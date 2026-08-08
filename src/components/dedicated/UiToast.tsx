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
          setTimeout(onClose, 300);
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

interface UiConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function UiConfirmDialog({ message, onConfirm, onCancel }: UiConfirmDialogProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: visible ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0)',
        backdropFilter: visible ? 'blur(5px)' : 'blur(0px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        pointerEvents: 'auto',
        transition: 'background 0.2s ease, backdrop-filter 0.2s ease',
      }}
    >
      <div
        style={{
          width: '380px',
          background: 'var(--spm-bg-secondary)',
          border: '1px solid var(--spm-border)',
          borderRadius: 'var(--spm-radius)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7)',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: 'var(--spm-text-primary)',
          transform: visible ? 'scale(1)' : 'scale(0.95)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
        }}
      >
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 700 }}>
          Confirm Action
        </h3>
        <p style={{ margin: '0 0 24px 0', fontSize: '14px', lineHeight: 1.5, color: 'var(--spm-text-muted)' }}>
          {message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={() => {
              setVisible(false);
              setTimeout(onCancel, 200);
            }}
            style={{
              background: 'transparent',
              border: '1px solid var(--spm-border)',
              borderRadius: 'var(--spm-radius)',
              color: 'var(--spm-text-primary)',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--spm-bg-tertiary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setVisible(false);
              setTimeout(onConfirm, 200);
            }}
            style={{
              background: 'var(--spm-accent)',
              border: 'none',
              borderRadius: 'var(--spm-radius)',
              color: 'var(--spm-accent-fg)',
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--spm-accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--spm-accent)')}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export function UiToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

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

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 4500);
    };

    const handleShowConfirm = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; onConfirm: () => void }>;
      setConfirmDialog({
        message: customEvent.detail.message,
        onConfirm: customEvent.detail.onConfirm,
      });
    };

    window.addEventListener('spm-show-toast', handleShowToast);
    window.addEventListener('spm-show-confirm-dialog', handleShowConfirm);

    return () => {
      window.removeEventListener('spm-show-toast', handleShowToast);
      window.removeEventListener('spm-show-confirm-dialog', handleShowConfirm);
    };
  }, []);

  return (
    <>
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

      {confirmDialog && (
        <UiConfirmDialog
          message={confirmDialog.message}
          onConfirm={() => {
            confirmDialog.onConfirm();
            setConfirmDialog(null);
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </>
  );
}
