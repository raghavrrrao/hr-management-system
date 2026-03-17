import { useSocket } from '../context/SocketContext';

const TOAST_STYLES = {
    success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', color: '#059669', icon: '✅' },
    error: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', color: '#dc2626', icon: '❌' },
    warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', color: '#d97706', icon: '⚠️' },
    info: { bg: 'rgba(46,125,247,0.12)', border: 'rgba(46,125,247,0.35)', color: '#2e7df7', icon: '💬' },
};

const ToastItem = ({ toast, onDismiss }) => {
    const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;

    return (
        <div
            onClick={() => onDismiss(toast.id)}
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                padding: '0.875rem 1rem',
                background: style.bg,
                border: `1px solid ${style.border}`,
                borderRadius: '12px',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                maxWidth: '360px',
                width: '100%',
                animation: 'toastSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                userSelect: 'none',
            }}
        >
            <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '1px' }}>{style.icon}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: style.color, lineHeight: 1.4, flex: 1 }}>
                {toast.message}
            </span>
            <span style={{ fontSize: '0.75rem', color: style.color, opacity: 0.6, flexShrink: 0, marginTop: '2px' }}>✕</span>
        </div>
    );
};

/**
 * ToastContainer — renders all active toasts.
 * Place once in App.jsx, outside all routes.
 */
const ToastContainer = () => {
    const { toasts, dismissToast } = useSocket();

    if (!toasts?.length) return null;

    return (
        <>
            <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(40px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
            <div style={{
                position: 'fixed',
                top: '1.25rem',
                right: '1.25rem',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
                pointerEvents: 'none',
            }}>
                {toasts.map((toast) => (
                    <div key={toast.id} style={{ pointerEvents: 'auto' }}>
                        <ToastItem toast={toast} onDismiss={dismissToast} />
                    </div>
                ))}
            </div>
        </>
    );
};

export default ToastContainer;