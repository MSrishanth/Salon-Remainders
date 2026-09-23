import express from 'express';
import { createLead, getLeads } from '../controllers/leadController.js';
import { verifyAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/', createLead);
router.get('/', verifyAuth, getLeads);

export default router;
