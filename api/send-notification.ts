import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { ADMIN_USERS, applyCors, requireAuth, requirePermission } from './_lib/auth.js';
import { SYSTEM_EMAILS_KEY, getSetting } from './_lib/settings.js';
import { supabaseAdmin as supabase } from './_lib/supabaseAdmin.js';

/**
 * POST /api/send-notification
 *   { type: "task_assigned", recipients: ["username", ...], data: { taskTitle, taskDescription?, month } }
 *
 * Tells users that a task in the årshjul was assigned to them.
 *
 * Recipients are USERNAMES. The server looks the addresses up itself, so
 * mail can only go to people who are users of the portal. (The browser
 * used to send the addresses, which let any logged-in user send mail from
 * the club's sender to anyone, with any content.) Text from the request is
 * escaped before it is placed in the mail.
 */

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.maileroo.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || SMTP_USER;
const FROM_NAME = process.env.SMTP_FROM_NAME || 'Måløv Boldklub';

const MAX_RECIPIENTS = 30;

// Create transporter only if configured
const transporter = SMTP_USER && SMTP_PASS
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465 (SSL), false for 587 (STARTTLS)
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      // Required for port 587 with STARTTLS
      ...(SMTP_PORT === 587 && { requireTLS: true }),
    })
  : null;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** One line of plain text, cut to a sensible length. */
const oneLine = (value: unknown, max: number) =>
  String(value ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);

const isEmail = (value: unknown): value is string =>
  typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/** Where the "log ind" link in the mail points: the portal's own address. */
function portalUrl(req: VercelRequest): string {
  const allowed = (process.env.ALLOWED_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean);
  const origin = (req.headers.origin as string) || '';
  if (origin && allowed.includes(origin) && !origin.includes('localhost')) return origin;
  return allowed.find((candidate) => candidate.startsWith('https://')) || 'https://mb-adminside.vercel.app';
}

interface Recipient {
  email: string;
  name: string;
}

/** Turn usernames into addresses, using only what the portal itself knows. */
async function resolveRecipients(usernames: string[]): Promise<Recipient[]> {
  const recipients: Recipient[] = [];

  const systemNames = usernames.filter((name) => ADMIN_USERS.includes(name));
  if (systemNames.length > 0) {
    const systemEmails = (await getSetting<Record<string, string>>(SYSTEM_EMAILS_KEY)) || {};
    systemNames.forEach((name) => {
      if (isEmail(systemEmails[name])) recipients.push({ email: systemEmails[name], name });
    });
  }

  const otherNames = usernames.filter((name) => !ADMIN_USERS.includes(name));
  if (otherNames.length > 0 && supabase) {
    const { data } = await supabase
      .from('custom_users')
      .select('username, first_name, last_name, email, is_active')
      .in('username', otherNames);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data || []).forEach((user: any) => {
      if (user.is_active !== false && isEmail(user.email)) {
        recipients.push({ email: user.email, name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username });
      }
    });
  }

  return recipients;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await requireAuth(req, res);
  if (!session) return;
  // Notifications belong to the årshjul (they announce an assigned task).
  if (!(await requirePermission(res, session, 'aarshjul'))) return;

  if (!transporter) {
    console.warn('SMTP not configured - email notifications disabled');
    return res.status(200).json({
      success: true,
      message: 'Email notifications disabled - SMTP credentials not set',
      sent: false
    });
  }

  try {
    const { type, recipients, data } = req.body || {};

    if (type !== 'task_assigned') {
      return res.status(400).json({ error: 'Unknown notification type' });
    }
    if (!Array.isArray(recipients) || !data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const usernames = Array.from(
      new Set(recipients.filter((name: unknown): name is string => typeof name === 'string' && name.length > 0 && name.length <= 100))
    ).slice(0, MAX_RECIPIENTS);

    const taskTitle = oneLine(data.taskTitle, 255);
    const month = oneLine(data.month, 20);
    const taskDescription = String(data.taskDescription ?? '').trim().slice(0, 2000);
    if (!taskTitle) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const validRecipients = await resolveRecipients(usernames);
    if (validRecipients.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No recipients with an email address',
        sent: false
      });
    }

    const link = portalUrl(req);
    const assignedBy = session.username;

    const results = await Promise.allSettled(
      validRecipients.map((recipient) => {
        const html = `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ny opgave tildelt</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1A1213; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #C8141B; padding: 28px 30px; border-radius: 12px 12px 0 0;">
    <p style="color: #FFE9E9; margin: 0 0 4px 0; font-size: 14px;">Måløv Boldklub</p>
    <h1 style="color: #FFFFFF; margin: 0; font-size: 24px;">Ny opgave tildelt</h1>
  </div>
  <div style="background: #FFFFFF; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #E6DFDC; border-top: none;">
    <p style="font-size: 16px; margin: 0 0 16px 0;">Hej <strong>${escapeHtml(recipient.name)}</strong>,</p>
    <p style="font-size: 16px; margin: 0 0 16px 0;">Du har fået en opgave i årshjulet for <strong>${escapeHtml(month)}</strong>.</p>
    <div style="background: #F5F2F0; padding: 18px 20px; border-radius: 10px; margin: 20px 0;">
      <h2 style="margin: 0 0 8px 0; font-size: 18px;">${escapeHtml(taskTitle)}</h2>
      ${taskDescription ? `<p style="margin: 0; color: #645859; white-space: pre-line;">${escapeHtml(taskDescription)}</p>` : ''}
    </div>
    <p style="font-size: 14px; color: #645859; margin: 0 0 20px 0;">Tildelt af: ${escapeHtml(assignedBy)}</p>
    <p style="margin: 0;"><a href="${escapeHtml(link)}" style="display: inline-block; background: #C8141B; color: #FFFFFF; text-decoration: none; font-weight: 600; padding: 12px 20px; border-radius: 10px;">Åbn portalen</a></p>
  </div>
  <p style="font-size: 12px; color: #645859; text-align: center; margin-top: 20px;">Denne mail er sendt automatisk fra Måløv Boldklubs administrationsportal.</p>
</body>
</html>`;

        const text = [
          `Hej ${recipient.name},`,
          '',
          `Du har fået en opgave i årshjulet for ${month}.`,
          '',
          `Opgave: ${taskTitle}`,
          ...(taskDescription ? [`Beskrivelse: ${taskDescription}`] : []),
          `Tildelt af: ${assignedBy}`,
          '',
          `Åbn portalen: ${link}`,
          '',
          'Med venlig hilsen',
          'Måløv Boldklub'
        ].join('\n');

        return transporter.sendMail({
          from: `"${FROM_NAME.replace(/["\r\n]/g, '')}" <${FROM_EMAIL}>`,
          to: recipient.email,
          subject: `Ny opgave: ${taskTitle}`,
          text,
          html,
        });
      })
    );

    const successful = results.filter((result) => result.status === 'fulfilled').length;
    const failed = results.length - successful;
    if (failed > 0) {
      console.error(
        'Some emails failed to send:',
        results.filter((result) => result.status === 'rejected').map((result) => (result as PromiseRejectedResult).reason)
      );
    }

    return res.status(200).json({
      success: true,
      message: `${successful} email(s) sent, ${failed} failed`,
      sent: successful > 0,
      details: { successful, failed, total: validRecipients.length }
    });
  } catch (error) {
    console.error('Notification API error:', error);
    return res.status(500).json({ success: false, error: 'Kunne ikke sende mail' });
  }
}
