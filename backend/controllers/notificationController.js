import { sendTransactionalEmail } from '../services/emailService.js';
import { DateTime } from 'luxon';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Controller to handle notification events
 */

export const handleAppointmentSuccess = async (req, res) => {
  const { customerEmail, customerName, serviceName, appointmentDate, price, customerPhone } = req.body;

  // 1. Respond to the client immediately
  res.status(202).json({
    message: 'Success: Appointment confirmed. Invoice is being generated and sent.',
    status: 'processing'
  });

  // 2. Process data and save to DB for future reminders
  try {
    // Parse date for Prisma (Input: 2026-05-16 8:30 AM)
    let jsDate = new Date();
    try {
      jsDate = DateTime.fromFormat(appointmentDate, 'yyyy-MM-dd h:mm a', { zone: 'Asia/Kolkata' }).toJSDate();
    } catch (e) {
      console.error('Prisma Date Parsing Error:', e);
    }

    // Upsert Customer
    const customer = await prisma.customer.upsert({
      where: { phone: customerPhone },
      update: { name: customerName, email: customerEmail },
      create: { name: customerName, phone: customerPhone, email: customerEmail }
    });

    // Create Booking in SQLite via Prisma for CRON reminders
    await prisma.booking.create({
      data: {
        customerId: customer.id,
        service: serviceName,
        price: parseInt(price) || 0,
        appointmentDate: jsDate,
        status: 'PENDING'
      }
    });

    console.log(`[DB SUCCESS] Booking saved for ${customerName} for automated reminders.`);

    // 3. Generate and send professional HTML invoice
    const subject = `Booking Confirmation & Receipt - Shobana Hair Salon`;

    // Format date for display (dd/mm/yy)
    let formattedDateDisplay = DateTime.fromJSDate(jsDate).setZone('Asia/Kolkata').toFormat('dd/MM/yy h:mm a');

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 600px; margin: 20px auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
          .header { background-color: #000; color: #ffffff; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; letter-spacing: 3px; font-weight: bold; }
          .content { padding: 40px; }
          .invoice-box { background-color: #fcfcfc; padding: 25px; border-radius: 8px; margin: 25px 0; border: 1px solid #eee; }
          .invoice-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
          .invoice-label { font-weight: bold; color: #888; text-transform: uppercase; font-size: 11px; }
          .total { font-size: 22px; font-weight: bold; border-top: 2px solid #000; padding-top: 15px; margin-top: 15px; }
          .footer { background-color: #f9f9f9; padding: 30px; text-align: center; font-size: 13px; color: #999; }
          .btn { display: inline-block; padding: 14px 28px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; margin-top: 25px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SHOBANA HAIR SALON</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.7;">Premium Grooming Experience</p>
          </div>
          <div class="content">
            <h1 style="margin-top:0; font-size: 32px; font-weight: 900; text-transform: uppercase; color: #000;">BOOKING CONFIRMATION</h1>
            
            <div style="margin-bottom: 25px;">
              <p style="font-size: 20px; margin: 15px 0; color: #000;">
                <strong style="text-transform: uppercase;">Service:</strong> ${serviceName}
              </p>
              <p style="font-size: 20px; margin: 15px 0; color: #000;">
                <strong style="text-transform: uppercase;">Date & Time:</strong> ${formattedDateDisplay}
              </p>
              <p style="font-size: 20px; margin: 15px 0; color: #000;">
                <strong style="text-transform: uppercase;">Booking ID:</strong> #SHB-${Math.floor(Math.random() * 90000) + 10000}
              </p>
            </div>
            
            <div style="border-top: 4px solid #000; padding-top: 20px; margin-top: 20px; margin-bottom: 30px;">
              <h2 style="margin: 0; font-size: 30px; font-weight: 900; color: #000;">Total Amount to Pay ₹${price}</h2>
            </div>
            
            <div style="text-align: center;">
              <a href="https://maps.google.com/?q=Shobana+Hair+Salon" class="btn">GET DIRECTIONS</a>
            </div>
          </div>
          <div class="footer">
            <p style="margin: 0;"><strong>Location:</strong> Shobana Hair Salon, India</p>
            <p style="margin: 5px 0;"><strong>Hours:</strong> 8AM – 10PM (Tuesday Closed)</p>
            <p style="margin: 15px 0 0 0; font-size: 11px; opacity: 0.6;">&copy; 2026 Shobana Hair Salon. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `Hi ${customerName}, your appointment for ${serviceName} on ${formattedDateDisplay} is confirmed. Total Amount to Pay: ₹${price || '---'}. See you soon!`;

    // Dispatch email
    await sendTransactionalEmail(customerEmail, subject, textBody, htmlBody);

  } catch (error) {
    console.error('[CONTROLLER ERROR] handleAppointmentSuccess:', error);
  }
};

/**
 * Controller to handle manual reminder scheduling
 */
export const handleReminderScheduled = async (req, res) => {
  const { customerEmail, customerName, serviceName, remindDate, remindTime, customerPhone } = req.body;

  // 1. Respond to the client immediately
  res.status(202).json({
    message: 'Success: Service reminder scheduled. Confirmation email is being sent.',
    status: 'processing'
  });

  try {
    // Parse the reminder date and time (Input: 2026-05-16 8:30 AM)
    const fullRemindString = `${remindDate} ${remindTime}`;
    let jsDate = new Date();
    try {
      jsDate = DateTime.fromFormat(fullRemindString, 'yyyy-MM-dd h:mm a', { zone: 'Asia/Kolkata' }).toJSDate();
    } catch (e) {
      console.error('Reminder Date Parsing Error:', e);
    }

    // Upsert Customer to ensure they exist in Prisma
    const customer = await prisma.customer.upsert({
      where: { phone: customerPhone },
      update: { name: customerName, email: customerEmail },
      create: { name: customerName, phone: customerPhone, email: customerEmail }
    });

    // Create a dummy "Booking" for the reminder so the CRON job picks it up
    // We'll mark it as a "REMINDER" in the service name or just let the CRON job treat it as a booking
    await prisma.booking.create({
      data: {
        customerId: customer.id,
        service: `[REMINDER] ${serviceName}`,
        price: 0,
        appointmentDate: jsDate,
        status: 'PENDING'
      }
    });

    console.log(`[DB SUCCESS] Manual reminder saved for ${customerName} at ${fullRemindString}`);

    // 2. Generate and send Instant Reminder Confirmation Email
    const subject = `Confirmed: Service Reminder Scheduled - Shobana Hair Salon`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', -apple-system, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0; }
          .wrapper { background-color: #f4f4f4; padding: 40px 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
          .header { background-color: #1a1a1a; color: #fff; padding: 40px; text-align: center; }
          .content { padding: 45px 40px; }
          .info-box { background-color: #fcfcfc; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #eee; }
          .footer { background-color: #f9f9f9; padding: 30px; text-align: center; font-size: 13px; color: #999; }
          .btn { display: inline-block; padding: 14px 28px; background-color: #000; color: #fff !important; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1 style="margin:0; letter-spacing: 4px; font-size: 24px;">SHOBANA HAIR SALON</h1>
              <p style="opacity:0.8; margin-top:5px; font-size: 14px;">Service Reminder Confirmed</p>
            </div>
            <div class="content">
              <h2 style="margin-top:0;">Hi ${customerName},</h2>
              <p>We've successfully scheduled a service reminder for you. Our system will notify you as the date approaches.</p>
              
              <div class="info-box">
                <p style="margin:0 0 10px 0;"><strong>Service:</strong> ${serviceName}</p>
                <p style="margin:0 0 10px 0;"><strong>Reminder Date:</strong> ${DateTime.fromJSDate(jsDate).setZone('Asia/Kolkata').toFormat('dd/MM/yy')}</p>
                <p style="margin:0;"><strong>Time:</strong> ${remindTime}</p>
              </div>

              <p style="font-size: 14px; color: #666;">You will receive automated follow-up emails 1 day, 1 hour, and 15 minutes before this scheduled time.</p>
              
              <div style="text-align: center;">
                <a href="https://www.google.com/maps/search/?api=1&query=Shobana+Hair+Salon" class="btn">View Our Location</a>
              </div>
            </div>
            <div class="footer">
              <p>&copy; 2026 Shobana Hair Salon | India</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `Hi ${customerName}, your service reminder for ${serviceName} on ${remindDate} at ${remindTime} has been scheduled. You will receive follow-up alerts 1 day, 1 hour, and 15 minutes before.`;

    await sendTransactionalEmail(customerEmail, subject, textBody, htmlBody);

  } catch (error) {
    console.error('[CONTROLLER ERROR] handleReminderScheduled:', error);
  }
};

/**
 * Controller to handle appointment rescheduling
 */
export const handleAppointmentRescheduled = async (req, res) => {
  const { customerEmail, customerName, serviceName, appointmentDate, customerPhone, oldAppointmentDate } = req.body;

  res.status(202).json({
    message: 'Success: Appointment rescheduled. Confirmation email is being sent.',
    status: 'processing'
  });

  try {
    let jsDate = new Date();
    let oldJsDate = null;
    try {
      if (appointmentDate) jsDate = DateTime.fromFormat(appointmentDate, 'yyyy-MM-dd h:mm a', { zone: 'Asia/Kolkata' }).toJSDate();
      if (oldAppointmentDate) oldJsDate = DateTime.fromFormat(oldAppointmentDate, 'yyyy-MM-dd h:mm a', { zone: 'Asia/Kolkata' }).toJSDate();
    } catch (e) {
      console.error('Reschedule Date Parsing Error:', e);
    }

    // Upsert Customer
    const customer = await prisma.customer.upsert({
      where: { phone: customerPhone },
      update: { name: customerName, email: customerEmail },
      create: { name: customerName, phone: customerPhone, email: customerEmail }
    });

    // Update existing booking or create new one for cron jobs
    const existingBookings = await prisma.booking.findMany({
      where: { customerId: customer.id, status: 'PENDING' }
    });

    let targetBooking = null;
    if (oldJsDate) {
      targetBooking = existingBookings.find(b => Math.abs(b.appointmentDate.getTime() - oldJsDate.getTime()) < 60000);
    }
    if (!targetBooking && existingBookings.length > 0) {
      targetBooking = existingBookings[0];
    }

    if (targetBooking) {
      await prisma.booking.update({
        where: { id: targetBooking.id },
        data: { appointmentDate: jsDate, reminded1Day: false, reminded1Hour: false, reminded15Min: false }
      });
    } else {
      await prisma.booking.create({
        data: {
          customerId: customer.id,
          service: serviceName || 'Haircut',
          price: 0,
          appointmentDate: jsDate,
          status: 'PENDING'
        }
      });
    }

    const subject = `Update: Appointment Rescheduled - Shobana Hair Salon`;
    let formattedDateDisplay = DateTime.fromJSDate(jsDate).setZone('Asia/Kolkata').toFormat('dd/MM/yy h:mm a');

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 600px; margin: 20px auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; }
          .header { background-color: #f39c12; color: #fff; padding: 30px; text-align: center; }
          .content { padding: 40px; }
          .box { background-color: #fcfcfc; padding: 25px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">APPOINTMENT RESCHEDULED</h1>
          </div>
          <div class="content">
            <h2>Hi ${customerName},</h2>
            <p>Your appointment has been successfully rescheduled to a new time.</p>
            <div class="box">
              <p><strong>New Date & Time:</strong> ${formattedDateDisplay}</p>
            </div>
            <p>You will receive your automated reminders prior to this new time.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    const textBody = `Hi ${customerName}, your appointment has been rescheduled to ${formattedDateDisplay}.`;

    if (customerEmail) {
      await sendTransactionalEmail(customerEmail, subject, textBody, htmlBody);
    }
  } catch (error) {
    console.error('[CONTROLLER ERROR] handleAppointmentRescheduled:', error);
  }
};

/**
 * Controller to handle appointment cancellation
 */
export const handleAppointmentCancelled = async (req, res) => {
  const { customerEmail, customerName, serviceName, appointmentDate, customerPhone, appUrl, cancelReason } = req.body;

  res.status(202).json({
    message: 'Success: Appointment cancelled. Confirmation email is being sent.',
    status: 'processing'
  });

  try {
    let jsDate = new Date();
    try {
      if (appointmentDate) jsDate = DateTime.fromFormat(appointmentDate, 'yyyy-MM-dd h:mm a', { zone: 'Asia/Kolkata' }).toJSDate();
    } catch (e) {
      console.error('Cancellation Date Parsing Error:', e);
    }

    const customer = await prisma.customer.findUnique({ where: { phone: customerPhone } });

    if (customer) {
      const existingBookings = await prisma.booking.findMany({
        where: { customerId: customer.id, status: 'PENDING' }
      });

      let targetBooking = null;
      if (appointmentDate) {
        targetBooking = existingBookings.find(b => Math.abs(b.appointmentDate.getTime() - jsDate.getTime()) < 60000);
      }
      if (!targetBooking && existingBookings.length > 0) {
        targetBooking = existingBookings[0];
      }

      if (targetBooking) {
        await prisma.booking.update({
          where: { id: targetBooking.id },
          data: { status: 'CANCELLED' }
        });
      }
    }

    let formattedDateDisplay = DateTime.fromJSDate(jsDate).setZone('Asia/Kolkata').toFormat('dd/MM/yy h:mm a');
    const subject = `Appointment Cancelled: ${formattedDateDisplay} - Shobana Hair Salon`;
    const baseUrl = process.env.FRONTEND_URL || appUrl || 'http://localhost:5173';

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 600px; margin: 20px auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; }
          .header { background-color: #e74c3c; color: #fff; padding: 30px; text-align: center; }
          .content { padding: 40px; }
          .box { background-color: #fcfcfc; padding: 25px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee; }
          .btn { display: inline-block; padding: 14px 28px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; margin-top: 25px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">APPOINTMENT CANCELLED</h1>
          </div>
          <div class="content">
            <h2>Hi ${customerName},</h2>
            <p>Your appointment has been cancelled. We sincerely apologize for any inconvenience caused.</p>
            ${cancelReason ? `<div class="box" style="background-color: #ffebe9; border-color: #d73a49; color: #cb2431; padding: 15px;"><p style="margin: 0;"><strong>Reason:</strong> ${cancelReason}</p></div>` : ''}
            <div class="box">
              <p><strong>Service:</strong> ${serviceName}</p>
              <p><strong>Date & Time:</strong> ${formattedDateDisplay}</p>
            </div>
            <p>We value you as a customer and would love to see you soon. Please click the button below to easily reschedule your service for a more convenient time.</p>
            <div style="text-align: center;">
              <a href="${baseUrl}" class="btn">Reschedule Now</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    const textBody = `Hi ${customerName}, your appointment for ${serviceName} on ${formattedDateDisplay} has been cancelled.${cancelReason ? ` Reason: ${cancelReason}` : ''} We apologize for any inconvenience and invite you to reschedule on our website.`;

    if (customerEmail) {
      await sendTransactionalEmail(customerEmail, subject, textBody, htmlBody);
    }
  } catch (error) {
    console.error('[CONTROLLER ERROR] handleAppointmentCancelled:', error);
  }
};

/**
 * Controller to handle no-show appointments
 */
export const handleAppointmentNoShow = async (req, res) => {
  const { customerEmail, customerName, serviceName, appointmentDate, customerPhone, appUrl } = req.body;

  res.status(202).json({
    message: 'Success: Appointment marked as No-Show. Reschedule email is being sent.',
    status: 'processing'
  });

  try {
    let jsDate = new Date();
    try {
      jsDate = DateTime.fromFormat(appointmentDate, 'yyyy-MM-dd h:mm a', { zone: 'Asia/Kolkata' }).toJSDate();
    } catch (e) {
      console.error('No-Show Date Parsing Error:', e);
    }

    const customer = await prisma.customer.findUnique({ where: { phone: customerPhone } });

    if (customer) {
      const existingBookings = await prisma.booking.findMany({
        where: { customerId: customer.id, status: 'PENDING' },
        orderBy: { appointmentDate: 'desc' },
        take: 1
      });

      if (existingBookings.length > 0) {
        await prisma.booking.update({
          where: { id: existingBookings[0].id },
          data: { status: 'CANCELLED' } // Use cancelled in prisma or keep as is if NO_SHOW isn't a valid enum
        });
      }
    }

    let formattedDateDisplay = DateTime.fromJSDate(jsDate).setZone('Asia/Kolkata').toFormat('dd/MM/yy h:mm a');
    const subject = `We missed you today: ${formattedDateDisplay} - Shobana Hair Salon`;
    const baseUrl = process.env.FRONTEND_URL || appUrl || 'http://localhost:5173';

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 600px; margin: 20px auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; }
          .header { background-color: #f39c12; color: #fff; padding: 30px; text-align: center; }
          .content { padding: 40px; }
          .box { background-color: #fcfcfc; padding: 25px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee; }
          .btn { display: inline-block; padding: 14px 28px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; margin-top: 25px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">WE MISSED YOU</h1>
          </div>
          <div class="content">
            <h2>Hi ${customerName},</h2>
            <p>We noticed you weren't able to make it to your appointment today.</p>
            <div class="box">
              <p><strong>Service:</strong> ${serviceName}</p>
              <p><strong>Date & Time:</strong> ${formattedDateDisplay}</p>
            </div>
            <p>We'd love to see you soon! You can easily reschedule your appointment using the link below.</p>
            <div style="text-align: center;">
              <a href="${baseUrl}" class="btn">Reschedule Now</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    const textBody = `Hi ${customerName}, we noticed you weren't able to make it to your appointment for ${serviceName} on ${formattedDateDisplay}. Please contact us or visit our website to reschedule.`;

    if (customerEmail) {
      await sendTransactionalEmail(customerEmail, subject, textBody, htmlBody);
    }
  } catch (error) {
    console.error('[CONTROLLER ERROR] handleAppointmentNoShow:', error);
  }
};

/**
 * Controller to handle reminder cancellation
 */
export const handleReminderCancelled = async (req, res) => {
  const { customerEmail, customerName, serviceName, remindDate, remindTime, customerPhone } = req.body;

  res.status(202).json({
    message: 'Success: Reminder cancelled. Confirmation email is being sent.',
    status: 'processing'
  });

  try {
    const fullRemindString = `${remindDate} ${remindTime}`;
    let jsDate = new Date();
    try {
      jsDate = DateTime.fromFormat(fullRemindString, 'yyyy-MM-dd h:mm a', { zone: 'Asia/Kolkata' }).toJSDate();
    } catch (e) {
      console.error('Cancellation Date Parsing Error:', e);
    }

    const customer = await prisma.customer.findUnique({ where: { phone: customerPhone } });

    if (customer) {
      const existingBookings = await prisma.booking.findMany({
        where: { customerId: customer.id, status: 'PENDING', service: `[REMINDER] ${serviceName}` },
        orderBy: { appointmentDate: 'desc' },
        take: 1
      });

      if (existingBookings.length > 0) {
        await prisma.booking.delete({
          where: { id: existingBookings[0].id }
        });
      }
    }

    const subject = `Update: Service Reminder Cancelled - Shobana Hair Salon`;
    let formattedDateDisplay = DateTime.fromJSDate(jsDate).setZone('Asia/Kolkata').toFormat('dd/MM/yy');

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 600px; margin: 20px auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; }
          .header { background-color: #e74c3c; color: #fff; padding: 30px; text-align: center; }
          .content { padding: 40px; }
          .box { background-color: #fcfcfc; padding: 25px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">REMINDER CANCELLED</h1>
          </div>
          <div class="content">
            <h2>Hi ${customerName},</h2>
            <p>Your scheduled service reminder has been successfully cancelled.</p>
            <div class="box">
              <p><strong>Service:</strong> ${serviceName}</p>
              <p><strong>Reminder Date:</strong> ${formattedDateDisplay}</p>
              <p><strong>Time:</strong> ${remindTime}</p>
            </div>
            <p>You will no longer receive alerts for this service at the specified time.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    const textBody = `Hi ${customerName}, your service reminder for ${serviceName} on ${formattedDateDisplay} at ${remindTime} has been cancelled.`;

    if (customerEmail) {
      await sendTransactionalEmail(customerEmail, subject, textBody, htmlBody);
    }
  } catch (error) {
    console.error('[CONTROLLER ERROR] handleReminderCancelled:', error);
  }
};

/**
 * Diagnostic ping endpoint
 */
export const testEmailHandler = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Payload Error: "email" field is required.' });
  }

  try {
    await sendTransactionalEmail(
      email,
      'Diagnostic Check: Email Service Active',
      'This is a baseline diagnostic check for Shobana Hair Salon email system.',
      '<div style="padding:20px; border: 2px solid #000; font-family: sans-serif;"><h2>✅ System Online</h2><p>Email delivery is properly configured and active.</p></div>'
    );
    res.json({ success: true, message: 'Diagnostic test email dispatched successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Service Failure', details: error.message });
  }
};

/**
 * Controller to handle appointment completion and vote of thanks
 */
export const handleAppointmentCompleted = async (req, res) => {
  const { customerEmail, customerName, customerPhone, serviceName, appointmentDate, price, appUrl } = req.body;

  res.status(202).json({
    message: 'Success: Appointment marked as completed. Vote of thanks email is being sent.',
    status: 'processing'
  });

  try {
    let jsDate = new Date();
    try {
      if (appointmentDate) jsDate = DateTime.fromFormat(appointmentDate, 'yyyy-MM-dd h:mm a', { zone: 'Asia/Kolkata' }).toJSDate();
    } catch (e) {
      console.error('Completion Date Parsing Error:', e);
    }

    if (customerPhone) {
      const customer = await prisma.customer.findUnique({ where: { phone: customerPhone } });
      if (customer) {
        const existingBookings = await prisma.booking.findMany({
          where: { customerId: customer.id, status: 'PENDING' }
        });
        
        let targetBooking = null;
        if (appointmentDate) {
          targetBooking = existingBookings.find(b => Math.abs(b.appointmentDate.getTime() - jsDate.getTime()) < 60000);
        }
        if (!targetBooking && existingBookings.length > 0) {
          targetBooking = existingBookings[0];
        }
        
        if (targetBooking) {
          await prisma.booking.update({
            where: { id: targetBooking.id },
            data: { status: 'COMPLETED' }
          });
        }
      }
    }

    const subject = `Thank you for visiting Shobana Hair Salon!`;
    const googleReviewUrl = 'https://share.google/dRV09yYI4J5YFjek6';
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 600px; margin: 20px auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; }
          .header { background-color: #000; color: #fff; padding: 30px; text-align: center; }
          .content { padding: 40px; }
          .box { background-color: #fcfcfc; padding: 25px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee; text-align: center; }
          .btn { display: inline-block; padding: 14px 28px; background-color: #000; color: #fff !important; text-decoration: none; border-radius: 6px; margin-top: 15px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px;">THANK YOU</h1>
          </div>
          <div class="content">
            <h2>Hi ${customerName},</h2>
            <p>Thank you for choosing Shobana Hair Salon for your <strong>${serviceName}</strong>. We hope you enjoyed your experience with us!</p>
            <p>Your feedback means the world to us and helps us continue to provide premium grooming services.</p>
            <div class="box">
              <h3 style="margin-top: 0;">How did we do?</h3>
              <p style="margin-bottom: 20px; font-size: 14px; color: #666;">We would be incredibly grateful if you could take a quick minute to leave us a review on Google.</p>
              <a href="${googleReviewUrl}" class="btn">⭐ Rate Us on Google</a>
            </div>
            <p>We look forward to seeing you again soon!</p>
          </div>
        </div>
        <div style="display: none; font-size: 1px; color: transparent; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">Ref: ${Date.now()}_${Math.random().toString(36).substring(7)}</div>
      </body>
      </html>
    `;
    const textBody = `Hi ${customerName}, thank you for choosing Shobana Hair Salon for your ${serviceName}. We'd love to hear about your experience! Please leave us a review on Google: ${googleReviewUrl}`;

    if (customerEmail) {
      await sendTransactionalEmail(customerEmail, subject, textBody, htmlBody);
    }
  } catch (error) {
    console.error('[CONTROLLER ERROR] handleAppointmentCompleted:', error);
  }
};
