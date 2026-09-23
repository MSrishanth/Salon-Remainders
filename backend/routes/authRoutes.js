import express from 'express';
import { loginUser, logoutUser, getSession } from '../controllers/authController.js';
import { verifyAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/session', verifyAuth, getSession);

export default router;
