import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClipboardList, KeyRound, Wrench, Building2 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <nav className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Building2 className="h-5 w-5" />
            CresIQ
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/tenant/login">
              <Button size="sm" variant="ghost">Tenant login</Button>
            </Link>
            <Link href="/login">
              <Button size="sm" variant="outline">Sign in</Button>
            </Link>
            <Link href="/signup" className="hidden sm:inline-flex">
              <Button size="sm">Sign up</Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Property management without the spreadsheets.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground sm:text-xl">
            CresIQ is the system small landlords and property managers use to screen applicants,
            track leases, collect rent, and handle maintenance — all in one place.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup">
              <Button size="lg" className="h-12 px-8 text-base font-semibold">
                Sign up as a property manager
              </Button>
            </Link>
            <Link href="/tenant/login">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                <KeyRound className="mr-2 h-4 w-4" />
                Login as tenant
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            New accounts are reviewed and approved manually during early access.
          </p>
        </div>
      </section>

      <section className="border-t bg-muted/30 px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">What you can do in CresIQ</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={ClipboardList}
              title="Pre-screen applicants"
              body="Send a single link. Applicants fill in income, rental history, and references. You see a scored summary and can approve, reject, or schedule a showing in one click."
            />
            <Feature
              icon={Building2}
              title="Track properties & leases"
              body="Keep each property's rent, deposit, and lease terms in one place. Move tenants in, renew leases, and record move-outs without rebuilding a spreadsheet."
            />
            <Feature
              icon={KeyRound}
              title="Collect rent & deposits"
              body="Record monthly payments, late fees, and security deposits per tenant. See who's paid and who hasn't at a glance."
            />
            <Feature
              icon={Wrench}
              title="Maintenance requests"
              body="Tenants submit issues with photos and category. You get notified, assign priority, and keep a history per property."
            />
            <Feature
              icon={ClipboardList}
              title="Share to anyone, anywhere"
              body="Generate a unique application link for Zillow, Facebook Marketplace, a yard sign — and see exactly where each lead came from."
            />
            <Feature
              icon={Building2}
              title="One dashboard"
              body="Stop juggling email threads, Google Forms, and three different apps. Everything that matters about your rentals in one screen."
            />
          </div>
        </div>
      </section>

      <section className="border-t px-4 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to try it?</h2>
          <p className="mt-3 text-muted-foreground">
            Request an account and we&apos;ll get you set up. No credit card.
          </p>
          <Link href="/signup">
            <Button size="lg" className="mt-6 h-12 px-8 text-base font-semibold">
              Request access
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>&copy; {new Date().getFullYear()} CresIQ Property Management.</p>
          <div className="flex items-center gap-4">
            <Link href="/apply" className="hover:text-foreground">Apply to a rental</Link>
            <Link href="/maintenance" className="hover:text-foreground">Maintenance</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}
