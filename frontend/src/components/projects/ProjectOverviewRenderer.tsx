import React from 'react';
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

  const hasStructuredSections = Boolean(
    parsed.uiPresentation || parsed.technicalReqs || parsed.functionality || parsed.submissionNotes
  );

  if (!hasStructuredSections) {
    return (
      <div className={cn("text-xs sm:text-[13px] text-slate-600 font-medium leading-relaxed whitespace-pre-line", className)}>
        {renderInlineText(overview)}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3 font-sans text-xs sm:text-[13px] text-slate-600 leading-relaxed", className)}>
      {/* 1. Main Project Objective / Summary */}
      {parsed.objective && (
        <p className="text-slate-700 leading-relaxed font-normal">
          {renderInlineText(parsed.objective)}
        </p>
      )}

      {/* 2. Structured Clear Breakdown (Clean Normal White Style with Bullet Points) */}
      <div className="pt-2 space-y-2.5 border-t border-slate-100">
        {parsed.uiPresentation && (
          <div className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] mt-2 shrink-0" />
            <p className="leading-relaxed">
              <strong className="text-slate-900 font-bold">UI / Presentation: </strong>
              <span className="text-slate-600">{renderInlineText(parsed.uiPresentation)}</span>
            </p>
          </div>
        )}

        {parsed.technicalReqs && (
          <div className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] mt-2 shrink-0" />
            <p className="leading-relaxed">
              <strong className="text-slate-900 font-bold">Technical Requirements: </strong>
              <span className="text-slate-600">{renderInlineText(parsed.technicalReqs)}</span>
            </p>
          </div>
        )}

        {parsed.functionality && (
          <div className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] mt-2 shrink-0" />
            <p className="leading-relaxed">
              <strong className="text-slate-900 font-bold">Functionality: </strong>
              <span className="text-slate-600">{renderInlineText(parsed.functionality)}</span>
            </p>
          </div>
        )}

        {parsed.submissionNotes && (
          <div className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] mt-2 shrink-0" />
            <p className="leading-relaxed">
              <strong className="text-slate-900 font-bold">Submission Deliverable: </strong>
              <span className="text-slate-600">The final submission must be {renderInlineText(parsed.submissionNotes)}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

