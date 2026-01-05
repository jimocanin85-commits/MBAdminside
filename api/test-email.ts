import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

// Maileroo SMTP Configuration
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.maileroo.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || SMTP_USER;
const FROM_NAME = process.env.SMTP_FROM_NAME || 'Måløv Boldklub Admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const results: any = {
    timestamp: new Date().toISOString(),
    configuration: {},
    connection: {},
    testEmail: {}
  };

  // Check configuration
  results.configuration = {
    SMTP_HOST: SMTP_HOST ? `✅ ${SMTP_HOST}` : '❌ Not set',
    SMTP_PORT: SMTP_PORT ? `✅ ${SMTP_PORT}` : '❌ Not set',
    SMTP_USER: SMTP_USER ? '✅ Set' : '❌ Not set',
    SMTP_PASS: SMTP_PASS ? '✅ Set' : '❌ Not set',
    SMTP_FROM_EMAIL: FROM_EMAIL ? `✅ ${FROM_EMAIL}` : '❌ Not set',
    SMTP_FROM_NAME: FROM_NAME ? `✅ ${FROM_NAME}` : '❌ Not set',
  };

  if (!SMTP_USER || !SMTP_PASS) {
    results.connection = {
      status: '❌ Cannot connect',
      error: 'SMTP_USER and SMTP_PASS are required'
    };
    results.overall = '❌ Email not configured - add SMTP environment variables';
    return res.status(200).json(results);
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    ...(SMTP_PORT === 587 && { requireTLS: true }),
  });

  // Test connection
  try {
    await transporter.verify();
    results.connection = {
      status: '✅ Connected successfully',
      host: SMTP_HOST,
      port: SMTP_PORT
    };
  } catch (error) {
    results.connection = {
      status: '❌ Connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    results.overall = '❌ SMTP connection failed - check credentials';
    return res.status(200).json(results);
  }

  // Send test email if requested
  const testEmail = req.query.to || req.body?.to;
  
  if (testEmail && typeof testEmail === 'string') {
    try {
      const info = await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to: testEmail,
        subject: '✅ Test Email - Måløv Boldklub Admin',
        text: `
Hej!

Dette er en test email fra Måløv Boldklub Admin Portal.

Hvis du modtager denne email, er email konfigurationen korrekt! 🎉

Konfiguration:
- SMTP Host: ${SMTP_HOST}
- SMTP Port: ${SMTP_PORT}
- From: ${FROM_EMAIL}

Med venlig hilsen,
Måløv Boldklub Admin
        `.trim(),
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">✅ Test Email</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
              <p style="font-size: 16px;">Hej!</p>
              <p style="font-size: 16px;">Dette er en test email fra <strong>Måløv Boldklub Admin Portal</strong>.</p>
              <p style="font-size: 16px; color: #22c55e;">Hvis du modtager denne email, er email konfigurationen korrekt! 🎉</p>
              
              <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; font-family: monospace; font-size: 14px;">
                <p style="margin: 5px 0;"><strong>SMTP Host:</strong> ${SMTP_HOST}</p>
                <p style="margin: 5px 0;"><strong>SMTP Port:</strong> ${SMTP_PORT}</p>
                <p style="margin: 5px 0;"><strong>From:</strong> ${FROM_EMAIL}</p>
              </div>
              
              <p style="font-size: 14px; color: #666;">Med venlig hilsen,<br>Måløv Boldklub Admin</p>
            </div>
          </body>
          </html>
        `
      });

      results.testEmail = {
        status: '✅ Test email sent!',
        to: testEmail,
        messageId: info.messageId
      };
      results.overall = '✅ Everything is working! Email notifications are ready.';
    } catch (error) {
      results.testEmail = {
        status: '❌ Failed to send test email',
        to: testEmail,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      results.overall = '⚠️ Connected but failed to send - check FROM_EMAIL is verified';
    }
  } else {
    results.testEmail = {
      status: '⏭️ Skipped',
      message: 'Add ?to=your@email.com to send a test email'
    };
    results.overall = '✅ SMTP connected! Add ?to=your@email.com to send a test email';
  }

  return res.status(200).json(results);
}
