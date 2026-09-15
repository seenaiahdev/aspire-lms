import React from 'react';
import { Target, Layout, Cpu, Sparkles, FileCheck, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { renderInlineText } from '@/components/practice/ProblemDescriptionRenderer';

export interface ParsedProjectOverview {
  objective: string;
  uiPresentation: string;
  technicalReqs: string;
  functionality: string;
  submissionNotes: string;
}

export function parseProjectOverview(text: string): ParsedProjectOverview {
  if (!text) {
    return {
      objective: '',
      uiPresentation: '',
      technicalReqs: '',
      functionality: '',
      submissionNotes: '',
    };
  }

  let remaining = text.trim();
  let objective = '';
  let uiPresentation = '';
  let technicalReqs = '';
  let functionality = '';
  let submissionNotes = '';

  // 1. Extract Submission Deliverable Notes
  const subMatch = remaining.match(/(?:The final submission should be|Submission criteria:|Deliverables:)\s*(.+)$/i);
  if (subMatch) {
    submissionNotes = subMatch[1].trim();
    remaining = remaining.replace(subMatch[0], '').trim();
  }

  // 2. Extract Technical requirements
  const techMatch =
    remaining.match(/(?:Technical requirements:|Technical Stack:|Technical requirements)\s*:\s*([^.]+?\.)/i) ||
    remaining.match(/(?:Technical requirements:|Technical Stack:|Technical requirements)\s*:\s*(.+)$/i);
  if (techMatch) {
    technicalReqs = techMatch[1].trim();
    remaining = remaining.replace(techMatch[0], '').trim();
  }

  // 3. Extract UI & Presentation
  const uiMatch =
    remaining.match(/(?:UI\/Presentation:|UI requirements:|Presentation:)\s*([^.]+?\.)/i) ||
    remaining.match(/(?:UI\/Presentation:|UI requirements:|Presentation:)\s*(.+)$/i);
  if (uiMatch) {
    uiPresentation = uiMatch[1].trim();
    remaining = remaining.replace(uiMatch[0], '').trim();
  }

  // 4. Extract Functionality expectations
  const funcMatch = remaining.match(/(Functionality should be complete enough.+?\.)(?=\s|$)/i);
  if (funcMatch) {
    functionality = funcMatch[1].trim();
    remaining = remaining.replace(funcMatch[0], '').trim();
  }

  objective = remaining.trim();

  return {
    objective,
    uiPresentation,
    technicalReqs,
    functionality,
    submissionNotes,
  };
}

interface ProjectOverviewRendererProps {
  overview?: string;
  className?: string;
}

export function ProjectOverviewRenderer({ overview, className }: ProjectOverviewRendererProps) {
  if (!overview) return null;

  const parsed = parseProjectOverview(overview);

  // If text doesn't match standard template parts (e.g. short custom summary), render formatted text cleanly
  const hasStructuredSections = Boolean(
    parsed.uiPresentation || parsed.technicalReqs || parsed.functionality || parsed.submissionNotes
  );

  if (!hasStructuredSections) {
    return (
      <div className={cn("p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 text-xs sm:text-[13px] text-slate-700 leading-relaxed font-medium", className)}>
        {renderInlineText(overview)}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4 font-sans", className)}>
      {/* 1. Main Project Objective Card */}
      {parsed.objective && (
        <div className="p-4 sm:p-5 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-2 shadow-2xs transition-all hover:bg-purple-50">
          <div className="flex items-center gap-2 text-[#7c3aed] text-xs font-black uppercase tracking-wider">
            <div className="w-5 h-5 rounded-md bg-purple-100 border border-purple-200 flex items-center justify-center text-[#7c3aed] shrink-0">
              <Target className="w-3.5 h-3.5" />
            </div>
            <span>Core Objective & Goal</span>
          </div>
          <p className="text-xs sm:text-[13px] text-slate-800 font-medium leading-relaxed">
            {renderInlineText(parsed.objective)}
          </p>
        </div>
      )}

      {/* 2. Side-by-Side Specifications Grid: UI & Technical Requirements */}
      {(parsed.uiPresentation || parsed.technicalReqs) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* UI & Presentation */}
          {parsed.uiPresentation && (
            <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-2 shadow-2xs hover:bg-white hover:border-indigo-200 transition-all">
              <div className="flex items-center gap-2 text-indigo-700 text-xs font-black uppercase tracking-wider">
                <div className="w-5 h-5 rounded-md bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shrink-0">
                  <Layout className="w-3.5 h-3.5" />
                </div>
                <span>UI & Presentation</span>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {renderInlineText(parsed.uiPresentation)}
              </p>
            </div>
          )}

          {/* Technical Requirements */}
          {parsed.technicalReqs && (
            <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-2 shadow-2xs hover:bg-white hover:border-emerald-200 transition-all">
              <div className="flex items-center gap-2 text-emerald-700 text-xs font-black uppercase tracking-wider">
                <div className="w-5 h-5 rounded-md bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shrink-0">
                  <Cpu className="w-3.5 h-3.5" />
                </div>
                <span>Technical Requirements</span>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {renderInlineText(parsed.technicalReqs)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 3. Functional Scope & Verification Quality */}
      {parsed.functionality && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-start gap-3 shadow-3xs">
          <div className="w-5 h-5 rounded-md bg-amber-100/90 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <p className="text-xs font-black text-amber-900 uppercase tracking-wider">Functionality & Reliability Standard</p>
            <p className="text-xs text-amber-950/80 font-medium leading-relaxed">
              {renderInlineText(parsed.functionality)}
            </p>
          </div>
        </div>
      )}

      {/* 4. Submission & Deliverable Evidence */}
      {parsed.submissionNotes && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 flex items-start gap-3 shadow-3xs">
          <div className="w-5 h-5 rounded-md bg-blue-100/90 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
            <FileCheck className="w-3.5 h-3.5" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <p className="text-xs font-black text-blue-900 uppercase tracking-wider">Deliverable & Verification Standard</p>
            <p className="text-xs text-blue-950/80 font-medium leading-relaxed">
              The project submission must be {renderInlineText(parsed.submissionNotes)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
