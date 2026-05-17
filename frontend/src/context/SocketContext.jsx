import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

// Toast messages (no emojis, clean text)
const EVENT_MESSAGES = {
    'leave:requested': (d) => `${d.employeeName} requested ${d.leaveType} leave`,
    'attendance:checkin': (d) => `${d.employeeName} checked in`,
    'attendance:checkout': (d) => `${d.employeeName} checked out (${d.workingHours}h)`,
    'task:assigned': (d) => `New task: "${d.title || d.description}"`,
    'leave:approved': (d) => `Your ${d.leaveType} leave was approved`,
    'leave:rejected': (d) => `Your ${d.leaveType} leave was rejected`,
    'salary:paid': (d) => `Your salary for ${d.month} has been paid`,
    'task:updated': (d) => `Task "${d.title || d.description}" updated`,
    'task:status-updated': (d) => `Task status changed to ${d.status}`,
    'burnout:alert': (d) => `${d.employeeName} has High burnout risk (score: ${d.score})`,
};

export const SocketProvider = ({ children }) => {
    const socketRef = useRef(null);
    const mountedRef = useRef(false);   // guards against StrictMode double‑mount (temporary)
    const [connected, setConnected] = useState(false);
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    useEffect(() => {
        // Prevent double‑connect from React StrictMode or fast refresh
        if (mountedRef.current) return;
        mountedRef.current = true;

        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!token || !user) return;

        // Already connected — just re‑register rooms
        if (socketRef.current?.connected) {
            socketRef.current.emit('register', { userId: user._id || user.id, role: user.role });
            return;
        }

        const SOCKET_URL =
            import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';

        const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            auth: { token },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        socketRef.current = socket;

        // Remove any stale listeners before attaching fresh ones
        socket.offAny();
        socket.off('connect');
        socket.off('disconnect');
        socket.off('reconnect');
        Object.keys(EVENT_MESSAGES).forEach((ev) => socket.off(ev));
        socket.off('role:updated');

        socket.on('connect', () => {
            setConnected(true);
            const freshUser = JSON.parse(localStorage.getItem('user') || 'null');
            if (freshUser) {
                socket.emit('register', { userId: freshUser._id || freshUser.id, role: freshUser.role });
            }
        });

        socket.on('disconnect', () => setConnected(false));

        socket.on('reconnect', () => {
            const freshUser = JSON.parse(localStorage.getItem('user') || 'null');
            if (freshUser) {
                socket.emit('register', { userId: freshUser._id || freshUser.id, role: freshUser.role });
            }
        });

        Object.keys(EVENT_MESSAGES).forEach((event) => {
            socket.on(event, (data) => {
                const message = EVENT_MESSAGES[event](data);
                const type =
                    event.includes('rejected') ? 'error' :
                        event.includes('alert') ? 'warning' :
                            event.includes('approved') || event.includes('paid') ||
                                event.includes('checkin') ? 'success' :
                                'info';
                addToast(message, type);
                window.dispatchEvent(new CustomEvent('ws:update', { detail: { event, data } }));
            });
        });

        socket.on('role:updated', (data) => {
            const stored = JSON.parse(localStorage.getItem('user') || 'null');
            if (stored) {
                stored.role = data.newRole;
                localStorage.setItem('user', JSON.stringify(stored));
            }
            addToast(
                data.newRole === 'admin'
                    ? 'You have been promoted to Admin! Redirecting...'
                    : 'Your role has been changed to Employee. Redirecting...',
                data.newRole === 'admin' ? 'success' : 'info'
            );
            setTimeout(() => {
                window.location.href = data.newRole === 'admin' ? '/admin' : '/dashboard';
            }, 2000);
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            mountedRef.current = false;
        };
    }, [addToast]);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, connected, toasts, addToast, dismissToast }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);