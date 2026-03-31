"use client";

import { useForm } from "react-hook-form";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PrescreeningForm {
  // Section 1 - Personal
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

  // Section 2 - Income
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

  // Section 3 - Credit
  creditScoreRange: string;
  willingToScreen: string;
  deniedHousing: string;
  deniedHousingExplanation: string;

  // Section 4 - Rental History
  currentHousingStatus: string;
  currentLandlordName: string;
  currentLandlordPhone: string;
  currentMonthlyRent: number;
  timeAtCurrentAddress: string;
  hasRentedBefore: string;
  brokenLease: string;
  askedToMoveOut: string;
  evictionFiled: string;
  oweMoneyToLandlord: string;
  causedPropertyDamage: string;
  rentalHistoryExplanation: string;

  // Section 5 - Property Use
  fullTimeResidence: string;
  intentToSublease: string;
  intentToAirbnb: string;

  // Section 6 - Pets
  hasPets: string;
  petDetails: string;
  petsHouseTrained: string;
  petsCausedDamage: string;
  understandPetPolicy: string;

  // Section 7 - Smoking
  anyoneSmokeVape: string;
  willingToMaintain: string;
  willingToHandleUtilities: string;

  // Section 8 - Background
  violentCrime: string;
  propertyCrime: string;
  anythingToExplain: string;

  // Section 9 - Confirmation
  infoAccurate: boolean;
  understandNoGuarantee: boolean;
  falseInfoDisqualify: boolean;
  consentToContact: boolean;
  additionalNotes: string;
}

/* ------------------------------------------------------------------ */
/*  Shared sub-components                                              */
/* ------------------------------------------------------------------ */

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  );
}

