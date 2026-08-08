import 'dotenv/config';

// The rest of your transporter code goes here...

/**
 * Flexible asynchronous helper to dispatch transactional emails using Resend HTTP API
 * 
 * @param {string} toEmail - Recipient email
 * @param {string} subject - Clear, descriptive subject line
 * @param {string} textBody - Plaintext fallback for standard clients
 * @param {string} htmlBody - Rich HTML content for professional presentation
 * @returns {Promise<object>} - Resend API response object
 */
import nodemailer from 'nodemailer';
import 'dotenv/config';

// Create a transporter using Gmail credentials from .env
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Flexible asynchronous helper to dispatch transactional emails using Gmail SMTP
 * 
 * @param {string} toEmail - Recipient email
 * @param {string} subject - Clear, descriptive subject line
 * @param {string} textBody - Plaintext fallback for standard clients
 * @param {string} htmlBody - Rich HTML content for professional presentation
 * @returns {Promise<object>} - Nodemailer response object
 */
export const sendTransactionalEmail = async (toEmail, subject, textBody, htmlBody) => {
  try {
    const info = await transporter.sendMail({
      from: `"Shobana Hair Salon" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: subject,
      text: textBody,
      html: htmlBody,
    });

    console.log(`[EMAIL SUCCESS] Dispatched via Gmail to: ${toEmail} | ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`\n[CRITICAL EMAIL FAILURE] Failed delivery to: ${toEmail}`);
    console.error(`[ERROR]:`, error);
    console.error(`----------------------------------------\n`);
    throw error;
  }
};
