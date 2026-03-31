"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle } from "lucide-react";

interface TenantInfo {
  tenantId: number;
  fullName: string;
  email: string;
  phone: string;
  propertyId: number;
  propertyName: string;
  propertyAddress: string;
}

interface MaintenanceForm {
  title: string;
  description: string;
  category: string;
  priority: string;
}

export default function MaintenancePage() {
  const { token } = useParams<{ token: string }>();
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MaintenanceForm>({ defaultValues: { priority: "medium" } });

  useEffect(() => {
    fetch(`/api/tenants/by-token/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setTenant(data);
        setLoading(false);
      })
      .catch(() => {
        setInvalid(true);
        setLoading(false);
      });
  }, [token]);

  async function onSubmit(data: MaintenanceForm) {
    if (!tenant) return;
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: tenant.propertyId,
          tenantName: tenant.fullName,
          tenantPhone: tenant.phone,
          tenantEmail: tenant.email,
          ...data,
        }),
      });
      if (!res.ok) throw new Error("Submission failed");
      setSubmitted(true);
      toast.success("Request submitted!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
        <AlertTriangle className="h-14 w-14 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">Invalid Link</h1>
        <p className="mt-2 text-muted-foreground text-lg">
          This maintenance request link is invalid or your lease is no longer active. Contact your property manager for assistance.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-600" />
        <h1 className="mt-6 text-3xl font-bold">Request Submitted</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Your maintenance request has been received. We will review it and get back to you.
        </p>
        <Button className="mt-8 h-12 px-8 text-lg" onClick={() => window.location.reload()}>
          Submit Another Request
        </Button>
      </div>
    );
  }

  const inputClass =
    "mt-1 block w-full h-14 rounded-lg border border-input bg-transparent px-4 text-lg outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
  const textareaClass =
    "mt-1 block w-full min-h-[140px] rounded-lg border border-input bg-transparent px-4 py-3 text-lg outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
  const selectClass =
    "mt-1 block w-full h-14 rounded-lg border border-input bg-transparent px-4 text-lg outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold sm:text-4xl">Maintenance Request</h1>

      <div className="mt-4 rounded-xl border bg-muted/40 p-5">
        <p className="text-lg">
          <span className="font-medium">{tenant!.fullName}</span>
          <span className="text-muted-foreground"> — {tenant!.propertyName}, {tenant!.propertyAddress}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Describe the Issue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-lg font-medium">
                Title <span className="text-destructive">*</span>
              </label>
              <input
                id="title"
                className={inputClass}
                placeholder="e.g. Leaking kitchen faucet"
                {...register("title", { required: "Title is required" })}
              />
              {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label htmlFor="description" className="block text-lg font-medium">
                Description <span className="text-destructive">*</span>
              </label>
              <textarea
                id="description"
                className={textareaClass}
                placeholder="Please describe the issue in detail — what's happening, where, when it started..."
                {...register("description", { required: "Description is required", minLength: { value: 10, message: "Please provide more detail" } })}
              />
              {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="category" className="block text-lg font-medium">
                  Category <span className="text-destructive">*</span>
                </label>
                <select
                  id="category"
                  className={selectClass}
                  {...register("category", { required: "Category is required" })}
                >
                  <option value="">Select...</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="hvac">HVAC / Heating / Cooling</option>
                  <option value="appliance">Appliance</option>
                  <option value="structural">Structural / Doors / Windows</option>
                  <option value="pest">Pest Control</option>
                  <option value="exterior">Exterior / Yard</option>
                  <option value="other">Other</option>
                </select>
                {errors.category && <p className="text-sm text-destructive mt-1">{errors.category.message}</p>}
              </div>

              <div>
                <label htmlFor="priority" className="block text-lg font-medium">
                  Priority
                </label>
                <select id="priority" className={selectClass} {...register("priority")}>
                  <option value="low">Low — not urgent</option>
                  <option value="medium">Medium — needs attention soon</option>
                  <option value="high">High — affecting daily living</option>
                  <option value="emergency">Emergency — safety risk / no water / no heat</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={isSubmitting} className="w-full h-14 text-xl font-semibold">
          {isSubmitting ? "Submitting..." : "Submit Request"}
        </Button>
      </form>
    </div>
  );
}
