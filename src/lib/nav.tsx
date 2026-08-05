import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Route } from './routes';

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

const AUTH_ROUTES: Route[] = ['splash', 'welcome', 'login', 'register', 'forgot', 'reset', 'otp'];

export function NavProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('aspire_logged_in') === 'true';
  });

  // Always start with 'splash' loader screen on page load / refresh
  const [route, setRoute] = useState<Route>('splash');
  const [params, setParams] = useState<Record<string, string>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Navigate function with URL Hash & localStorage route sync
  const navigate = useCallback((r: Route, p: Record<string, string> = {}) => {
    setRoute(r);
    setParams(p);
    setSidebarOpen(false);
    setNotificationsOpen(false);
    if (r !== 'splash') {
      localStorage.setItem('aspire_active_route', r);
      let newHash = `#/${r}`;
      if (Object.keys(p).length > 0) {
        const searchParams = new URLSearchParams(p);
        newHash += `?${searchParams.toString()}`;
      }
      window.location.hash = newHash;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const login = useCallback(() => {
    localStorage.setItem('aspire_logged_in', 'true');
    setIsLoggedIn(true);
    navigate('dashboard');
  }, [navigate]);

  const logout = useCallback(() => {
    localStorage.setItem('aspire_logged_in', 'false');
    localStorage.setItem('aspire_active_route', 'login');
    setIsLoggedIn(false);
    navigate('login');
  }, [navigate]);

  // Sync hash changes (e.g. browser back/forward buttons)
  useEffect(() => {
    const handleHashChange = () => {
      const fullHash = window.location.hash.replace('#/', '').replace('#', '').trim();
      const [pathPart, queryPart] = fullHash.split('?');
      const baseRoute = (pathPart.split('/')[0] || 'dashboard') as Route;
      
      const newParams: Record<string, string> = {};
      if (queryPart) {
        const searchParams = new URLSearchParams(queryPart);
        searchParams.forEach((value, key) => {
          newParams[key] = value;
        });
      }

      if (baseRoute && baseRoute !== 'splash') {
        const loggedIn = localStorage.getItem('aspire_logged_in') === 'true';
        if (!loggedIn && !AUTH_ROUTES.includes(baseRoute)) {
          navigate('login');
        } else {
          setRoute(baseRoute);
          setParams(newParams);
          localStorage.setItem('aspire_active_route', baseRoute);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [navigate]);

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
