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
  senderName = "Property Manager",
  senderEmail = "noreply@propertymanager.com",
}: SendEmailParams) {
  const apiKey = process.env.BREVO_API_KEY;
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

export function prescreeningConfirmationEmail(name: string) {
  return {
    subject: "Pre-Screening Application Received",
    htmlContent: `
      <div style="font-family: Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a;">Application Received</h2>
        <p>Hi ${name},</p>
        <p>Thank you for submitting your pre-screening application. We have received your information and will review it shortly.</p>
        <p>If your application meets our minimum requirements, we will reach out to schedule a showing and invite you to complete the formal screening process.</p>
        <p style="margin-top: 24px; color: #666;">Property Manager</p>
      </div>
    `,
  };
}

export function prescreeningApprovedEmail(name: string) {
  return {
    subject: "Next Step: Background & Credit Screening",
    htmlContent: `
      <div style="font-family: Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a;">You're Pre-Approved!</h2>
        <p>Hi ${name},</p>
        <p>Great news — your pre-screening application meets our minimum requirements.</p>
        <p>The next step is to complete a formal background and credit screening. The cost is <strong>$47</strong>, paid directly by you through the screening provider.</p>
        <div style="margin: 24px 0; padding: 16px; background: #f5f5f5; border-radius: 8px;">
          <p style="margin: 0; font-weight: bold;">How to proceed:</p>
          <ol style="margin: 8px 0 0 0; padding-left: 20px;">
            <li>We will contact you shortly to schedule a showing</li>
            <li>At that time, we will send you a direct link to complete the $47 screening</li>
            <li>Once the screening clears, we move forward with the lease</li>
          </ol>
        </div>
        <p><strong>Move-in costs reminder:</strong></p>
        <ul style="padding-left: 20px;">
          <li>First month's rent: $1,250</li>
          <li>Security deposit: $1,250</li>
          <li><strong>Total: $2,500</strong></li>
        </ul>
        <p>If you have any questions, reply to this email or contact your property manager directly.</p>
        <p style="margin-top: 24px; color: #666;">Property Manager</p>
      </div>
    `,
  };
}

export function prescreeningRejectedEmail(name: string) {
  return {
    subject: "Pre-Screening Application Update",
    htmlContent: `
      <div style="font-family: Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a;">Application Update</h2>
        <p>Hi ${name},</p>
        <p>Thank you for your interest and for taking the time to complete the pre-screening application.</p>
        <p>After reviewing your submission, we are unable to move forward with your application at this time based on the minimum qualification requirements for this property.</p>
        <p>We appreciate your time and wish you the best in your housing search.</p>
        <p style="margin-top: 24px; color: #666;">Property Manager</p>
      </div>
    `,
  };
}

export function prescreeningAdminNotification(name: string, email: string, score: number, status: string) {
  return {
    subject: `New Pre-Screening: ${name} (Score: ${score})`,
    htmlContent: `
      <div style="font-family: Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a;">New Pre-Screening Submission</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td style="padding: 8px; font-weight: bold;">Applicant:</td><td style="padding: 8px;">${name}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${email}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Score:</td><td style="padding: 8px;">${score}/100</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Status:</td><td style="padding: 8px; text-transform: uppercase;">${status}</td></tr>
        </table>
        <p style="margin-top: 16px;">Log in to your admin dashboard to review the full application.</p>
      </div>
    `,
  };
}
