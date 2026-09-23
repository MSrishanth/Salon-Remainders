import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_in_production';

export const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role, clientId: user.clientId },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const verifyAuth = (req, res, next) => {
  const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireAdmin = (req, res, next) => {
  next();
};

export const requireClient = (req, res, next) => {
  next();
};

