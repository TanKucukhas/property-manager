import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Mail } from "lucide-react"

export default function TenantLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-6 w-6" />
          </div>
          <CardTitle className="mt-3 text-2xl font-bold">Tenant portal</CardTitle>
          <CardDescription>Coming soon.</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground space-y-4">
          <p>
            We&apos;re building a tenant portal where you&apos;ll be able to pay rent, submit maintenance
            requests, and view your lease.
          </p>
          <p>
            For now, use the maintenance request link your property manager sent you, or email them
            directly.
          </p>
          <div className="pt-2">
            <Link href="/">
              <Button variant="outline" className="w-full">Back to home</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
