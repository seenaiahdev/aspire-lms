import { useState, forwardRef } from 'react';
import { Joyride, Step, TooltipRenderProps, STATUS, CallBackProps, EVENTS, BeaconRenderProps } from 'react-joyride';
import { ChevronRight, Check, X, Pointer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNav } from '@/lib/nav';

interface OnboardingTourProps {
  run: boolean;
  onFinish?: () => void;
}

export function OnboardingTour({ run, onFinish }: OnboardingTourProps) {
  const [steps] = useState<Step[]>([
    {
      target: '#tour-sidebar',
      title: 'Navigation Menu',
      content: 'This is your main navigation. Jump between your Dashboard, Courses, Practice Labs, and Settings here.',
      disableBeacon: true,
      placement: 'right',
    },
    {
      target: '#tour-schedule',
      title: 'Your Daily Schedule',
      content: 'Check here every day for your learning tasks and curriculum schedule. You can use the calendar to look ahead or back.',
      placement: 'bottom',
    },
    {
      target: '#tour-live-classes',
      title: 'Live & Upcoming Sessions',
      content: 'Join your live instructor-led sessions directly from here. We will notify you when a class is about to start.',
      placement: 'bottom',
    },
    {
      target: '#tour-stats',
      title: 'Track Your Progress',
      content: 'Keep an eye on your overall course completion and modules finished. Consistency is key!',
      placement: 'left',
    }
  ]);

  const { setSidebarOpen } = useNav();

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, type } = data;
    
    // Open sidebar ONLY for the first step (index 0) so the tooltip points to the expanded menu
    if (type === EVENTS.STEP_BEFORE) {
      setSidebarOpen(index === 0);
    }

    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) {
      setSidebarOpen(false);
      if (onFinish) onFinish();
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
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-300", 
                  i === index ? "bg-[#7c3aed] w-4" : "bg-slate-200"
                )} 
              />
            ))}
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

  const CustomBeacon = forwardRef<HTMLButtonElement, BeaconRenderProps>((props, ref) => {
    return (
      <button
        ref={ref}
        {...props}
        className="animate-point-left p-2 flex items-center justify-center cursor-pointer"
      >
        <Pointer className="w-8 h-8 text-[#7c3aed] fill-[#7c3aed] -rotate-90 drop-shadow-lg" />
      </button>
    );
  });

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      tooltipComponent={Tooltip}
      beaconComponent={CustomBeacon}
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
