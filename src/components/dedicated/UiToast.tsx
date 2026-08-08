import { useState, useEffect } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
}

interface UiToastProps {
  message: string;
  type?: 'info' | 'warning' | 'success' | 'error';
  onClose: () => void;
}

export function UiToast({ message, type = 'info', onClose }: UiToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-in animation after mount
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return { borderLeft: '4px solid #10b981', color: '#34d399' };
      case 'warning':
        return { borderLeft: '4px solid #f59e0b', color: '#fbbf24' };
      case 'error':
        return { borderLeft: '4px solid #ef4444', color: '#f87171' };
      default:
        return { borderLeft: '4px solid var(--spm-accent)', color: 'var(--spm-text-primary)' };
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '320px',
        padding: '14px 16px',
        background: 'rgba(20, 20, 20, 0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--spm-border)',
        borderRadius: 'var(--spm-radius)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
        transform: visible ? 'translateX(0)' : 'translateX(120%)',
        opacity: visible ? 1 : 0,
        pointerEvents: 'auto',
        gap: '12px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        ...getTypeStyles(),
      }}
    >
      <span style={{ fontSize: '13px', lineHeight: 1.5, wordBreak: 'break-word', fontWeight: 500 }}>
        {message}
      </span>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(onClose, 300); // Wait for transition out
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--spm-text-muted)',
          fontSize: '16px',
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--spm-text-primary)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--spm-text-muted)')}
      >
        ×
      </button>
    </div>
  );
}

export function UiToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleShowToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type?: ToastMessage['type'] }>;
      const { message, type = 'info' } = customEvent.detail;
      
      const newToast: ToastMessage = {
        id: Math.random().toString(36).substring(2, 9),
        message,
        type,
      };

      setToasts((prev) => [...prev, newToast]);

      // Auto-remove toast after 4.5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 4500);
    };

    window.addEventListener('spm-show-toast', handleShowToast);
    return () => {
      window.removeEventListener('spm-show-toast', handleShowToast);
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <UiToast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
        />
      ))}
    </div>
  );
}
