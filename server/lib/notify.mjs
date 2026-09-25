import 'dotenv/config';

/**
 * Lead notifications for the wizard.
 *
 * 1. Webhook — POSTs lead JSON to LEAD_NOTIFY_WEBHOOK_URL
 *    (works with n8n, Zapier, Make, custom endpoints)
 * 2. Email   — SMTP via nodemailer (SMTP_HOST/PORT/USER/PASS/TO/FROM)
 *
 * Both are fire-and-forget; failures are logged, never thrown.
 */

const TIMEOUT_MS = 8_000;

/** E.164 for wa.me links: strips non-digits. */
function waNumber(phone) {
  return phone.replace(/\D/g, '');
}

/**
 * Shape the lead into the JSON payload for webhooks.
 */
export function buildLeadPayload(lead) {
  return {
    event: 'lead.created',
    timestamp: new Date().toISOString(),
    lead: {
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      wilaya: lead.wilaya,
      email: lead.email ?? null,
      material: lead.material ?? null,
      hardware: lead.hardware ?? null,
      measures: lead.measures ?? null,
      accessories: lead.accessories ?? null,
      estimate_low: lead.estimate_low ?? null,
      estimate_high: lead.estimate_high ?? null,
      currency: lead.currency ?? 'DZD',
      source: lead.source ?? 'website_wizard',
      attachments: lead.attachments ?? null,
      submitted_at: new Date().toISOString(),
    },
    links: {
      whatsapp_reply: `https://wa.me/${waNumber(lead.phone)}`,
      tel: `tel:${lead.phone}`,
      email: lead.email ? `mailto:${lead.email}` : null,
    },
  };
}

async function sendWebhook(lead, webhookUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildLeadPayload(lead)),
      signal: controller.signal,
    });
    console.log(`[notify] webhook ${new URL(webhookUrl).hostname} (${res.status})`);
  } finally {
    clearTimeout(timeout);
  }
}

async function sendEmail(lead) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_TO, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_TO) return;

  const nodemailer = (await import('nodemailer')).default;
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });

  const text = [
    `Nouveau lead — Madera Kitchen`,
    ``,
    `Nom        : ${lead.name}`,
    `Téléphone  : ${lead.phone}`,
    `Email      : ${lead.email ?? '—'}`,
    `Wilaya     : ${lead.wilaya}`,
    `Matériau   : ${lead.material ?? '—'}`,
    `Estimation : ${lead.estimate_low ? `${lead.estimate_low.toLocaleString()} – ${lead.estimate_high?.toLocaleString()} ${lead.currency ?? 'DZD'}` : '—'}`,
    `Accessoires: ${lead.accessories ?? '—'}`,
    `Mesures    : ${lead.measures ?? '—'}`,
    ``,
    `WhatsApp  : https://wa.me/${waNumber(lead.phone)}`,
  ].join('\n');

  await transporter.sendMail({
    from: SMTP_FROM || `"Madera Kitchen" <${SMTP_USER || 'noreply@madera.local'}>`,
    to: SMTP_TO,
    subject: `Nouveau lead : ${lead.name} (${lead.wilaya})`,
    text,
  });
  console.log(`[notify] email → ${SMTP_TO}`);
}

/**
 * Fire-and-forget — never blocks the request, never throws.
 * Call with `void` to explicitly ignore the promise.
 */
export async function notifyNewLead(lead) {
  const tasks = [];

  if (process.env.LEAD_NOTIFY_WEBHOOK_URL) {
    tasks.push(
      sendWebhook(lead, process.env.LEAD_NOTIFY_WEBHOOK_URL).catch((err) => {
        console.error('[notify] webhook failed:', err.message);
      }),
    );
  }

  if (process.env.SMTP_HOST && process.env.SMTP_TO) {
    tasks.push(
      sendEmail(lead).catch((err) => {
        console.error('[notify] email failed:', err.message);
      }),
    );
  }

  await Promise.allSettled(tasks);
}
