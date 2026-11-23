/**
 * Lease packet templates. Pure functions (no DB / runtime APIs) so the admin
 * editor can render a live preview in the browser and the server can freeze
 * exactly the same HTML when a packet is sent for signature.
 *
 * The lease text follows the reviewed 1635 6th Street draft (Ohio). Signature
 * spots are placeholder tokens that `fillPlaceholders` (./fill.ts) swaps for
 * the signer's captured signature, date, initials and answers:
 *   {{SIG:slot}} {{DATE:slot}} {{NAME:slot}} {{INIT:slot}}
 *   {{ACK:slot:key}}      → signer's initials when they ticked acknowledgment `key`
 *   {{CHK:slot:key=val}}  → ☒/☐ for a choice answer
 *   {{RESP:slot:key}}     → a free-text answer
 */

import { DEFAULT_HOUSE_TERMS as H } from "./standard-terms";

export type DocKey = "lease" | "lead" | "smoke" | "mold" | "insurance" | "pet" | "checklist";

export interface LeaseTenant {
  name: string;
  email: string;
  phone: string;
}

export interface LeasePet {
  species: string;
  breed: string;
  weight: string;
  age: string;
}

export interface LeaseData {
  landlordName: string;
  landlordAddress: string;
  landlordEmail: string;
  landlordSignerName: string;
  landlordSignerTitle: string;
  landlordSignerEmail: string;
  maintenanceContact: string;

  propertyAddress: string;
  homeType: string;

  tenants: LeaseTenant[];
  occupants: string;

  leaseStart: string; // YYYY-MM-DD
  leaseEnd: string; // YYYY-MM-DD
  monthlyRent: number;
  rentDueDay: number;
  paymentMethod: string;
  lateFeeTerms: string; // optional; empty = no late fee clause
  firstPaymentNote: string; // optional override, e.g. a prorated first month
  securityDeposit: number;

  utilitiesTerms: string;
  maintenanceTerms: string;
  smokingTerms: string;
  entryTerms: string;
  includedAppliances: string;
  tenantHandlesYardAndSnow: boolean;
  renterInsuranceRequired: boolean;

  tenancyType: "unassisted" | "voucher";
  voucherAgency: string;

  petsApproved: boolean;
  pets: LeasePet[];
  petFee: number;
  petRent: number;

  builtBefore1978: boolean;
  leadKnownHazards: string; // empty = no knowledge
  leadRecords: string; // empty = no records
  agentName: string; // lead disclosure agent, optional

  moldKnownConditions: string; // empty = not aware
  smokeKnownIssues: string; // empty = none known

  additionalTerms: string;
}

export const DOC_TITLES: Record<DocKey, string> = {
  lease: "Residential Lease Agreement",
  lead: "Lead-Based Paint Disclosure",
  smoke: "Smoke and Carbon Monoxide Detector Notice",
  mold: "Mold and Moisture Notice",
  insurance: "Renter's Insurance Acknowledgment",
  pet: "Pet Addendum",
  checklist: "Move-In / Move-Out Condition Checklist",
};

export const DOC_ORDER: DocKey[] = ["lease", "lead", "smoke", "mold", "insurance", "pet", "checklist"];

export const EPA_PAMPHLET_URL = "https://www.epa.gov/lead/protect-your-family-lead-your-home-english";

export function defaultLeaseData(): LeaseData {
  return {
    landlordName: H.landlordName,
    landlordAddress: H.landlordAddress,
    landlordEmail: H.landlordEmail,
    landlordSignerName: H.landlordSignerName,
    landlordSignerTitle: H.landlordSignerTitle,
    landlordSignerEmail: H.landlordSignerEmail,
    maintenanceContact: H.maintenanceContact,
    propertyAddress: "",
    homeType: "single-family home",
    tenants: [{ name: "", email: "", phone: "" }],
    occupants: "",
    leaseStart: "",
    leaseEnd: "",
    monthlyRent: 0,
    rentDueDay: 1,
    paymentMethod: H.paymentMethod,
    lateFeeTerms: H.lateFeeRule,
    firstPaymentNote: "",
    securityDeposit: 0,
    utilitiesTerms: H.utilitiesTerms,
    maintenanceTerms: H.maintenanceTerms,
    smokingTerms: H.smokingTerms,
    entryTerms: H.showingNoticeTerms,
    includedAppliances: "The washer and dryer are included.",
    tenantHandlesYardAndSnow: true,
    renterInsuranceRequired: false,
    tenancyType: "unassisted",
    voucherAgency: "",
    petsApproved: false,
    pets: [],
    petFee: H.petFee,
    petRent: H.petRent,
    builtBefore1978: true,
    leadKnownHazards: "",
    leadRecords: "",
    agentName: "",
    moldKnownConditions: "",
    smokeKnownIssues: "",
    additionalTerms: H.specialTerms,
  };
}

