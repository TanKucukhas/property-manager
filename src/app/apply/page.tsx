"use client";

import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AvailableProperty {
  id: number;
  name: string;
  address1: string;
  city: string;
  state: string;
}

interface PrescreeningForm {
  // Step 1 — Personal
  propertyApplyingFor: string;
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  currentAddress: string;
  desiredMoveIn: string;
  numAdults: number;
  numChildren: number;
  occupantNames: string;
  reasonForMove: string;
  howHeardAbout: string;
  preferredContactMethod: string;
  showingAvailability: string;

  // Step 2 — Income
  employmentStatus: string;
  employerName: string;
  jobTitle: string;
  employerLength: string;
  incomeSources: string;
  grossMonthlyIncome: number;
  incomeExceeds3437: string;
  canProveIncome: string;
  canPayMoveIn: string;
  lateRentPayments: string;
  lateRentExplanation: string;

  // Step 3 — Credit
  creditScoreRange: string;
  willingToScreen: string;
  allAdultsWillingToScreen: string;
  creditIssuesDisclosure: string;

  // Step 4 — Rental History
  currentHousingStatus: string;
  currentLandlordName: string;
  currentLandlordPhone: string;
  currentHousingPayment: number;
  timeAtCurrentAddress: string;
  hasRentedBefore: string;
  brokenLease: string;
  askedToMoveOut: string;
  evictionFiled: string;
  oweMoneyToLandlord: string;
  causedPropertyDamage: string;
  rentalHistoryExplanation: string;

  // Step 5 — Property Use
  fullTimeResidence: string;
  intentToSublease: string;
  intentToAirbnb: string;

  // Step 6 — Pets
  hasPets: string;
  petDetails: string;
  petsHouseTrained: string;
  petsCausedDamage: string;
  understandPetPolicy: string;

  // Step 7 — Smoking & Property Care
  anyoneSmokeVape: string;
  willingToMaintain: string;
  willingToHandleUtilities: string;

  // Step 8 — Disclosures
  backgroundDisclosure: string;

  // Step 9 — Confirmation
  infoAccurate: boolean;
  understandNoGuarantee: boolean;
  falseInfoDisqualify: boolean;
  consentToContact: boolean;
  additionalNotes: string;
}

const TOTAL_STEPS = 10;

const STEP_TITLES = [
  "Overview",
  "Personal Information",
  "Income & Employment",
  "Credit & Screening",
  "Rental History",
  "Property Use",
  "Pets",
  "Smoking & Property Care",
  "Disclosures",
  "Confirmation",
];

