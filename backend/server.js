import 'dotenv/config'; // Absolute line 1 initialization
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import twilio from 'twilio';
import cron from 'node-cron';
import { DateTime } from 'luxon';
import rateLimit from 'express-rate-limit';
import notificationRoutes from './routes/notificationRoutes.js';
import { sendTransactionalEmail } from './services/emailService.js';

const app = express();
const prisma = new PrismaClient();

// Rate Limiters
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window`
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const strictLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // Limit each IP to 3 account/booking creation requests per `window`
  message: { error: 'You have reached the maximum allowed limit of 3 requests per 24 hours. Please try again later.' }
});

// Middleware
app.use(cors());
app.use(express.json()); // Mount express.json() to parse payloads
app.use(globalLimiter); // Apply global rate limit to all requests

// Routes
app.use('/api/notifications', notificationRoutes);

// Twilio Setup (Optional/Existing)
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

// Get all customers
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      include: { bookings: true }
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create customer
app.post('/api/customers', strictLimiter, async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    
    // Enforce unique phone or email
    const conditions = [];
    if (phone) conditions.push({ phone });
    if (email) conditions.push({ email });
    
    if (conditions.length > 0) {
      const existingCustomer = await prisma.customer.findFirst({
        where: { OR: conditions }
      });
      if (existingCustomer) {
        // Since frontend might be relying on get-or-create if it's the exact same phone, 
        // we can return it if it matches exactly, but we must block different users sharing email/phone.
        // Actually, the requirement says "make sure multiple accounts should not been made through same email or phone number".
        // Returning the existing one fulfills this, but if the user wants an error, we should return an error if details don't match, or just return the existing customer.
        // Let's return the existing one so it doesn't break the frontend's booking modal which uses this as a get-or-create endpoint.
        return res.json(existingCustomer);
      }
    }
    
    const customer = await prisma.customer.create({ data: { name, phone, email } });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get bookings for the day
app.get('/api/bookings/today', async (req, res) => {
  try {
    const startOfDay = DateTime.now().startOf('day').toJSDate();
    const endOfDay = DateTime.now().endOf('day').toJSDate();

    const bookings = await prisma.booking.findMany({
      where: {
        appointmentDate: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: { customer: true },
      orderBy: { appointmentDate: 'asc' }
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all bookings history
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: { customer: true },
      orderBy: { appointmentDate: 'desc' }
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a booking
app.post('/api/bookings', strictLimiter, async (req, res) => {
  try {
    const { customerId, service, price, appointmentDate } = req.body;
    const date = new Date(appointmentDate);

    const booking = await prisma.booking.create({
      data: {
        customerId,
        service,
        price,
        appointmentDate: date,
      },
      include: { customer: true }
    });

    res.json(booking);

    // Asynchronously send confirmation email if customer has email
    if (booking.customer && booking.customer.email) {
      const subject = `Booking Confirmation & Receipt - Shobana Hair Salon`;
      const formattedDate = DateTime.fromJSDate(date).toFormat('dd/MM/yy h:mm a');
      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
          <div style="background-color: #000; color: #fff; padding: 30px; text-align: center;">
            <h1 style="margin: 0;">SHOBANA HAIR SALON</h1>
          </div>
          <div style="padding: 40px; color: #333;">
            <h1 style="margin-top:0; font-size: 32px; font-weight: 900; text-transform: uppercase; color: #000;">BOOKING CONFIRMATION</h1>
            
            <div style="margin-bottom: 25px;">
              <p style="font-size: 20px; margin: 15px 0; color: #000;">
                <strong style="text-transform: uppercase;">Service:</strong> ${service}
              </p>
              <p style="font-size: 20px; margin: 15px 0; color: #000;">
                <strong style="text-transform: uppercase;">Date & Time:</strong> ${formattedDate}
              </p>
              <p style="font-size: 20px; margin: 15px 0; color: #000;">
                <strong style="text-transform: uppercase;">Booking ID:</strong> #SHB-${Math.floor(Math.random() * 90000) + 10000}
              </p>
            </div>
            
            <div style="border-top: 4px solid #000; padding-top: 20px; margin-top: 20px; margin-bottom: 30px;">
              <h2 style="margin: 0; font-size: 30px; font-weight: 900; color: #000;">Total Amount to Pay ₹${price}</h2>
            </div>
            <div style="text-align: center;">
              <a href="https://www.google.com/maps/search/?api=1&query=Shobana+Hair+Salon" style="display: inline-block; padding: 14px 28px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">Get Directions</a>
            </div>
          </div>
        </div>
      `;
      const textBody = `Hi ${booking.customer.name}, your appointment for ${service} on ${formattedDate} is confirmed. Total Amount to Pay: ₹${price}.`;

      sendTransactionalEmail(booking.customer.email, subject, textBody, htmlBody)
        .catch(err => console.error('Background Email Error:', err));
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- CRON JOBS FOR AUTOMATED REMINDERS ---
cron.schedule('* * * * *', async () => {
  try {
    const now = DateTime.now();

    // 1. ONE DAY REMINDER (24 Hours Before)
    const bookings1Day = await prisma.booking.findMany({
      where: {
        reminded1Day: false,
        status: 'PENDING',
        appointmentDate: {
          gte: now.plus({ hours: 12 }).toJSDate(),
          lte: now.plus({ hours: 24 }).toJSDate()
        }
      },
      include: { customer: true }
    });

    for (const booking of bookings1Day) {
      const formattedDate = DateTime.fromJSDate(booking.appointmentDate).toFormat('dd/MM/yy');
      const formattedTime = DateTime.fromJSDate(booking.appointmentDate).toFormat('h:mm a');
      const message = `Hello ${booking.customer.name}, this is a service reminder from Shobana Hair Salon. Your appointment for ${booking.service} is tomorrow, ${formattedDate} at ${formattedTime}. We look forward to seeing you!`;

      // WhatsApp Reminder
      await sendWhatsApp(booking.customer.phone, message);

      // Email Reminder
      if (booking.customer.email) {
        const subject = `Service Reminder: Your Appointment Tomorrow - Shobana Hair Salon`;
        const htmlBody = generateReminderTemplate(booking.customer.name, booking.service, `${formattedDate} at ${formattedTime}`, '1 Day');
        sendTransactionalEmail(booking.customer.email, subject, message, htmlBody)
          .catch(err => console.error('1-Day Reminder Email Error:', err));
      }

      await prisma.booking.update({
        where: { id: booking.id },
        data: { reminded1Day: true }
      });
    }

    // 2. ONE HOUR REMINDER
    const bookings1Hour = await prisma.booking.findMany({
      where: {
        reminded1Hour: false,
        status: 'PENDING',
        appointmentDate: {
          gte: now.plus({ minutes: 20 }).toJSDate(),
          lte: now.plus({ hours: 1 }).toJSDate()
        }
      },
      include: { customer: true }
    });

    for (const booking of bookings1Hour) {
      const formattedTime = DateTime.fromJSDate(booking.appointmentDate).toFormat('h:mm a');
      const message = `Hello ${booking.customer.name}, this is a service reminder from Shobana Hair Salon. Your appointment for ${booking.service} is in 1 hour at ${formattedTime}. See you soon!`;

      // WhatsApp Reminder
      await sendWhatsApp(booking.customer.phone, message);

      // Email Reminder
      if (booking.customer.email) {
        const subject = `Service Reminder: 1 Hour to your Appointment - Shobana Hair Salon`;
        const htmlBody = generateReminderTemplate(booking.customer.name, booking.service, formattedTime, '1 Hour');
        sendTransactionalEmail(booking.customer.email, subject, message, htmlBody)
          .catch(err => console.error('1-Hour Reminder Email Error:', err));
      }

      await prisma.booking.update({
        where: { id: booking.id },
        data: { reminded1Hour: true }
      });
    }

    // 3. 15 MINUTE REMINDER
    const bookings15Min = await prisma.booking.findMany({
      where: {
        reminded15Min: false,
        status: 'PENDING',
        appointmentDate: {
          gte: now.toJSDate(),
          lte: now.plus({ minutes: 15 }).toJSDate()
        }
      },
      include: { customer: true }
    });

    for (const booking of bookings15Min) {
      const formattedTime = DateTime.fromJSDate(booking.appointmentDate).toFormat('h:mm a');
      const message = `Hello ${booking.customer.name}, your appointment at Shobana Hair Salon is in 15 minutes! We are getting ready for you.`;

      // WhatsApp Reminder
      await sendWhatsApp(booking.customer.phone, message);

      // Email Reminder
      if (booking.customer.email) {
        const subject = `Service Reminder: 15 Minutes Left! - Shobana Hair Salon`;
        const htmlBody = generateReminderTemplate(booking.customer.name, booking.service, formattedTime, '15 Minutes');
        sendTransactionalEmail(booking.customer.email, subject, message, htmlBody)
          .catch(err => console.error('15-Min Reminder Email Error:', err));
      }

      await prisma.booking.update({
        where: { id: booking.id },
        data: { reminded15Min: true }
      });
    }
  } catch (error) {
    console.error('Error running automated reminders:', error);
  }
});

// --- CRON JOB FOR MONTHLY DATA CLEANUP ---
// Runs every day at midnight to clean old data
cron.schedule('0 0 * * *', async () => {
  try {
    const today = DateTime.now();
    const startOfCurrentMonth = today.startOf('month').toJSDate();

    // Delete any booking/reminder scheduled before the 1st of the current month
    const deleted = await prisma.booking.deleteMany({
      where: {
        appointmentDate: {
          lt: startOfCurrentMonth
        }
      }
    });

    if (deleted.count > 0) {
      console.log(`[CLEANUP] Deleted ${deleted.count} old bookings/reminders from Prisma SQLite database to save storage.`);
    }
  } catch (error) {
    console.error('Error running data cleanup cron job:', error);
  }
});

/**
 * Helper function to generate professional reminder HTML
 * Customized for different countdown intervals
 */
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
    themeColor = '#c0392b'; // More urgent red
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
  console.log(`[INFO] GMAIL_USER: ${process.env.GMAIL_USER ? 'Configured' : 'MISSING'}`);
});
