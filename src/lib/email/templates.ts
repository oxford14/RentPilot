export type EmailAccent = 'default' | 'reminder' | 'account';

const ACCENT_STYLES: Record<
  EmailAccent,
  { headerBg: string; headerSub: string; badgeBg: string; badgeText: string; badgeLabel: string | null }
> = {
  default: {
    headerBg: '#1e40af',
    headerSub: '#93c5fd',
    badgeBg: '#dbeafe',
    badgeText: '#1e40af',
    badgeLabel: null,
  },
  reminder: {
    headerBg: '#b45309',
    headerSub: '#fde68a',
    badgeBg: '#fef3c7',
    badgeText: '#92400e',
    badgeLabel: 'Reminder',
  },
  account: {
    headerBg: '#1e40af',
    headerSub: '#93c5fd',
    badgeBg: '#dbeafe',
    badgeText: '#1e40af',
    badgeLabel: 'Your account',
  },
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function brandInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '•';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function getAppLoginUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  return base ? `${base}/login` : 'https://rent-pilot.net/login';
}

function ctaButton(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
      <tr>
        <td align="center" style="border-radius:8px;background:#1e40af;">
          <a href="${safeHref}" target="_blank" rel="noopener noreferrer"
            style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
            ${safeLabel}
          </a>
        </td>
      </tr>
    </table>`;
}

function infoBox(html: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="margin:20px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
      <tr><td style="padding:18px 20px;font-size:15px;line-height:1.6;color:#334155;">${html}</td></tr>
    </table>`;
}

function credentialRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
        <span style="display:block;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;">${escapeHtml(label)}</span>
        <span style="font-size:16px;font-weight:600;color:#0f172a;font-family:ui-monospace,Menlo,Consolas,monospace;">${escapeHtml(value)}</span>
      </td>
    </tr>`;
}

export function emailLayout(options: {
  title: string;
  bodyHtml: string;
  fromName?: string;
  previewText?: string;
  accent?: EmailAccent;
}): string {
  const { title, bodyHtml, fromName, previewText, accent = 'default' } = options;
  const style = ACCENT_STYLES[accent];
  const safeTitle = escapeHtml(title);
  const brandName = fromName?.trim() || 'Your property manager';
  const safeFrom = escapeHtml(brandName);
  const initials = escapeHtml(brandInitials(brandName));
  const preheader = escapeHtml(previewText || title);
  const badgeHtml = style.badgeLabel
    ? `<span style="display:inline-block;margin-bottom:14px;padding:4px 10px;background:${style.badgeBg};color:${style.badgeText};font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;border-radius:999px;">${style.badgeLabel}</span>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:${style.headerBg};padding:28px 32px 26px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
                <tr>
                  <td style="vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="48" height="48" align="center" valign="middle" style="width:48px;height:48px;background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.35);border-radius:12px;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.02em;">${initials}</td>
                      </tr>
                    </table>
                  </td>
                  <td style="vertical-align:middle;padding-left:14px;">
                    <p style="margin:0;color:#ffffff;font-size:16px;font-weight:700;line-height:1.3;">${safeFrom}</p>
                    <p style="margin:2px 0 0;color:${style.headerSub};font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Tenant Notice</p>
                  </td>
                </tr>
              </table>
              ${badgeHtml}
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.35;">${safeTitle}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 24px;color:#334155;font-size:16px;line-height:1.65;">${bodyHtml}</td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #e2e8f0;background:#f8fafc;">
              <p style="margin:0 0 8px;color:#64748b;font-size:13px;line-height:1.5;">
                This message was sent to you by <strong style="color:#475569;">${safeFrom}</strong>.
              </p>
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">
                Please do not reply to this automated message. Contact ${safeFrom} directly if you have questions.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;color:#94a3b8;font-size:11px;text-align:center;">© ${safeFrom}</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function tenantCredentialsEmail(params: {
  tenantName: string;
  clientName: string;
  username: string;
  temporaryPassword: string;
  isReset?: boolean;
}): { subject: string; html: string } {
  const loginUrl = getAppLoginUrl();
  const firstName = params.tenantName.trim().split(/\s+/)[0] || 'there';
  const subject = params.isReset
    ? `[${params.clientName}] Your portal password was reset`
    : `[${params.clientName}] Welcome — your tenant portal login`;

  const intro = params.isReset
    ? `<p style="margin:0 0 16px;">Hello <strong>${escapeHtml(firstName)}</strong>,</p>
       <p style="margin:0 0 16px;">Your password for the Rental Pilot tenant portal was reset by <strong>${escapeHtml(params.clientName)}</strong>. Use the credentials below to sign in. You will be asked to choose a new password right away.</p>`
    : `<p style="margin:0 0 16px;">Hello <strong>${escapeHtml(firstName)}</strong>,</p>
       <p style="margin:0 0 16px;">Welcome! <strong>${escapeHtml(params.clientName)}</strong> has set up your tenant portal account so you can view announcements, contracts, and payment information online.</p>
       <p style="margin:0 0 16px;">Sign in with the credentials below. For security, you must change your password on first login.</p>`;

  const body = `
    ${intro}
    ${infoBox(`
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${credentialRow('Username', params.username)}
        ${credentialRow('Temporary password', params.temporaryPassword)}
      </table>
    `)}
    ${ctaButton(loginUrl, 'Log in to tenant portal')}
  <p style="margin:16px 0 0;padding:14px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:13px;color:#92400e;line-height:1.5;">
      <strong>Keep this email private.</strong> Do not share your password. If you did not expect this message, contact ${escapeHtml(params.clientName)} immediately.
    </p>`;

  return {
    subject,
    html: emailLayout({
      title: params.isReset ? 'Password reset' : 'Your portal account is ready',
      bodyHtml: body,
      fromName: params.clientName,
      previewText: params.isReset
        ? `Temporary login details from ${params.clientName}`
        : `Your tenant portal login from ${params.clientName}`,
      accent: 'account',
    }),
  };
}

