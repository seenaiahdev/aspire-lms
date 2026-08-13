import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useNav } from '@/lib/nav';

interface TourContextType {
  /** Check if a tour has already been completed in this session */
  isTourCompleted: (tourId: string) => boolean;
  /** Mark a tour as completed for this session */
  markComplete: (tourId: string) => void;
  /** Check if tour should run (not yet completed) */
  shouldRunTour: (tourId: string) => boolean;
}

const TourContext = createContext<TourContextType | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  // In-memory Set — automatically resets on page refresh (F5) or logout
  const [completedTours, setCompletedTours] = useState<Set<string>>(new Set());
  const { route } = useNav();

  // Reset tours when user lands on the login screen
  useEffect(() => {
    if (route === 'login') {
      setCompletedTours(new Set());
    }
  }, [route]);

  const isTourCompleted = useCallback(
    (tourId: string) => completedTours.has(tourId),
    [completedTours]
  );

  const markComplete = useCallback((tourId: string) => {
    setCompletedTours((prev) => {
      const next = new Set(prev);
      next.add(tourId);
      return next;
    });
  }, []);

  const shouldRunTour = useCallback(
    (tourId: string) => !completedTours.has(tourId),
    [completedTours]
  );

  return (
    <TourContext.Provider value={{ isTourCompleted, markComplete, shouldRunTour }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within a TourProvider');
  return ctx;
}
