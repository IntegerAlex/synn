'use client';

import { useEffect, useState } from 'react';
import { Toast } from './Toast';
import { useToastStore } from '@/hooks/useToast';

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);
  const [visible, setVisible] = useState(toasts);

  // Animate when toasts change
  useEffect(() => {
    setVisible(toasts);
  }, [toasts]);

  if (visible.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] flex flex-col gap-2 w-full max-w-md px-4">
      {visible.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
        </div>
      ))}
    </div>
  );
}
