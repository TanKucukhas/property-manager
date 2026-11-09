/** Shared helpers for the prescreening admin screens. */

export function listingName(l: { label: string | null; openedAt: string } | null | undefined): string {
  if (!l) return "No listing"
  return l.label || new Date(l.openedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

export const statusColors: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  new: { variant: "secondary", className: "bg-blue-100 text-blue-800" },
  review: { variant: "secondary", className: "bg-yellow-100 text-yellow-800" },
  "with-concerns": { variant: "secondary", className: "bg-orange-100 text-orange-800" },
  "in-progress": { variant: "secondary", className: "bg-amber-100 text-amber-800" },
  "pre-approved": { variant: "secondary", className: "bg-green-100 text-green-800" },
  rejected: { variant: "secondary", className: "bg-red-100 text-red-800" },
  "scheduled-for-showing": { variant: "secondary", className: "bg-indigo-100 text-indigo-800" },
  "showing-completed": { variant: "secondary", className: "bg-purple-100 text-purple-800" },
  "did-not-show-up": { variant: "secondary", className: "bg-rose-100 text-rose-800" },
  "tenant-cancelled": { variant: "secondary", className: "bg-gray-100 text-gray-800" },
  "tenant-accepted": { variant: "secondary", className: "bg-emerald-100 text-emerald-800" },
  "credit-check-sent": { variant: "secondary", className: "bg-orange-100 text-orange-800" },
  approved: { variant: "secondary", className: "bg-green-200 text-green-900" },
}

export function formatDate(d: string | undefined) {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  })
}

/** Same heuristic as the apply form: ≥ $15k/month is most likely a yearly salary. */
export function looksYearly(monthly: number | undefined | null) {
  return monthly != null && monthly >= 15000
}

export function formatCurrency(value: number | undefined) {
  if (value == null) return "-"
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 0,
  }).format(value)
}

export const RESTRICTED_BREED_KEYWORDS = [
  "pit bull", "pitbull", "pit-bull",
  "rottweiler",
  "doberman",
  "german shepherd",
  "mastiff",
  "cane corso",
  "akita",
  "chow chow", "chow-chow",
  "wolf",
  "presa canario",
  "staffordshire", "staffy",
  "bull terrier",
  "great dane",
  "saint bernard", "st bernard", "st. bernard",
  "husky",
  "malamute",
  "boxer",
  "alaskan",
]

export function getPetWarning(petsJson: unknown): string | null {
  if (!petsJson || typeof petsJson !== "string") return null
  try {
    const parsed = JSON.parse(petsJson) as { pets?: Array<{ type?: string; breed?: string; weight?: string }> }
    const pets = parsed.pets || []
    for (const pet of pets) {
      const breed = (pet.breed || "").toLowerCase().trim()
      const weight = parseFloat(pet.weight || "")
      const isDog = (pet.type || "").toLowerCase() === "dog"
      if (isDog && Number.isFinite(weight) && weight > 35) {
        return `Large dog (${weight}lbs${breed ? `, ${pet.breed}` : ""})`
      }
      if (breed && RESTRICTED_BREED_KEYWORDS.some((kw) => breed.includes(kw))) {
        return `Restricted breed: ${pet.breed}`
      }
    }
  } catch {
    return null
  }
  return null
}

export const statusOptions = [
  "new",
  "review",
  "with-concerns",
  "in-progress",
  "pre-approved",
  "scheduled-for-showing",
  "showing-completed",
  "did-not-show-up",
  "tenant-cancelled",
  "tenant-accepted",
  "credit-check-sent",
  "approved",
  "rejected",
]

export const statusLabels: Record<string, string> = {
  new: "New",
  review: "Reviewed",
  "with-concerns": "With Concerns",
  "in-progress": "In Progress",
  "pre-approved": "Pre-Approved",
  "scheduled-for-showing": "Scheduled for Showing",
  "showing-completed": "Showing Completed",
  "did-not-show-up": "Did Not Show Up",
  "tenant-cancelled": "Tenant Cancelled",
  "tenant-accepted": "Tenant Accepted",
  "credit-check-sent": "Credit Check Sent",
  approved: "Approved",
  rejected: "Rejected",
}

export function getName(r: { fullName?: unknown; firstName?: unknown; lastName?: unknown }): string {
  if (typeof r.fullName === "string" && r.fullName) return r.fullName
  const first = typeof r.firstName === "string" ? r.firstName : ""
  const last = typeof r.lastName === "string" ? r.lastName : ""
  return `${first} ${last}`.trim() || "-"
}

/** System score (0-80) plus admin/AI rating (0-10) ×2. */
export function totalScore(r: { score?: unknown; adminRating?: unknown }): number {
  return (typeof r.score === "number" ? r.score : 0) + (typeof r.adminRating === "number" ? r.adminRating : 0) * 2
}
