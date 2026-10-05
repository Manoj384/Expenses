import { useState } from 'react'
import {
  FileText,
  ExternalLink,
  Download,
  X,
  Maximize2,
  ZoomIn,
  BookOpen,
  Sparkles,
} from 'lucide-react'

export default function EmcPdfViewerModal({ isOpen, onClose, pdfUrl, title, onAnalyzeWithAi }) {
  if (!isOpen || !pdfUrl) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fadeIn">
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl flex-shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-white truncate">
                {title || 'Standard Document / Course PDF'}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono truncate">{pdfUrl}</p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onAnalyzeWithAi && (
              <button
                onClick={() => {
                  onClose()
                  onAnalyzeWithAi(pdfUrl, title)
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                title="Send this PDF to EMC AI Assistant for autonomous key-point and formula extraction"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI Auto-Extract</span>
              </button>
            )}

            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              title="Open in new browser tab"
            >
              <ExternalLink className="h-4 w-4" />
            </a>

            <a
              href={pdfUrl}
              download
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              title="Download PDF"
            >
              <Download className="h-4 w-4" />
            </a>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded-xl transition-colors ml-1"
              title="Close viewer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Embedded PDF Viewer Iframe */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-950 relative">
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=1`}
            title={title}
            className="w-full h-full border-0"
          />
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
            <span>Official Technical Specification & Reference Document</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors"
            >
              Close Viewer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