function isReminderTitle(title: string): boolean {
  const t = title.toLowerCase();
  return t.includes('reminder') || t.includes('due') || t.includes('expir') || t.includes('balance');
}

export function announcementEmail(params: {
  fromName: string;
  title: string;
  content: string;
}): { subject: string; html: string } {
  const reminder = isReminderTitle(params.title);
  const subject = reminder
    ? `[${params.fromName}] ${params.title}`
    : `${params.fromName}: ${params.title}`;

  const messageHtml = escapeHtml(params.content);

  const body = `
    <p style="margin:0 0 20px;">Hello,</p>
    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Message</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="margin:0 0 24px;background:${reminder ? '#fffbeb' : '#f8fafc'};border:1px solid ${reminder ? '#fde68a' : '#e2e8f0'};border-radius:10px;border-left:4px solid ${reminder ? '#f59e0b' : '#1e40af'};">
      <tr>
        <td style="padding:20px 22px;font-size:16px;line-height:1.65;color:#1e293b;white-space:pre-wrap;word-break:break-word;">${messageHtml}</td>
      </tr>
    </table>
    <p style="margin:0;color:#64748b;font-size:14px;">
      Regards,<br>
      <strong style="color:#0f172a;">${escapeHtml(params.fromName)}</strong>
    </p>
    ${ctaButton(getAppLoginUrl(), 'Open tenant portal')}`;

  return {
    subject,
    html: emailLayout({
      title: params.title,
      bodyHtml: body,
      fromName: params.fromName,
      previewText: params.content.slice(0, 120),
      accent: reminder ? 'reminder' : 'default',
    }),
  };
}

export function reminderEmail(params: {
  fromName: string;
  title: string;
  message: string;
}): { subject: string; html: string } {
  return announcementEmail({
    fromName: params.fromName,
    title: params.title,
    content: params.message,
  });
}
