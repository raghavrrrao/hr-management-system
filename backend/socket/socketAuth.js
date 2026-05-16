// socket/socketAuth.js
const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate Socket.IO connections using JWT token.
 * The client must provide the token in the `auth` object during connection.
 */
const authenticateSocket = (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error: No token provided'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded; // attach user info to socket
        next();
    } catch (err) {
        next(new Error('Authentication error: Invalid token'));
    }
};

module.exports = { authenticateSocket };