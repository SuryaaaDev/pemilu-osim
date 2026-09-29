'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info', title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success', title?: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message }]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title = 'Berhasil') => showToast(message, 'success', title),
    [showToast]
  );

  const error = useCallback(
    (message: string, title = 'Gagal') => showToast(message, 'error', title),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error }}>
      {children}

      {/* Snackbar / Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start space-x-3 p-4 rounded-xl shadow-2xl border text-sm transition-all duration-300 transform animate-in slide-in-from-bottom-5 ${
              t.type === 'success'
                ? 'bg-slate-900 border-emerald-500/50 text-white'
                : t.type === 'error'
                ? 'bg-slate-900 border-rose-500/50 text-white'
                : 'bg-slate-900 border-indigo-500/50 text-white'
            }`}
          >
            {t.type === 'success' && (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            {t.type === 'error' && (
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            {t.type === 'info' && (
              <Info className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
            )}

            <div className="flex-1">
              {t.title && (
                <p className="font-bold text-xs uppercase tracking-wider mb-0.5 text-slate-300">
                  {t.title}
                </p>
              )}
              <p className="font-medium text-slate-100 leading-snug">{t.message}</p>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-white p-0.5 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Return dummy fallback if used outside provider gracefully
    return {
      showToast: () => {},
      success: () => {},
      error: () => {},
    };
  }
  return context;
}
