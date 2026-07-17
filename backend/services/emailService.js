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
export const sendTransactionalEmail = async (toEmail, subject, textBody, htmlBody) => {
  try {
    const vercelApiUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/api/email` : 'https://shobanamensalon.vercel.app/api/email';
    
    const response = await fetch(vercelApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toEmail,
        subject,
        textBody,
        htmlBody
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[VERCEL RELAY ERROR DETAILS]:`, data);
      throw new Error(data.error || 'Failed to send email via Vercel relay');
    }

    console.log(`[EMAIL SUCCESS] Dispatched via Vercel Relay to: ${toEmail} | ID: ${data?.messageId}`);
    return data;
  } catch (error) {
    console.error(`\n[CRITICAL EMAIL FAILURE] Failed delivery to: ${toEmail}`);
    console.error(`[ERROR]:`, error);
    console.error(`----------------------------------------\n`);
    throw error;
  }
};
