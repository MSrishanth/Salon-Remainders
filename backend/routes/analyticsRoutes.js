import express from 'express';
import { trackEvents } from '../controllers/analyticsController.js';

const router = express.Router();

router.post('/track', trackEvents);

export default router;
