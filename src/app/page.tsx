import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, ShieldCheck, Home, DollarSign, Wrench, CheckCircle2 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <nav className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span className="text-xl font-bold tracking-tight">Cresiq</span>
          <div className="flex items-center gap-4">
            <Link href="/apply">
              <Button size="sm" variant="outline">Apply Now</Button>
            </Link>
            <Link href="/login">
              <Button size="sm" variant="ghost" className="text-muted-foreground">Admin</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-4 py-20 sm:py-28 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Quality Rentals.<br />Qualified Tenants.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto">
            We make the rental process simple, transparent, and fair. Pre-screen in minutes,
            not hours. No fee to apply. Only qualified applicants move forward.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/apply">
              <Button size="lg" className="h-14 px-10 text-lg font-semibold">
                <ClipboardList className="mr-2 h-5 w-5" />
                Start Pre-screening
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Takes 2-3 minutes. No fee required.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t bg-muted/30 px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">How It Works</h2>
          <p className="mt-3 text-center text-muted-foreground text-lg">
            Three simple steps from application to move-in.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ClipboardList className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">1. Pre-screen</h3>
              <p className="mt-2 text-muted-foreground">
                Complete a quick online form. No fee, no commitment. We check basic qualification before scheduling a showing.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">2. Screen & Show</h3>
              <p className="mt-2 text-muted-foreground">
                Qualified applicants are invited for a private showing and a $47 background and credit screening.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Home className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">3. Move In</h3>
              <p className="mt-2 text-muted-foreground">
                Sign your lease, pay first month and deposit, and move into your new home.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">Minimum Requirements</h2>
          <p className="mt-3 text-center text-muted-foreground text-lg">
            Review these before applying to save everyone time.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: DollarSign, title: "Income", desc: "Gross monthly household income of at least 2.75x rent" },
              { icon: ShieldCheck, title: "Credit Score", desc: "Minimum credit score of 675" },
              { icon: DollarSign, title: "Move-in Funds", desc: "First month's rent + security deposit due at signing" },
              { icon: CheckCircle2, title: "Background Check", desc: "Willingness to complete a $47 screening" },
              { icon: Home, title: "Full-time Residence", desc: "No subleasing, no Airbnb, no short-term rentals" },
              { icon: Wrench, title: "Property Care", desc: "Tenants handle utilities, lawn, snow, and basic upkeep" },
            ].map((item) => (
              <Card key={item.title} className="border">
                <CardContent className="flex items-start gap-4 pt-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-primary/5 px-4 py-16 sm:py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to Apply?</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start your pre-screening application now. It only takes a few minutes and there is no fee at this stage.
          </p>
          <Link href="/apply">
            <Button size="lg" className="mt-8 h-14 px-10 text-lg font-semibold">
              Start Application
            </Button>
          </Link>
        </div>
      </section>

      {/* Tenants */}
      <section className="px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Current tenants: use the maintenance request link provided by your property manager.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Cresiq Property Management. All rights reserved.</p>
      </footer>
    </div>
  );
}
