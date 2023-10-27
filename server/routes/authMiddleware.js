const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    if (req.path == '/api/login') {
        return next();
    }

    const authHeader = req.headers['Authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        var decoded = jwt.verify(token, process.env.JWTSECRET_KEY);
        console.log("decoded", decoded);
    } catch (err) {
        return res.status(401).json({ message: err.message });
    }
}