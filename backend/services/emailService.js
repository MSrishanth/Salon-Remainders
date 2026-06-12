import 'dotenv/config'; // Modern ES Module way to load configuration
import nodemailer from 'nodemailer';

// The rest of your transporter code goes here...
/**
 * Enterprise-grade Email Initialization Module
 * Specifically tuned for Gmail SMTP with App Passwords
 */

// Initialize the Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Verify connection configuration on initialization
transporter.verify((error) => {
  if (error) {
    console.error('[EMAIL SERVICE] Configuration Error:', error.message);
  } else {
    console.log('[EMAIL SERVICE] SMTP Transport ready to dispatch notifications.');
  }
});

/**
 * Flexible asynchronous helper to dispatch transactional emails
 * 
 * @param {string} toEmail - Recipient email
 * @param {string} subject - Clear, descriptive subject line
 * @param {string} textBody - Plaintext fallback for standard clients
 * @param {string} htmlBody - Rich HTML content for professional presentation
 * @returns {Promise<object>} - Nodemailer information object
 */
export const sendTransactionalEmail = async (toEmail, subject, textBody, htmlBody) => {
  try {
    const mailOptions = {
      from: `"Shobana Hair Salon Support" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: subject,
      text: textBody,
      html: htmlBody,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL SUCCESS] Dispatched to: ${toEmail} | ID: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error(`[EMAIL FAILURE] Failed delivery to: ${toEmail} | Error:`, error.message);
    throw error; // Re-throw for upstream error handling in controllers
  }
};
