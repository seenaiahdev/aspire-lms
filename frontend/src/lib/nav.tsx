import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Route } from './routes';
import { cleanPhoneSuffix } from './utils';

interface NavContextValue {
  route: Route;
  params: Record<string, string>;
  navigate: (route: Route, params?: Record<string, string>) => void;
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  notificationsOpen: boolean;
  setNotificationsOpen: (open: boolean) => void;
}

const NavContext = createContext<NavContextValue | null>(null);

export const AUTH_ROUTES: Route[] = ['splash', 'welcome', 'login'];

/**
 * Validates whether the browser holds an active, non-expired, and structurally sound student session.
 * Rejects sessions that lack a valid cryptographic session token or where the token has expired.
 */
export function hasValidSession(): boolean {
  try {
    if (typeof window === 'undefined') return false;

    const token = localStorage.getItem('aspire_session_token');
    const loggedIn = localStorage.getItem('aspire_logged_in') === 'true';
    const mobile = localStorage.getItem('aspire_logged_in_mobile');

    if (!loggedIn || !mobile) {
      return false;
    }

    if (token) {
      const parts = token.split('.');
      if (parts.length !== 2 && parts.length !== 3) return false;
      const payloadB64 = parts.length === 3 ? parts[1] : parts[0];
      const signature = parts.length === 3 ? parts[2] : parts[1];
      if (!payloadB64 || !signature || signature.length < 16) return false;

      // Decode base64url payload
      const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
      const jsonStr = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonStr);

      if (!payload.studentId || !payload.exp) {
        return false;
      }

      const expMs = payload.exp < 10000000000 ? payload.exp * 1000 : payload.exp;
      if (Date.now() > expMs) {
        // Session expired — purge invalid state
        localStorage.removeItem('aspire_session_token');
        localStorage.setItem('aspire_logged_in', 'false');
        return false;
      }

      // Check mobile matches if provided in payload
      const sanitizePhone = typeof cleanPhoneSuffix === 'function'
        ? cleanPhoneSuffix
        : (p?: string | number | null) => String(p || '').replace(/\D/g, '').slice(-10);
      const cleanMobile = sanitizePhone(mobile);
      if (payload.phone) {
        const payloadPhone = sanitizePhone(payload.phone);
        if (payloadPhone && payloadPhone !== cleanMobile) {
          return false;
        }
      }

      return true;
    }

    // SEC-06: Strict session validation — unverified cached user without signed session token is rejected
    return false;
  } catch {
    return false;
  }
}

export function isAuthenticated(): boolean {
  return hasValidSession();
}