/** Fills gaps in stored JSON (older packets, partial input) with defaults. */
export function normalizeLeaseData(input: unknown): LeaseData {
  const d = defaultLeaseData();
  const src = (input && typeof input === "object" ? input : {}) as Partial<LeaseData>;
  const merged = { ...d, ...src } as LeaseData;
  merged.tenants = Array.isArray(src.tenants) && src.tenants.length
    ? src.tenants.map((t) => ({ name: String(t?.name ?? ""), email: String(t?.email ?? ""), phone: String(t?.phone ?? "") }))
    : d.tenants;
  merged.pets = Array.isArray(src.pets)
    ? src.pets.map((p) => ({ species: String(p?.species ?? ""), breed: String(p?.breed ?? ""), weight: String(p?.weight ?? ""), age: String(p?.age ?? "") }))
    : [];
  merged.monthlyRent = Number(merged.monthlyRent) || 0;
  merged.securityDeposit = Number(merged.securityDeposit) || 0;
  merged.rentDueDay = Math.min(28, Math.max(1, Number(merged.rentDueDay) || 1));
  merged.petFee = Number(merged.petFee) || 0;
  merged.petRent = Number(merged.petRent) || 0;
  return merged;
}

/** Documents that make sense for this data (lead only pre-1978, pet only with approved pets). */
export function defaultDocuments(data: LeaseData): DocKey[] {
  return DOC_ORDER.filter((k) => {
    if (k === "lead") return data.builtBefore1978;
    if (k === "pet") return data.petsApproved;
    return true;
  });
}

export function tenantSlot(i: number) {
  return `tenant${i + 1}`;
}

// ---------------------------------------------------------------- helpers

export function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function money(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
}

export function longDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function termMonths(start: string, end: string): number | null {
  if (!start || !end) return null;
  const a = new Date(start + "T00:00:00Z");
  const b = new Date(end + "T00:00:00Z");
  if (isNaN(+a) || isNaN(+b) || b <= a) return null;
  b.setUTCDate(b.getUTCDate() + 1); // lease end is inclusive
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
}

/** Value or a visible gap so missing data is obvious in the preview. */
function v(value: string | number | null | undefined, blank = "____________________"): string {
  const s = String(value ?? "").trim();
  return s ? esc(s) : `<span class="missing">${blank}</span>`;
}

function joinNames(names: string[]): string {
  const n = names.filter(Boolean);
  if (n.length <= 1) return n[0] ?? "";
  return n.slice(0, -1).join(", ") + " and " + n[n.length - 1];
}

