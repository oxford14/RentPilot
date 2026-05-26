'use server';

import { sendEmail, sendEmails, announcementEmail } from '@/lib/email';

export async function serverSendAnnouncementEmails(params: {
  recipients: string[];
  fromName: string;
  title: string;
  content: string;
}): Promise<{ sent: number; failed: number; skipped: boolean }> {
  const { subject, html } = announcementEmail({
    fromName: params.fromName,
    title: params.title,
    content: params.content,
  });

  if (params.recipients.length === 1) {
    const result = await sendEmail({ to: params.recipients[0], subject, html });
    if (result.skipped) return { sent: 0, failed: 0, skipped: true };
    return { sent: result.success ? 1 : 0, failed: result.success ? 0 : 1, skipped: false };
  }

  return sendEmails(
    params.recipients.map((to) => ({ to, subject, html }))
  );
}

export async function serverSendReminderEmail(params: {
  to: string;
  fromName: string;
  title: string;
  message: string;
}): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  const { subject, html } = announcementEmail({
    fromName: params.fromName,
    title: params.title,
    content: params.message,
  });
  return sendEmail({ to: params.to, subject, html });
}
