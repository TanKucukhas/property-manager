/**
 * Built-in fallback for the company's default house terms. The live values
 * are stored in the `settings` table (key "house_defaults", edited at
 * /admin/leases/defaults); each property then gets its own copy in
 * `lease_terms` that can be changed per house.
 *
 * Based on our earlier leases, keeping the enforceable parts and dropping
 * clauses Ohio law voids (R.C. 5321.13: attorney-fee shifting, waivers of
 * tenant rights, automatic deductions, disposal of belongings without notice).
 */

export interface HouseDefaults {
  landlordName: string
  landlordAddress: string
  landlordEmail: string
  landlordSignerName: string
  landlordSignerTitle: string
  landlordSignerEmail: string
  maintenanceContact: string
  paymentMethod: string
  lateFeeRule: string
  petFee: number
  petRent: number
  utilitiesTerms: string
  maintenanceTerms: string
  smokingTerms: string
  showingNoticeTerms: string
  specialTerms: string
}

export const STANDARD_LATE_FEE =
  "If rent is not received in full by the 5th day of the month, Tenant owes a late charge of $25.00, plus $5.00 per day beginning on the 6th day, not to exceed $100.00 for any one month. Late charges are not rent. If the tenancy is voucher-assisted, late charges apply only to Tenant's share of the rent."

export const STANDARD_UTILITIES =
  "Landlord pays water, sewer and regular trash service. Tenant places electric (AEP) and natural gas service in Tenant's name by the lease start date and keeps them active during the tenancy; if a utility Tenant must carry is billed to Landlord after that date, Tenant reimburses the billed amount. Tenant pays for internet and other optional services. Promptly notify Landlord of service outages, heat loss or suspected leaks."

export const STANDARD_MAINTENANCE =
  "Landlord will keep the home fit and habitable, meet applicable housing and safety codes, and maintain required systems and facilities. Tenant will keep the home reasonably clean and safe, dispose of rubbish properly, use plumbing and electrical fixtures reasonably, and promptly report leaks, moisture or visible mold, pests, loss of heat, or electrical or safety problems. Tenant replaces light bulbs and replaceable smoke/CO detector batteries, and replaces HVAC filters at least every 90 days (filters supplied by Landlord). Do not make or authorize repairs on Landlord's behalf without approval, except as allowed by law. Tenant is responsible for actual damage caused by misuse or negligence, not ordinary wear."

export const STANDARD_SMOKING =
  "No smoking or vaping of any substance inside the home, including tobacco and marijuana. Cleaning or repair of smoke damage beyond ordinary wear is charged at actual, documented cost."

export const STANDARD_SHOWING_NOTICE =
  "Landlord may enter at reasonable times on at least 24 hours' notice, by email or text, for repairs, inspection, agreed services and showings to prospective renters or purchasers. Emergencies and other exceptions recognized by Ohio law are handled accordingly."

export const STANDARD_SPECIAL_TERMS = `Renewal. At the end of the fixed term, this Lease continues month to month on the same terms unless either party gives at least 30 days' written notice before the end of the term or of any later month. Landlord may change the rent for a month-to-month period with at least 30 days' written notice.

Returned payments. A returned or dishonored payment incurs a $35.00 fee, and Landlord may then require certified funds.

Additional adults and absences. Any person 18 or older who will live in the home must first complete Landlord's screening. Tenant notifies Landlord in writing of any absence longer than 14 consecutive days.

Early termination option. Tenant may end the Lease early by giving 30 days' written notice and paying an early termination fee equal to one month's rent, in addition to rent through the move-out date. This option does not limit other rights under Ohio law.

Keys and devices. Unreturned keys, remotes or access devices are charged at actual replacement cost.`

export const DEFAULT_HOUSE_TERMS: HouseDefaults = {
  landlordName: "Halberd LLC",
  landlordAddress: "1116 Fabron Ave, Columbus, OH 43203",
  landlordEmail: "info@halberd.co",
  landlordSignerName: "",
  landlordSignerTitle: "Authorized Manager",
  landlordSignerEmail: "info@halberd.co",
  maintenanceContact: "Steve Phipps, 740-821-6206",
  paymentMethod: "",
  lateFeeRule: STANDARD_LATE_FEE,
  petFee: 300,
  petRent: 25,
  utilitiesTerms: STANDARD_UTILITIES,
  maintenanceTerms: STANDARD_MAINTENANCE,
  smokingTerms: STANDARD_SMOKING,
  showingNoticeTerms: STANDARD_SHOWING_NOTICE,
  specialTerms: STANDARD_SPECIAL_TERMS,
}

export function normalizeHouseDefaults(input: unknown): HouseDefaults {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>
  const out = { ...DEFAULT_HOUSE_TERMS }
  for (const k of Object.keys(out) as (keyof HouseDefaults)[]) {
    if (src[k] === undefined || src[k] === null) continue
    if (k === "petFee" || k === "petRent") out[k] = Number(src[k]) || 0
    else (out as Record<string, unknown>)[k] = String(src[k]).slice(0, 8000)
  }
  return out
}

/** The per-house (lease_terms) fields a new property starts with. */
export function houseTermsFromDefaults(d: HouseDefaults) {
  return {
    lateFeeRule: d.lateFeeRule,
    petFee: d.petFee,
    petRent: d.petRent,
    utilitiesTerms: d.utilitiesTerms,
    maintenanceTerms: d.maintenanceTerms,
    smokingTerms: d.smokingTerms,
    showingNoticeTerms: d.showingNoticeTerms,
    specialTerms: d.specialTerms,
  }
}
