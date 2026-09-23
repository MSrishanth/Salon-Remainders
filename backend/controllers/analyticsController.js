import { db } from '../firebaseAdmin.js';
import { DateTime } from 'luxon';
import crypto from 'crypto';

/**
 * Hash an IP address or user agent for privacy-conscious tracking
 */
const hashData = (data) => {
  return crypto.createHash('sha256').update(data || '').digest('hex').substring(0, 16);
};

export const trackEvents = async (req, res) => {
  const { events, websiteId, clientId } = req.body;
  
  if (!events || !Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid events array' });
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const ipHash = hashData(ip);
  const userAgentHash = hashData(userAgent);
  
  // Use a batch write for raw events
  const batch = db.batch();
  const rawEventsRef = db.collection('analytics_events');
  
  // Prepare daily aggregation updates
  const today = DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');
  const dailyRef = db.collection('analytics_daily').doc(`${websiteId}_${today}`);
  
  // We don't want to read before write for the daily aggregation if possible, 
  // but Firestore requires incrementing specific fields.
  const increments = {};
  
  const expireAt = new Date();
  expireAt.setDate(expireAt.getDate() + 30); // 30 days retention for raw events

  events.forEach((event) => {
    // 1. Queue raw event
    const newEventRef = rawEventsRef.doc();
    batch.set(newEventRef, {
      ...event,
      websiteId,
      clientId,
      ipHash,
      userAgentHash,
      serverTimestamp: new Date().toISOString(),
      expireAt: expireAt.toISOString()
    });

    // 2. Count for aggregation
    const type = event.eventType;
    if (type) {
      const fieldName = type.toLowerCase();
      increments[fieldName] = (increments[fieldName] || 0) + 1;
    }
  });

  try {
    // Execute batch for raw events
    await batch.commit();

    // Fire-and-forget the aggregation update
    const dbAdmin = await import('firebase-admin/firestore');
    const FieldValue = dbAdmin.FieldValue;
    
    const updatePayload = {
      date: today,
      websiteId,
      clientId,
      updatedAt: new Date().toISOString()
    };
    
    // Convert counts to FieldValue.increment
    for (const [key, value] of Object.entries(increments)) {
      updatePayload[key] = FieldValue.increment(value);
    }
    
    // Set with merge: true creates the document if it doesn't exist
    dailyRef.set(updatePayload, { merge: true }).catch(err => {
      console.error('Error updating daily analytics:', err);
    });

    res.status(202).json({ success: true, message: 'Events tracked successfully' });
  } catch (error) {
    console.error('Error tracking events:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
