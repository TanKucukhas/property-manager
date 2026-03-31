"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboardIcon,
  ClipboardListIcon,
  BuildingIcon,
  UsersIcon,
  FileTextIcon,
  DollarSignIcon,
  ShieldIcon,
  WrenchIcon,
  MenuIcon,
  XIcon,
  LogOutIcon,
} from "lucide-react"

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboardIcon },
  { label: "Prescreening", href: "/admin/prescreening", icon: ClipboardListIcon },
  { label: "Properties", href: "/admin/properties", icon: BuildingIcon },
  { label: "Tenants", href: "/admin/tenants", icon: UsersIcon },
  { label: "Leases", href: "/admin/leases", icon: FileTextIcon },
  { label: "Payments", href: "/admin/payments", icon: DollarSignIcon },
  { label: "Deposits", href: "/admin/deposits", icon: ShieldIcon },
  { label: "Maintenance", href: "/admin/maintenance", icon: WrenchIcon },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin"
    return pathname.startsWith(href)
  }

  const sidebarContent = (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {navItems.map((item) => {
        const Icon = item.icon
        const active = isActive(item.href)
        return (
          <a
            key={item.href}
            href={item.href}
            onClick={(e) => {
              e.preventDefault()
              router.push(item.href)
              setSidebarOpen(false)
            }}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-white/10 text-white"
                : "text-gray-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="size-5 shrink-0" />
            {item.label}
          </a>
        )
      })}
    </nav>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-gray-900 lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-white/10 px-5">
          <BuildingIcon className="size-6 text-white" />
          <span className="text-lg font-bold text-white">Property Manager</span>
        </div>
        <div className="flex-1 overflow-y-auto">{sidebarContent}</div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative flex h-full w-64 flex-col bg-gray-900">
            <div className="flex h-14 items-center justify-between border-b border-white/10 px-5">
              <span className="text-lg font-bold text-white">Property Manager</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <XIcon className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{sidebarContent}</div>
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 hover:bg-muted lg:hidden"
            >
              <MenuIcon className="size-5" />
            </button>
            <h1 className="text-lg font-semibold lg:hidden">Property Manager</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOutIcon className="size-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
