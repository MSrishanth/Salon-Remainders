import 'dotenv/config';
import { Resend } from 'resend';

// Initialize the Resend client
// We use the provided key as a fallback, but you should add RESEND_API_KEY to Render Environment Variables!
const resend = new Resend(process.env.RESEND_API_KEY || 're_83m7FG7j_AhZbPrKvMN8ozKSSUMUwhy75');

/**
 * Flexible asynchronous helper to dispatch transactional emails using Resend HTTP API
 * 
 * @param {string} toEmail - Recipient email
 * @param {string} subject - Clear, descriptive subject line
 * @param {string} textBody - Plaintext fallback for standard clients
 * @param {string} htmlBody - Rich HTML content for professional presentation
 * @returns {Promise<object>} - Resend API response object
 */
export const sendTransactionalEmail = async (toEmail, subject, textBody, htmlBody) => {
  try {
    // Note: Resend's free tier requires sending from onboarding@resend.dev
    // and you can ONLY send emails to the email address you verified on your Resend account.
    const { data, error } = await resend.emails.send({
      from: 'Shobana Hair Salon <onboarding@resend.dev>',
      to: [toEmail],
      subject: subject,
      text: textBody,
      html: htmlBody,
    });

    if (error) {
      console.error(`[RESEND ERROR DETAILS]:`, error);
      throw error;
    }

    console.log(`[EMAIL SUCCESS] Dispatched via Resend to: ${toEmail} | ID: ${data?.id}`);
    return data;
  } catch (error) {
    console.error(`\n[CRITICAL EMAIL FAILURE] Failed delivery to: ${toEmail}`);
    console.error(`[ERROR]:`, error);
    console.error(`----------------------------------------\n`);
    throw error;
  }
};
