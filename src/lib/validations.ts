import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email required"),
  password: z.string().min(1, "Password required"),
});

export const prescreeningSchema = z.object({
  propertyId: z.coerce.number().optional(),
  fullName: z.string().min(2, "Full legal name required"),
  phone: z.string().min(10, "Valid phone number required"),
  email: z.string().email("Valid email required"),
  dateOfBirth: z.string().optional(),
  currentAddress: z.string().optional(),
  desiredMoveIn: z.string().min(1, "Move-in date required"),
  adultsCount: z.coerce.number().min(1, "At least 1 adult"),
  childrenCount: z.coerce.number().min(0).default(0),
  occupantNames: z.string().optional(),
  preferredContactMethod: z.string().optional(),
  showingAvailability: z.string().optional(),
  howHeardAbout: z.string().optional(),
  monthlyIncome: z.coerce.number().min(0, "Income required"),
  creditScoreRange: z.string().min(1, "Credit score range required"),
  employmentStatus: z.string().min(1, "Employment status required"),
  employerName: z.string().optional(),
  jobTitle: z.string().optional(),
  employmentLength: z.string().optional(),
  incomeSources: z.string().optional(),
  canProvideProofOfIncome: z.coerce.boolean(),
  meetsIncomeRequirement: z.coerce.boolean(),
  canPayMoveIn: z.coerce.boolean(),
  latePayments: z.coerce.boolean().default(false),
  latePaymentsExplanation: z.string().optional(),
  housingStatus: z.string().min(1, "Current housing status required"),
  currentLandlordName: z.string().optional(),
  currentLandlordPhone: z.string().optional(),
  currentHousingPayment: z.coerce.number().optional(),
  currentAddressDuration: z.string().optional(),
  hasRentedBefore: z.coerce.boolean().optional(),
  priorEviction: z.coerce.boolean(),
  evictionExplanation: z.string().optional(),
  brokenLease: z.coerce.boolean().default(false),
  askedToMoveOut: z.coerce.boolean().default(false),
  landlordDebt: z.coerce.boolean(),
  propertyDamageHistory: z.coerce.boolean().default(false),
  rentalHistoryExplanation: z.string().optional(),
  allAdultsWillingToScreen: z.coerce.boolean().optional(),
  creditIssuesDisclosure: z.string().optional(),
  hasPets: z.coerce.boolean(),
  petsJson: z.string().optional(),
  smoking: z.coerce.boolean(),
  willingToMaintain: z.coerce.boolean(),
  willingToHandleUtilities: z.coerce.boolean(),
  intentToSublease: z.coerce.boolean(),
  intentToAirbnb: z.coerce.boolean(),
  fullTimeResidence: z.coerce.boolean(),
  backgroundDisclosure: z.string().optional(),
  screeningConsent: z.coerce.boolean(),
  moveReason: z.string().optional(),
  additionalNotes: z.string().optional(),
});

export const maintenanceSchema = z.object({
  tenantName: z.string().min(2, "Name required"),
  tenantPhone: z.string().optional(),
  tenantEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  title: z.string().min(3, "Title required"),
  description: z.string().min(10, "Please describe the issue in detail"),
  category: z.string().min(1, "Category required"),
  priority: z.string().default("medium"),
});

export const propertySchema = z.object({
  name: z.string().min(1, "Property name required"),
  address1: z.string().min(1, "Address required"),
  city: z.string().min(1, "City required"),
  state: z.string().min(1, "State required"),
  zip: z.string().min(5, "ZIP code required"),
  monthlyRent: z.coerce.number().min(0),
  securityDeposit: z.coerce.number().min(0),
  leaseType: z.string().default("fixed"),
  status: z.string().default("available"),
  leaseTermsSummary: z.string().optional(),
});

