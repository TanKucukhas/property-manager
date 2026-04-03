"use client";

import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle2, Home, DollarSign, ShieldCheck } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AvailableProperty {
  id: number;
  name: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  monthlyRent: number;
  securityDeposit: number;
}

interface FormData {
  propertyApplyingFor: string;
  agreeToTerms: boolean;
  fullName: string;
  phone: string;
  email: string;
  preferredContactMethod: string;
  dateOfBirth: string;
  currentAddress: string;
  desiredMoveIn: string;
  numAdults: number;
  numChildren: number;
  occupantNames: string;
  howHeardAbout: string;
  showingAvailability: string;
  reasonForMove: string;
  employmentStatus: string;
  employerName: string;
  jobTitle: string;
  employerLength: string;
  incomeSources: string;
  grossMonthlyIncome: number;
  incomeExceeds: string;
  canProveIncome: string;
  canPayMoveIn: string;
  lateRentPayments: string;
  lateRentExplanation: string;
  creditScoreRange: string;
  willingToScreen: string;
  allAdultsWillingToScreen: string;
  creditIssuesDisclosure: string;
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
  fullTimeResidence: string;
  intentToSublease: string;
  intentToAirbnb: string;
  hasPets: string;
  petDetails: string;
  petsHouseTrained: string;
  petsCausedDamage: string;
  understandPetPolicy: string;
  anyoneSmokeVape: string;
  willingToMaintain: string;
  willingToHandleUtilities: string;
  backgroundDisclosure: string;
  infoAccurate: boolean;
  understandNoGuarantee: boolean;
  falseInfoDisqualify: boolean;
  consentToContact: boolean;
  additionalNotes: string;
}

/* ------------------------------------------------------------------ */
/*  Steps                                                              */
/* ------------------------------------------------------------------ */

const STEP_TITLES = [
  "Overview",
  "Select Property",
  "Contact Information",
  "Move-in Details",
  "Employment",
  "Income & Funds",
  "Additional Info",
  "Rental History",
  "Rental Background",
  "Property Use & Pets",
  "Property Care",
  "Disclosures",
  "Confirmation",
];

const TOTAL_STEPS = STEP_TITLES.length;

