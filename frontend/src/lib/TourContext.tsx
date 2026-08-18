import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useNav } from '@/lib/nav';
import { useUser } from '@/lib/UserContext';

interface TourContextType {
  /** Check if a tour has already been completed */
  isTourCompleted: (tourId: string) => boolean;
  /** Mark a tour as completed */
  markComplete: (tourId: string) => void;
  /** Check if tour should run (not yet completed and allowed for this login session) */
  shouldRunTour: (tourId: string) => boolean;
  /** Reset all completed tours for the active user */
  resetTours: () => void;
}

const TourContext = createContext<TourContextType | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  
  // Synchronous initialization prevents race condition on initial render
  const [completedTours, setCompletedTours] = useState<string[]>(() => {
    const mobile = localStorage.getItem('aspire_logged_in_mobile') || 'guest';
    const stored = localStorage.getItem(`aspire_completed_tours_${mobile}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  });
  
  const { route } = useNav();

  // Load completed tours from localStorage when active user profile changes
  useEffect(() => {
    const mobile = user?.mobile || localStorage.getItem('aspire_logged_in_mobile') || 'guest';
    const stored = localStorage.getItem(`aspire_completed_tours_${mobile}`);
    if (stored) {
      try {
        setCompletedTours(JSON.parse(stored));
      } catch {
        setCompletedTours([]);
      }
    } else {
      setCompletedTours([]);
    }
  }, [user?.mobile]);

  // Reset tours in-memory when user lands on the login screen (auth logout)
  useEffect(() => {
    if (route === 'login') {
      setCompletedTours([]);
    }
  }, [route]);

  const isTourCompleted = useCallback(
    (tourId: string) => completedTours.includes(tourId),
    [completedTours]
  );

  const markComplete = useCallback((tourId: string) => {
    const mobile = user?.mobile || localStorage.getItem('aspire_logged_in_mobile') || 'guest';
    localStorage.setItem('aspire_tour_allowed', 'false'); // Lock further automatic triggers
    setCompletedTours((prev) => {
      if (prev.includes(tourId)) return prev;
      const next = [...prev, tourId];
      localStorage.setItem(`aspire_completed_tours_${mobile}`, JSON.stringify(next));
      return next;
    });
  }, [user?.mobile]);

  const shouldRunTour = useCallback(
    (tourId: string) => {
      const isAllowed = localStorage.getItem('aspire_tour_allowed') === 'true';
      return isAllowed && !completedTours.includes(tourId);
    },
    [completedTours]
  );

  const resetTours = useCallback(() => {
    const mobile = user?.mobile || localStorage.getItem('aspire_logged_in_mobile') || 'guest';
    setCompletedTours([]);
    localStorage.removeItem(`aspire_completed_tours_${mobile}`);
    localStorage.setItem('aspire_tour_allowed', 'true'); // Allow tours to run again
  }, [user?.mobile]);

  return (
    <TourContext.Provider value={{ isTourCompleted, markComplete, shouldRunTour, resetTours }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within a TourProvider');
  return ctx;
}
