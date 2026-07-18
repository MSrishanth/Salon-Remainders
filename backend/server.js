import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import twilio from 'twilio';
import cron from 'node-cron';
import { DateTime } from 'luxon';
import rateLimit from 'express-rate-limit';
import notificationRoutes from './routes/notificationRoutes.js';
import { sendTransactionalEmail } from './services/emailService.js';
import { db } from './firebaseAdmin.js';

const app = express();

// Rate Limiters
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const strictLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 10,
  message: { error: 'You have reached the maximum allowed limit. Please try again later.' }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*'
}));
app.use(express.json());
app.use(globalLimiter);

// Routes
app.use('/api/notifications', notificationRoutes);

// Twilio Setup
const twilioClient = process.env.TWILIO_ACCOUNT_SID ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) : null;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

// Ping endpoint for keep-alive
app.get('/api/ping', (req, res) => {
  res.status(200).send('pong');
});

// Get all customers (Firebase)
app.get('/api/customers', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Firebase not initialized' });
  try {
    const customersSnapshot = await db.collection('customers').get();
    const customers = [];
    customersSnapshot.forEach(doc => customers.push({ id: doc.id, ...doc.data() }));
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create customer (Firebase)
app.post('/api/customers', strictLimiter, async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Firebase not initialized' });
  try {
    const { name, phone, email } = req.body;
    const customersRef = db.collection('customers');
    
    if (phone) {
      const snapshot = await customersRef.where('phone', '==', phone).get();
      if (!snapshot.empty) {
        const existing = snapshot.docs[0];
        return res.json({ id: existing.id, ...existing.data() });
      }
    }
    
    const newCust = await customersRef.add({ name, phone, email, createdAt: new Date().toISOString() });
    res.json({ id: newCust.id, name, phone, email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get bookings for today (Firebase)
app.get('/api/bookings/today', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Firebase not initialized' });
  try {
    const todayStr = DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');
    const bookingsSnapshot = await db.collection('bookings').where('date', '==', todayStr).get();
    const bookings = [];
    bookingsSnapshot.forEach(doc => bookings.push({ id: doc.id, ...doc.data() }));
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all bookings (Firebase)
app.get('/api/bookings', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Firebase not initialized' });
  try {
    const bookingsSnapshot = await db.collection('bookings').get();
    const bookings = [];
    bookingsSnapshot.forEach(doc => bookings.push({ id: doc.id, ...doc.data() }));
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create booking API (fallback if frontend uses it instead of Firebase direct)
app.post('/api/bookings', strictLimiter, async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Firebase not initialized' });
  try {
    const { customerId, service, price, appointmentDate } = req.body;
    
    let dateStr = '', timeStr = '';
    if (appointmentDate) {
      const dt = DateTime.fromJSDate(new Date(appointmentDate)).setZone('Asia/Kolkata');
      dateStr = dt.toFormat('yyyy-MM-dd');
      timeStr = dt.toFormat('h:mm a');
    }
    
    const newBooking = {
      customerId,
      service,
      price: price || 0,
      date: dateStr,
      time: timeStr,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    
    const docRef = await db.collection('bookings').add(newBooking);
    res.json({ id: docRef.id, ...newBooking });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- CRON JOBS FOR AUTOMATED REMINDERS USING FIREBASE ---
// Extracted to an API endpoint to prevent serverless sleep issues
app.get('/api/cron', async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }
  try {
    const now = DateTime.now().setZone('Asia/Kolkata');
    
    const bookingsSnapshot = await db.collection('bookings').where('status', '==', 'PENDING').get();
    const remindersSnapshot = await db.collection('reminders').where('status', '==', 'PENDING').get();
    
    const allPending = [];
    bookingsSnapshot.forEach(doc => allPending.push({ type: 'bookings', id: doc.id, ...doc.data() }));
    remindersSnapshot.forEach(doc => allPending.push({ type: 'reminders', id: doc.id, ...doc.data() }));
    
    // Pre-fetch all customers to avoid N+1 queries
    const customersMap = {};
    const custSnapshot = await db.collection('customers').get();
    custSnapshot.forEach(doc => { customersMap[doc.id] = doc.data(); });
    
    for (const item of allPending) {
      const dateStr = item.date || item.remindDate;
      const timeStr = item.time || item.remindTime;
      if (!dateStr || !timeStr) continue;
      
      const fullTimeStr = `${dateStr} ${timeStr}`;
      let appointmentDate;
      try {
        // Try parsing 24-hour format (e.g. 16:30)
        appointmentDate = DateTime.fromFormat(fullTimeStr, 'yyyy-MM-dd HH:mm', { zone: 'Asia/Kolkata' });
        // If it fails, try parsing 12-hour AM/PM format (e.g. 4:30 PM)
        if (!appointmentDate.isValid) {
          appointmentDate = DateTime.fromFormat(fullTimeStr, 'yyyy-MM-dd h:mm a', { zone: 'Asia/Kolkata' });
        }
      } catch(e) { continue; }
      
      if (!appointmentDate.isValid) continue;
      
      const diffMinutes = appointmentDate.diff(now, 'minutes').minutes;
      
      const customer = customersMap[item.customerId] || { name: item.customerName, email: item.customerEmail, phone: item.customerPhone };
      
      // 1 Day Reminder (between 12 and 24 hours)
      if (diffMinutes > 720 && diffMinutes <= 1440 && !item.reminded1Day) {
        await sendCronEmail(item, customer, '1 Day', dateStr, timeStr);
        await db.collection(item.type).doc(item.id).update({ reminded1Day: true });
      }
      
      // 1 Hour Reminder (between 15 and 60 minutes) - Gap Fixed
      if (diffMinutes > 15 && diffMinutes <= 60 && !item.reminded1Hour) {
        await sendCronEmail(item, customer, '1 Hour', dateStr, timeStr);
        await db.collection(item.type).doc(item.id).update({ reminded1Hour: true });
      }
      
      // 15 Min Reminder (between 0 and 15 minutes)
      if (diffMinutes > 0 && diffMinutes <= 15 && !item.reminded15Min) {
        await sendCronEmail(item, customer, '15 Minutes', dateStr, timeStr);
        await db.collection(item.type).doc(item.id).update({ reminded15Min: true });
      }
    }
    
    res.status(200).json({ success: true, message: 'Reminders processed successfully' });
  } catch (error) {
    console.error('Error running Firebase automated reminders:', error);
    res.status(500).json({ error: error.message });
  }
});

async function sendCronEmail(item, customer, countdown, dateStr, timeStr) {
  if (!customer.name) return;
  
  let formattedDate = DateTime.fromFormat(dateStr, 'yyyy-MM-dd').toFormat('dd/MM/yy');
  const service = item.service || 'Service';
  
  let message = '';
  let subject = '';
  
  if (countdown === '1 Day') {
    message = `Hello ${customer.name}, this is a service reminder from Shobana Hair Salon. Your appointment for ${service} is tomorrow, ${formattedDate} at ${timeStr}. We look forward to seeing you!`;
    subject = `Service Reminder: Your Appointment Tomorrow - Shobana Hair Salon`;
  } else if (countdown === '1 Hour') {
    message = `Hello ${customer.name}, this is a service reminder from Shobana Hair Salon. Your appointment for ${service} is in 1 hour at ${timeStr}. See you soon!`;
    subject = `Service Reminder: 1 Hour to your Appointment - Shobana Hair Salon`;
  } else {
    message = `Hello ${customer.name}, your appointment at Shobana Hair Salon is in 15 minutes! We are getting ready for you.`;
    subject = `Service Reminder: 15 Minutes Left! - Shobana Hair Salon`;
  }

  if (customer.phone) {
    await sendWhatsApp(customer.phone, message);
  }

  if (customer.email) {
    const htmlBody = generateReminderTemplate(customer.name, service, `${formattedDate} at ${timeStr}`, countdown);
    sendTransactionalEmail(customer.email, subject, message, htmlBody).catch(err => console.error('Reminder Email Error:', err));
  }
}

function generateReminderTemplate(name, service, time, countdown) {
  let themeColor = '#000000';
  let badgeText = 'RESERVATION';
  let subText = 'Premium Grooming Experience';
  let icon = '✂️';

  if (countdown === '1 Day') {
    themeColor = '#1a1a1a';
    badgeText = 'SEE YOU TOMORROW';
    icon = '🗓️';
  } else if (countdown === '1 Hour') {
    themeColor = '#2c3e50';
    badgeText = 'GET READY';
    icon = '⌛';
  } else if (countdown === '15 Minutes') {
    themeColor = '#c0392b';
    badgeText = 'FINAL CALL';
    subText = 'We are waiting for you!';
    icon = '🚀';
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; line-height: 1.6; margin: 0; padding: 0; }
        .wrapper { background-color: #f4f4f4; padding: 40px 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
        .header { background-color: ${themeColor}; color: #ffffff; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; letter-spacing: 4px; font-weight: 800; text-transform: uppercase; }
        .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 5px 15px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-bottom: 15px; letter-spacing: 1px; }
        .content { padding: 45px 40px; }
        .greeting { font-size: 22px; font-weight: 700; margin-bottom: 20px; color: #000; }
        .appointment-box { background-color: #fcfcfc; padding: 30px; border-radius: 12px; margin: 30px 0; border: 2px dashed #eee; position: relative; }
        .info-row { margin-bottom: 15px; }
        .info-label { font-size: 11px; color: #888; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 4px; }
        .info-value { font-size: 18px; font-weight: 600; color: #000; }
        .cta-btn { display: block; text-align: center; background-color: ${themeColor}; color: #ffffff !important; padding: 18px; text-decoration: none; border-radius: 8px; font-weight: 700; margin-top: 35px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .footer { background-color: #f9f9f9; padding: 30px; text-align: center; font-size: 13px; color: #999; border-top: 1px solid #eee; }
        .urgent-note { color: #c0392b; font-weight: 600; font-size: 14px; margin-top: 20px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <div class="badge">${badgeText}</div>
            <h1>${icon} SHOBANA HAIR SALON</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.8; font-weight: 400;">${subText}</p>
          </div>
          <div class="content">
            <div class="greeting">Hi ${name},</div>
            <p style="font-size: 16px; color: #555;">This is a friendly service reminder. Your appointment is scheduled for <strong>${countdown}</strong> from now.</p>
            
            <div class="appointment-box">
              <div class="info-row">
                <span class="info-label">Reserved Service</span>
                <span class="info-value">${service}</span>
              </div>
              <div class="info-row" style="margin-bottom:0">
                <span class="info-label">Scheduled Time</span>
                <span class="info-value">${time}</span>
              </div>
            </div>

            ${countdown === '15 Minutes' ? '<div class="urgent-note">Please head over to the salon now to ensure your spot!</div>' : '<p style="color: #666; font-size: 14px;">Please arrive 10 minutes before your scheduled time for the best experience.</p>'}
            
            <a href="https://www.google.com/maps/search/?api=1&query=Shobana+Hair+Salon" class="cta-btn">GET DIRECTIONS →</a>
          </div>
          <div class="footer">
            <p style="margin: 0; font-weight: 600;">Shobana Hair Salon, India</p>
            <p style="margin: 5px 0;">Open: 8AM – 10PM (Tuesday Closed)</p>
            <p style="margin: 15px 0 0 0; font-size: 11px; opacity: 0.6;">&copy; 2026 Shobana Hair Salon. Transactional Reminder.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function sendWhatsApp(toPhone, message) {
  if (!twilioClient) return;
  try {
    const formattedPhone = toPhone.startsWith('+') ? toPhone : `+91${toPhone}`;
    await twilioClient.messages.create({
      body: message,
      from: `whatsapp:${twilioNumber}`,
      to: `whatsapp:${formattedPhone}`
    });
    console.log(`Sent WhatsApp to ${formattedPhone}`);
  } catch (error) {
    console.error(`Failed to send WhatsApp to ${toPhone}:`, error.message);
  }
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[SERVER] Node.js & Express server running cleanly on port ${PORT}`);
});