const STEP_REQUIRED: (keyof FormData)[][] = [
  [],                                                                     // 0  Overview
  ["propertyApplyingFor", "agreeToTerms"],                                // 1  Select Property
  ["fullName", "phone", "email", "preferredContactMethod"],               // 2  Contact
  ["currentAddress", "desiredMoveIn", "occupantNames"],                   // 3  Move-in
  ["employmentStatus"],                                                   // 4  Employment
  ["grossMonthlyIncome", "incomeExceeds", "canProveIncome", "canPayMoveIn", "lateRentPayments"], // 5 Income
  ["allAdultsWillingToScreen"],     // 6  Additional Info
  ["currentHousingStatus"],                                               // 7  Rental History
  [],                                                                     // 8  Rental Background
  ["fullTimeResidence", "intentToSublease", "intentToAirbnb", "hasPets"], // 9  Property Use & Pets
  ["anyoneSmokeVape", "willingToMaintain", "willingToHandleUtilities"],   // 10 Property Care
  [],                                                                     // 11 Disclosures
  [],                                                                     // 12 Confirmation
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function Label({ htmlFor, required, children }: { htmlFor?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-lg font-medium">
      {children}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="text-sm text-red-500 mt-1">{msg}</p> : null;
}

const input = "mt-1 block w-full h-14 rounded-xl border border-input bg-transparent px-4 text-lg outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const textarea = "mt-1 block w-full min-h-[120px] rounded-xl border border-input bg-transparent px-4 py-3 text-lg outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const select = "mt-1 block w-full h-14 rounded-xl border border-input bg-transparent px-4 text-lg outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function ApplyPage() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [properties, setProperties] = useState<AvailableProperty[]>([]);
  const [selectedProp, setSelectedProp] = useState<AvailableProperty | null>(null);
  const [occupantNames, setOccupantNames] = useState<string[]>([]);
  const [numPets, setNumPets] = useState(0);
  const [petList, setPetList] = useState<{ type: string; breed: string; weight: string; age: string }[]>([]);

  useEffect(() => {
    fetch("/api/properties/available").then(r => r.json()).then(d => setProperties(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const { register, handleSubmit, watch, trigger, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: { numAdults: 1, numChildren: 0 },
    mode: "onTouched",
  });

  const propId = watch("propertyApplyingFor");
  const numAdults = watch("numAdults") || 1;
  const numChildren = watch("numChildren") || 0;
  const totalOccupants = numAdults + numChildren;

  // Auto-size occupant name fields based on adults + children count
  useEffect(() => {
    setOccupantNames(prev => {
      const next = [...prev];
      while (next.length < totalOccupants) next.push("");
      while (next.length > totalOccupants) next.pop();
      return next;
    });
  }, [totalOccupants]);

  // Validate all occupant names are filled
  const allOccupantsFilled = occupantNames.length > 0 && occupantNames.every(n => n.trim().length > 0);

  // Sync pet list with numPets
  useEffect(() => {
    setPetList(prev => {
      const next = [...prev];
      while (next.length < numPets) next.push({ type: "", breed: "", weight: "", age: "" });
      while (next.length > numPets) next.pop();
      return next;
    });
  }, [numPets]);
  const lateRent = watch("lateRentPayments");
  const hasPets = watch("hasPets");
  const broken = watch("brokenLease");
  const asked = watch("askedToMoveOut");
  const eviction = watch("evictionFiled");
  const owes = watch("oweMoneyToLandlord");
  const damage = watch("causedPropertyDamage");
  const showExplanation = [broken, asked, eviction, owes, damage].some(v => v === "true");

  // Update selected property when dropdown changes
  useEffect(() => {
    const p = properties.find(p => String(p.id) === propId);
    setSelectedProp(p || null);
  }, [propId, properties]);

  async function goNext() {
    const fields = STEP_REQUIRED[step];
    if (fields.length > 0) {
      const valid = await trigger(fields);
      if (!valid) return;
    }
    // Step 3: validate all occupant names are filled
    if (step === 3 && !allOccupantsFilled) {
      setValue("occupantNames", "", { shouldValidate: true });
      toast.error("Please enter a name for every occupant.");
      return;
    }
    setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setStep(s => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit(data: FormData) {
    try {
      const payload = {
        propertyId: data.propertyApplyingFor ? parseInt(data.propertyApplyingFor) : undefined,
        fullName: data.fullName, phone: data.phone, email: data.email,
        dateOfBirth: data.dateOfBirth, currentAddress: data.currentAddress,
        desiredMoveIn: data.desiredMoveIn, adultsCount: data.numAdults,
        childrenCount: data.numChildren, occupantNames: data.occupantNames,
        preferredContactMethod: data.preferredContactMethod,
        showingAvailability: data.showingAvailability, howHeardAbout: data.howHeardAbout,
        moveReason: data.reasonForMove, employmentStatus: data.employmentStatus,
        employerName: data.employerName, jobTitle: data.jobTitle,
        employmentLength: data.employerLength, incomeSources: data.incomeSources,
        monthlyIncome: data.grossMonthlyIncome,
        meetsIncomeRequirement: data.incomeExceeds === "true",
        canProvideProofOfIncome: data.canProveIncome === "true",
        canPayMoveIn: data.canPayMoveIn === "true",
        latePayments: data.lateRentPayments === "true",
        latePaymentsExplanation: data.lateRentExplanation,
        creditScoreRange: "unknown",
        screeningConsent: true,
        allAdultsWillingToScreen: data.allAdultsWillingToScreen === "true",
        creditIssuesDisclosure: data.creditIssuesDisclosure,
        housingStatus: data.currentHousingStatus,
        currentLandlordName: data.currentLandlordName,
        currentLandlordPhone: data.currentLandlordPhone,
        currentHousingPayment: data.currentHousingPayment || 0,
        currentAddressDuration: data.timeAtCurrentAddress,
        hasRentedBefore: data.hasRentedBefore === "true",
        priorEviction: data.evictionFiled === "true",
        brokenLease: data.brokenLease === "true",
        askedToMoveOut: data.askedToMoveOut === "true",
        landlordDebt: data.oweMoneyToLandlord === "true",
        propertyDamageHistory: data.causedPropertyDamage === "true",
        rentalHistoryExplanation: data.rentalHistoryExplanation,
        fullTimeResidence: data.fullTimeResidence === "true",
        intentToSublease: data.intentToSublease === "true",
        intentToAirbnb: data.intentToAirbnb === "true",
        hasPets: data.hasPets === "true",
        petsJson: petList.length > 0 ? JSON.stringify({ pets: petList, houseTrained: data.petsHouseTrained, causedDamage: data.petsCausedDamage }) : undefined,
        smoking: data.anyoneSmokeVape === "true",
        willingToMaintain: data.willingToMaintain === "true",
        willingToHandleUtilities: data.willingToHandleUtilities === "true",
        backgroundDisclosure: data.backgroundDisclosure,
        additionalNotes: data.additionalNotes,
      };
      const res = await fetch("/api/prescreening", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Submission failed");
      setSubmitted(true);
      toast.success("Application submitted!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-600" />
        <h1 className="mt-6 text-3xl font-bold">Application Received</h1>
        <p className="mt-3 text-lg text-muted-foreground">We will review your information and get back to you shortly. Check your email for a confirmation with your submission details.</p>
        <Link href="/"><Button className="mt-8 h-12 px-8 text-lg">Back to Home</Button></Link>
      </div>
    );
  }

  function YesNo({ name, required: req }: { name: keyof FormData; required?: boolean }) {
    return (
      <div className="flex gap-4 mt-2">
        <label className="flex-1 cursor-pointer">
          <input type="radio" className="peer sr-only" value="true" {...register(name, { required: req ? "Required" : false })} />
          <div className="peer-checked:border-primary peer-checked:bg-primary/5 rounded-xl border-2 p-5 text-center text-lg font-medium transition">Yes</div>
        </label>
        <label className="flex-1 cursor-pointer">
          <input type="radio" className="peer sr-only" value="false" {...register(name, { required: req ? "Required" : false })} />
          <div className="peer-checked:border-primary peer-checked:bg-primary/5 rounded-xl border-2 p-5 text-center text-lg font-medium transition">No</div>
        </label>
      </div>
    );
  }

  const progress = ((step + 1) / TOTAL_STEPS) * 100;
  const incomeReq = selectedProp ? (selectedProp.monthlyRent * 2.75).toFixed(2) : "3,437.50";
  const moveInCost = selectedProp ? `$${(selectedProp.monthlyRent + selectedProp.securityDeposit).toLocaleString()}` : "$2,500";

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

        {/* ── STEP 0: Overview ── */}
        {step === 0 && (
          <Card>
            <CardHeader><CardTitle className="text-2xl">Before You Begin</CardTitle></CardHeader>
            <CardContent className="space-y-5 text-base leading-relaxed sm:text-lg">
              <p>This is a quick pre-screening form. No fee required. Only applicants meeting minimum requirements will be invited for a showing.</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-xl border p-4">
                  <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
                  <div><p className="font-semibold text-sm">Free</p><p className="text-xs text-muted-foreground">No credit check</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border p-4">
                  <DollarSign className="h-6 w-6 text-primary shrink-0" />
                  <div><p className="font-semibold text-sm">Income</p><p className="text-xs text-muted-foreground">2.75x monthly rent</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border p-4">
                  <Home className="h-6 w-6 text-primary shrink-0" />
                  <div><p className="font-semibold text-sm">Move-in</p><p className="text-xs text-muted-foreground">First + deposit</p></div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Takes 2-3 minutes. No fee required.</p>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 1: Select Property ── */}
        {step === 1 && (
          <Card>
            <CardHeader><CardTitle className="text-2xl">Select Property</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="propertyApplyingFor" required>Which property are you applying for?</Label>
                <select id="propertyApplyingFor" className={select} {...register("propertyApplyingFor", { required: "Please select a property" })}>
                  <option value="">Select a property...</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name} — {p.address1}, {p.city}, {p.state}</option>
                  ))}
                </select>
                <Err msg={errors.propertyApplyingFor?.message} />
              </div>

              {selectedProp && (
                <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 space-y-3">
                  <h3 className="font-semibold text-lg">{selectedProp.name}</h3>
                  <p className="text-muted-foreground">{selectedProp.address1}, {selectedProp.city}, {selectedProp.state} {selectedProp.zip}</p>
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="text-center">
                      <p className="text-2xl font-bold">${selectedProp.monthlyRent.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Monthly Rent</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">${selectedProp.securityDeposit.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Deposit</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">${(selectedProp.monthlyRent + selectedProp.securityDeposit).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Total Move-in</p>
                    </div>
                  </div>
                  <div className="border-t pt-3 mt-3 text-sm text-muted-foreground space-y-1">
                    <p>Min. income: <strong>${(selectedProp.monthlyRent * 2.75).toLocaleString()}/mo</strong> (2.75x rent)</p>
                    <p>No subleasing or Airbnb. Pets case-by-case.</p>
                  </div>
                </div>
              )}

              {selectedProp && (
                <div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-1 h-6 w-6 rounded border-input accent-primary" {...register("agreeToTerms", { required: "You must agree to proceed" })} />
                    <span className="text-lg">I have reviewed the property details and requirements above and wish to proceed with the pre-screening application.</span>
                  </label>
                  <Err msg={errors.agreeToTerms?.message} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── STEP 2: Contact Info ── */}
        {step === 2 && (
          <Card>
            <CardHeader><CardTitle className="text-2xl">Contact Information</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="fullName" required>Full Legal Name</Label>
                <input id="fullName" className={input} {...register("fullName", { required: "Required" })} />
                <Err msg={errors.fullName?.message} />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <Label htmlFor="phone" required>Phone</Label>
                  <input id="phone" type="tel" className={input} placeholder="(555) 123-4567" {...register("phone", { required: "Required", pattern: { value: /^[\d\s\-().+]{10,}$/, message: "Enter a valid phone number" } })} />
                  <Err msg={errors.phone?.message} />
                </div>
                <div>
                  <Label htmlFor="email" required>Email</Label>
                  <input id="email" type="email" className={input} placeholder="you@example.com" {...register("email", { required: "Required", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email address" } })} />
                  <Err msg={errors.email?.message} />
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <Label htmlFor="preferredContactMethod" required>Preferred Contact Method</Label>
                  <select id="preferredContactMethod" className={select} {...register("preferredContactMethod", { required: "Required" })}>
                    <option value="">Select...</option>
                    <option value="phone">Phone call</option>
                    <option value="text">Text message</option>
                    <option value="email">Email</option>
                  </select>
                  <Err msg={errors.preferredContactMethod?.message} />
                </div>
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <input id="dateOfBirth" type="date" className={input} {...register("dateOfBirth")} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 3: Move-in Details ── */}
        {step === 3 && (
          <Card>
            <CardHeader><CardTitle className="text-2xl">Move-in Details</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="desiredMoveIn" required>Desired Move-in Date</Label>
                <input id="desiredMoveIn" type="date" className={input} {...register("desiredMoveIn", { required: "Required" })} />
                <Err msg={errors.desiredMoveIn?.message} />
              </div>
              <div>
                <Label htmlFor="currentAddress" required>Current Address</Label>
                <input id="currentAddress" className={input} {...register("currentAddress", { required: "Required" })} />
                <Err msg={errors.currentAddress?.message} />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <Label htmlFor="numAdults">Adults</Label>
                  <input id="numAdults" type="number" min={1} className={input} {...register("numAdults", { valueAsNumber: true })} />
                </div>
                <div>
                  <Label htmlFor="numChildren">Children</Label>
                  <input id="numChildren" type="number" min={0} className={input} {...register("numChildren", { valueAsNumber: true })} />
                </div>
              </div>
              <div>
                <Label required>Full Name of Each Occupant</Label>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  {totalOccupants} occupant{totalOccupants !== 1 ? "s" : ""} based on the numbers above.
                </p>
                <input type="hidden" {...register("occupantNames", { required: "Enter all occupant names" })} />
                <div className="space-y-3">
                  {occupantNames.map((name, i) => {
                    const isAdult = i < numAdults;
                    const label = isAdult ? `Adult ${i + 1}` : `Child ${i - numAdults + 1}`;
                    return (
                      <div key={i}>
                        <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
                        <input
                          required
                          className={input}
                          placeholder={`${label} — full name`}
                          value={name}
                          onChange={(e) => {
                            const updated = [...occupantNames];
                            updated[i] = e.target.value;
                            setOccupantNames(updated);
                            setValue("occupantNames", updated.filter(n => n.trim()).join("\n"), { shouldValidate: true });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <Err msg={errors.occupantNames?.message} />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <Label htmlFor="showingAvailability">Showing Availability</Label>
                  <select id="showingAvailability" className={select} {...register("showingAvailability")}>
                    <option value="">Select...</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="evenings">Evenings</option>
                    <option value="weekends">Weekends</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="howHeardAbout">How did you find us?</Label>
                  <select id="howHeardAbout" className={select} {...register("howHeardAbout")}>
                    <option value="">Select...</option>
                    <option value="zillow">Zillow</option>
                    <option value="facebook">Facebook</option>
                    <option value="craigslist">Craigslist</option>
                    <option value="referral">Referral</option>
                    <option value="sign">For Rent Sign</option>
                    <option value="apartments-com">Apartments.com</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="reasonForMove">Reason for Move</Label>
                <textarea id="reasonForMove" className={textarea} {...register("reasonForMove")} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 4: Employment ── */}
        {step === 4 && (
          <Card>
            <CardHeader><CardTitle className="text-2xl">Employment</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="employmentStatus" required>Employment Status</Label>
                <select id="employmentStatus" className={select} {...register("employmentStatus", { required: "Required" })}>
                  <option value="">Select...</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="self-employed">Self-employed</option>
                  <option value="retired">Retired</option>
                  <option value="disability">Disability / Fixed Income</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="other">Other</option>
                </select>
                <Err msg={errors.employmentStatus?.message} />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <Label htmlFor="employerName">Employer Name</Label>
                  <input id="employerName" className={input} {...register("employerName")} />
                </div>
                <div>
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <input id="jobTitle" className={input} {...register("jobTitle")} />
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <Label htmlFor="employerLength">Length with Employer</Label>
                  <input id="employerLength" className={input} placeholder="e.g. 2 years" {...register("employerLength")} />
                </div>
                <div>
                  <Label htmlFor="incomeSources">Income Sources</Label>
                  <input id="incomeSources" className={input} placeholder="e.g. salary, side business" {...register("incomeSources")} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 5: Income & Funds ── */}
        {step === 5 && (
          <Card>
            <CardHeader><CardTitle className="text-2xl">Income & Move-in Funds</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="grossMonthlyIncome" required>Gross Monthly Household Income ($)</Label>
                <input id="grossMonthlyIncome" type="number" min={0} step="0.01" className={input} {...register("grossMonthlyIncome", { required: "Required", valueAsNumber: true })} />
                <Err msg={errors.grossMonthlyIncome?.message} />
              </div>
              <div>
                <Label required>Does your household income equal or exceed ${incomeReq}/month?</Label>
                <YesNo name="incomeExceeds" required />
                <Err msg={errors.incomeExceeds?.message} />
              </div>
              <div>
                <Label required>Can you provide proof of income?</Label>
                <YesNo name="canProveIncome" required />
                <Err msg={errors.canProveIncome?.message} />
              </div>
              <div>
                <Label required>Can you pay {moveInCost} in move-in funds?</Label>
                <YesNo name="canPayMoveIn" required />
                <Err msg={errors.canPayMoveIn?.message} />
              </div>
              <div>
                <Label required>Any late rent payments in the past 12 months?</Label>
                <YesNo name="lateRentPayments" required />
                <Err msg={errors.lateRentPayments?.message} />
              </div>
              {lateRent === "true" && (
                <div>
                  <Label htmlFor="lateRentExplanation">Please explain</Label>
                  <textarea id="lateRentExplanation" className={textarea} {...register("lateRentExplanation")} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── STEP 6: Additional Info ── */}
        {step === 6 && (
          <Card>
            <CardHeader><CardTitle className="text-2xl">Additional Information</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                This is not a credit check. This form is completely free and does not affect your credit score in any way.
              </div>
              <div>
                <Label required>All adult occupants willing to complete separate screening if requested?</Label>
                <YesNo name="allAdultsWillingToScreen" required />
                <Err msg={errors.allAdultsWillingToScreen?.message} />
              </div>
              <div>
                <Label htmlFor="creditIssuesDisclosure">Anything you would like us to know before we review your application?</Label>
                <textarea id="creditIssuesDisclosure" className={textarea} placeholder="Optional" {...register("creditIssuesDisclosure")} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 7: Rental History ── */}
        {step === 7 && (
          <Card>
            <CardHeader><CardTitle className="text-2xl">Rental History</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="currentHousingStatus" required>Current Housing Status</Label>
                <select id="currentHousingStatus" className={select} {...register("currentHousingStatus", { required: "Required" })}>
                  <option value="">Select...</option>
                  <option value="renting">Renting</option>
                  <option value="own">Own</option>
                  <option value="family-friends">Living with Family/Friends</option>
                  <option value="other">Other</option>
                </select>
                <Err msg={errors.currentHousingStatus?.message} />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <Label htmlFor="currentLandlordName">Current Landlord Name</Label>
                  <input id="currentLandlordName" className={input} {...register("currentLandlordName")} />
                </div>
                <div>
                  <Label htmlFor="currentLandlordPhone">Current Landlord Phone</Label>
                  <input id="currentLandlordPhone" type="tel" className={input} {...register("currentLandlordPhone")} />
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <Label htmlFor="currentHousingPayment">Current Monthly Payment ($)</Label>
                  <input id="currentHousingPayment" type="number" min={0} className={input} {...register("currentHousingPayment", { valueAsNumber: true })} />
                </div>
                <div>
                  <Label htmlFor="timeAtCurrentAddress">Time at Current Address</Label>
                  <input id="timeAtCurrentAddress" className={input} placeholder="e.g. 3 years" {...register("timeAtCurrentAddress")} />
                </div>
              </div>
              <div>
                <Label>Have you rented before?</Label>
                <YesNo name="hasRentedBefore" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 8: Rental Background ── */}
        {step === 8 && (
          <Card>
            <CardHeader><CardTitle className="text-2xl">Rental Background</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">Please answer honestly. A &quot;yes&quot; does not automatically disqualify you.</p>
              <div><Label>Ever broken a lease?</Label><YesNo name="brokenLease" /></div>
              <div><Label>Ever been asked to move out?</Label><YesNo name="askedToMoveOut" /></div>
              <div><Label>Eviction ever filed against you?</Label><YesNo name="evictionFiled" /></div>
              <div><Label>Owe money to a previous landlord or utility?</Label><YesNo name="oweMoneyToLandlord" /></div>
              <div><Label>Caused significant property damage?</Label><YesNo name="causedPropertyDamage" /></div>
              {showExplanation && (
                <div>
                  <Label htmlFor="rentalHistoryExplanation">Please explain</Label>
                  <textarea id="rentalHistoryExplanation" className={textarea} {...register("rentalHistoryExplanation")} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── STEP 9: Property Use & Pets ── */}
        {step === 9 && (
          <Card>
            <CardHeader><CardTitle className="text-2xl">Property Use & Pets</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div><Label required>Full-time residence?</Label><YesNo name="fullTimeResidence" required /><Err msg={errors.fullTimeResidence?.message} /></div>
              <div><Label required>Intend to sublease?</Label><YesNo name="intentToSublease" required /><Err msg={errors.intentToSublease?.message} /></div>
              <div><Label required>Intend to use for Airbnb / short-term rental?</Label><YesNo name="intentToAirbnb" required /><Err msg={errors.intentToAirbnb?.message} /></div>

              <div className="border-t pt-6">
                <div><Label required>Do you have any pets?</Label><YesNo name="hasPets" required /><Err msg={errors.hasPets?.message} /></div>
              </div>

              {hasPets === "true" && (
                <>
                  <div>
                    <Label required>How many pets?</Label>
                    <select
                      className={select}
                      value={numPets}
                      onChange={(e) => setNumPets(parseInt(e.target.value))}
                    >
                      <option value={0}>Select...</option>
                      {[1, 2, 3, 4, 5].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>

                  {petList.map((pet, i) => (
                    <div key={i} className="rounded-xl border p-4 space-y-4">
                      <p className="font-semibold">Pet {i + 1}</p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label>Type</Label>
                          <select
                            className={select}
                            value={pet.type}
                            onChange={(e) => {
                              const updated = [...petList];
                              updated[i] = { ...updated[i], type: e.target.value };
                              setPetList(updated);
                            }}
                          >
                            <option value="">Select...</option>
                            <option value="dog">Dog</option>
                            <option value="cat">Cat</option>
                            <option value="bird">Bird</option>
                            <option value="fish">Fish</option>
                            <option value="reptile">Reptile</option>
                            <option value="small-animal">Small Animal (hamster, rabbit, etc.)</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <Label>Breed</Label>
                          <input className={input} placeholder="e.g. Golden Retriever" value={pet.breed} onChange={(e) => {
                            const updated = [...petList]; updated[i] = { ...updated[i], breed: e.target.value }; setPetList(updated);
                          }} />
                        </div>
                        <div>
                          <Label>Weight (lbs)</Label>
                          <input className={input} placeholder="e.g. 65" value={pet.weight} onChange={(e) => {
                            const updated = [...petList]; updated[i] = { ...updated[i], weight: e.target.value }; setPetList(updated);
                          }} />
                        </div>
                        <div>
                          <Label>Age</Label>
                          <input className={input} placeholder="e.g. 3 years" value={pet.age} onChange={(e) => {
                            const updated = [...petList]; updated[i] = { ...updated[i], age: e.target.value }; setPetList(updated);
                          }} />
                        </div>
                      </div>
                    </div>
                  ))}

                  {numPets > 0 && (
                    <>
                      <div><Label>Are all pets house-trained?</Label><YesNo name="petsHouseTrained" /></div>
                      <div><Label>Have any pets caused property damage?</Label><YesNo name="petsCausedDamage" /></div>
                    </>
                  )}
                </>
              )}

              <div>
                <Label required>Understand pets are case-by-case with possible fees?</Label>
                <YesNo name="understandPetPolicy" required />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 10: Property Care ── */}
        {step === 10 && (
          <Card>
            <CardHeader><CardTitle className="text-2xl">Property Care</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div><Label required>Anyone in the household smoke or vape?</Label><YesNo name="anyoneSmokeVape" required /><Err msg={errors.anyoneSmokeVape?.message} /></div>
              <div><Label required>Willing to maintain property (lawn, snow, trash, filters)?</Label><YesNo name="willingToMaintain" required /><Err msg={errors.willingToMaintain?.message} /></div>
              <div><Label required>Willing to place utilities in your name?</Label><YesNo name="willingToHandleUtilities" required /><Err msg={errors.willingToHandleUtilities?.message} /></div>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 11: Disclosures ── */}
        {step === 11 && (
          <Card>
            <CardHeader><CardTitle className="text-2xl">Disclosures</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">If there is anything that may appear on a background screening you would like to explain, you may do so below. This is optional and will not automatically disqualify you.</p>
              <div>
                <Label htmlFor="backgroundDisclosure">Anything to disclose?</Label>
                <textarea id="backgroundDisclosure" className={textarea} placeholder="Optional" {...register("backgroundDisclosure")} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 12: Confirmation ── */}
        {step === 12 && (
          <Card>
            <CardHeader><CardTitle className="text-2xl">Confirmation</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 h-6 w-6 rounded border-input accent-primary" {...register("infoAccurate", { required: "Required" })} />
                  <span className="text-lg">All information I provided is accurate and complete.</span>
                </label>
                <Err msg={errors.infoAccurate?.message} />
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 h-6 w-6 rounded border-input accent-primary" {...register("understandNoGuarantee", { required: "Required" })} />
                  <span className="text-lg">I understand this does not guarantee approval or a showing.</span>
                </label>
                <Err msg={errors.understandNoGuarantee?.message} />
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 h-6 w-6 rounded border-input accent-primary" {...register("falseInfoDisqualify", { required: "Required" })} />
                  <span className="text-lg">False or misleading information may disqualify my application.</span>
                </label>
                <Err msg={errors.falseInfoDisqualify?.message} />
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 h-6 w-6 rounded border-input accent-primary" {...register("consentToContact", { required: "Required" })} />
                  <span className="text-lg">I consent to being contacted regarding this application.</span>
                </label>
                <Err msg={errors.consentToContact?.message} />
              </div>
              <div>
                <Label htmlFor="additionalNotes">Anything else?</Label>
                <textarea id="additionalNotes" className={textarea} {...register("additionalNotes")} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Navigation ── */}
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