function paras(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const kv = (label: string, value: string) => `<p class="kv"><b>${esc(label)}:</b> ${value}</p>`;

function header(title: string, data: LeaseData, tenantNames: string) {
  return `<div class="doc-meta">
    <div><b>Property:</b> ${v(data.propertyAddress)}</div>
    <div><b>Landlord:</b> ${v(data.landlordName)}</div>
    <div><b>Tenant:</b> ${v(tenantNames)}</div>
    <div><b>Lease start:</b> ${v(longDate(data.leaseStart))}</div>
  </div>
  <h1>${esc(title)}</h1>`;
}

function tenantSignatureBlock(data: LeaseData, opts: { initials?: boolean } = {}) {
  return data.tenants
    .map((t, i) => {
      const s = tenantSlot(i);
      return `<div class="sig-block">
        <div class="sig-row"><span class="sig-label">Tenant:</span> <span class="sig-name">${v(t.name)}</span></div>
        <div class="sig-row"><span class="sig-label">Signature:</span> {{SIG:${s}}} <span class="sig-label">Date:</span> {{DATE:${s}}}</div>
        ${opts.initials ? `<div class="sig-row"><span class="sig-label">Initials:</span> {{INIT:${s}}}</div>` : ""}
      </div>`;
    })
    .join("");
}

function landlordSignatureBlock(data: LeaseData) {
  return `<div class="sig-block">
    <div class="sig-row"><span class="sig-label">For ${v(data.landlordName)}:</span> {{SIG:landlord}} <span class="sig-label">Date:</span> {{DATE:landlord}}</div>
    <div class="sig-row"><span class="sig-label">Printed name and title:</span> ${v(
      [data.landlordSignerName, data.landlordSignerTitle].filter(Boolean).join(", ")
    )}</div>
  </div>`;
}

function signatures(data: LeaseData, opts: { initials?: boolean } = {}) {
  return `<h2>Signatures</h2>${landlordSignatureBlock(data)}${tenantSignatureBlock(data, opts)}`;
}

/** Initials of every tenant for one acknowledgment, e.g. "JG / LH". */
function ackInitials(data: LeaseData, key: string) {
  return data.tenants.map((_, i) => `{{ACK:${tenantSlot(i)}:${key}}}`).join(" / ");
}

// ---------------------------------------------------------------- documents

function renderLease(data: LeaseData, docs: DocKey[]): string {
  const names = data.tenants.map((t) => t.name.trim()).filter(Boolean);
  const tenantNames = joinNames(names);
  const months = termMonths(data.leaseStart, data.leaseEnd);
  const assisted = data.tenancyType === "voucher";
  const sections: { title: string; body: string; group?: string }[] = [];

  sections.push({
    group: "",
    title: "Parties and notices",
    body: `${kv("Landlord", v(data.landlordName))}
      ${kv("Landlord mailing address", v(data.landlordAddress))}
      ${kv("Routine correspondence", v(data.landlordEmail))}
      ${data.tenants
        .map((t) => `${kv("Tenant and signer", v(t.name))}${kv("Tenant email and phone", v([t.email, t.phone].filter(Boolean).join(" · ")))}`)
        .join("")}
      ${kv("Permitted occupants who are not signers", data.occupants.trim() ? esc(data.occupants) : "None")}
      ${kv("Property manager (maintenance and rent)", v(data.maintenanceContact))}
      <p>The property manager handles maintenance requests and rent collection for Landlord. Send written notices to Landlord at the mailing address above. Routine coordination may be by email or text.</p>`,
  });

  sections.push({
    title: "Term and possession",
    body: `${kv("Fixed term", `${v(longDate(data.leaseStart))} through ${v(longDate(data.leaseEnd))}${months ? ` (${months} months)` : ""}`)}
      <p>Landlord will deliver lawful possession on the agreed start date. Rent will not accrue before possession is available. This Lease does not automatically renew for another fixed term; an extension must be agreed to in writing. Any holdover is governed by Ohio law and the parties’ written agreements.</p>`,
  });

  const total = data.monthlyRent + data.securityDeposit;
  sections.push({
    title: "Rent and payment",
    body: `${kv("Monthly rent", `${v(data.monthlyRent ? money(data.monthlyRent) : "")} due on the ${ordinal(data.rentDueDay)} day of each month`)}
      ${kv("Payment method and payee", v(data.paymentMethod))}
      ${data.lateFeeTerms.trim() ? kv("Late charge", esc(data.lateFeeTerms)) : ""}
      <p>${
        data.firstPaymentNote.trim()
          ? esc(data.firstPaymentNote)
          : assisted
            ? "Tenant’s approved share of the first month’s rent is due on the agreed start date."
            : `The first month’s rent is due on the agreed start date. A full first month plus the security deposit totals ${money(total)}.`
      }</p>`,
  });

  sections.push({
    title: "Security deposit",
    body: `<p>The ${v(data.securityDeposit ? money(data.securityDeposit) : "")} security deposit is due before possession and is not prepaid rent. Landlord may make only lawful deductions, including unpaid rent and actual loss beyond ordinary wear. Within 30 days after termination of the Lease and delivery of possession, Landlord will deliver any balance due and a written itemization of deductions. Tenant must provide a forwarding address in writing. Interest is payable if required by Ohio law.</p>`,
  });

  sections.push({
    group: "House rules and utilities",
    title: "Occupancy and guests",
    body: `<p>Use the home as a private residence. Reasonable guest visits are permitted. Obtain Landlord’s written approval before adding a resident, assigning this Lease, subletting, or listing any part of the home for short-term stays. Occupants and guests must not unreasonably disturb neighbors. Tenant is responsible for complying with this Lease and for damage caused by occupants or guests to the extent allowed by law.</p>`,
  });

  sections.push({
    title: "Utilities and appliances",
    body: `${paras(data.utilitiesTerms) || `<p>${v("")}</p>`}<p>Landlord retains all legal duties for the home and its systems.</p>
      <p>${data.includedAppliances.trim() ? esc(data.includedAppliances) + " " : ""}Record any other supplied appliances, their condition, and all keys, remotes and access devices on the move-in checklist. Use appliances according to their instructions and report malfunctions rather than attempting repairs.</p>`,
  });

  sections.push({
    title: "Smoking, pets and fire safety",
    body: `${paras(data.smokingTerms)}<p>${
      data.petsApproved
        ? "Only the pets approved in the attached Pet Addendum are permitted; any other pet requires prior written approval."
        : "Pets require prior written approval and a signed addendum."
    } Assistance animals are handled separately under applicable fair housing law. Do not disable or remove required smoke or carbon monoxide alarms, block exits, or use outdoor grills or fuel-burning equipment indoors. Report alarm issues promptly.</p>`,
  });

  sections.push({
    title: "Parking, trash and outdoor upkeep",
    body: `<p>Park only on the designated driveway or lawful parking spaces, not on the lawn. Do not store inoperable vehicles or perform vehicle repairs at the home. Keep the yard and porch clear of rubbish. Put bins out for collection and return them after pickup; arrange lawful disposal of bulky items.</p>
      <p>${
        data.tenantHandlesYardAndSnow
          ? "Tenant handles routine mowing and clearing snow or ice from the private walk and driveway used by the household. Landlord remains responsible for duties that cannot legally be transferred."
          : "Landlord arranges routine mowing and snow and ice removal from the private walk and driveway."
      }</p>`,
  });

  sections.push({
    title: "Alterations and locks",
    body: `<p>Ordinary small picture hooks are permitted. Obtain written approval before repainting, installing TV mounts, making substantial holes, materially altering the home or changing locks, except as otherwise allowed by law. Return all keys and devices on move-out. Any charge for damage or missing items is limited to lawful, documented amounts.</p>`,
  });

  sections.push({
    group: "Repairs, access and move out",
    title: "Maintenance and reporting",
    body: `${paras(data.maintenanceTerms)}
      <p>Call emergency services first where appropriate. Nothing here shifts Landlord’s statutory repair duties or limits a remedy allowed by law.</p>`,
  });

  sections.push({
    title: "Inspection, repairs and showings",
    body: `${paras(data.entryTerms)}<p>Landlord must not abuse access or use it to harass Tenant.</p>`,
  });

  sections.push({
    title: "Condition records and renters insurance",
    body: `<p>Use the attached checklist and dated photos to record existing conditions, supplied items and keys. Share the completed record with both parties. Failing to return the checklist does not waive rights or make Tenant responsible for pre-existing conditions. ${
      data.renterInsuranceRequired
        ? "Tenant must keep renters insurance with personal liability coverage of at least $100,000 in force during the Lease and provide proof on request."
        : "Renters insurance is recommended, not required."
    }</p>`,
  });

  sections.push({
    title: "Early move out and surrender",
    body: `<p>If Tenant needs to leave before the end date, contact Landlord in writing to discuss a written agreement. Moving out early does not by itself end the Lease or determine what is owed. Any remaining rent or damages and any duty to reduce the loss are governed by applicable law and any written agreement.</p>
      <p>At move-out, remove belongings, leave the home reasonably clean, return keys and access devices, and provide a forwarding address. A joint walkthrough is encouraged. Landlord will handle property left behind in accordance with applicable law; the Lease does not authorize disposal based solely on an absence or late payment.</p>`,
  });

  sections.push({
    title: "Default and damage to the home",
    body: `<p>If a material breach occurs, the parties retain their lawful rights. Landlord must use the required notices and court procedures to recover possession. No lockout, service interruption or other unlawful remedy is authorized. If fire, water damage or another event makes the home unsafe or unusable, give prompt notice; the parties’ rights and duties are governed by applicable law.</p>`,
  });

  const attached = docs.filter((k) => k !== "lease").map((k) => DOC_TITLES[k]);
  sections.push({
    group: "Disclosures and signatures",
    title: "Lead disclosure and attachments",
    body: `<p>${
      data.builtBefore1978
        ? "The home was built before 1978. Before Tenant is bound by this Lease, Landlord gives Tenant the attached Lead-Based Paint Disclosure, the EPA pamphlet “Protect Your Family From Lead in Your Home”, and any available records or reports required by law. The parties complete and sign the disclosure as part of this packet."
        : "Landlord represents that the home was built in 1978 or later, so the federal lead-based paint disclosure does not apply."
    }</p>
      <p>Attached and made part of this Lease: ${attached.length ? esc(attached.join("; ")) : "none"}. A blank form or unchecked receipt box is not an acknowledgment.</p>`,
  });

  sections.push({
    title: "Housing assistance if applicable",
    body: `${kv("Tenancy type", assisted ? `Housing Choice Voucher${data.voucherAgency.trim() ? ` (${esc(data.voucherAgency)})` : ""}` : "Unassisted")}
      <p>If the tenancy uses a Housing Choice Voucher, the applicable agency must approve the effective date, rent, utilities and other required terms. The HUD Tenancy Addendum controls any conflict with this Lease. Tenant owes only the approved tenant share and any charges allowed by the program. The housing agency’s share is not owed by Tenant. Landlord and the agency execute the HAP contract separately.</p>`,
  });

  if (data.additionalTerms.trim()) {
    // "Renewal. At the end…" → bold lead-in for each paragraph.
    const body = paras(data.additionalTerms).replace(/<p>([A-Z][A-Za-z ,&/'’-]{2,48}\.)\s/g, "<p><b>$1</b> ");
    sections.push({ title: "Additional terms", body });
  }

  sections.push({
    title: "Entire agreement",
    body: `<p>This Lease and its signed attachments are the agreement. Changes must be agreed to in writing unless the law provides otherwise. Ohio law applies. No provision waives rights or obligations that cannot lawfully be waived. If a provision is unenforceable, the remainder remains effective to the extent allowed by law.</p>
      <p>The parties agree to sign this Lease and its attachments electronically. Each party will receive the completed Lease and applicable signed attachments.</p>`,
  });

  const body = sections
    .map((s, i) => `${s.group ? `<h2 class="group">${esc(s.group)}</h2>` : ""}<h3>${i + 1}&nbsp;&nbsp;${esc(s.title)}</h3>${s.body}`)
    .join("");

  return `<h1>Residential Lease Agreement</h1>
    <p class="subtitle">${v(data.propertyAddress)}</p>
    <p>${v(data.landlordName)} rents the ${esc(data.homeType || "home")} at the address above to ${v(tenantNames)} on the terms below. The rental includes the areas and fixtures identified in this Lease and its attached condition checklist.</p>
    ${body}
    ${signatures(data)}`;
}

function renderLead(data: LeaseData): string {
  const tenantNames = joinNames(data.tenants.map((t) => t.name));
  const known = data.leadKnownHazards.trim();
  const records = data.leadRecords.trim();
  const box = (on: boolean) => (on ? "☒" : "☐");
  return `${header("Lead-Based Paint Disclosure", data, tenantNames)}
    <p>This Lead-Based Paint Disclosure is incorporated into and made part of the Residential Lease Agreement for the Premises.</p>
    <h3>Lead Warning Statement</h3>
    <p class="warning">Housing built before 1978 may contain lead-based paint. Lead from paint, paint chips, and dust can pose health hazards if not managed properly. Lead exposure is especially harmful to young children and pregnant women. Before renting pre-1978 housing, lessors must disclose the presence of known lead-based paint and/or lead-based paint hazards in the dwelling. Lessees must also receive a federally approved pamphlet on lead poisoning prevention.</p>
    <h3>1. Landlord’s disclosure</h3>
    <p><b>(a) Presence of lead-based paint and/or lead-based paint hazards</b></p>
    <p>${box(!!known)} Known lead-based paint and/or lead-based paint hazards are present in the housing. ${known ? `Explain: ${esc(known)}` : ""}</p>
    <p>${box(!known)} Landlord has no knowledge of lead-based paint and/or lead-based paint hazards in the housing.</p>
    <p><b>(b) Records and reports available to Landlord</b></p>
    <p>${box(!!records)} Landlord has provided Tenant with all available records and reports pertaining to lead-based paint and/or lead-based paint hazards in the housing. ${records ? `Documents: ${esc(records)}` : ""}</p>
    <p>${box(!records)} Landlord has no reports or records pertaining to lead-based paint and/or lead-based paint hazards in the housing.</p>
    <h3>2. Tenant’s acknowledgment (initial)</h3>
    <p class="ack"><span class="ack-init">${ackInitials(data, "lead_records")}</span> (c) Tenant has received copies of all information listed above.</p>
    <p class="ack"><span class="ack-init">${ackInitials(data, "lead_pamphlet")}</span> (d) Tenant has received the pamphlet “Protect Your Family From Lead in Your Home” (${esc(EPA_PAMPHLET_URL)}).</p>
    <p>Tenant agrees to promptly notify Landlord of any deteriorating paint, chips or dust during the tenancy.</p>
    <h3>3. Agent’s acknowledgment</h3>
    <p>${
      data.agentName.trim()
        ? `(e) The agent, ${esc(data.agentName)}, has informed Landlord of Landlord’s obligations under 42 U.S.C. 4852d and is aware of the agent’s responsibility to ensure compliance.`
        : "No leasing agent is involved in this transaction."
    }</p>
    <h3>4. Certification of accuracy</h3>
    <p>The following parties have reviewed the information above and certify, to the best of their knowledge, that the information they have provided is true and accurate. Landlord will keep this signed disclosure for at least three years from the start of the lease.</p>
    ${signatures(data)}`;
}

function renderSmoke(data: LeaseData): string {
  const tenantNames = joinNames(data.tenants.map((t) => t.name));
  return `${header("Smoke and Carbon Monoxide Detector Notice", data, tenantNames)}
    <p>This Notice is incorporated into and made part of the Residential Lease Agreement for the Premises.</p>
    <h3>1. Detectors</h3>
    <p>Landlord states that smoke detectors and carbon monoxide detectors are installed as required by applicable law and code. Their presence and operation are tested and recorded at the move-in walkthrough on the condition checklist.</p>
    ${kv("Known detector issues", data.smokeKnownIssues.trim() ? esc(data.smokeKnownIssues) : "None known to Landlord")}
    <h3>2. Tenant responsibilities</h3>
    <ul>
      <li>Test smoke and carbon monoxide detectors after move-in and at least monthly.</li>
      <li>Promptly notify Landlord in writing if any detector is missing, damaged, chirping, expired, not working or appears defective.</li>
      <li>Replace batteries as needed unless the detector is sealed or hardwired without replaceable batteries, or otherwise requires Landlord service.</li>
      <li>Do not remove, disconnect, cover, paint over, disable or tamper with any detector, and do not allow occupants or guests to do so.</li>
      <li>Keep furniture, stored items and decorations from blocking detectors.</li>
      <li>Immediately report any fire, smoke or CO alarm activation, gas smell, furnace or water heater issue, electrical burning smell or other safety concern. Call emergency services first where appropriate.</li>
    </ul>
    <h3>3. Landlord responsibilities</h3>
    <p>Landlord remains responsible for installing and maintaining required detectors. Nothing in this Notice waives Landlord’s obligations under Ohio law or any applicable code.</p>
    <h3>4. Tenant acknowledgment (initial)</h3>
    <p class="ack"><span class="ack-init">${ackInitials(data, "smoke_report")}</span> Tenant has been instructed to report any detector issue promptly.</p>
    <p class="ack"><span class="ack-init">${ackInitials(data, "smoke_tamper")}</span> Tenant understands detectors must not be disabled, removed, covered or tampered with, and that doing so may be a lease violation.</p>
    ${signatures(data)}`;
}

function renderMold(data: LeaseData): string {
  const tenantNames = joinNames(data.tenants.map((t) => t.name));
  const known = data.moldKnownConditions.trim();
  return `${header("Mold and Moisture Notice", data, tenantNames)}
    <p>This Notice is incorporated into and made part of the Residential Lease Agreement for the Premises.</p>
    <h3>1. Purpose</h3>
    <p>Mold, mildew, moisture buildup, leaks, condensation, poor ventilation and unreported water intrusion can damage the home and may affect health and comfort. Tenant agrees to help prevent moisture problems by using the home in a clean, safe and reasonable manner.</p>
    <h3>2. Landlord disclosure</h3>
    <p>${known ? `☐ Landlord is not aware of active visible mold.<br>☒ Landlord is aware of the following mold, moisture, leak or water-related condition: ${esc(known)}` : "☒ To Landlord’s current knowledge, Landlord is not aware of active visible mold at the Premises.<br>☐ Landlord is aware of a mold, moisture, leak or water-related condition."}</p>
    <h3>3. Tenant responsibilities</h3>
    <ul>
      <li>Promptly report leaks, water intrusion, moisture buildup, condensation, water stains, musty odors, visible mold, sewer backup, appliance or HVAC leaks, or unusual dampness. Report active leaks immediately.</li>
      <li>Use bathroom fans, kitchen ventilation, windows and HVAC when bathing, cooking, cleaning or drying wet items.</li>
      <li>Clean and dry spills, condensation and minor surface moisture; avoid standing water.</li>
      <li>Do not block vents, returns, registers or ventilation paths, or pack stored items against walls in a way that prevents airflow.</li>
      <li>Keep indoor humidity at a reasonable level when possible.</li>
    </ul>
    <h3>4. Delayed reporting</h3>
    <p>Failure to promptly report moisture, leaks, visible mold or water intrusion may make Tenant responsible for resulting damage caused by the delay, to the extent permitted by law.</p>
    <h3>5. Landlord responsibilities</h3>
    <p>Landlord remains responsible for repairs, maintenance and habitability obligations that cannot be waived under Ohio law. Nothing in this Notice waives them.</p>
    <h3>6. Tenant notes</h3>
    <p class="resp">${data.tenants.map((_, i) => `{{RESP:${tenantSlot(i)}:mold_notes}}`).join("<br>")}</p>
    <p class="note">Conditions observed at move-in are also recorded on the condition checklist.</p>
    ${signatures(data)}`;
}

function renderInsurance(data: LeaseData): string {
  const tenantNames = joinNames(data.tenants.map((t) => t.name));
  const s = tenantSlot(0);
  return `${header("Renter’s Insurance Acknowledgment", data, tenantNames)}
    <p>This Acknowledgment is incorporated into and made part of the Residential Lease Agreement for the Premises.</p>
    <h3>1. Insurance notice</h3>
    <p>Landlord’s insurance does not cover Tenant’s personal property, temporary housing, relocation costs, personal liability, guest injuries or other losses belonging to Tenant, occupants or guests. ${
      data.renterInsuranceRequired
        ? "Tenant must keep renter’s insurance in force during the Lease as stated in the Lease."
        : "Tenant is strongly advised to obtain renter’s insurance."
    }</p>
    <h3>2. Tenant’s own property</h3>
    <p>Tenant is responsible for protecting Tenant’s own belongings and liability exposure, including items kept in the home, basement, garage, yard, porch, driveway or vehicles, except to the extent a loss is caused by Landlord’s negligence, willful misconduct, or obligations that cannot be waived under Ohio law.</p>
    <h3>3. Recommended coverage</h3>
    <p>Personal property, personal liability (recommended minimum $100,000), loss of use / temporary housing, water and sewer-backup coverage where available, and pet liability if applicable.</p>
    <h3>4. Tenant selection</h3>
    <p>{{CHK:${s}:insurance_option=has}} Tenant already has renter’s insurance.
      Company: {{RESP:${s}:insurance_company}} · Policy number: {{RESP:${s}:insurance_policy}} · Effective: {{RESP:${s}:insurance_effective}} · Liability limit: {{RESP:${s}:insurance_limit}}</p>
    <p>{{CHK:${s}:insurance_option=intends}} Tenant intends to obtain renter’s insurance.</p>
    ${
      data.renterInsuranceRequired
        ? ""
        : `<p>{{CHK:${s}:insurance_option=declines}} Tenant declines renter’s insurance at this time and understands Tenant is responsible for Tenant’s own personal property and liability exposure.</p>`
    }
    ${signatures(data)}`;
}

function renderPet(data: LeaseData): string {
  const tenantNames = joinNames(data.tenants.map((t) => t.name));
  const rows = data.pets.length
    ? data.pets
        .map((p) => `<tr><td>${v(p.species, "____")}</td><td>${v(p.breed, "____")}</td><td>${v(p.weight, "____")}</td><td>${v(p.age, "____")}</td></tr>`)
        .join("")
    : `<tr><td colspan="4"><span class="missing">No pets listed</span></td></tr>`;
  return `${header("Pet Addendum", data, tenantNames)}
    <p>This Addendum is incorporated into and made part of the Residential Lease Agreement for the Premises. It does not apply to assistance animals, which are handled under applicable fair housing law.</p>
    <h3>1. Approved pets</h3>
    <table class="lease-table"><thead><tr><th>Species</th><th>Breed</th><th>Weight</th><th>Age</th></tr></thead><tbody>${rows}</tbody></table>
    <h3>2. Fees</h3>
    <p>Non-refundable pet fee: ${money(data.petFee)}, due at move-in. Monthly pet rent: ${money(data.petRent)}, due with rent.</p>
    <h3>3. Rules</h3>
    <ul>
      <li>No additional or replacement pets without Landlord’s written approval.</li>
      <li>Tenant is responsible for actual pet-related damage, odors, flea or pest treatment and cleaning beyond ordinary wear.</li>
      <li>Prevent noise disturbances, keep pets under control, and clean up waste promptly.</li>
      <li>Do not leave a pet unattended for more than 24 hours.</li>
      <li>Comply with all licensing, vaccination and local animal regulations.</li>
    </ul>
    <h3>4. Liability</h3>
    <p>Tenant is responsible for injuries or damage caused by Tenant’s pets to the extent allowed by law.</p>
    <h3>5. Violations</h3>
    <p>A material violation of this Addendum is a breach of the Lease. Landlord may pursue the remedies allowed by Ohio law, using the required notices and procedures.</p>
    <p class="ack"><span class="ack-init">${ackInitials(data, "pet_rules")}</span> Tenant has read and agrees to this Pet Addendum.</p>
    ${signatures(data)}`;
}

const CHECKLIST_ROWS = [
  "Living room and hallways",
  "Kitchen and fixtures",
  "Bedrooms",
  "Bathrooms and plumbing",
  "Floors, walls and ceilings",
  "Doors, locks and windows",
  "Kitchen appliances",
  "Washer and dryer",
  "Smoke and CO alarms",
  "Exterior, driveway and bins",
  "Keys, remotes and access devices",
];

function renderChecklist(data: LeaseData): string {
  const tenantNames = joinNames(data.tenants.map((t) => t.name));
  return `<h1>Move-In / Move-Out Condition Checklist</h1>
    <p class="subtitle">${v(data.propertyAddress)} &nbsp;|&nbsp; Tenant: ${v(tenantNames)}</p>
    <p>Move-in date: ____________________ &nbsp;&nbsp; Move-out date: ____________________</p>
    <p>Completed at the move-in walkthrough, not at lease signing. Record condition, existing damage and photo references. Mark items that are not present or not applicable. Do not sign for an inspection or delivery that has not happened.</p>
    <table class="lease-table checklist"><thead><tr><th>Area or item</th><th>Move-in condition / photo</th><th>Move-out condition / photo</th></tr></thead>
    <tbody>${CHECKLIST_ROWS.map((r) => `<tr><td>${esc(r)}</td><td></td><td></td></tr>`).join("")}</tbody></table>
    <p>Outstanding repairs / photo references: ______________________________________________</p>
    <p>Additional notes: ______________________________________________</p>
    <p>Move-in signatures: Tenant ______________________ Landlord ______________________</p>
    <p>Move-out signatures: Tenant ______________________ Landlord ______________________</p>
    <p class="note">Signatures record observations only. This checklist does not waive claims or authorize a deduction.</p>`;
}

// ---------------------------------------------------------------- packet

export function renderDocument(key: DocKey, data: LeaseData, docs: DocKey[]): string {
  switch (key) {
    case "lease": return renderLease(data, docs);
    case "lead": return renderLead(data);
    case "smoke": return renderSmoke(data);
    case "mold": return renderMold(data);
    case "insurance": return renderInsurance(data);
    case "pet": return renderPet(data);
    case "checklist": return renderChecklist(data);
  }
}

/** The whole packet as one HTML fragment; each document is a print page group. */
export function renderPacket(data: LeaseData, docs: DocKey[]): string {
  const ordered = DOC_ORDER.filter((k) => docs.includes(k));
  return ordered
    .map((k) => `<section class="doc" data-doc="${k}" id="doc-${k}">${renderDocument(k, data, ordered)}</section>`)
    .join("\n");
}

// ---------------------------------------------------------------- signer fields

export interface SignerField {
  key: string;
  doc: DocKey;
  type: "ack" | "choice" | "text";
  label: string;
  required: boolean;
  options?: { value: string; label: string }[];
  /** Only shown / required when another field has this value. */
  showIf?: { key: string; value: string };
  link?: { href: string; label: string };
}

/** What a signer must confirm or answer before signing. */
export function signerFields(data: LeaseData, docs: DocKey[], slot: string): SignerField[] {
  if (slot === "landlord") return [];
  const out: SignerField[] = [];
  const has = (k: DocKey) => docs.includes(k);

  if (has("lease")) {
    out.push({ key: "lease_read", doc: "lease", type: "ack", required: true, label: "I have read the Residential Lease Agreement and agree to its terms." });
  }
  if (has("lead")) {
    out.push(
      { key: "lead_records", doc: "lead", type: "ack", required: true, label: "I have received copies of all lead-based paint information listed in the disclosure (if any)." },
      {
        key: "lead_pamphlet", doc: "lead", type: "ack", required: true,
        label: "I have received the EPA pamphlet “Protect Your Family From Lead in Your Home”.",
        link: { href: EPA_PAMPHLET_URL, label: "Open the EPA pamphlet" },
      },
    );
  }
  if (has("smoke")) {
    out.push(
      { key: "smoke_report", doc: "smoke", type: "ack", required: true, label: "I have been instructed to report any smoke or CO detector issue promptly." },
      { key: "smoke_tamper", doc: "smoke", type: "ack", required: true, label: "I understand detectors must not be disabled, removed, covered or tampered with." },
    );
  }
  if (has("mold")) {
    out.push(
      { key: "mold_read", doc: "mold", type: "ack", required: true, label: "I have read the Mold and Moisture Notice and agree to report moisture problems promptly." },
      { key: "mold_notes", doc: "mold", type: "text", required: false, label: "Moisture or mold concerns you already know about (optional)" },
    );
  }
  if (has("insurance") && slot === "tenant1") {
    const options = [
      { value: "has", label: "I already have renter’s insurance" },
      { value: "intends", label: "I intend to obtain renter’s insurance" },
    ];
    if (!data.renterInsuranceRequired) options.push({ value: "declines", label: "I decline renter’s insurance at this time" });
    out.push({ key: "insurance_option", doc: "insurance", type: "choice", required: true, label: "Renter’s insurance", options });
    const when = { key: "insurance_option", value: "has" };
    out.push(
      { key: "insurance_company", doc: "insurance", type: "text", required: true, label: "Insurance company", showIf: when },
      { key: "insurance_policy", doc: "insurance", type: "text", required: true, label: "Policy number", showIf: when },
      { key: "insurance_effective", doc: "insurance", type: "text", required: false, label: "Effective date", showIf: when },
      { key: "insurance_limit", doc: "insurance", type: "text", required: false, label: "Liability limit", showIf: when },
    );
  }
  if (has("pet")) {
    out.push({ key: "pet_rules", doc: "pet", type: "ack", required: true, label: "I have read and agree to the Pet Addendum." });
  }
  return out;
}

/** Things that must be filled in before a packet can be sent. */
export function missingForSend(data: LeaseData, docs: DocKey[]): string[] {
  const m: string[] = [];
  if (!data.propertyAddress.trim()) m.push("Property address");
  if (!data.landlordName.trim()) m.push("Landlord name");
  if (!data.landlordSignerName.trim()) m.push("Landlord signer name");
  if (!data.tenants.length || data.tenants.some((t) => !t.name.trim())) m.push("Tenant name");
  if (data.tenants.some((t) => !t.email.trim())) m.push("Tenant email (needed for the signing link)");
  if (!data.leaseStart || !data.leaseEnd) m.push("Lease start and end dates");
  if (!data.monthlyRent) m.push("Monthly rent");
  if (!data.paymentMethod.trim()) m.push("Payment method and payee");
  if (docs.includes("pet") && !data.pets.length) m.push("Pet details (Pet Addendum is included)");
  if (data.builtBefore1978 && !docs.includes("lead")) m.push("Lead-Based Paint Disclosure is required for a pre-1978 home");
  return m;
}
