import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClipboardList, Wrench } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero */}
      <header className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Property Manager
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground sm:text-xl">
          Professional property management made simple. Submit your application
          or request maintenance below.
        </p>

        <div className="mt-12 grid w-full max-w-2xl gap-6 sm:grid-cols-2">
          <Link href="/apply" className="group">
            <Card className="h-full transition hover:ring-2 hover:ring-primary/30">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">Pre-screening Application</CardTitle>
                <CardDescription className="text-base">
                  Interested in renting? Complete a quick pre-screening form to
                  get started.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full h-11 text-base">
                  Start Application
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/maintenance" className="group">
            <Card className="h-full transition hover:ring-2 hover:ring-primary/30">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Wrench className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">Maintenance Request</CardTitle>
                <CardDescription className="text-base">
                  Current tenant? Submit a maintenance request and we will get
                  back to you promptly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full h-11 text-base">
                  Submit Request
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>
      </header>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Property Manager. All rights reserved.
      </footer>
    </div>
  );
}