export const tenantSchema = z.object({
  propertyId: z.coerce.number(),
  fullName: z.string().min(1, "Name required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  moveInDate: z.string().optional(),
  moveOutDate: z.string().optional(),
  monthlyRent: z.coerce.number().min(0),
  depositRequired: z.coerce.number().min(0),
  depositPaid: z.coerce.number().min(0).default(0),
  leaseStatus: z.string().default("active"),
  notes: z.string().optional(),
});

export const paymentSchema = z.object({
  tenantId: z.coerce.number(),
  propertyId: z.coerce.number(),
  dueDate: z.string().min(1, "Due date required"),
  amountDue: z.coerce.number().min(0),
  amountPaid: z.coerce.number().min(0).default(0),
  paymentDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  status: z.string().default("unpaid"),
  lateFee: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

export const depositSchema = z.object({
  tenantId: z.coerce.number(),
  propertyId: z.coerce.number(),
  depositRequired: z.coerce.number().min(0),
  depositPaid: z.coerce.number().min(0).default(0),
  paidDate: z.string().optional(),
  refundAmount: z.coerce.number().optional(),
  refundDate: z.string().optional(),
  deductions: z.string().optional(),
  notes: z.string().optional(),
});

export const leaseTermsSchema = z.object({
  propertyId: z.coerce.number(),
  leaseStart: z.string().optional(),
  leaseEnd: z.string().optional(),
  monthlyRent: z.coerce.number().min(0),
  lateFeeRule: z.string().optional(),
  securityDeposit: z.coerce.number().optional(),
  petsAllowed: z.coerce.boolean().default(false),
  petFee: z.coerce.number().optional(),
  petRent: z.coerce.number().optional(),
  utilitiesTerms: z.string().optional(),
  maintenanceTerms: z.string().optional(),
  smokingTerms: z.string().optional(),
  showingNoticeTerms: z.string().optional(),
  specialTerms: z.string().optional(),
});

// Prescreening scoring — informational only, no auto-reject
// Total: 80 from form + admin rating (0-10, ×2 weight) = 100
// Consent fields are flags, not scored — you either consent or you don't
const INCOME_THRESHOLD = 3437.50;

export function scorePrescreening(data: z.infer<typeof prescreeningSchema>): {
  score: number;
  flags: string[];
} {
  let score = 0;
  const flags: string[] = [];

  // Credit (0-25)
  const creditMap: Record<string, number> = {
    "800+": 25,
    "750-799": 22,
    "700-749": 18,
    "650-699": 14,
    "600-649": 9,
    "550-599": 5,
    "500-549": 2,
    "below-500": 0,
    "unknown": 0,
  };
  score += creditMap[data.creditScoreRange] ?? 0;
  if (["500-549", "below-500"].includes(data.creditScoreRange)) flags.push("Low credit score");
  if (data.creditScoreRange === "unknown") flags.push("Credit score unknown");

  // Income (0-25)
  if (data.monthlyIncome >= INCOME_THRESHOLD * 1.2) score += 25;
  else if (data.monthlyIncome >= INCOME_THRESHOLD) score += 20;
  else if (data.monthlyIncome >= INCOME_THRESHOLD * 0.8) { score += 10; flags.push("Income below 2.75x rent"); }
  else { flags.push("Income significantly below threshold"); }

  // Move-in readiness (0-10)
  if (data.canPayMoveIn) score += 10;
  else flags.push("Cannot pay move-in funds");

  // Rental history (0-20)
  let rentalScore = 20;
  if (data.priorEviction) { rentalScore -= 10; flags.push("Prior eviction"); }
  if (data.landlordDebt) { rentalScore -= 5; flags.push("Owes landlord/utility debt"); }
  if (data.brokenLease) { rentalScore -= 3; flags.push("Broken lease"); }
  if (data.askedToMoveOut) { rentalScore -= 2; flags.push("Asked to move out"); }
  if (data.propertyDamageHistory) { rentalScore -= 2; flags.push("Property damage history"); }
  score += Math.max(rentalScore, 0);

  // Flags only — no points, just info for admin
  if (!data.screeningConsent) flags.push("Refuses screening");
  if (data.allAdultsWillingToScreen === false) flags.push("Not all adults willing to screen");
  if (data.intentToSublease) flags.push("Intends to sublease");
  if (data.intentToAirbnb) flags.push("Intends to Airbnb");
  if (!data.fullTimeResidence) flags.push("Not full-time residence");
  if (data.smoking) flags.push("Smoker/vaper in household");

  // Admin rates 0-10 (×2 = up to 20 effective points, set manually in admin panel)
  // Not calculated here — added when admin reviews

  return { score: Math.min(score, 80), flags };
}
