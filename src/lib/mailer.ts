const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

interface SendEmailParams {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  senderName?: string;
  senderEmail?: string;
}

export async function sendEmail({
  to,
  subject,
  htmlContent,
  senderName = "Cresiq Property Manager",
  senderEmail = "hello@cresiq.com",
}: SendEmailParams) {
  let apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    try {
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      const { env } = await getCloudflareContext();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiKey = (env as any).BREVO_API_KEY;
    } catch {
      // local dev
    }
  }
  if (!apiKey) {
    console.warn("BREVO_API_KEY not set, skipping email");
    return null;
  }

  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to,
      subject,
      htmlContent,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Brevo email failed:", err);
    return null;
  }

  return res.json();
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
        <p style="margin-top: 24px; color: #666;">Cresiq Property Management</p>
      </div>
    `,
  };
}

export function prescreeningAdminNotification(name: string, email: string, score: number, flags: string[]) {
  const flagsHtml = flags.length > 0
    ? `<div style="margin-top: 12px; padding: 12px; background: #fff3cd; border-radius: 6px;"><p style="margin: 0 0 6px; font-weight: bold; font-size: 13px;">Flags:</p><ul style="margin: 0; padding-left: 18px; font-size: 13px;">${flags.map(f => `<li>${f}</li>`).join("")}</ul></div>`
    : `<p style="margin-top: 12px; color: #28a745; font-size: 13px;">No flags — clean application.</p>`;

  return {
    subject: `New Application: ${name} (Score: ${score}/100)`,
    htmlContent: `
      <div style="font-family: Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a;">New Pre-Screening Application</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td style="padding: 8px; font-weight: bold;">Applicant:</td><td style="padding: 8px;">${name}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${email}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Score:</td><td style="padding: 8px;"><strong>${score}/100</strong></td></tr>
        </table>
        ${flagsHtml}
        <p style="margin-top: 16px;">Log in to review the full application and update status.</p>
      </div>
    `,
  };
}
