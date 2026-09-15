import React from 'react';
import { ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper: render inline text containing `code`, **bold**, *italic*, and [link](url)
export function renderInlineText(text: string): React.ReactNode[] {
  if (!text) return [];

  const tokens: React.ReactNode[] = [];
  // Matches: `code`, **bold**, *italic*, [link text](url)
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(
        <span key={`txt-${keyIndex++}`}>
          {text.slice(lastIndex, match.index)}
        </span>
      );
    }

    const val = match[0];
    if (val.startsWith('`') && val.endsWith('`')) {
      const codeContent = val.slice(1, -1);
      tokens.push(
        <code
          key={`code-${keyIndex++}`}
          className="font-mono text-[11px] font-semibold bg-purple-50 text-[#7c3aed] border border-purple-200/80 px-1.5 py-0.5 rounded-md shadow-3xs inline-block my-0.5 select-all"
        >
          {codeContent}
        </code>
      );
    } else if (val.startsWith('**') && val.endsWith('**')) {
      const boldContent = val.slice(2, -2);
      tokens.push(
        <strong key={`bold-${keyIndex++}`} className="font-extrabold text-slate-900">
          {renderInlineText(boldContent)}
        </strong>
      );
    } else if (val.startsWith('*') && val.endsWith('*')) {
      const italicContent = val.slice(1, -1);
      tokens.push(
        <em key={`em-${keyIndex++}`} className="italic text-slate-600">
          {renderInlineText(italicContent)}
        </em>
      );
    } else if (val.startsWith('[') && val.includes('](') && val.endsWith(')')) {
      const linkMatch = val.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        tokens.push(
          <a
            key={`a-${keyIndex++}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#7c3aed] font-bold underline hover:text-[#6d28d9] inline-flex items-center gap-0.5"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        tokens.push(<span key={`txt-${keyIndex++}`}>{val}</span>);
      }
    }

    lastIndex = match.index + val.length;
  }

  if (lastIndex < text.length) {
    tokens.push(
      <span key={`txt-${keyIndex++}`}>
        {text.slice(lastIndex)}
      </span>
    );
  }

  return tokens;
}

interface StepItem {
  level: number;
  text: string;
  number?: string;
}

interface StepBlock {
  type: 'step';
  number: string;
  title: string;
  items: StepItem[];
}

interface HeadingBlock {
  type: 'heading';
  level: number;
  text: string;
}

interface ParagraphBlock {
  type: 'paragraph';
  text: string;
}

interface ListBlock {
  type: 'list';
  items: StepItem[];
}

type MarkdownBlock = StepBlock | HeadingBlock | ParagraphBlock | ListBlock;

function parseMarkdownToBlocks(text: string): MarkdownBlock[] {
  if (!text) return [];
  const lines = text.split('\n');
  const blocks: MarkdownBlock[] = [];
  let currentParagraph: string[] = [];
  let currentStep: StepBlock | null = null;
  let currentList: ListBlock | null = null;

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      blocks.push({
        type: 'paragraph',
        text: currentParagraph.join(' ').trim(),
      });
      currentParagraph = [];
    }
  }

  function flushStep() {
    if (currentStep) {
      blocks.push(currentStep);
      currentStep = null;
    }
  }

  function flushList() {
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    // Heading: ### Step-by-Step Instructions:
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushStep();
      flushList();
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      continue;
    }

    // Top-level numbered step (starts at column 0 or 1): e.g. "1. **Document Declaration & Head:**"
    const topStepMatch = rawLine.match(/^(\d+)\.\s+(.+)$/);
    if (topStepMatch) {
      flushParagraph();
      flushStep();
      flushList();
      currentStep = {
        type: 'step',
        number: topStepMatch[1],
        title: topStepMatch[2],
        items: [],
      };
      continue;
    }

    // Bullet item (- ... or * ...)
    const indentMatch = rawLine.match(/^(\s*)[-*+]\s+(.+)$/);
    if (indentMatch) {
      flushParagraph();
      const indentLevel = indentMatch[1].length >= 4 ? 2 : 1;
      const itemText = indentMatch[2];

      if (currentStep) {
        currentStep.items.push({
          level: indentLevel,
          text: itemText,
        });
      } else {
        if (!currentList) {
          currentList = { type: 'list', items: [] };
        }
        currentList.items.push({
          level: indentLevel,
          text: itemText,
        });
      }
      continue;
    }

    // Indented numbered item inside a step: e.g. "       1. `HTML5 Document Structure`"
    const indentedNumMatch = rawLine.match(/^(\s+)(\d+)\.\s+(.+)$/);
    if (indentedNumMatch && currentStep) {
      flushParagraph();
      currentStep.items.push({
        level: 3,
        number: indentedNumMatch[2],
        text: indentedNumMatch[3],
      });
      continue;
    }

    // Continuation of step item
    if (currentStep && currentStep.items.length > 0 && !trimmed.startsWith('**') && !trimmed.startsWith('#')) {
      const lastItem = currentStep.items[currentStep.items.length - 1];
      lastItem.text += ' ' + trimmed;
      continue;
    }

    flushStep();
    flushList();
    currentParagraph.push(trimmed);
  }

  flushParagraph();
  flushStep();
  flushList();

  return blocks;
}

// Clean title if it contains wrapped asterisks like "**Document Declaration:**"
function cleanStepTitle(title: string): string {
  let cleaned = title.trim();
  if (cleaned.startsWith('**') && cleaned.endsWith('**')) {
    cleaned = cleaned.slice(2, -2);
  }
  return cleaned;
}

interface ProblemDescriptionRendererProps {
  description: string;
  className?: string;
}

export function ProblemDescriptionRenderer({ description, className }: ProblemDescriptionRendererProps) {
  if (!description) return null;

  const blocks = parseMarkdownToBlocks(description);

  return (
    <div className={cn("space-y-4 text-slate-700 leading-relaxed", className)}>
      {blocks.map((block, bIdx) => {
        if (block.type === 'paragraph') {
          return (
            <p key={bIdx} className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
              {renderInlineText(block.text)}
            </p>
          );
        }

        if (block.type === 'heading') {
          return (
            <div key={bIdx} className="pt-3 pb-1 border-t border-slate-100 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-purple-100/90 text-[#7c3aed] flex items-center justify-center shrink-0">
                <ListOrdered className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                {renderInlineText(block.text)}
              </h3>
            </div>
          );
        }

        if (block.type === 'step') {
          const cleanedTitle = cleanStepTitle(block.title);
          return (
            <div
              key={bIdx}
              className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 sm:p-5 space-y-3 transition-all hover:border-purple-200/90 hover:bg-white shadow-2xs"
            >
              {/* Step Header */}
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#7c3aed] text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                  {block.number}
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                  {renderInlineText(cleanedTitle)}
                </h4>
              </div>

              {/* Step Items */}
              {block.items && block.items.length > 0 && (
                <div className="space-y-2 pl-1 sm:pl-2">
                  {block.items.map((item, itemIdx) => {
                    if (item.level === 3 && item.number) {
                      // Sub-numbered item
                      return (
                        <div key={itemIdx} className="ml-5 flex items-center gap-2 text-xs text-slate-600">
                          <span className="w-4 h-4 rounded bg-purple-100 text-[#7c3aed] font-bold text-[10px] flex items-center justify-center shrink-0">
                            {item.number}
                          </span>
                          <span>{renderInlineText(item.text)}</span>
                        </div>
                      );
                    }

                    if (item.level === 2) {
                      // Sub-bullet item
                      return (
                        <div
                          key={itemIdx}
                          className="ml-5 pl-2.5 border-l-2 border-purple-200/60 flex items-start gap-2 text-xs text-slate-600"
                        >
                          <span className="w-1.5 h-1.5 rounded-full border border-purple-400 mt-1.5 shrink-0" />
                          <div className="leading-relaxed">{renderInlineText(item.text)}</div>
                        </div>
                      );
                    }

                    // Level 1 bullet item
                    return (
                      <div key={itemIdx} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] mt-1.5 shrink-0" />
                        <div className="leading-relaxed">{renderInlineText(item.text)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        if (block.type === 'list') {
          return (
            <div key={bIdx} className="space-y-2 pl-2">
              {block.items.map((item, itemIdx) => (
                <div key={itemIdx} className="flex items-start gap-2.5 text-xs text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                  <div className="leading-relaxed">{renderInlineText(item.text)}</div>
                </div>
              ))}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
