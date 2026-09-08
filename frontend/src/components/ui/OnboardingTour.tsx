import { useEffect } from 'react';
import { Joyride, Step, TooltipRenderProps, STATUS, CallBackProps, EVENTS } from 'react-joyride';
import { ChevronRight, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNav } from '@/lib/nav';
import { useTour } from '@/lib/TourContext';

interface OnboardingTourProps {
  /** Unique ID for this tour (e.g. 'dashboard', 'learning') */
  tourId: string;
  /** Steps to render in this tour */
  steps: Step[];
  /** Optional callback for step-specific side effects (e.g. opening sidebar) */
  onStepChange?: (index: number, type: string) => void;
}

export function OnboardingTour(_props: OnboardingTourProps) {
  // Tour completely disabled per user request
  return null;
}
