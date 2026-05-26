import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { prescreenings, applicationShares, shareVisits, properties } from "@/db/schema";
import { prescreeningSchema, scorePrescreening } from "@/lib/validations";
import { and, desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { sendEmail, prescreeningConfirmationEmail, prescreeningAdminNotification, type ApplicationSummary, type ShareLeadInfo } from "@/lib/mailer";

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
    const property = data.propertyId
      ? await db.select().from(properties).where(eq(properties.id, data.propertyId)).get()
      : null;
    const { score, flags } = scorePrescreening(data, property);

    let shareId: number | null = null;
    let leadInfo: ShareLeadInfo | null = null;
    if (data.shareToken) {
      const share = await db.select().from(applicationShares).where(eq(applicationShares.shareToken, data.shareToken)).get();
      if (share) {
        shareId = share.id;
        leadInfo = {
          shareType: share.shareType,
          leadSource: share.leadSource,
          recipientName: share.recipientName,
          sourceProfile: share.sourceProfile,
          notes: share.notes,
        };
      }
    }

    const { shareToken: _shareToken, visitorId: incomingVisitorId, ...rest } = data;
    void _shareToken;
    const result = await db.insert(prescreenings).values({
      ...rest,
      petsJson: data.petsJson || null,
      currentHousingPayment: data.currentHousingPayment ?? null,
      score,
      status: "new",
      shareId,
    }).returning().get();

    if (shareId) {
      const now = new Date().toISOString();
      const share = await db.select().from(applicationShares).where(eq(applicationShares.id, shareId)).get();
      const visitorIdForVisit = share?.shareType === "direct" ? "direct" : (incomingVisitorId || "anon");
      const existing = await db
        .select()
        .from(shareVisits)
        .where(and(eq(shareVisits.shareId, shareId), eq(shareVisits.visitorId, visitorIdForVisit)))
        .get();
      if (existing) {
        await db
          .update(shareVisits)
          .set({ completedAt: now, lastSeenAt: now, submittedPrescreeningId: result.id })
          .where(eq(shareVisits.id, existing.id))
          .run();
      } else {
        await db.insert(shareVisits).values({
          shareId,
          visitorId: visitorIdForVisit,
          furthestStep: 0,
          totalSteps: 0,
          firstOpenedAt: now,
          lastSeenAt: now,
          completedAt: now,
          submittedPrescreeningId: result.id,
        }).run();
      }
    }

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

    // Send emails — must await in Workers (no background tasks after response)
    const confirmation = prescreeningConfirmationEmail(data.fullName, summary);
    const adminNotif = prescreeningAdminNotification(data.fullName, data.email, score, flags, leadInfo);
    await Promise.allSettled([
      sendEmail({ to: [{ email: data.email, name: data.fullName }], ...confirmation }),
      sendEmail({ to: [{ email: "tankucukhas@gmail.com", name: "Admin" }], ...adminNotif }),
    ]);

    return NextResponse.json({ success: true, id: result.id });
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
  const records = await db
    .select({
      prescreening: prescreenings,
      share: {
        id: applicationShares.id,
        shareToken: applicationShares.shareToken,
        shareType: applicationShares.shareType,
        leadSource: applicationShares.leadSource,
        recipientName: applicationShares.recipientName,
        sourceProfile: applicationShares.sourceProfile,
        notes: applicationShares.notes,
        createdAt: applicationShares.createdAt,
      },
    })
    .from(prescreenings)
    .leftJoin(applicationShares, eq(prescreenings.shareId, applicationShares.id))
    .orderBy(desc(prescreenings.createdAt))
    .all();

  const flat = records.map((r: typeof records[number]) => ({ ...r.prescreening, share: r.share?.id ? r.share : null }));
  return NextResponse.json(flat);
}
