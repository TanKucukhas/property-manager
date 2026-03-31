"use client";

import { useForm } from "react-hook-form";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

interface MaintenanceForm {
  tenantName: string;
  phone: string;
  email: string;
  title: string;
  description: string;
  category: string;
  priority: string;
}

export default function MaintenancePage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MaintenanceForm>();

  async function onSubmit(data: MaintenanceForm) {
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Submission failed");
      }

      setSubmitted(true);
      toast.success("Maintenance request submitted!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong"
      );
    }
  }

  const inputClass =
    "mt-1 block w-full h-12 rounded-lg border border-input bg-transparent px-3 text-lg outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50";
  const textareaClass =
    "mt-1 block w-full min-h-[150px] rounded-lg border border-input bg-transparent px-3 py-3 text-lg outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50";
  const selectClass =
    "mt-1 block w-full h-12 rounded-lg border border-input bg-transparent px-3 text-lg outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50";

  if (submitted) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-600" />
        <h1 className="mt-6 text-3xl font-bold">Request Submitted</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Your maintenance request has been received. We will review it and get
          back to you as soon as possible.
        </p>
        <Link href="/">
          <Button className="mt-8 h-12 px-8 text-lg">Back to Home</Button>
        </Link>
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

      <h1 className="text-3xl font-bold sm:text-4xl">Maintenance Request</h1>
      <p className="mt-2 text-lg text-muted-foreground">
        Please describe the issue and we will address it promptly.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">
              Your Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label htmlFor="tenantName" className="block text-lg font-medium">
                Full Name <span className="text-destructive">*</span>
              </label>
              <input
                id="tenantName"
                className={inputClass}
                {...register("tenantName", { required: "Name is required" })}
              />
              {errors.tenantName && (
                <p className="text-sm text-destructive mt-1">
                  {errors.tenantName.message}
                </p>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="phone" className="block text-lg font-medium">
                  Phone <span className="text-destructive">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  className={inputClass}
                  {...register("phone", { required: "Phone is required" })}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.phone.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="email" className="block text-lg font-medium">
                  Email <span className="text-destructive">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  className={inputClass}
                  {...register("email", { required: "Email is required" })}
                />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">
              Request Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-lg font-medium">
                Request Title <span className="text-destructive">*</span>
              </label>
              <input
                id="title"
                className={inputClass}
                placeholder="e.g. Leaking kitchen faucet"
                {...register("title", { required: "Title is required" })}
              />
              {errors.title && (
                <p className="text-sm text-destructive mt-1">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-lg font-medium"
              >
                Description <span className="text-destructive">*</span>
              </label>
              <textarea
                id="description"
                className={textareaClass}
                placeholder="Please describe the issue in detail, including location, when it started, and any relevant details."
                {...register("description", {
                  required: "Description is required",
                })}
              />
              {errors.description && (
                <p className="text-sm text-destructive mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="category"
                  className="block text-lg font-medium"
                >
                  Category <span className="text-destructive">*</span>
                </label>
                <select
                  id="category"
                  className={selectClass}
                  {...register("category", { required: "Category is required" })}
                >
                  <option value="">Select category...</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="hvac">HVAC</option>
                  <option value="appliance">Appliance</option>
                  <option value="structural">Structural</option>
                  <option value="pest">Pest</option>
                  <option value="other">Other</option>
                </select>
                {errors.category && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.category.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="priority"
                  className="block text-lg font-medium"
                >
                  Priority <span className="text-destructive">*</span>
                </label>
                <select
                  id="priority"
                  className={selectClass}
                  {...register("priority", { required: "Priority is required" })}
                >
                  <option value="">Select priority...</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="emergency">Emergency</option>
                </select>
                {errors.priority && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.priority.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-14 text-xl font-semibold"
        >
          {isSubmitting ? "Submitting..." : "Submit Request"}
        </Button>
      </form>
    </div>
  );
}
