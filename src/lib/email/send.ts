import { Resend } from 'resend';

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export type SendEmailResult = {
  success: boolean;
  id?: string;
  error?: string;
  skipped?: boolean;
};

function getFromAddress(): string {
  const email = process.env.RESEND_FROM_EMAIL?.trim() || 'noreply@rent-pilot.net';
  const name = process.env.RESEND_FROM_NAME?.trim() || 'RentPilot';
  return `${name} <${email}>`;
}

function getResendApiKey(): string | null {
  const key = process.env.RESEND_API_KEY?.trim();
  return key || null;
}

function getResendClient(): Resend | null {
  const apiKey = getResendApiKey();
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const resend = getResendClient();
  if (!resend) {
    const hint =
      process.env.RESEND_API_KEY === ''
        ? 'RESEND_API_KEY is empty in .env.local — paste your key and save the file'
        : 'RESEND_API_KEY is missing from .env.local — add it, save, and restart npm run dev';
    console.warn(`[Email] ${hint}:`, input.subject);
    return { success: false, skipped: true, error: hint };
  }

  const to = Array.isArray(input.to) ? input.to.filter(Boolean) : [input.to].filter(Boolean);
  if (to.length === 0) {
    return { success: false, error: 'No recipients' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to,
      subject: input.subject,
      html: input.html,
      replyTo: input.replyTo,
    });

    if (error) {
      console.error('[Email] Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send email';
    console.error('[Email]', message);
    return { success: false, error: message };
  }
}

export async function sendEmails(
  emails: SendEmailInput[]
): Promise<{ sent: number; failed: number; skipped: boolean }> {
  let sent = 0;
  let failed = 0;
  let skipped = false;

  for (const email of emails) {
    const result = await sendEmail(email);
    if (result.skipped) {
      skipped = true;
      break;
    }
    if (result.success) sent++;
    else failed++;
  }

  return { sent, failed, skipped };
}

export function isEmailConfigured(): boolean {
  return Boolean(getResendApiKey());
}
