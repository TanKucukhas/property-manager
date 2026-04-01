import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/mailer";

export async function POST() {
  const uid = crypto.randomUUID();
  console.log(`[EMAIL-TEST] uid=${uid} — starting`);

  try {
    const result = await sendEmail({
      to: [{ email: "tankucukhas@gmail.com", name: "Test" }],
      subject: `Email Test — ${uid}`,
      htmlContent: `<div style="font-family: Roboto, sans-serif; padding: 24px;"><h2>Email Test</h2><p>If you see this, Brevo is working.</p><p><strong>UID:</strong> ${uid}</p><p><strong>Time:</strong> ${new Date().toISOString()}</p></div>`,
    });

    console.log(`[EMAIL-TEST] uid=${uid} — result:`, JSON.stringify(result));
    return NextResponse.json({ success: true, uid, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[EMAIL-TEST] uid=${uid} — error:`, message);
    return NextResponse.json({ success: false, uid, error: message }, { status: 500 });
  }
}
