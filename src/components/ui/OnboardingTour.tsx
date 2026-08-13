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

export function OnboardingTour({ tourId, steps, onStepChange }: OnboardingTourProps) {
  const { shouldRunTour, markComplete } = useTour();
  const { setSidebarOpen } = useNav();

  const run = shouldRunTour(tourId);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, type } = data;

    // Let parent handle step-specific side effects
    if (type === EVENTS.STEP_BEFORE || type === EVENTS.TOOLTIP) {
      onStepChange?.(index, type);
    }

    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) {
      setSidebarOpen(false);
      markComplete(tourId);
    }
  };

  // Custom Tooltip Renderer matching our premium glassmorphic UI
  const Tooltip = ({
    continuous,
    index,
    step,
    backProps,
    closeProps,
    primaryProps,
    tooltipProps,
    isLastStep,
  }: TooltipRenderProps) => {
    return (
      <div
        {...tooltipProps}
        className="bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-3xl p-5 w-[320px] font-sans animate-scale-in relative"
      >
        <button 
          {...closeProps} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-base font-black text-slate-900 mb-2 pr-6">{step.title}</h3>
        <p className="text-xs font-semibold text-slate-600 leading-relaxed mb-5">{step.content}</p>
        
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          {/* Step indicator — compact counter for many steps, dots for few */}
          <div className="flex items-center gap-1.5 shrink-0">
            {steps.length <= 8 ? (
              steps.map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all duration-300", 
                    i === index ? "bg-[#7c3aed] w-4" : i < index ? "bg-[#7c3aed]/40" : "bg-slate-200"
                  )} 
                />
              ))
            ) : (
              <span className="text-[11px] font-bold text-slate-500">
                <span className="text-[#7c3aed] font-extrabold">{index + 1}</span> / {steps.length}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button 
                {...backProps} 
                className="text-xs font-bold text-slate-500 hover:text-slate-900 px-3 py-1.5 transition-colors"
              >
              Back
              </button>
            )}
            <button
              {...primaryProps}
              className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-extrabold px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              {isLastStep ? 'Got it!' : 'Next'}
              {isLastStep ? <Check className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!run || steps.length === 0) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      disableScrolling={true}
      callback={handleJoyrideCallback}
      tooltipComponent={Tooltip}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: '#7c3aed',
        },
        overlay: {
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
        },
      }}
      floaterProps={{
        disableAnimation: true,
      }}
    />
  );
}
