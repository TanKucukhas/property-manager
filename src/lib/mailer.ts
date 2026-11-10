interface SendEmailParams {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  senderName?: string;
  senderEmail?: string;
}

/** Minimal shape of the Cloudflare `send_email` binding (wrangler.jsonc → EMAIL). */
interface SendEmailBinding {
  send(message: {
    to: string | string[];
    from: { email: string; name?: string };
    subject: string;
    html: string;
    text: string;
  }): Promise<{ messageId: string }>;
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<(br|\/p|\/div|\/h[1-6]|\/tr|\/li)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

/**
 * Sends a transactional email through Cloudflare Email Service (Workers
 * `send_email` binding; cresiq.com is onboarded for sending). Returns
 * `{ messageId }`, or `null` when sending is unavailable or fails — callers
 * must never let email failure break the request.
 */
export async function sendEmail({
  to,
  subject,
  htmlContent,
  senderName = "CresIQ Property Manager",
  senderEmail = "hello@cresiq.com",
}: SendEmailParams): Promise<{ messageId: string } | null> {
  let binding: SendEmailBinding | undefined;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    binding = (env as unknown as { EMAIL?: SendEmailBinding }).EMAIL;
  } catch {
    // Outside the Workers runtime (plain `next dev`).
  }
  if (!binding) {
    console.warn(`EMAIL binding not available, skipping email "${subject}"`);
    return null;
  }

  try {
    return await binding.send({
      to: to.map((r) => r.email),
      from: { email: senderEmail, name: senderName },
      subject,
      html: htmlContent,
      text: htmlToText(htmlContent),
    });
  } catch (e) {
    const err = e as { code?: string; message?: string };
    console.error(`Email send failed (${err.code ?? "unknown"}): ${err.message ?? String(e)}`);
    return null;
  }
}

// Build a summary of the applicant's submission for their records
export interface ApplicationSummary {
  fullName: string;
  email: string;
  phone: string;
  desiredMoveIn: string;
  adultsCount: number;
  childrenCount: number;
  employmentStatus: string;
  monthlyIncome: number;
  creditScoreRange: string;
  housingStatus: string;
  hasPets: boolean;
  preferredContactMethod?: string;
  showingAvailability?: string;
}

function buildSummaryBlock(s: ApplicationSummary): string {
  const row = (label: string, value: string) =>
    `<tr><td style="padding: 6px 8px; color: #666; white-space: nowrap;">${label}</td><td style="padding: 6px 8px;">${value}</td></tr>`;
  return `
    <div style="margin: 20px 0; padding: 16px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eee;">
      <p style="margin: 0 0 12px 0; font-weight: bold; font-size: 14px;">Your Submission Summary</p>
      <table style="border-collapse: collapse; width: 100%; font-size: 13px;">
        ${row("Name", s.fullName)}
        ${row("Email", s.email)}
        ${row("Phone", s.phone)}
        ${row("Desired Move-in", s.desiredMoveIn)}
        ${row("Adults / Children", `${s.adultsCount} / ${s.childrenCount}`)}
        ${row("Employment", s.employmentStatus)}
        ${row("Monthly Income", `$${s.monthlyIncome.toLocaleString()}`)}
        ${row("Credit Score", s.creditScoreRange)}
        ${row("Housing Status", s.housingStatus)}
        ${row("Pets", s.hasPets ? "Yes" : "No")}
        ${s.preferredContactMethod ? row("Contact Preference", s.preferredContactMethod) : ""}
        ${s.showingAvailability ? row("Showing Availability", s.showingAvailability) : ""}
      </table>
    </div>`;
}

export function prescreeningConfirmationEmail(name: string, summary?: ApplicationSummary) {
  return {
    subject: "Pre-Screening Application Received — Your Copy",
    htmlContent: `
      <div style="font-family: Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a;">Application Received</h2>
        <p>Hi ${name},</p>
        <p>Thank you for submitting your pre-screening application. We have received your information and will review it shortly.</p>
        <p>If your application meets our minimum requirements, we will reach out to schedule a showing and invite you to complete the formal screening process.</p>
        ${summary ? buildSummaryBlock(summary) : ""}
        <p style="font-size: 12px; color: #999;">Please keep this email for your records.</p>
        <p style="margin-top: 24px; color: #666;">CresIQ Property Management</p>
      </div>
    `,
  };
}

export interface ShareLeadInfo {
  shareType: string;
  leadSource: string | null;
  recipientName: string | null;
  sourceProfile: string | null;
  notes: string | null;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
}

export function prescreeningAdminNotification(name: string, email: string, score: number, flags: string[], lead?: ShareLeadInfo | null) {
  const flagsHtml = flags.length > 0
    ? `<div style="margin-top: 12px; padding: 12px; background: #fff3cd; border-radius: 6px;"><p style="margin: 0 0 6px; font-weight: bold; font-size: 13px;">Flags:</p><ul style="margin: 0; padding-left: 18px; font-size: 13px;">${flags.map(f => `<li>${escapeHtml(f)}</li>`).join("")}</ul></div>`
    : `<p style="margin-top: 12px; color: #28a745; font-size: 13px;">No flags — clean application.</p>`;

  let leadHtml = "";
  if (lead) {
    const profileLink = lead.sourceProfile
      ? `<a href="${escapeHtml(lead.sourceProfile)}" style="color: #2563eb;">${escapeHtml(lead.sourceProfile)}</a>`
      : "—";
    leadHtml = `
      <div style="margin-top: 16px; padding: 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px;">
        <p style="margin: 0 0 8px; font-weight: bold; font-size: 13px; color: #1e40af;">Shared via — Lead Details</p>
        <table style="border-collapse: collapse; width: 100%; font-size: 13px;">
          <tr><td style="padding: 4px 8px; color: #475569;">Type:</td><td style="padding: 4px 8px;">${escapeHtml(lead.shareType === "direct" ? "Direct (DM)" : "Public link")}</td></tr>
          <tr><td style="padding: 4px 8px; color: #475569;">Source:</td><td style="padding: 4px 8px;">${escapeHtml(lead.leadSource || "—")}</td></tr>
          ${lead.recipientName ? `<tr><td style="padding: 4px 8px; color: #475569;">Shared with:</td><td style="padding: 4px 8px;">${escapeHtml(lead.recipientName)}</td></tr>` : ""}
          <tr><td style="padding: 4px 8px; color: #475569;">Profile:</td><td style="padding: 4px 8px;">${profileLink}</td></tr>
          ${lead.notes ? `<tr><td style="padding: 4px 8px; color: #475569; vertical-align: top;">Notes:</td><td style="padding: 4px 8px; white-space: pre-wrap;">${escapeHtml(lead.notes)}</td></tr>` : ""}
        </table>
      </div>
    `;
  }

  return {
    subject: `New Application: ${name} (Score: ${score}/100)${lead?.leadSource ? ` — via ${lead.leadSource}` : ""}`,
    htmlContent: `
      <div style="font-family: Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a;">New Pre-Screening Application</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td style="padding: 8px; font-weight: bold;">Applicant:</td><td style="padding: 8px;">${escapeHtml(name)}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${escapeHtml(email)}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Score:</td><td style="padding: 8px;"><strong>${score}/100</strong></td></tr>
        </table>
        ${flagsHtml}
        ${leadHtml}
        <p style="margin-top: 16px;">Log in to review the full application and update status.</p>
      </div>
    `,
  };
}
