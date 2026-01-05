import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

// SendPulse SMTP Configuration
// Get these from SendPulse: Settings → SMTP → SMTP settings
const SMTP_HOST = process.env.SMTP_HOST || 'smtp-pulse.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || SMTP_USER;
const FROM_NAME = process.env.SMTP_FROM_NAME || 'Måløv Boldklub Admin';

// Create transporter only if configured
const transporter = SMTP_USER && SMTP_PASS 
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

interface NotificationRequest {
  type: 'task_assigned';
  recipients: {
    email: string;
    name: string;
  }[];
  data: {
    taskTitle: string;
    taskDescription?: string;
    month: string;
    assignedBy?: string;
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!transporter) {
    console.warn('SMTP not configured - email notifications disabled');
    return res.status(200).json({ 
      success: true, 
      message: 'Email notifications disabled - SMTP credentials not set',
      sent: false
    });
  }

  try {
    const { type, recipients, data } = req.body as NotificationRequest;

    if (!type || !recipients || !data) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (recipients.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No recipients specified',
        sent: false
      });
    }

    // Filter out recipients without valid email
    const validRecipients = recipients.filter(r => r.email && r.email.includes('@'));
    
    if (validRecipients.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No valid email addresses',
        sent: false
      });
    }

    if (type === 'task_assigned') {
      const { taskTitle, taskDescription, month, assignedBy } = data;
      
      // Send email to each recipient
      const results = await Promise.allSettled(
        validRecipients.map(async (recipient) => {
          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Ny opgave tildelt</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">🎯 Ny opgave tildelt</h1>
              </div>
              
              <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
                <p style="font-size: 16px; margin-bottom: 20px;">
                  Hej <strong>${recipient.name}</strong>,
                </p>
                
                <p style="font-size: 16px; margin-bottom: 20px;">
                  Du er blevet tildelt en ny opgave i Årshjulet for <strong>${month}</strong>.
                </p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
                  <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #333;">${taskTitle}</h2>
                  ${taskDescription ? `<p style="margin: 0; color: #666;">${taskDescription}</p>` : ''}
                </div>
                
                ${assignedBy ? `<p style="font-size: 14px; color: #666;">Tildelt af: ${assignedBy}</p>` : ''}
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                  <p style="font-size: 14px; color: #666; margin: 0;">
                    Log ind på <a href="https://mb-adminside.vercel.app" style="color: #667eea;">MB Admin</a> for at se opgaven.
                  </p>
                </div>
              </div>
              
              <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
                Denne email er sendt automatisk fra Måløv Boldklub Admin Portal
              </p>
            </body>
            </html>
          `;

          const plainText = `
Hej ${recipient.name},

Du er blevet tildelt en ny opgave i Årshjulet for ${month}.

Opgave: ${taskTitle}
${taskDescription ? `Beskrivelse: ${taskDescription}` : ''}
${assignedBy ? `Tildelt af: ${assignedBy}` : ''}

Log ind på https://mb-adminside.vercel.app for at se opgaven.

Med venlig hilsen,
Måløv Boldklub Admin Portal
          `.trim();

          return transporter.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to: recipient.email,
            subject: `🎯 Ny opgave: ${taskTitle}`,
            text: plainText,
            html: emailHtml,
          });
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (failed > 0) {
        console.error('Some emails failed to send:', 
          results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason)
        );
      }

      return res.status(200).json({ 
        success: true, 
        message: `${successful} email(s) sent, ${failed} failed`,
        sent: successful > 0,
        details: {
          successful,
          failed,
          total: validRecipients.length
        }
      });
    }

    return res.status(400).json({ error: 'Unknown notification type' });
  } catch (error) {
    console.error('Notification API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
