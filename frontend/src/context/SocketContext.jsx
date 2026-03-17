import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

// ── Event → human-readable toast message map ──────────────────────────────────
const EVENT_MESSAGES = {
    // Admin receives
    'leave:requested': (d) => `📋 ${d.employeeName} requested ${d.leaveType} leave`,
    'attendance:checkin': (d) => `✅ ${d.employeeName} checked in`,
    'attendance:checkout': (d) => `🏁 ${d.employeeName} checked out (${d.workingHours}h)`,

    // Employee receives
    'task:assigned': (d) => `📌 New task assigned: "${d.description}"`,
    'leave:approved': (d) => `✅ Your ${d.leaveType} leave was approved`,
    'leave:rejected': (d) => `❌ Your ${d.leaveType} leave was rejected`,
    'salary:paid': (d) => `💰 Your salary for ${d.month} has been paid`,
    'task:updated': (d) => `🔄 Task "${d.description}" was updated`,

    // Admin receives
    'burnout:alert': (d) => `🔥 ${d.employeeName} has reached High burnout risk (score: ${d.score})`,
};

export const SocketProvider = ({ children }) => {
    const socketRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [toasts, setToasts] = useState([]);

    // ── Toast helpers ───────────────────────────────────────────────────────────
    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, message, type }]);
        // Auto-dismiss after 4.5s
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4500);
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    // ── Connect / disconnect based on auth ────────────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!token || !user) return;

        const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

        const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            auth: { token },
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            // Register this socket to user's room + role room
            socket.emit('register', { userId: user._id || user.id, role: user.role });
        });

        socket.on('disconnect', () => setConnected(false));

        // ── Attach all event listeners ─────────────────────────────────────────
        Object.keys(EVENT_MESSAGES).forEach((event) => {
            socket.on(event, (data) => {
                const message = EVENT_MESSAGES[event](data);
                const type =
                    event.includes('rejected') ? 'error' :
                        event.includes('alert') ? 'warning' :
                            event.includes('approved') || event.includes('paid') || event.includes('checkin') ? 'success' :
                                'info';
                addToast(message, type);

                // Dispatch a custom DOM event so pages can react (e.g. re-fetch data)
                window.dispatchEvent(new CustomEvent('ws:update', { detail: { event, data } }));
            });
        });

        // ── Role change: update localStorage + force redirect ─────────────────
        // Fires when admin promotes or demotes this user
        socket.on('role:updated', (data) => {
            const stored = JSON.parse(localStorage.getItem('user') || 'null');
            if (stored) {
                stored.role = data.newRole;
                localStorage.setItem('user', JSON.stringify(stored));
            }
            // Show a toast then redirect to the correct dashboard after 2s
            addToast(
                data.newRole === 'admin'
                    ? `🎉 You've been promoted to Admin! Redirecting...`
                    : `ℹ️ Your role has been changed to Employee. Redirecting...`,
                data.newRole === 'admin' ? 'success' : 'info'
            );
            setTimeout(() => {
                window.location.href = data.newRole === 'admin' ? '/admin' : '/dashboard';
            }, 2000);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, []); // runs once on mount — user must be logged in by the time App mounts

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, connected, toasts, addToast, dismissToast }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);