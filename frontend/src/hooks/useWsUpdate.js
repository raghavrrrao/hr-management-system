import { useEffect } from 'react';

/**
 * useWsUpdate
 * 
 * Calls `callback` whenever a WebSocket event matching one of `events` fires.
 * Components use this to auto-refresh their data without a page reload.
 * 
 * @param {string|string[]} events  - Event name(s) to listen for
 * @param {function}        callback - Usually your fetchData() function
 * 
 * @example
 * useWsUpdate(['leave:requested', 'leave:approved'], fetchData);
 * useWsUpdate('task:assigned', fetchTasks);
 */
const useWsUpdate = (events, callback) => {
    useEffect(() => {
        const eventList = Array.isArray(events) ? events : [events];

        const handler = (e) => {
            if (eventList.includes(e.detail?.event)) {
                callback(e.detail?.data);
            }
        };

        window.addEventListener('ws:update', handler);
        return () => window.removeEventListener('ws:update', handler);
    }, [events, callback]);
};

export default useWsUpdate;