function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
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
  const [submitted, setSubmitted] = useState(false);
  const [scoreResult, setScoreResult] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PrescreeningForm>({
    defaultValues: {
      numAdults: 1,
      numChildren: 0,
    },
  });

  const lateRentPayments = watch("lateRentPayments");
  const deniedHousing = watch("deniedHousing");
  const hasPets = watch("hasPets");

  // Check if any rental history yes/no is "true"
  const brokenLease = watch("brokenLease");
  const askedToMoveOut = watch("askedToMoveOut");
  const evictionFiled = watch("evictionFiled");
  const oweMoneyToLandlord = watch("oweMoneyToLandlord");
  const causedPropertyDamage = watch("causedPropertyDamage");
  const showRentalExplanation =
    brokenLease === "true" ||
    askedToMoveOut === "true" ||
    evictionFiled === "true" ||
    oweMoneyToLandlord === "true" ||
    causedPropertyDamage === "true";

  async function onSubmit(data: PrescreeningForm) {
    try {
      const res = await fetch("/api/prescreening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Submission failed");
      }

      const result = await res.json();
      setScoreResult(result.score ?? "Submitted");
      setSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong"
      );
    }
  }

  /* ---- Success state ---- */
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
          <p className="mt-4 text-xl font-semibold">
            Result: {scoreResult}
          </p>
        )}
        <Link href="/">
          <Button className="mt-8 h-12 px-8 text-lg">Back to Home</Button>
        </Link>
      </div>
    );
  }

  /* ---- Form inputs helper ---- */
  const inputClass =
    "mt-1 block w-full h-12 rounded-lg border border-input bg-transparent px-3 text-lg outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50";
  const textareaClass =
    "mt-1 block w-full min-h-[100px] rounded-lg border border-input bg-transparent px-3 py-3 text-lg outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50";
  const selectClass =
    "mt-1 block w-full h-12 rounded-lg border border-input bg-transparent px-3 text-lg outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50";

  /* ---- YesNo radio helper ---- */
  function YesNo({
    name,
    required,
  }: {
    name: keyof PrescreeningForm;
    required?: boolean;
  }) {
    return (
      <div className="flex gap-4 mt-2">
        <label className="flex-1 cursor-pointer">
          <input
            type="radio"
            className="peer sr-only"
            value="true"
            {...register(name, { required: required ? "Required" : false })}
          />
          <div className="peer-checked:border-primary peer-checked:bg-primary/5 rounded-lg border-2 p-4 text-center text-lg font-medium transition">
            Yes
          </div>
        </label>
        <label className="flex-1 cursor-pointer">
          <input
            type="radio"
            className="peer sr-only"
            value="false"
            {...register(name, { required: required ? "Required" : false })}
          />
          <div className="peer-checked:border-primary peer-checked:bg-primary/5 rounded-lg border-2 p-4 text-center text-lg font-medium transition">
            No
          </div>
        </label>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      {/* Back link */}
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <h1 className="text-3xl font-bold sm:text-4xl">
        Pre-screening Application
      </h1>

      {/* Intro */}
      <div className="mt-6 rounded-lg border bg-muted/40 p-5 text-base leading-relaxed sm:text-lg">
        <p>
          Thank you for your interest. Before scheduling a showing, we ask all
          prospective applicants to complete this short pre-screening form.
          There is no fee at this stage.
        </p>
        <p className="mt-4 font-semibold">Minimum requirements:</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Credit score of 675+</li>
          <li>Gross monthly household income of at least $3,437.50</li>
          <li>Move-in funds of $2,500</li>
          <li>Pets considered case-by-case</li>
        </ul>
        <p className="mt-4">
          If your pre-screening looks like a good fit, we will invite you to
          the next step, which includes a $47 background and credit screening
          paid directly by the applicant.
        </p>
      </div>

      <Separator className="my-8" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* ============================================================ */}
        {/*  SECTION 1: Personal Info                                     */}
        {/* ============================================================ */}
        <SectionCard title="1. Personal Information">
          <div>
            <FieldLabel htmlFor="fullName" required>
              Full Legal Name
            </FieldLabel>
            <input
              id="fullName"
              className={inputClass}
              {...register("fullName", { required: "Full name is required" })}
            />
            <FieldError message={errors.fullName?.message} />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="phone" required>
                Phone
              </FieldLabel>
              <input
                id="phone"
                type="tel"
                className={inputClass}
                {...register("phone", { required: "Phone is required" })}
              />
              <FieldError message={errors.phone?.message} />
            </div>
            <div>
              <FieldLabel htmlFor="email" required>
                Email
              </FieldLabel>
              <input
                id="email"
                type="email"
                className={inputClass}
                {...register("email", { required: "Email is required" })}
              />
              <FieldError message={errors.email?.message} />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="dateOfBirth" required>
                Date of Birth
              </FieldLabel>
              <input
                id="dateOfBirth"
                type="date"
                className={inputClass}
                {...register("dateOfBirth", {
                  required: "Date of birth is required",
                })}
              />
              <FieldError message={errors.dateOfBirth?.message} />
            </div>
            <div>
              <FieldLabel htmlFor="desiredMoveIn" required>
                Desired Move-in Date
              </FieldLabel>
              <input
                id="desiredMoveIn"
                type="date"
                className={inputClass}
                {...register("desiredMoveIn", {
                  required: "Move-in date is required",
                })}
              />
              <FieldError message={errors.desiredMoveIn?.message} />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="currentAddress" required>
              Current Address
            </FieldLabel>
            <input
              id="currentAddress"
              className={inputClass}
              {...register("currentAddress", {
                required: "Current address is required",
              })}
            />
            <FieldError message={errors.currentAddress?.message} />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="numAdults" required>
                Number of Adults
              </FieldLabel>
              <input
                id="numAdults"
                type="number"
                min={1}
                className={inputClass}
                {...register("numAdults", {
                  required: "Required",
                  valueAsNumber: true,
                })}
              />
              <FieldError message={errors.numAdults?.message} />
            </div>
            <div>
              <FieldLabel htmlFor="numChildren">Number of Children</FieldLabel>
              <input
                id="numChildren"
                type="number"
                min={0}
                className={inputClass}
                {...register("numChildren", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="occupantNames" required>
              Full Names of All Occupants
            </FieldLabel>
            <textarea
              id="occupantNames"
              className={textareaClass}
              placeholder="List all people who will live in the unit"
              {...register("occupantNames", {
                required: "Occupant names are required",
              })}
            />
            <FieldError message={errors.occupantNames?.message} />
          </div>

          <div>
            <FieldLabel htmlFor="reasonForMove">Reason for Move</FieldLabel>
            <textarea
              id="reasonForMove"
              className={textareaClass}
              {...register("reasonForMove")}
            />
          </div>
        </SectionCard>

        {/* ============================================================ */}
        {/*  SECTION 2: Income & Employment                               */}
        {/* ============================================================ */}
        <SectionCard title="2. Income & Employment">
          <div>
            <FieldLabel htmlFor="employmentStatus" required>
              Employment Status
            </FieldLabel>
            <select
              id="employmentStatus"
              className={selectClass}
              {...register("employmentStatus", { required: "Required" })}
            >
              <option value="">Select...</option>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="self-employed">Self-employed</option>
              <option value="retired">Retired</option>
              <option value="disability">Disability</option>
              <option value="unemployed">Unemployed</option>
              <option value="other">Other</option>
            </select>
            <FieldError message={errors.employmentStatus?.message} />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="employerName">Employer Name</FieldLabel>
              <input
                id="employerName"
                className={inputClass}
                {...register("employerName")}
              />
            </div>
            <div>
              <FieldLabel htmlFor="jobTitle">Job Title</FieldLabel>
              <input
                id="jobTitle"
                className={inputClass}
                {...register("jobTitle")}
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="employerLength">
                Length with Current Employer
              </FieldLabel>
              <input
                id="employerLength"
                className={inputClass}
                placeholder="e.g. 2 years"
                {...register("employerLength")}
              />
            </div>
            <div>
              <FieldLabel htmlFor="incomeSources">Income Sources</FieldLabel>
              <input
                id="incomeSources"
                className={inputClass}
                placeholder="e.g. salary, side business"
                {...register("incomeSources")}
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="grossMonthlyIncome" required>
              Gross Monthly Household Income ($)
            </FieldLabel>
            <input
              id="grossMonthlyIncome"
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              {...register("grossMonthlyIncome", {
                required: "Required",
                valueAsNumber: true,
              })}
            />
            <FieldError message={errors.grossMonthlyIncome?.message} />
          </div>

          <div>
            <FieldLabel required>
              Does your total gross monthly household income equal or exceed
              $3,437.50?
            </FieldLabel>
            <YesNo name="incomeExceeds3437" required />
            <FieldError message={errors.incomeExceeds3437?.message} />
          </div>

          <div>
            <FieldLabel required>Can you provide proof of income?</FieldLabel>
            <YesNo name="canProveIncome" required />
            <FieldError message={errors.canProveIncome?.message} />
          </div>

          <div>
            <FieldLabel required>
              Can you pay $2,500 in move-in funds?
            </FieldLabel>
            <YesNo name="canPayMoveIn" required />
            <FieldError message={errors.canPayMoveIn?.message} />
          </div>

          <div>
            <FieldLabel required>
              Have you had any late rent payments in the past 12 months?
            </FieldLabel>
            <YesNo name="lateRentPayments" required />
            <FieldError message={errors.lateRentPayments?.message} />
          </div>

          {lateRentPayments === "true" && (
            <div>
              <FieldLabel htmlFor="lateRentExplanation">
                Please explain
              </FieldLabel>
              <textarea
                id="lateRentExplanation"
                className={textareaClass}
                {...register("lateRentExplanation")}
              />
            </div>
          )}
        </SectionCard>

        {/* ============================================================ */}
        {/*  SECTION 3: Credit & Screening                                */}
        {/* ============================================================ */}
        <SectionCard title="3. Credit & Screening">
          <div>
            <FieldLabel htmlFor="creditScoreRange" required>
              Estimated Credit Score Range
            </FieldLabel>
            <select
              id="creditScoreRange"
              className={selectClass}
              {...register("creditScoreRange", { required: "Required" })}
            >
              <option value="">Select...</option>
              <option value="750+">750+</option>
              <option value="700-749">700 - 749</option>
              <option value="675-699">675 - 699</option>
              <option value="650-674">650 - 674</option>
              <option value="below-650">Below 650</option>
              <option value="unknown">Unknown</option>
            </select>
            <FieldError message={errors.creditScoreRange?.message} />
          </div>

          <div>
            <FieldLabel required>
              Are you willing to complete the $47 background and credit
              screening?
            </FieldLabel>
            <YesNo name="willingToScreen" required />
            <FieldError message={errors.willingToScreen?.message} />
          </div>

          <div>
            <FieldLabel required>
              Have you ever been denied housing?
            </FieldLabel>
            <YesNo name="deniedHousing" required />
            <FieldError message={errors.deniedHousing?.message} />
          </div>

          {deniedHousing === "true" && (
            <div>
              <FieldLabel htmlFor="deniedHousingExplanation">
                Please explain
              </FieldLabel>
              <textarea
                id="deniedHousingExplanation"
                className={textareaClass}
                {...register("deniedHousingExplanation")}
              />
            </div>
          )}
        </SectionCard>

        {/* ============================================================ */}
        {/*  SECTION 4: Rental History                                    */}
        {/* ============================================================ */}
        <SectionCard title="4. Rental History">
          <div>
            <FieldLabel htmlFor="currentHousingStatus" required>
              Current Housing Status
            </FieldLabel>
            <select
              id="currentHousingStatus"
              className={selectClass}
              {...register("currentHousingStatus", { required: "Required" })}
            >
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
              <FieldLabel htmlFor="currentLandlordName">
                Current Landlord Name
              </FieldLabel>
              <input
                id="currentLandlordName"
                className={inputClass}
                {...register("currentLandlordName")}
              />
            </div>
            <div>
              <FieldLabel htmlFor="currentLandlordPhone">
                Current Landlord Phone
              </FieldLabel>
              <input
                id="currentLandlordPhone"
                type="tel"
                className={inputClass}
                {...register("currentLandlordPhone")}
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="currentMonthlyRent">
                Current Monthly Rent ($)
              </FieldLabel>
              <input
                id="currentMonthlyRent"
                type="number"
                min={0}
                className={inputClass}
                {...register("currentMonthlyRent", { valueAsNumber: true })}
              />
            </div>
            <div>
              <FieldLabel htmlFor="timeAtCurrentAddress">
                How Long at Current Address
              </FieldLabel>
              <input
                id="timeAtCurrentAddress"
                className={inputClass}
                placeholder="e.g. 3 years"
                {...register("timeAtCurrentAddress")}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Have you rented before?</FieldLabel>
            <YesNo name="hasRentedBefore" />
          </div>

          <Separator />

          <p className="text-lg font-medium">
            Please answer the following honestly:
          </p>

          <div>
            <FieldLabel>Have you ever broken a lease?</FieldLabel>
            <YesNo name="brokenLease" />
          </div>

          <div>
            <FieldLabel>Have you ever been asked to move out?</FieldLabel>
            <YesNo name="askedToMoveOut" />
          </div>

          <div>
            <FieldLabel>
              Has an eviction ever been filed against you?
            </FieldLabel>
            <YesNo name="evictionFiled" />
          </div>

          <div>
            <FieldLabel>
              Do you owe money to a previous landlord or utility company?
            </FieldLabel>
            <YesNo name="oweMoneyToLandlord" />
          </div>

          <div>
            <FieldLabel>
              Have you caused significant property damage?
            </FieldLabel>
            <YesNo name="causedPropertyDamage" />
          </div>

          {showRentalExplanation && (
            <div>
              <FieldLabel htmlFor="rentalHistoryExplanation">
                Please explain any &quot;Yes&quot; answers above
              </FieldLabel>
              <textarea
                id="rentalHistoryExplanation"
                className={textareaClass}
                {...register("rentalHistoryExplanation")}
              />
            </div>
          )}
        </SectionCard>

        {/* ============================================================ */}
        {/*  SECTION 5: Property Use                                      */}
        {/* ============================================================ */}
        <SectionCard title="5. Property Use">
          <div>
            <FieldLabel required>
              Will this be your full-time residence?
            </FieldLabel>
            <YesNo name="fullTimeResidence" required />
            <FieldError message={errors.fullTimeResidence?.message} />
          </div>

          <div>
            <FieldLabel required>
              Do you intend to sublease any portion of the property?
            </FieldLabel>
            <YesNo name="intentToSublease" required />
            <FieldError message={errors.intentToSublease?.message} />
          </div>

          <div>
            <FieldLabel required>
              Do you intend to use the property for Airbnb or short-term
              rentals?
            </FieldLabel>
            <YesNo name="intentToAirbnb" required />
            <FieldError message={errors.intentToAirbnb?.message} />
          </div>
        </SectionCard>

        {/* ============================================================ */}
        {/*  SECTION 6: Pets                                              */}
        {/* ============================================================ */}
        <SectionCard title="6. Pets">
          <div>
            <FieldLabel required>Do you have any pets?</FieldLabel>
            <YesNo name="hasPets" required />
            <FieldError message={errors.hasPets?.message} />
          </div>

          {hasPets === "true" && (
            <>
              <div>
                <FieldLabel htmlFor="petDetails">
                  Pet Details (type, breed, weight, age for each)
                </FieldLabel>
                <textarea
                  id="petDetails"
                  className={textareaClass}
                  placeholder="e.g. Dog, Golden Retriever, 65 lbs, 3 years old"
                  {...register("petDetails")}
                />
              </div>

              <div>
                <FieldLabel>Are your pets house-trained?</FieldLabel>
                <YesNo name="petsHouseTrained" />
              </div>

              <div>
                <FieldLabel>
                  Have your pets caused property damage before?
                </FieldLabel>
                <YesNo name="petsCausedDamage" />
              </div>
            </>
          )}

          <div>
            <FieldLabel required>
              Do you understand that pets are considered case-by-case and may
              require additional fees?
            </FieldLabel>
            <YesNo name="understandPetPolicy" required />
            <FieldError message={errors.understandPetPolicy?.message} />
          </div>
        </SectionCard>

        {/* ============================================================ */}
        {/*  SECTION 7: Smoking & Property Care                           */}
        {/* ============================================================ */}
        <SectionCard title="7. Smoking & Property Care">
          <div>
            <FieldLabel required>
              Does anyone in the household smoke or vape?
            </FieldLabel>
            <YesNo name="anyoneSmokeVape" required />
            <FieldError message={errors.anyoneSmokeVape?.message} />
          </div>

          <div>
            <FieldLabel required>
              Are you willing to maintain the property in good condition?
            </FieldLabel>
            <YesNo name="willingToMaintain" required />
            <FieldError message={errors.willingToMaintain?.message} />
          </div>

          <div>
            <FieldLabel required>
              Are you willing to handle utilities in your name?
            </FieldLabel>
            <YesNo name="willingToHandleUtilities" required />
            <FieldError message={errors.willingToHandleUtilities?.message} />
          </div>
        </SectionCard>

        {/* ============================================================ */}
        {/*  SECTION 8: Background                                        */}
        {/* ============================================================ */}
        <SectionCard title="8. Background">
          <div>
            <FieldLabel required>
              Have you ever been convicted of a violent crime?
            </FieldLabel>
            <YesNo name="violentCrime" required />
            <FieldError message={errors.violentCrime?.message} />
          </div>

          <div>
            <FieldLabel required>
              Have you ever been convicted of a property crime, arson, or
              fraud?
            </FieldLabel>
            <YesNo name="propertyCrime" required />
            <FieldError message={errors.propertyCrime?.message} />
          </div>

          <div>
            <FieldLabel htmlFor="anythingToExplain">
              Is there anything you would like to explain before a background
              screening?
            </FieldLabel>
            <textarea
              id="anythingToExplain"
              className={textareaClass}
              {...register("anythingToExplain")}
            />
          </div>
        </SectionCard>

        {/* ============================================================ */}
        {/*  SECTION 9: Confirmation                                      */}
        {/* ============================================================ */}
        <SectionCard title="9. Confirmation">
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 rounded border-input accent-primary"
                {...register("infoAccurate", {
                  required: "You must confirm this",
                })}
              />
              <span className="text-lg">
                I confirm that all information provided is accurate and
                complete.
              </span>
            </label>
            <FieldError message={errors.infoAccurate?.message} />

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 rounded border-input accent-primary"
                {...register("understandNoGuarantee", {
                  required: "You must confirm this",
                })}
              />
              <span className="text-lg">
                I understand that completing this form does not guarantee
                approval.
              </span>
            </label>
            <FieldError message={errors.understandNoGuarantee?.message} />

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 rounded border-input accent-primary"
                {...register("falseInfoDisqualify", {
                  required: "You must confirm this",
                })}
              />
              <span className="text-lg">
                I understand that providing false information may result in
                disqualification.
              </span>
            </label>
            <FieldError message={errors.falseInfoDisqualify?.message} />

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 rounded border-input accent-primary"
                {...register("consentToContact", {
                  required: "You must consent to be contacted",
                })}
              />
              <span className="text-lg">
                I consent to being contacted regarding this application.
              </span>
            </label>
            <FieldError message={errors.consentToContact?.message} />
          </div>

          <div>
            <FieldLabel htmlFor="additionalNotes">
              Additional Notes or Comments
            </FieldLabel>
            <textarea
              id="additionalNotes"
              className={textareaClass}
              {...register("additionalNotes")}
            />
          </div>
        </SectionCard>

        {/* Submit */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-14 text-xl font-semibold"
        >
          {isSubmitting ? "Submitting..." : "Submit Application"}
        </Button>
      </form>
    </div>
  );
}