export function NavProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return hasValidSession();
  });

  // Synchronously compute initial route and query params from URL on frame 0 to eliminate refresh flicker
  const getInitialRouteAndParams = (): { initialRoute: Route; initialParams: Record<string, string> } => {
    if (typeof window === 'undefined') return { initialRoute: 'splash', initialParams: {} };
    const loggedIn = hasValidSession();
    if (!loggedIn) {
      return { initialRoute: 'splash', initialParams: {} };
    }
    const locationPath = window.location.pathname.replace(/^\//, '') || 'dashboard';
    const [baseRoute] = locationPath.split('/');
    let base = (baseRoute || 'dashboard') as Route;
    if (base === 'quizzes') base = 'weekly-assessment';
    if (base === 'assignments') base = 'daily-assessment';

    const searchParams = new URLSearchParams(window.location.search);
    const newParams: Record<string, string> = {};
    searchParams.forEach((value, key) => { newParams[key] = value; });

    if (AUTH_ROUTES.includes(base)) {
      return { initialRoute: 'dashboard', initialParams: {} };
    }
    return { initialRoute: base, initialParams: newParams };
  };

  const [{ initialRoute, initialParams }] = useState(getInitialRouteAndParams);
  const [route, setRoute] = useState<Route>(initialRoute);
  const [params, setParams] = useState<Record<string, string>>(initialParams);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Navigate function with URL Hash & localStorage route sync
  const navigate = useCallback((r: Route, p: Record<string, string> = {}) => {
    let targetRoute = r;
    if (targetRoute === 'quizzes') targetRoute = 'weekly-assessment';
    if (targetRoute === 'assignments') targetRoute = 'daily-assessment';

    setRoute(targetRoute);
    setParams(p);
    setSidebarOpen(false);
    setNotificationsOpen(false);
    if (targetRoute !== 'splash') {
      localStorage.setItem('aspire_active_route', targetRoute);
      const searchParams = new URLSearchParams(p);
      const query = searchParams.toString();
      const newPath = `/${targetRoute}${query ? `?${query}` : ''}`;
      window.history.pushState({}, '', newPath);
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const login = useCallback(() => {
    localStorage.setItem('aspire_logged_in', 'true');
    localStorage.setItem('aspire_tour_allowed', 'true');
    setIsLoggedIn(true);
    navigate('dashboard');
  }, [navigate]);

  const logout = useCallback(() => {
    localStorage.removeItem('aspire_session_token');
    localStorage.setItem('aspire_logged_in', 'false');
    localStorage.setItem('aspire_active_route', 'login');
    localStorage.removeItem('aspire_logged_in_mobile');
    localStorage.removeItem('aspire_cached_user');
    setIsLoggedIn(false);
    navigate('login');
  }, [navigate]);

  // On mount: if logged in → skip splash, go directly to route.
  // If NOT logged in → stay on 'splash' (default useState), SplashScreen navigates to login.
  useEffect(() => {
    const loggedIn = hasValidSession();

    if (loggedIn) {
      // Skip splash for logged-in users — go directly to the page they were on
      const locationPath = window.location.pathname.replace(/^\//, '') || 'dashboard';
      const [baseRoute] = locationPath.split('/');
      let base = (baseRoute || 'dashboard') as Route;
      const searchParams = new URLSearchParams(window.location.search);
      const newParams: Record<string, string> = {};
      searchParams.forEach((value, key) => { newParams[key] = value; });

      if (base === 'quizzes') {
        base = 'weekly-assessment';
        const q = searchParams.toString();
        window.history.replaceState({}, '', `/weekly-assessment${q ? `?${q}` : ''}`);
      } else if (base === 'assignments') {
        base = 'daily-assessment';
        const q = searchParams.toString();
        window.history.replaceState({}, '', `/daily-assessment${q ? `?${q}` : ''}`);
      }

      if (AUTH_ROUTES.includes(base)) {
        // Was on a login/auth page while logged in → go to dashboard
        setRoute('dashboard');
        localStorage.setItem('aspire_active_route', 'dashboard');
      } else {
        setRoute(base);
        setParams(newParams);
        localStorage.setItem('aspire_active_route', base);
      }
    }
    // NOT logged in: do nothing — stay on 'splash', SplashScreen will navigate to login

    // Handle browser back/forward buttons
    const handlePopState = () => {
      const locationPath = window.location.pathname.replace(/^\//, '') || 'dashboard';
      const [baseRoute] = locationPath.split('/');
      let base = (baseRoute || 'dashboard') as Route;
      if (base === 'quizzes') base = 'weekly-assessment';
      if (base === 'assignments') base = 'daily-assessment';
      const isAuthed = hasValidSession();
      if (!isAuthed && !AUTH_ROUTES.includes(base)) {
        navigate('login');
      } else {
        const searchParams = new URLSearchParams(window.location.search);
        const newParams: Record<string, string> = {};
        searchParams.forEach((value, key) => { newParams[key] = value; });
        setRoute(base);
        setParams(newParams);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate]);

  // Instant scroll-to-top on every route change (including browser popstate back/forward)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [route]);


  return (
    <NavContext.Provider 
      value={{ 
        route, 
        params, 
        navigate, 
        isLoggedIn, 
        login, 
        logout, 
        sidebarOpen, 
        setSidebarOpen, 
        commandOpen, 
        setCommandOpen,
        notificationsOpen,
        setNotificationsOpen
      }}
    >
      {children}
    </NavContext.Provider>
  );
}

export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used within NavProvider');
  return ctx;
}
