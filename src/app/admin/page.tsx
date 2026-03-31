"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BuildingIcon,
  CheckCircleIcon,
  UsersIcon,
  ClipboardListIcon,
  DollarSignIcon,
  WrenchIcon,
  AlertCircleIcon,
  BanknoteIcon,
} from "lucide-react"

interface DashboardData {
  properties: number
  available: number
  activeTenants: number
  newApplications: number
  rentDue: number
  rentCollected: number
  unpaidBalance: number
  openMaintenance: number
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value)
}

const statCards = [
  { key: "properties" as const, label: "Properties", icon: BuildingIcon, color: "text-blue-600", bg: "bg-blue-50" },
  { key: "available" as const, label: "Available", icon: CheckCircleIcon, color: "text-green-600", bg: "bg-green-50" },
  { key: "activeTenants" as const, label: "Active Tenants", icon: UsersIcon, color: "text-purple-600", bg: "bg-purple-50" },
  { key: "newApplications" as const, label: "New Applications", icon: ClipboardListIcon, color: "text-orange-600", bg: "bg-orange-50" },
  { key: "rentDue" as const, label: "Rent Due", icon: DollarSignIcon, color: "text-red-600", bg: "bg-red-50", isCurrency: true },
  { key: "rentCollected" as const, label: "Rent Collected", icon: BanknoteIcon, color: "text-green-600", bg: "bg-green-50", isCurrency: true },
  { key: "unpaidBalance" as const, label: "Unpaid Balance", icon: AlertCircleIcon, color: "text-red-600", bg: "bg-red-50", isCurrency: true },
  { key: "openMaintenance" as const, label: "Open Maintenance", icon: WrenchIcon, color: "text-yellow-600", bg: "bg-yellow-50" },
]

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load dashboard")
        return res.json()
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-destructive">{error}</div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          const value = data?.[stat.key] ?? 0
          return (
            <Card key={stat.key}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <div className={`rounded-lg p-2 ${stat.bg}`}>
                  <Icon className={`size-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stat.isCurrency ? formatCurrency(value) : value}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
