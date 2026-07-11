import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Info, AlertTriangle, XCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

const toastTypeConfig = {
  success: {
    icon: <CheckCircle size={16} className="text-emerald-400" />,
    borderColor: 'border-emerald-500/20',
    bgColor: 'bg-emerald-950/20',
    textColor: 'text-emerald-200'
  },
  info: {
    icon: <Info size={16} className="text-blue-400" />,
    borderColor: 'border-blue-500/20',
    bgColor: 'bg-blue-950/20',
    textColor: 'text-blue-200'
  },
  warning: {
    icon: <AlertTriangle size={16} className="text-amber-400" />,
    borderColor: 'border-amber-500/20',
    bgColor: 'bg-amber-950/20',
    textColor: 'text-amber-200'
  },
  error: {
    icon: <XCircle size={16} className="text-rose-400" />,
    borderColor: 'border-rose-500/20',
    bgColor: 'bg-rose-950/20',
    textColor: 'text-rose-200'
  }
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface ToastItemProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const config = toastTypeConfig[toast.type] || toastTypeConfig.info;

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration || 3500);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`pointer-events-auto flex items-center justify-between gap-4 px-4 py-3.5 rounded-2xl bg-[#576d87]/30 border ${config.borderColor} backdrop-blur-md shadow-2xl`}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">{config.icon}</div>
        <p className="text-xs font-medium text-white tracking-wide">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 text-white/40 hover:text-white transition-colors duration-200 rounded-full p-1 hover:bg-white/5"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
};
