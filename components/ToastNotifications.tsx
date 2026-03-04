import React, { useEffect } from 'react';
import { useToaster } from '../context/ToastContext';
import { Toast, ToastType } from '../types';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from './Icons';
import { useSettings } from '../context/SettingsContext';
import { motion, AnimatePresence } from 'motion/react';

const ToastIcons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircleIcon className="w-5 h-5 text-emerald-500" />,
  error: <XCircleIcon className="w-5 h-5 text-rose-500" />,
  info: <InformationCircleIcon className="w-5 h-5 text-sky-500" />,
};

const ToastComponent: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const { direction } = useSettings();

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={`
        w-full max-w-sm bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-2xl border border-slate-100 dark:border-slate-800
        flex items-center p-4 pointer-events-auto
      `}
      role="alert"
    >
      <div className="flex-shrink-0">{ToastIcons[toast.type]}</div>
      <div className={`flex-1 min-w-0 ${direction === 'rtl' ? 'mr-3' : 'ml-3'}`}>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
          {toast.message}
        </p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-4 flex-shrink-0 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  );
};

const ToastContainer = () => {
    const { toasts, removeToast } = useToaster();
    const { direction } = useSettings();

    return (
        <div
            className={`fixed inset-0 flex flex-col items-center px-4 py-6 pointer-events-none z-[9999] sm:p-6 ${
                direction === 'rtl' ? 'sm:items-start' : 'sm:items-end'
            }`}
        >
            <div className="w-full max-w-sm flex flex-col space-y-3">
                <AnimatePresence mode="popLayout">
                    {toasts.map((toast) => (
                        <ToastComponent key={toast.id} toast={toast} onDismiss={removeToast} />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ToastContainer;
