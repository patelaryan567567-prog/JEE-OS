import React from 'react';
import { useApp } from '../../context/AppContext';
import { Zap, Award, CheckCircle2, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg bg-neutral-900/95 border border-neutral-700/80 shadow-2xl backdrop-blur-md text-sm text-neutral-100 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
        >
          <div className="mt-0.5 shrink-0">
            {toast.type === 'xp' && (
              <div className="w-7 h-7 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
            )}
            {toast.type === 'badge' && (
              <div className="w-7 h-7 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                <Award className="w-4 h-4 text-purple-400" />
              </div>
            )}
            {toast.type === 'success' && (
              <div className="w-7 h-7 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
            )}
            {toast.type === 'info' && (
              <div className="w-7 h-7 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                <Info className="w-4 h-4 text-blue-400" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-semibold text-neutral-100 truncate">{toast.message}</div>
            {toast.subtext && (
              <div className="text-xs text-neutral-400 mt-0.5 line-clamp-2">{toast.subtext}</div>
            )}
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            className="text-neutral-500 hover:text-neutral-300 p-1 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
