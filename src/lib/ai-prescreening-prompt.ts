/**
 * Generates the prompt the admin pastes into Claude/Codex when running
 * "Rate with AI" on a prescreening application. The model returns a JSON
 * object matching PrescreeningAIAnalysis, which the admin can edit and save.
 */

export interface PrescreeningAIAnalysis {
  summary: string;
  adminRating: number;
  recommendedStatus:
    | "review"
    | "with-concerns"
    | "in-progress"
    | "pre-approved"
    | "rejected";
  rejectReason: string | null;
  adminNotes: string;
  redFlags: string[];
  greenFlags: string[];
  incomeAnalysis: {
    threshold: number | null;
    actual: number | null;
    meetsRequirement: boolean | null;
    comment: string;
  };
  creditAnalysis: {
    range: string | null;
    meetsMinimum: boolean | null;
    comment: string;
  };
  voucherAnalysis: string | null;
}

export interface PrescreeningPromptInput {
  /** Anonymized record from the DB. Pass the whole row as a flat object. */
  applicant: Record<string, unknown>;
  /** Property the applicant is applying for (with qualification fields). */
  property: Record<string, unknown> | null;
  /** Computed score and flags from scorePrescreening for reference. */
  computed?: { score: number; flags: string[]; incomeThreshold: number };
}

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return String(v);
  return String(v);
}

function petsJsonToText(raw: unknown): string {
  if (!raw) return "—";
  try {
    const data = JSON.parse(String(raw));
    const pets = data?.pets || (Array.isArray(data) ? data : [data]);
    if (!pets?.length) return "—";
    return pets
      .map((p: Record<string, unknown>, i: number) => {
        const bits = [p.type, p.breed, p.weight ? `${p.weight} lbs` : null, p.age].filter(Boolean);
        return `Pet ${i + 1}: ${bits.length ? bits.join(", ") : "no details"}`;
      })
      .join(" | ");
  } catch {
    return String(raw);
  }
}

