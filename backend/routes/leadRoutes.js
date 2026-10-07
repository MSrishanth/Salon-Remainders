import express from 'express';
import { createLead, getLeads, disputeLead } from '../controllers/leadController.js';
import { verifyAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/', createLead);
router.get('/', verifyAuth, getLeads);
router.post('/:id/dispute', verifyAuth, disputeLead);

export default router;
