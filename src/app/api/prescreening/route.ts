import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { prescreenings } from "@/db/schema";
import { prescreeningSchema, scorePrescreening } from "@/lib/validations";
import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { sendEmail, prescreeningConfirmationEmail, prescreeningApprovedEmail, prescreeningRejectedEmail, prescreeningAdminNotification, type ApplicationSummary } from "@/lib/mailer";

export async function POST(request: Request) {
  try {
    const db = await getDb();
    const body = await request.json();
    const parsed = prescreeningSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const { score, status } = scorePrescreening(data);

    const result = db.insert(prescreenings).values({
      ...data,
      petsJson: data.petsJson || null,
      currentHousingPayment: data.currentHousingPayment ?? null,
      score,
      status,
    }).returning().get();

    // Build summary for applicant's copy
    const summary: ApplicationSummary = {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      desiredMoveIn: data.desiredMoveIn,
      adultsCount: data.adultsCount,
      childrenCount: data.childrenCount ?? 0,
      employmentStatus: data.employmentStatus,
      monthlyIncome: data.monthlyIncome,
      creditScoreRange: data.creditScoreRange,
      housingStatus: data.housingStatus,
      hasPets: data.hasPets,
      preferredContactMethod: data.preferredContactMethod ?? undefined,
      showingAvailability: data.showingAvailability ?? undefined,
    };

    // Send status-specific email to applicant (with their submission copy)
    if (status === "pre-approved") {
      const approved = prescreeningApprovedEmail(data.fullName, summary);
      sendEmail({ to: [{ email: data.email, name: data.fullName }], ...approved }).catch(console.error);
    } else if (status === "rejected") {
      const rejected = prescreeningRejectedEmail(data.fullName, summary);
      sendEmail({ to: [{ email: data.email, name: data.fullName }], ...rejected }).catch(console.error);
    } else {
      const confirmation = prescreeningConfirmationEmail(data.fullName, summary);
      sendEmail({ to: [{ email: data.email, name: data.fullName }], ...confirmation }).catch(console.error);
    }

    // Notify admin of every submission
    const adminNotif = prescreeningAdminNotification(data.fullName, data.email, score, status);
    sendEmail({
      to: [{ email: "tankucukhas@gmail.com", name: "Admin" }],
      ...adminNotif,
    }).catch(console.error);

    return NextResponse.json({ success: true, id: result.id, score, status });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const records = db.select().from(prescreenings).orderBy(desc(prescreenings.createdAt)).all();
  return NextResponse.json(records);
}
