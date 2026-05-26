"use client"

import Link from "next/link"
import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"

export default function SignupPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, phone, password, notes }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not submit request")
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <CardTitle className="mt-3 text-2xl font-bold">Request received</CardTitle>
            <CardDescription>We&apos;ll review your account and reach out by email.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              New accounts are approved manually while we&apos;re in early access.
              Once your account is active you&apos;ll be able to sign in.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link href="/">
                <Button className="w-full">Back to home</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Sign up as a property manager</CardTitle>
          <CardDescription>
            Tell us about you and your portfolio. We&apos;ll approve your account and email you when it&apos;s ready.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="company">Company <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} className="h-11" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">How many units do you manage? <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. 12 single-family rentals across two cities."
                rows={3}
              />
            </div>
            <Button type="submit" disabled={loading} className="h-11 text-base">
              {loading ? "Sending request..." : "Request access"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already approved? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
