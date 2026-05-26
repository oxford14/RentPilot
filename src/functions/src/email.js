const { Resend } = require('resend');

const ACCENT_STYLES = {
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

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getAppLoginUrl() {
  const base = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://rent-pilot.net')
    .trim()
    .replace(/\/$/, '');
  return `${base}/login`;
}

function getFromAddress() {
  const email = process.env.RESEND_FROM_EMAIL || 'noreply@rent-pilot.net';
  const name = process.env.RESEND_FROM_NAME || 'RentPilot';
  return `${name} <${email}>`;
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function ctaButton(href, label) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
      <tr>
        <td align="center" style="border-radius:8px;background:#1e40af;">
          <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"
            style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>`;
}

function emailLayout({ title, bodyHtml, fromName, previewText, accent = 'default' }) {
  const style = ACCENT_STYLES[accent] || ACCENT_STYLES.default;
  const safeTitle = escapeHtml(title);
  const safeFrom = fromName ? escapeHtml(fromName) : 'Your property manager';
  const preheader = escapeHtml(previewText || title);
  const badgeHtml = style.badgeLabel
    ? `<span style="display:inline-block;margin-bottom:10px;padding:4px 10px;background:${style.badgeBg};color:${style.badgeText};font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;border-radius:999px;">${style.badgeLabel}</span>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
        <tr>
          <td style="background:${style.headerBg};padding:28px 32px 24px;">
            ${badgeHtml}
            <p style="margin:0 0 6px;color:${style.headerSub};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">RentPilot · Tenant Portal</p>
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;line-height:1.35;">${safeTitle}</h1>
            <p style="margin:10px 0 0;color:${style.headerSub};font-size:14px;">From ${safeFrom}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 32px 24px;color:#334155;font-size:16px;line-height:1.65;">${bodyHtml}</td>
        </tr>
        <tr>
          <td style="padding:20px 32px 28px;border-top:1px solid #e2e8f0;background:#f8fafc;">
            <p style="margin:0 0 8px;color:#64748b;font-size:13px;line-height:1.5;">
              This email was sent by <strong style="color:#475569;">${safeFrom}</strong> through RentPilot.
            </p>
            <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">
              Please do not reply to this automated message. Contact your property manager directly if you have questions.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function isReminderTitle(title) {
  const t = String(title).toLowerCase();
  return t.includes('reminder') || t.includes('due') || t.includes('expir') || t.includes('balance');
}

function announcementEmail({ fromName, title, content }) {
  const reminder = isReminderTitle(title);
  const subject = reminder ? `[${fromName}] ${title}` : `${fromName}: ${title}`;
  const messageHtml = escapeHtml(content).replace(/\n/g, '<br>');

  const body = `
    <p style="margin:0 0 20px;">Hello,</p>
    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Message</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="margin:0 0 24px;background:${reminder ? '#fffbeb' : '#f8fafc'};border:1px solid ${reminder ? '#fde68a' : '#e2e8f0'};border-radius:10px;border-left:4px solid ${reminder ? '#f59e0b' : '#1e40af'};">
      <tr>
        <td style="padding:20px 22px;font-size:16px;line-height:1.65;color:#1e293b;">${messageHtml}</td>
      </tr>
    </table>
    <p style="margin:0;color:#64748b;font-size:14px;">
      Regards,<br>
      <strong style="color:#0f172a;">${escapeHtml(fromName)}</strong>
    </p>
    ${ctaButton(getAppLoginUrl(), 'Open tenant portal')}`;

  return {
    subject,
    html: emailLayout({
      title,
      bodyHtml: body,
      fromName,
      previewText: String(content).slice(0, 120),
      accent: reminder ? 'reminder' : 'default',
    }),
  };
}

async function sendEmail({ to, subject, html }) {
  const resend = getResendClient();
  if (!resend) {
    console.warn('[Email] RESEND_API_KEY not set — skipped:', subject);
    return { success: false, skipped: true };
  }
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (recipients.length === 0) return { success: false };
  try {
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: recipients,
      subject,
      html,
    });
    if (error) {
      console.error('[Email] Resend error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('[Email]', err);
    return { success: false, error: err.message };
  }
}

module.exports = { sendEmail, announcementEmail, emailLayout };