const STEP_REQUIRED_FIELDS: (keyof PrescreeningForm)[][] = [
  [],
  ["fullName", "phone", "email", "desiredMoveIn", "currentAddress", "occupantNames", "preferredContactMethod"],
  ["employmentStatus", "grossMonthlyIncome", "incomeExceeds3437", "canProveIncome", "canPayMoveIn", "lateRentPayments"],
  ["creditScoreRange", "willingToScreen", "allAdultsWillingToScreen"],
  ["currentHousingStatus"],
  ["fullTimeResidence", "intentToSublease", "intentToAirbnb"],
  ["hasPets", "understandPetPolicy"],
  ["anyoneSmokeVape", "willingToMaintain", "willingToHandleUtilities"],
  [],
  [],
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function FieldLabel({ htmlFor, required, children }: { htmlFor?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-lg font-medium">
      {children}
      {required && <span className="text-destructive ml-1">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive mt-1">{message}</p>;
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function ApplyPage() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [scoreResult, setScoreResult] = useState<string | null>(null);
  const [availableProperties, setAvailableProperties] = useState<AvailableProperty[]>([]);

  useEffect(() => {
    fetch("/api/properties/available")
      .then((r) => r.json())
      .then((data) => setAvailableProperties(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<PrescreeningForm>({
    defaultValues: { numAdults: 1, numChildren: 0 },
    mode: "onTouched",
  });

  const lateRentPayments = watch("lateRentPayments");
  const hasPets = watch("hasPets");
  const brokenLease = watch("brokenLease");
  const askedToMoveOut = watch("askedToMoveOut");
  const evictionFiled = watch("evictionFiled");
  const oweMoneyToLandlord = watch("oweMoneyToLandlord");
  const causedPropertyDamage = watch("causedPropertyDamage");
  const showRentalExplanation =
    brokenLease === "true" || askedToMoveOut === "true" || evictionFiled === "true" ||
    oweMoneyToLandlord === "true" || causedPropertyDamage === "true";

  async function goNext() {
    const fields = STEP_REQUIRED_FIELDS[step];
    if (fields.length > 0) {
      const valid = await trigger(fields);
      if (!valid) return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit(data: PrescreeningForm) {
    try {
      const payload = {
        propertyId: data.propertyApplyingFor ? parseInt(data.propertyApplyingFor) : undefined,
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
        dateOfBirth: data.dateOfBirth,
        currentAddress: data.currentAddress,
        desiredMoveIn: data.desiredMoveIn,
        adultsCount: data.numAdults,
        childrenCount: data.numChildren,
        occupantNames: data.occupantNames,
        preferredContactMethod: data.preferredContactMethod,
        showingAvailability: data.showingAvailability,
        howHeardAbout: data.howHeardAbout,
        moveReason: data.reasonForMove,
        employmentStatus: data.employmentStatus,
        employerName: data.employerName,
        jobTitle: data.jobTitle,
        employmentLength: data.employerLength,
        incomeSources: data.incomeSources,
        monthlyIncome: data.grossMonthlyIncome,
        meetsIncomeRequirement: data.incomeExceeds3437 === "true",
        canProvideProofOfIncome: data.canProveIncome === "true",
        canPayMoveIn: data.canPayMoveIn === "true",
        latePayments: data.lateRentPayments === "true",
        latePaymentsExplanation: data.lateRentExplanation,
        creditScoreRange: data.creditScoreRange,
        screeningConsent: data.willingToScreen === "true",
        allAdultsWillingToScreen: data.allAdultsWillingToScreen === "true",
        creditIssuesDisclosure: data.creditIssuesDisclosure,
        housingStatus: data.currentHousingStatus,
        currentLandlordName: data.currentLandlordName,
        currentLandlordPhone: data.currentLandlordPhone,
        currentHousingPayment: data.currentHousingPayment || 0,
        currentAddressDuration: data.timeAtCurrentAddress,
        hasRentedBefore: data.hasRentedBefore === "true",
        priorEviction: data.evictionFiled === "true",
        evictionExplanation: data.rentalHistoryExplanation,
        brokenLease: data.brokenLease === "true",
        askedToMoveOut: data.askedToMoveOut === "true",
        landlordDebt: data.oweMoneyToLandlord === "true",
        propertyDamageHistory: data.causedPropertyDamage === "true",
        rentalHistoryExplanation: data.rentalHistoryExplanation,
        fullTimeResidence: data.fullTimeResidence === "true",
        intentToSublease: data.intentToSublease === "true",
        intentToAirbnb: data.intentToAirbnb === "true",
        hasPets: data.hasPets === "true",
        petsJson: data.petDetails ? JSON.stringify({ details: data.petDetails, houseTrained: data.petsHouseTrained, causedDamage: data.petsCausedDamage }) : undefined,
        smoking: data.anyoneSmokeVape === "true",
        willingToMaintain: data.willingToMaintain === "true",
        willingToHandleUtilities: data.willingToHandleUtilities === "true",
        backgroundDisclosure: data.backgroundDisclosure,
        additionalNotes: data.additionalNotes,
      };

      const res = await fetch("/api/prescreening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Submission failed");
      }

      const result = await res.json();
      setScoreResult(result.status);
      setSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  /* ---- Success ---- */
  if (submitted) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-600" />
        <h1 className="mt-6 text-3xl font-bold">Application Received</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Thank you for submitting your pre-screening application. We will
          review your information and get back to you shortly.
        </p>
        {scoreResult && (
          <p className="mt-4 text-lg">
            You will receive a confirmation email at the address you provided.
          </p>
        )}
        <Link href="/">
          <Button className="mt-8 h-12 px-8 text-lg">Back to Home</Button>
        </Link>
      </div>
    );
  }

  /* ---- Shared classes ---- */
  const inputClass =
    "mt-1 block w-full h-14 rounded-lg border border-input bg-transparent px-4 text-lg outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
  const textareaClass =
    "mt-1 block w-full min-h-[120px] rounded-lg border border-input bg-transparent px-4 py-3 text-lg outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
  const selectClass =
    "mt-1 block w-full h-14 rounded-lg border border-input bg-transparent px-4 text-lg outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  function YesNo({ name, required }: { name: keyof PrescreeningForm; required?: boolean }) {
    return (
      <div className="flex gap-4 mt-2">
        <label className="flex-1 cursor-pointer">
          <input type="radio" className="peer sr-only" value="true" {...register(name, { required: required ? "Required" : false })} />
          <div className="peer-checked:border-primary peer-checked:bg-primary/5 rounded-xl border-2 p-5 text-center text-lg font-medium transition">Yes</div>
        </label>
        <label className="flex-1 cursor-pointer">
          <input type="radio" className="peer sr-only" value="false" {...register(name, { required: required ? "Required" : false })} />
          <div className="peer-checked:border-primary peer-checked:bg-primary/5 rounded-xl border-2 p-5 text-center text-lg font-medium transition">No</div>
        </label>
      </div>
    );
  }

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <h1 className="text-3xl font-bold sm:text-4xl">Pre-screening Application</h1>

      {/* Progress */}
      <div className="mt-8 mb-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>Step {step + 1} of {TOTAL_STEPS}</span>
          <span>{STEP_TITLES[step]}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6">

        {/* ============================================================ */}
        {/*  STEP 0: Overview                                              */}
        {/* ============================================================ */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Before You Begin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 text-base leading-relaxed sm:text-lg">
              <p>
                Thank you for your interest. Before scheduling a showing, we ask all
                prospective applicants to complete this short pre-screening form.
                There is no fee at this stage.
              </p>
              <div>
                <p className="font-semibold">Minimum requirements:</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Credit score of 675+</li>
                  <li>Gross monthly household income of at least $3,437.50 (2.75x rent)</li>
                  <li>Move-in funds of $2,500 (first month + security deposit)</li>
                  <li>No subleasing or Airbnb</li>
                  <li>Pets considered case-by-case</li>
                  <li>Willingness to complete a $47 background and credit screening</li>
                </ul>
              </div>
              <p>
                This takes about 2-3 minutes. Only applicants meeting minimum
                requirements will be invited for a showing.
              </p>
              <p className="text-muted-foreground text-sm">
                All adult occupants may be required to complete a separate screening.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ============================================================ */}
        {/*  STEP 1: Personal Info                                        */}
        {/* ============================================================ */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

              {availableProperties.length > 0 && (
                <div>
                  <FieldLabel htmlFor="propertyApplyingFor">Which property are you applying for?</FieldLabel>
                  <select id="propertyApplyingFor" className={selectClass} {...register("propertyApplyingFor")}>
                    <option value="">Select property...</option>
                    {availableProperties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — {p.address1}, {p.city}, {p.state}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <FieldLabel htmlFor="fullName" required>Full Legal Name</FieldLabel>
                <input id="fullName" className={inputClass} {...register("fullName", { required: "Full name is required" })} />
                <FieldError message={errors.fullName?.message} />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="phone" required>Phone</FieldLabel>
                  <input id="phone" type="tel" className={inputClass} {...register("phone", { required: "Phone is required" })} />
                  <FieldError message={errors.phone?.message} />
                </div>
                <div>
                  <FieldLabel htmlFor="email" required>Email</FieldLabel>
                  <input id="email" type="email" className={inputClass} {...register("email", { required: "Email is required" })} />
                  <FieldError message={errors.email?.message} />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="preferredContactMethod" required>Preferred Contact Method</FieldLabel>
                  <select id="preferredContactMethod" className={selectClass} {...register("preferredContactMethod", { required: "Required" })}>
                    <option value="">Select...</option>
                    <option value="phone">Phone call</option>
                    <option value="text">Text message</option>
                    <option value="email">Email</option>
                  </select>
                  <FieldError message={errors.preferredContactMethod?.message} />
                </div>
                <div>
                  <FieldLabel htmlFor="showingAvailability">Preferred Showing Availability</FieldLabel>
                  <select id="showingAvailability" className={selectClass} {...register("showingAvailability")}>
                    <option value="">Select...</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="evenings">Evenings</option>
                    <option value="weekends">Weekends</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="dateOfBirth">Date of Birth</FieldLabel>
                  <input id="dateOfBirth" type="date" className={inputClass} {...register("dateOfBirth")} />
                </div>
                <div>
                  <FieldLabel htmlFor="desiredMoveIn" required>Desired Move-in Date</FieldLabel>
                  <input id="desiredMoveIn" type="date" className={inputClass} {...register("desiredMoveIn", { required: "Required" })} />
                  <FieldError message={errors.desiredMoveIn?.message} />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="currentAddress" required>Current Address</FieldLabel>
                <input id="currentAddress" className={inputClass} {...register("currentAddress", { required: "Required" })} />
                <FieldError message={errors.currentAddress?.message} />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="numAdults" required>Number of Adults</FieldLabel>
                  <input id="numAdults" type="number" min={1} className={inputClass} {...register("numAdults", { required: "Required", valueAsNumber: true })} />
                  <FieldError message={errors.numAdults?.message} />
                </div>
                <div>
                  <FieldLabel htmlFor="numChildren">Number of Children</FieldLabel>
                  <input id="numChildren" type="number" min={0} className={inputClass} {...register("numChildren", { valueAsNumber: true })} />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="occupantNames" required>Full Names of All Occupants</FieldLabel>
                <textarea id="occupantNames" className={textareaClass} placeholder="List all adults and minors who will live in the unit" {...register("occupantNames", { required: "Required" })} />
                <FieldError message={errors.occupantNames?.message} />
              </div>

              <div>
                <FieldLabel htmlFor="howHeardAbout">How did you hear about this listing?</FieldLabel>
                <select id="howHeardAbout" className={selectClass} {...register("howHeardAbout")}>
                  <option value="">Select...</option>
                  <option value="zillow">Zillow</option>
                  <option value="facebook">Facebook Marketplace</option>
                  <option value="craigslist">Craigslist</option>
                  <option value="referral">Referral / Word of Mouth</option>
                  <option value="sign">For Rent Sign</option>
                  <option value="apartments-com">Apartments.com</option>
                  <option value="realtor">Realtor.com</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <FieldLabel htmlFor="reasonForMove">Reason for Move</FieldLabel>
                <textarea id="reasonForMove" className={textareaClass} {...register("reasonForMove")} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ============================================================ */}
        {/*  STEP 2: Income & Employment                                  */}
        {/* ============================================================ */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Income & Employment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <FieldLabel htmlFor="employmentStatus" required>Employment Status</FieldLabel>
                <select id="employmentStatus" className={selectClass} {...register("employmentStatus", { required: "Required" })}>
                  <option value="">Select...</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="self-employed">Self-employed</option>
                  <option value="retired">Retired</option>
                  <option value="disability">Disability / Fixed Income</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="other">Other</option>
                </select>
                <FieldError message={errors.employmentStatus?.message} />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="employerName">Employer Name</FieldLabel>
                  <input id="employerName" className={inputClass} {...register("employerName")} />
                </div>
                <div>
                  <FieldLabel htmlFor="jobTitle">Job Title</FieldLabel>
                  <input id="jobTitle" className={inputClass} {...register("jobTitle")} />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="employerLength">Length with Current Employer</FieldLabel>
                  <input id="employerLength" className={inputClass} placeholder="e.g. 2 years" {...register("employerLength")} />
                </div>
                <div>
                  <FieldLabel htmlFor="incomeSources">Income Sources</FieldLabel>
                  <input id="incomeSources" className={inputClass} placeholder="e.g. salary, side business" {...register("incomeSources")} />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="grossMonthlyIncome" required>Gross Monthly Household Income ($)</FieldLabel>
                <input id="grossMonthlyIncome" type="number" min={0} step="0.01" className={inputClass} {...register("grossMonthlyIncome", { required: "Required", valueAsNumber: true })} />
                <FieldError message={errors.grossMonthlyIncome?.message} />
              </div>

              <div>
                <FieldLabel required>Does your total gross monthly household income equal or exceed $3,437.50?</FieldLabel>
                <YesNo name="incomeExceeds3437" required />
                <FieldError message={errors.incomeExceeds3437?.message} />
              </div>

              <div>
                <FieldLabel required>Can you provide proof of income?</FieldLabel>
                <YesNo name="canProveIncome" required />
                <FieldError message={errors.canProveIncome?.message} />
              </div>

              <div>
                <FieldLabel required>Can you pay $2,500 in move-in funds?</FieldLabel>
                <YesNo name="canPayMoveIn" required />
                <FieldError message={errors.canPayMoveIn?.message} />
              </div>

              <div>
                <FieldLabel required>Have you had any late rent payments in the past 12 months?</FieldLabel>
                <YesNo name="lateRentPayments" required />
                <FieldError message={errors.lateRentPayments?.message} />
              </div>

              {lateRentPayments === "true" && (
                <div>
                  <FieldLabel htmlFor="lateRentExplanation">Please explain</FieldLabel>
                  <textarea id="lateRentExplanation" className={textareaClass} {...register("lateRentExplanation")} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ============================================================ */}
        {/*  STEP 3: Credit & Screening                                   */}
        {/* ============================================================ */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Credit & Screening</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <FieldLabel htmlFor="creditScoreRange" required>Estimated Credit Score Range</FieldLabel>
                <select id="creditScoreRange" className={selectClass} {...register("creditScoreRange", { required: "Required" })}>
                  <option value="">Select...</option>
                  <option value="750+">750+</option>
                  <option value="700-749">700 - 749</option>
                  <option value="675-699">675 - 699</option>
                  <option value="650-674">650 - 674</option>
                  <option value="below-650">Below 650</option>
                  <option value="unknown">I don&apos;t know</option>
                </select>
                <FieldError message={errors.creditScoreRange?.message} />
                <p className="text-sm text-muted-foreground mt-1">Minimum credit score requirement is 675.</p>
              </div>

              <div>
                <FieldLabel required>Are you willing to complete the $47 background and credit screening?</FieldLabel>
                <YesNo name="willingToScreen" required />
                <FieldError message={errors.willingToScreen?.message} />
              </div>

              <div>
                <FieldLabel required>Are all adult occupants willing to complete a separate application/screening if requested?</FieldLabel>
                <YesNo name="allAdultsWillingToScreen" required />
                <FieldError message={errors.allAdultsWillingToScreen?.message} />
              </div>

              <div>
                <FieldLabel htmlFor="creditIssuesDisclosure">
                  Any bankruptcies, collections, or major credit issues you would like to disclose before formal screening?
                </FieldLabel>
                <textarea id="creditIssuesDisclosure" className={textareaClass} placeholder="Optional — anything you'd like us to know ahead of screening" {...register("creditIssuesDisclosure")} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ============================================================ */}
        {/*  STEP 4: Rental History                                       */}
        {/* ============================================================ */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Rental History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <FieldLabel htmlFor="currentHousingStatus" required>Current Housing Status</FieldLabel>
                <select id="currentHousingStatus" className={selectClass} {...register("currentHousingStatus", { required: "Required" })}>
                  <option value="">Select...</option>
                  <option value="renting">Renting</option>
                  <option value="own">Own</option>
                  <option value="family-friends">Living with Family/Friends</option>
                  <option value="other">Other</option>
                </select>
                <FieldError message={errors.currentHousingStatus?.message} />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="currentLandlordName">Current Landlord Name</FieldLabel>
                  <input id="currentLandlordName" className={inputClass} {...register("currentLandlordName")} />
                </div>
                <div>
                  <FieldLabel htmlFor="currentLandlordPhone">Current Landlord Phone</FieldLabel>
                  <input id="currentLandlordPhone" type="tel" className={inputClass} {...register("currentLandlordPhone")} />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="currentHousingPayment">Current Monthly Housing Payment ($)</FieldLabel>
                  <input id="currentHousingPayment" type="number" min={0} className={inputClass} {...register("currentHousingPayment", { valueAsNumber: true })} />
                </div>
                <div>
                  <FieldLabel htmlFor="timeAtCurrentAddress">How Long at Current Address</FieldLabel>
                  <input id="timeAtCurrentAddress" className={inputClass} placeholder="e.g. 3 years" {...register("timeAtCurrentAddress")} />
                </div>
              </div>

              <div>
                <FieldLabel>Have you rented before?</FieldLabel>
                <YesNo name="hasRentedBefore" />
              </div>

              <div className="border-t pt-6">
                <p className="text-lg font-medium mb-4">Please answer the following honestly:</p>

                <div className="space-y-6">
                  <div>
                    <FieldLabel>Have you ever broken a lease?</FieldLabel>
                    <YesNo name="brokenLease" />
                  </div>
                  <div>
                    <FieldLabel>Have you ever been asked to move out?</FieldLabel>
                    <YesNo name="askedToMoveOut" />
                  </div>
                  <div>
                    <FieldLabel>Has an eviction ever been filed against you?</FieldLabel>
                    <YesNo name="evictionFiled" />
                  </div>
                  <div>
                    <FieldLabel>Do you owe money to a previous landlord or utility company?</FieldLabel>
                    <YesNo name="oweMoneyToLandlord" />
                  </div>
                  <div>
                    <FieldLabel>Have you caused significant property damage?</FieldLabel>
                    <YesNo name="causedPropertyDamage" />
                  </div>

                  {showRentalExplanation && (
                    <div>
                      <FieldLabel htmlFor="rentalHistoryExplanation">Please explain any &quot;Yes&quot; answers above</FieldLabel>
                      <textarea id="rentalHistoryExplanation" className={textareaClass} {...register("rentalHistoryExplanation")} />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ============================================================ */}
        {/*  STEP 5: Property Use                                         */}
        {/* ============================================================ */}
        {step === 5 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Property Use</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <FieldLabel required>Will this be your full-time residence?</FieldLabel>
                <YesNo name="fullTimeResidence" required />
                <FieldError message={errors.fullTimeResidence?.message} />
              </div>
              <div>
                <FieldLabel required>Do you intend to sublease any portion of the property?</FieldLabel>
                <YesNo name="intentToSublease" required />
                <FieldError message={errors.intentToSublease?.message} />
              </div>
              <div>
                <FieldLabel required>Do you intend to use the property for Airbnb or short-term rentals?</FieldLabel>
                <YesNo name="intentToAirbnb" required />
                <FieldError message={errors.intentToAirbnb?.message} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ============================================================ */}
        {/*  STEP 6: Pets                                                 */}
        {/* ============================================================ */}
        {step === 6 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Pets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <FieldLabel required>Do you have any pets?</FieldLabel>
                <YesNo name="hasPets" required />
                <FieldError message={errors.hasPets?.message} />
              </div>

              {hasPets === "true" && (
                <>
                  <div>
                    <FieldLabel htmlFor="petDetails">Pet Details (type, breed, weight, age for each)</FieldLabel>
                    <textarea id="petDetails" className={textareaClass} placeholder="e.g. Dog, Golden Retriever, 65 lbs, 3 years old" {...register("petDetails")} />
                  </div>
                  <div>
                    <FieldLabel>Are your pets house-trained?</FieldLabel>
                    <YesNo name="petsHouseTrained" />
                  </div>
                  <div>
                    <FieldLabel>Have your pets caused property damage before?</FieldLabel>
                    <YesNo name="petsCausedDamage" />
                  </div>
                </>
              )}

              <div>
                <FieldLabel required>Do you understand that pets are considered case-by-case and may require additional fees?</FieldLabel>
                <YesNo name="understandPetPolicy" required />
                <FieldError message={errors.understandPetPolicy?.message} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ============================================================ */}
        {/*  STEP 7: Smoking & Property Care                              */}
        {/* ============================================================ */}
        {step === 7 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Smoking & Property Care</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <FieldLabel required>Does anyone in the household smoke or vape?</FieldLabel>
                <YesNo name="anyoneSmokeVape" required />
                <FieldError message={errors.anyoneSmokeVape?.message} />
              </div>
              <div>
                <FieldLabel required>Are you willing to maintain the property in good condition (lawn, snow, trash, filters, basic upkeep)?</FieldLabel>
                <YesNo name="willingToMaintain" required />
                <FieldError message={errors.willingToMaintain?.message} />
              </div>
              <div>
                <FieldLabel required>Are you willing to place utilities in your name and keep them active?</FieldLabel>
                <YesNo name="willingToHandleUtilities" required />
                <FieldError message={errors.willingToHandleUtilities?.message} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ============================================================ */}
        {/*  STEP 8: Disclosures                                          */}
        {/* ============================================================ */}
        {step === 8 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Disclosures</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed sm:text-lg">
                If there is anything that may appear on a background screening that you would like to
                proactively explain, you may do so here. This is optional and will not automatically
                disqualify your application.
              </p>
              <div>
                <FieldLabel htmlFor="backgroundDisclosure">
                  Is there anything you would like to disclose that may appear on a screening report?
                </FieldLabel>
                <textarea
                  id="backgroundDisclosure"
                  className={textareaClass}
                  placeholder="Optional"
                  {...register("backgroundDisclosure")}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ============================================================ */}
        {/*  STEP 9: Confirmation                                         */}
        {/* ============================================================ */}
        {step === 9 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Confirmation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 h-6 w-6 rounded border-input accent-primary" {...register("infoAccurate", { required: "You must confirm this" })} />
                  <span className="text-lg">I confirm that all information provided is accurate and complete.</span>
                </label>
                <FieldError message={errors.infoAccurate?.message} />

                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 h-6 w-6 rounded border-input accent-primary" {...register("understandNoGuarantee", { required: "You must confirm this" })} />
                  <span className="text-lg">I understand that completing this form does not guarantee approval or a showing.</span>
                </label>
                <FieldError message={errors.understandNoGuarantee?.message} />

                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 h-6 w-6 rounded border-input accent-primary" {...register("falseInfoDisqualify", { required: "You must confirm this" })} />
                  <span className="text-lg">I understand that providing false or misleading information may disqualify my application.</span>
                </label>
                <FieldError message={errors.falseInfoDisqualify?.message} />

                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 h-6 w-6 rounded border-input accent-primary" {...register("consentToContact", { required: "You must consent to be contacted" })} />
                  <span className="text-lg">I consent to being contacted by phone, text, or email regarding next steps.</span>
                </label>
                <FieldError message={errors.consentToContact?.message} />
              </div>

              <div>
                <FieldLabel htmlFor="additionalNotes">Anything else you want us to know?</FieldLabel>
                <textarea id="additionalNotes" className={textareaClass} {...register("additionalNotes")} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ============================================================ */}
        {/*  Navigation                                                    */}
        {/* ============================================================ */}
        <div className="flex gap-4 mt-8">
          {step > 0 && (
            <Button type="button" variant="outline" onClick={goBack} className="h-14 flex-1 text-lg">
              <ArrowLeft className="mr-2 h-5 w-5" /> Back
            </Button>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <Button type="button" onClick={goNext} className="h-14 flex-1 text-lg">
              {step === 0 ? "Get Started" : "Next"} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting} className="h-14 flex-1 text-lg font-semibold">
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
