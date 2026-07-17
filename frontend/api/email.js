import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // CORS configuration to allow the Render backend to hit this endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { toEmail, subject, textBody, htmlBody } = req.body;

  if (!toEmail || !subject || !htmlBody) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Ensure environment variables are loaded
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('Missing GMAIL_USER or GMAIL_APP_PASSWORD in Vercel Environment Variables');
    return res.status(500).json({ error: 'Server misconfiguration: Missing email credentials.' });
  }

  try {
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

    const mailOptions = {
      from: `"Shobana Hair Salon Support" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: subject,
      text: textBody,
      html: htmlBody,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`[VERCEL EMAIL SUCCESS] Dispatched to: ${toEmail} | ID: ${result.messageId}`);
    return res.status(200).json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error('[VERCEL EMAIL ERROR]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
