import { db } from '../firebaseAdmin.js';
import bcrypt from 'bcrypt';
import { generateToken } from '../middleware/auth.js';

export const loginUser = async (req, res) => {
  const username = req.body.username || req.body.identifier;
  const password = req.body.password;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('username', '==', username).limit(1).get();

    if (snapshot.empty) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userDoc = snapshot.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() };

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        clientId: user.clientId
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logoutUser = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
};

export const getSession = (req, res) => {
  // If this route is protected by verifyAuth, req.user will be set
  if (req.user) {
    res.json({
      user: {
        id: req.user.id,
        role: req.user.role,
        clientId: req.user.clientId
      }
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
};
