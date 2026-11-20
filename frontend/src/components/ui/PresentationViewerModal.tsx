import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Maximize2, Minimize2, ShieldAlert, Presentation as PresentationIcon, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPresentationEmbedUrl, PresentationRecord } from '@/lib/api';

interface PresentationViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  presentation: PresentationRecord | null;
}

export function PresentationViewerModal({ isOpen, onClose, presentation }: PresentationViewerModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreen, onClose]);

  // Reset loading state when presentation changes
  useEffect(() => {
    if (presentation?.ppt_url) {
      setIframeLoading(true);
    }
  }, [presentation?.ppt_url]);

  if (!isOpen || !presentation) return null;

  const embedUrl = getPresentationEmbedUrl(presentation.ppt_url);

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-fade-in select-none"
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className={cn(
          "w-full bg-[#0e1322] border border-slate-800 rounded-2xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300",
          isFullscreen ? "fixed inset-2 sm:inset-4 md:inset-6 z-[100000]" : "max-w-5xl h-[88vh] max-h-[860px]"
        )}
      >
        {/* Top Header Bar */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-slate-900/90 border-b border-slate-800/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 shadow-inner">
              <PresentationIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-black uppercase tracking-wider">
                  {presentation.course_name ? (presentation.course_name.includes('Python') ? 'Python' : 'Java') : 'Presentation'}
                </span>
                {presentation.stage_name && (
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold truncate max-w-[200px]">
                    {presentation.subtopic_name || presentation.stage_name}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-emerald-400" /> View Only • No Download
                </span>
              </div>
              <h3 className="font-extrabold text-white text-xs sm:text-sm md:text-base truncate mt-0.5 leading-snug">
                {presentation.title || presentation.lesson_name}
              </h3>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors border border-slate-700/60"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close Presentation"
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-300 flex items-center justify-center transition-colors border border-slate-700/60"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Presentation Viewer Area */}
        <div 
          className="flex-1 w-full bg-slate-950 relative flex items-center justify-center overflow-hidden"
          onContextMenu={(e) => e.preventDefault()}
        >
          {iframeLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 z-10">
              <div className="w-9 h-9 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-xs font-bold tracking-wide">Loading presentation slides...</p>
            </div>
          )}

          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={presentation.title || 'Presentation Viewer'}
              className="w-full h-full border-0 bg-black"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-presentation"
              onLoad={() => setIframeLoading(false)}
            />
          ) : (
            <div className="text-center p-6 text-slate-400">
              <p className="font-bold text-sm">Unable to render presentation preview.</p>
              <p className="text-xs text-slate-500 mt-1">Presentation link is unavailable.</p>
            </div>
          )}
        </div>

        {/* Bottom Safety & Topic Footer */}
        <div className="px-4 py-2 sm:px-6 bg-slate-900/90 border-t border-slate-800/90 flex items-center justify-between text-[11px] text-slate-400 font-semibold shrink-0">
          <span className="truncate max-w-[70%]">
            {presentation.lesson_name ? `Mapped to: ${presentation.lesson_name}` : presentation.subtopic_name || ''}
          </span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
            {presentation.provider || 'Google Slides'}
          </span>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
