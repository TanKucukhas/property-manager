import { asc, eq } from "drizzle-orm";
import { leaseEvents, leasePackets, leaseSigners, prescreenings, properties, propertyListings, tenants } from "@/db/schema";
import { getOpenListing, syncListingWithStatus } from "@/lib/listings";
import { fillPlaceholders, type FillSigner } from "./fill";
import {
  defaultDocuments, defaultLeaseData, normalizeLeaseData, renderPacket,
  type DocKey, type LeaseData, DOC_ORDER,
} from "./templates";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export type PacketRow = typeof leasePackets.$inferSelect;
export type SignerRow = typeof leaseSigners.$inferSelect;

export function newToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function requestMeta(request: Request) {
  const h = request.headers;
  const ip = h.get("cf-connecting-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  return { ip, userAgent: h.get("user-agent")?.slice(0, 400) || null };
}

export async function logEvent(
  db: Db,
  packetId: number,
  event: string,
  opts: { signerId?: number | null; detail?: string | null; request?: Request } = {},
) {
  const meta = opts.request ? requestMeta(opts.request) : { ip: null, userAgent: null };
  await db.insert(leaseEvents).values({
    packetId,
    signerId: opts.signerId ?? null,
    event,
    detail: opts.detail ?? null,
    ip: meta.ip,
    userAgent: meta.userAgent,
    createdAt: new Date().toISOString(),
  }).run();
}

export function parseDocs(raw: string | null | undefined): DocKey[] {
  try {
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? DOC_ORDER.filter((k) => arr.includes(k)) : [];
  } catch {
    return [];
  }
}

export function parseData(raw: string | null | undefined): LeaseData {
  try {
    return normalizeLeaseData(JSON.parse(raw || "{}"));
  } catch {
    return defaultLeaseData();
  }
}

export function parseResponses(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}

export function toFillSigner(s: SignerRow): FillSigner {
  return {
    slot: s.slot,
    name: s.name,
    status: s.status,
    signedAt: s.signedAt,
    signatureImage: s.signatureImage,
    initials: s.initials,
    responses: parseResponses(s.responses),
  };
}

export async function getSigners(db: Db, packetId: number): Promise<SignerRow[]> {
  return db.select().from(leaseSigners).where(eq(leaseSigners.packetId, packetId)).orderBy(asc(leaseSigners.id)).all();
}

/** Document HTML for a packet: the frozen snapshot once sent, a live render while draft. */
export function packetHtml(packet: PacketRow, signers: SignerRow[]): string {
  const base = packet.snapshotHtml ?? renderPacket(parseData(packet.data), parseDocs(packet.documents));
  return fillPlaceholders(base, signers.map(toFillSigner));
}

/** Public view of a signer for the audit certificate (no token, no signature image). */
export function auditSigner(s: SignerRow) {
  return {
    id: s.id,
    role: s.role,
    slot: s.slot,
    name: s.name,
    title: s.title,
    email: s.email,
    status: s.status,
    viewedAt: s.viewedAt,
    consentAt: s.consentAt,
    signedAt: s.signedAt,
    typedName: s.typedName,
    ip: s.ip,
    userAgent: s.userAgent,
    signedHash: s.signedHash,
  };
}

function addMonthsMinusDay(iso: string, months: number): string {
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  if (isNaN(+d)) return "";
  d.setUTCMonth(d.getUTCMonth() + months);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function toIsoDate(s: string | null | undefined): string {
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return isNaN(+d) ? "" : d.toISOString().slice(0, 10);
}

function fullAddress(p: { address1: string; city: string; state: string; zip: string }) {
  return `${p.address1}, ${p.city}, ${p.state} ${p.zip}`;
}

/**
 * Starting data for a new packet from an applicant, a tenant record or a
 * property. Everything is editable afterwards.
 */
export async function prefillLeaseData(
  db: Db,
  src: { prescreeningId?: number; tenantId?: number; propertyId?: number },
): Promise<{ data: LeaseData; documents: DocKey[]; propertyId: number | null; title: string }> {
  const data = defaultLeaseData();
  let propertyId: number | null = src.propertyId ?? null;

  if (src.prescreeningId) {
    const p = await db.select().from(prescreenings).where(eq(prescreenings.id, src.prescreeningId)).get();
    if (p) {
      propertyId = propertyId ?? p.propertyId ?? null;
      data.tenants = [{ name: p.fullName, email: p.email, phone: p.phone }];
      const others = String(p.occupantNames || "")
        .split(/\n|,/)
        .map((n: string) => n.trim())
        .filter((n: string) => n && n.toLowerCase() !== p.fullName.trim().toLowerCase());
      data.occupants = others.join(", ");
      const start = toIsoDate(p.desiredMoveIn);
      if (start) {
        data.leaseStart = start;
        data.leaseEnd = addMonthsMinusDay(start, 12);
      }
      if (p.usingVoucher === "yes") {
        data.tenancyType = "voucher";
        data.voucherAgency = p.voucherAgency || "";
      }
      if (p.hasPets && p.petsJson) {
        try {
          const parsed = JSON.parse(p.petsJson) as { pets?: { type?: string; breed?: string; weight?: string; age?: string }[] };
          data.pets = (parsed.pets || []).map((x) => ({
            species: x.type || "", breed: x.breed || "", weight: x.weight ? `${x.weight} lbs` : "", age: x.age || "",
          }));
          data.petsApproved = data.pets.length > 0;
        } catch {
          // ignore malformed pet JSON
        }
      }
    }
  }

  if (src.tenantId) {
    const t = await db.select().from(tenants).where(eq(tenants.id, src.tenantId)).get();
    if (t) {
      propertyId = propertyId ?? t.propertyId ?? null;
      data.tenants = [{ name: t.fullName, email: t.email || "", phone: t.phone || "" }];
      if (t.moveInDate) {
        data.leaseStart = toIsoDate(t.moveInDate);
        data.leaseEnd = t.moveOutDate ? toIsoDate(t.moveOutDate) : addMonthsMinusDay(data.leaseStart, 12);
      }
      data.monthlyRent = t.monthlyRent;
      data.securityDeposit = t.depositRequired;
    }
  }

  if (propertyId) {
    const prop = await db.select().from(properties).where(eq(properties.id, propertyId)).get();
    if (prop) {
      data.propertyAddress = fullAddress(prop);
      if (!data.monthlyRent) data.monthlyRent = prop.monthlyRent;
      if (!data.securityDeposit) data.securityDeposit = prop.securityDeposit;
    }
  }

  const name = data.tenants[0]?.name || "New tenant";
  const where = data.propertyAddress.split(",")[0] || "Lease";
  return { data, documents: defaultDocuments(data), propertyId, title: `${where} — ${name}` };
}

export function signingEmail(opts: { name: string; title: string; address: string; link: string; landlordName: string }) {
  return {
    subject: `Please review and sign: ${opts.title}`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color:#1a1a1a">
        <h2 style="margin-top:0">Your lease is ready to sign</h2>
        <p>Hi ${escHtml(opts.name)},</p>
        <p>${escHtml(opts.landlordName)} has prepared the lease documents for <b>${escHtml(opts.address)}</b>. Please review every document and sign electronically using your private link:</p>
        <p style="margin:24px 0"><a href="${escHtml(opts.link)}" style="background:#111;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Review and sign</a></p>
        <p style="font-size:13px;color:#555">This link is personal — please don’t forward it. You can download a PDF copy before and after signing. If you prefer to sign on paper, reply to this email.</p>
      </div>`,
  };
}

export function completedEmail(opts: { name: string; title: string; link: string }) {
  return {
    subject: `Signed: ${opts.title}`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color:#1a1a1a">
        <h2 style="margin-top:0">All parties have signed</h2>
        <p>Hi ${escHtml(opts.name)},</p>
        <p>Every party has signed <b>${escHtml(opts.title)}</b>. You can view and download the completed copy at any time:</p>
        <p style="margin:24px 0"><a href="${escHtml(opts.link)}" style="background:#111;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">View signed documents</a></p>
        <p style="font-size:13px;color:#555">Please keep a copy for your records.</p>
      </div>`,
  };
}

function escHtml(s: string) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------- pipeline

/** Applicant statuses the lease flow is allowed to move between. */
const LEASE_FLOW_STATUSES = ["approved", "lease-draft", "lease-sent", "lease-review", "lease-signed"];

/** Where a packet puts its applicant. `null` packet = deleted draft. */
function applicantStatusFor(packet: PacketRow | null, signers: SignerRow[]): string {
  if (!packet || packet.status === "void") return "approved";
  if (packet.status === "draft") return "lease-draft";
  if (packet.status === "completed") return "lease-signed";
  const tenants = signers.filter((s) => s.role === "tenant");
  return tenants.length && tenants.every((s) => s.status === "signed") ? "lease-review" : "lease-sent";
}

/**
 * Keeps the linked applicant's status in step with the packet:
 * approved → lease-draft → lease-sent → lease-review (tenants signed, landlord to countersign) → lease-signed.
 * Never touches an applicant outside that flow (e.g. rejected).
 */
export async function syncApplicantStatus(db: Db, prescreeningId: number | null, packet: PacketRow | null) {
  if (!prescreeningId) return;
  const p = await db.select({ status: prescreenings.status }).from(prescreenings).where(eq(prescreenings.id, prescreeningId)).get();
  if (!p || !LEASE_FLOW_STATUSES.includes(p.status)) return;
  const signers = packet ? await getSigners(db, packet.id) : [];
  const next = applicantStatusFor(packet, signers);
  if (next === p.status) return;
  await db.update(prescreenings).set({ status: next, updatedAt: new Date().toISOString() }).where(eq(prescreenings.id, prescreeningId)).run();
  if (packet) await logEvent(db, packet.id, "applicant_status", { detail: `${p.status} → ${next}` });
}

/**
 * After everyone signed: create (or link) the tenant record, record the
 * placement on the listing round, and mark the property occupied (which
 * closes the open listing so new applications stop attaching to it).
 */
export async function onPacketCompleted(db: Db, packet: PacketRow) {
  const data = parseData(packet.data);
  const now = new Date().toISOString();
  const primary = data.tenants[0];
  let tenantId = packet.tenantId ?? null;
  let propertyId = packet.propertyId ?? null;
  let listingId: number | null = null;

  if (packet.prescreeningId) {
    const p = await db.select().from(prescreenings).where(eq(prescreenings.id, packet.prescreeningId)).get();
    if (p) {
      propertyId = propertyId ?? p.propertyId ?? null;
      listingId = p.listingId ?? null;
    }
  }

  if (!tenantId && primary) {
    const existing = primary.email
      ? (await db.select().from(tenants).where(eq(tenants.email, primary.email)).all())
          .find((t: { propertyId: number | null }) => t.propertyId === propertyId)
      : null;
    if (existing) {
      tenantId = existing.id;
    } else {
      const created = await db.insert(tenants).values({
        propertyId,
        fullName: data.tenants.map((t) => t.name).join(" & "),
        email: primary.email || null,
        phone: primary.phone || null,
        moveInDate: data.leaseStart || null,
        moveOutDate: data.leaseEnd || null,
        monthlyRent: data.monthlyRent,
        depositRequired: data.securityDeposit,
        depositPaid: 0,
        leaseStatus: "active",
        notes: `Created from signed lease packet #${packet.id}.${data.occupants ? ` Occupants: ${data.occupants}` : ""}`,
        createdAt: now,
        updatedAt: now,
      }).returning().get();
      tenantId = created.id;
    }
    await db.update(leasePackets).set({ tenantId, updatedAt: now }).where(eq(leasePackets.id, packet.id)).run();
    await logEvent(db, packet.id, "tenant_linked", { detail: `tenant #${tenantId}` });
  }

  if (propertyId) {
    const listing = listingId
      ? await db.select().from(propertyListings).where(eq(propertyListings.id, listingId)).get()
      : await getOpenListing(db, propertyId);
    if (listing) {
      await db.update(propertyListings)
        .set({ placedPrescreeningId: packet.prescreeningId ?? listing.placedPrescreeningId, tenantId, updatedAt: now })
        .where(eq(propertyListings.id, listing.id))
        .run();
    }
    const prop = await db.select({ status: properties.status }).from(properties).where(eq(properties.id, propertyId)).get();
    if (prop && prop.status !== "occupied") {
      await db.update(properties).set({ status: "occupied", updatedAt: now }).where(eq(properties.id, propertyId)).run();
      await syncListingWithStatus(db, propertyId, prop.status, "occupied");
      await logEvent(db, packet.id, "property_occupied", { detail: `property #${propertyId}: ${prop.status} → occupied` });
    }
  }
}

export function countersignEmail(opts: { tenantNames: string; title: string; link: string }) {
  return {
    subject: `Ready to countersign: ${opts.title}`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color:#1a1a1a">
        <h2 style="margin-top:0">Tenant signed — your review</h2>
        <p>${escHtml(opts.tenantNames)} signed <b>${escHtml(opts.title)}</b>. Review their answers (insurance, notes) and countersign to complete the lease.</p>
        <p style="margin:24px 0"><a href="${escHtml(opts.link)}" style="background:#111;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Review and countersign</a></p>
      </div>`,
  };
}
