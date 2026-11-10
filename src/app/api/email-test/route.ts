import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/mailer";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uid = crypto.randomUUID();
  console.log(`[EMAIL-TEST] uid=${uid} — starting`);

  try {
    const result = await sendEmail({
      to: [{ email: "tankucukhas@gmail.com", name: "Test" }],
      subject: `Email Test — ${uid}`,
      htmlContent: `<div style="font-family: Roboto, sans-serif; padding: 24px;"><h2>Email Test</h2><p>If you see this, Cloudflare Email Service is working.</p><p><strong>UID:</strong> ${uid}</p><p><strong>Time:</strong> ${new Date().toISOString()}</p></div>`,
    });

    console.log(`[EMAIL-TEST] uid=${uid} — result:`, JSON.stringify(result));
    // sendEmail returns null when the binding is missing or the send is rejected.
    return NextResponse.json({ success: result !== null, uid, result, ...(result === null ? { error: "Email was not sent — check the Worker logs (wrangler tail) for the reason" } : {}) }, { status: result === null ? 502 : 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[EMAIL-TEST] uid=${uid} — error:`, message);
    return NextResponse.json({ success: false, uid, error: message }, { status: 500 });
  }
}