export function generatePrescreeningPrompt(input: PrescreeningPromptInput): string {
  const a = input.applicant;
  const p = input.property;
  const c = input.computed;

  const incomeMultiplier = (p?.incomeMultiplier as number) ?? 2.75;
  const rent = (p?.monthlyRent as number) ?? null;
  const threshold = rent ? rent * incomeMultiplier : null;

  const usingVoucher = String(a.usingVoucher ?? "");
  const voucherBlock =
    usingVoucher === "yes"
      ? `
RENTAL ASSISTANCE / VOUCHER (applicant is using one)
  Agency: ${fmt(a.voucherAgency)}
  Bedroom size: ${fmt(a.voucherBedroomSize)}
  Expires: ${fmt(a.voucherExpiration)}
  Approved rent: ${fmt(a.voucherApprovedRent)}
  Tenant portion: ${fmt(a.voucherTenantPortion)}
  Caseworker: ${fmt(a.voucherCaseworkerName)} · ${fmt(a.voucherCaseworkerPhone)} · ${fmt(a.voucherCaseworkerEmail)}
  Has RFTA paperwork: ${fmt(a.voucherHasRfta)}
  Property accepts vouchers: ${fmt(p?.acceptsVouchers)}`
      : usingVoucher
        ? `RENTAL ASSISTANCE: ${usingVoucher} (no detail captured).`
        : `RENTAL ASSISTANCE: applicant did not indicate use of a voucher.`;

  return `You are a property manager's underwriting assistant. You score a single rental
applicant against a specific property's qualification rules and return a structured
JSON verdict that the property manager will review.

Be brutally honest and grounded in the provided facts. Do NOT invent details.
If a field is missing, say so explicitly in adminNotes — never assume.

== PROPERTY ==
${
  p
    ? `Name: ${fmt(p.name)}
Address: ${fmt(p.address1)}, ${fmt(p.city)}, ${fmt(p.state)} ${fmt(p.zip)}
Monthly rent: $${fmt(rent)}
Security deposit: $${fmt(p.securityDeposit)}
Income multiplier: ${incomeMultiplier}x  → minimum income $${threshold ?? "—"}/mo
Minimum credit score: ${fmt(p.minCreditScore)} (null = no minimum)
Pets policy: ${fmt(p.petsPolicy)}
Smoking allowed: ${fmt(p.smokingAllowed)}
Sublease allowed: ${fmt(p.subleaseAllowed)}
Short-term rental (Airbnb) allowed: ${fmt(p.airbnbAllowed)}
Accepts Housing Choice Voucher / Section 8 / PMHA: ${fmt(p.acceptsVouchers)}
Custom requirements:
${fmt(p.customRequirements)}`
    : "No property attached. Score using common-sense rental underwriting only."
}

== APPLICANT ==
Name: ${fmt(a.fullName)}
Email: ${fmt(a.email)}
Phone: ${fmt(a.phone)}
Date of birth: ${fmt(a.dateOfBirth)}
Current address: ${fmt(a.currentAddress)}
Desired move-in: ${fmt(a.desiredMoveIn)}
Adults / children: ${fmt(a.adultsCount)} / ${fmt(a.childrenCount)}
Occupant names: ${fmt(a.occupantNames)}
Reason for moving: ${fmt(a.moveReason)}
Preferred contact: ${fmt(a.preferredContactMethod)}
Showing availability: ${fmt(a.showingAvailability)}
How they heard about us: ${fmt(a.howHeardAbout)}

INCOME & EMPLOYMENT
  Monthly income: $${fmt(a.monthlyIncome)}
  Employment status: ${fmt(a.employmentStatus)}
  Employer: ${fmt(a.employerName)} (${fmt(a.jobTitle)})
  Length: ${fmt(a.employmentLength)}
  Other income sources: ${fmt(a.incomeSources)}
  Can provide proof of income: ${fmt(a.canProvideProofOfIncome)}
  Self-reports meets ${incomeMultiplier}x threshold: ${fmt(a.meetsIncomeRequirement)}
  Can pay first + deposit at signing: ${fmt(a.canPayMoveIn)}
  Late payments past 12 months: ${fmt(a.latePayments)} — ${fmt(a.latePaymentsExplanation)}

CREDIT
  Self-reported range: ${fmt(a.creditScoreRange)}
  Credit issues disclosure: ${fmt(a.creditIssuesDisclosure)}

CURRENT HOUSING
  Status: ${fmt(a.housingStatus)}
  Current landlord: ${fmt(a.currentLandlordName)} (${fmt(a.currentLandlordPhone)})
  Current rent: ${fmt(a.currentHousingPayment)}
  Time at current address: ${fmt(a.currentAddressDuration)}
  Has rented before: ${fmt(a.hasRentedBefore)}

RENTAL HISTORY
  Prior eviction: ${fmt(a.priorEviction)} — ${fmt(a.evictionExplanation)}
  Broken lease: ${fmt(a.brokenLease)}
  Asked to move out: ${fmt(a.askedToMoveOut)}
  Owes landlord / utility debt: ${fmt(a.landlordDebt)}
  Property damage history: ${fmt(a.propertyDamageHistory)}
  Notes: ${fmt(a.rentalHistoryExplanation)}

PROPERTY USE
  Full-time residence: ${fmt(a.fullTimeResidence)}
  Intent to sublease: ${fmt(a.intentToSublease)}
  Intent to Airbnb: ${fmt(a.intentToAirbnb)}
  Smoker / vaper in household: ${fmt(a.smoking)}
  Has pets: ${fmt(a.hasPets)}
  Pet details: ${petsJsonToText(a.petsJson)}
  Willing to handle maintenance: ${fmt(a.willingToMaintain)}
  Willing to handle utilities: ${fmt(a.willingToHandleUtilities)}

CONSENTS
  All adults willing to screen: ${fmt(a.allAdultsWillingToScreen)}
  Background disclosure: ${fmt(a.backgroundDisclosure)}
  Screening consent: ${fmt(a.screeningConsent)}

${voucherBlock}

ADDITIONAL NOTES FROM APPLICANT
${fmt(a.additionalNotes)}

== SYSTEM-COMPUTED CONTEXT ==
${
  c
    ? `Computed score: ${c.score}/80  (admin rating ×2 adds the last 20)
Computed income threshold: $${c.incomeThreshold}/mo
Computed flags: ${c.flags.length ? c.flags.join("; ") : "none"}`
    : "No computed score provided."
}

== STATUS VOCABULARY ==
Use one of: "review", "with-concerns", "in-progress", "pre-approved", "rejected".
  review            — needs a human look, no clear signal yet
  with-concerns     — proceed but flag specific risks
  in-progress       — qualified, advancing to next step
  pre-approved      — meets all hard requirements, recommend showing
  rejected          — fails a hard requirement (eviction recent, income way below, refuses screening, etc.)

== RULES ==
- adminRating is 0–10 where 10 = strongest applicant you've ever seen for this property.
  This number is multiplied ×2 and added to the computed score to produce the effective score out of 100.
- rejectReason MUST be a short, factual reason ONLY if recommendedStatus = "rejected", otherwise null.
- redFlags and greenFlags are short bullet phrases (≤ 12 words each).
- adminNotes is what the property manager reads first — 3–6 sentences, plain English.
- summary is one paragraph (2–3 sentences).
- Never recommend "pre-approved" if there is any hard-stop pain (recent eviction, income below 1.0×, refuses screening,
  voucher-needed but property doesn't accept).
- If applicant uses a voucher and property does NOT accept vouchers, this is a hard reject.
- If applicant uses a voucher and property accepts it, normal income rules are relaxed for the tenant-paid portion.

Return ONLY a single JSON object matching this schema EXACTLY. No markdown, no
prose, no backticks. Every field type must match — voucherAnalysis is a STRING
(or null), not an object. incomeAnalysis and creditAnalysis are the only nested
objects, and they must contain a "comment" string.

{
  "summary": "string",
  "adminRating": 0,
  "recommendedStatus": "review | with-concerns | in-progress | pre-approved | rejected",
  "rejectReason": null,
  "adminNotes": "string",
  "redFlags": ["string"],
  "greenFlags": ["string"],
  "incomeAnalysis": {
    "threshold": 0,
    "actual": 0,
    "meetsRequirement": true,
    "comment": "string"
  },
  "creditAnalysis": {
    "range": "string",
    "meetsMinimum": true,
    "comment": "string"
  },
  "voucherAnalysis": "short paragraph string, or null"
}
`;
}
