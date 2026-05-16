// socket/socketManager.js
// Helper functions to emit events from controllers

/**
 * Emit an event to a specific user's private room.
 * @param {object} req - Express request object (used to access io)
 * @param {string} userId - Target user's MongoDB _id (string)
 * @param {string} event - Event name
 * @param {object} payload - Data to send
 */
const emitToUser = (req, userId, event, payload) => {
    const io = req.app.locals.io;
    if (!io || !userId) return;
    io.to(`user:${userId}`).emit(event, payload);
};

/**
 * Emit an event to all connected admins.
 * @param {object} req - Express request object
 * @param {string} event - Event name
 * @param {object} payload - Data to send
 */
const emitToAdmins = (req, event, payload) => {
    const io = req.app.locals.io;
    if (!io) return;
    io.to('admins').emit(event, payload);
};

/**
 * Emit an event to every connected socket.
 * @param {object} req - Express request object
 * @param {string} event - Event name
 * @param {object} payload - Data to send
 */
const emitToAll = (req, event, payload) => {
    const io = req.app.locals.io;
    if (!io) return;
    io.emit(event, payload);
};

module.exports = { emitToUser, emitToAdmins, emitToAll };