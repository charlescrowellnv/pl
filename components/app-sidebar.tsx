"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Mic,
  ClipboardList,
  BookOpen,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sessions", label: "Sessions", icon: Mic },
  { href: "/scorecards", label: "Scorecards", icon: ClipboardList },
  { href: "/scenarios", label: "Scenarios", icon: BookOpen },
]

const bottomItems = [
  { href: "/team", label: "Team", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function AppSidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname()

  const NavLink = ({
    href,
    label,
    icon: Icon,
  }: {
    href: string
    label: string
    icon: LucideIcon
  }) => (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        pathname === href || pathname.startsWith(href + "/")
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      )}
    >
      <Icon className={"h-4 w-4 shrink-0"} />
      {label}
    </Link>
  )

  return (
    <aside className="bg-sidebar border-sidebar-border flex h-svh w-56 shrink-0 flex-col border-r">
      <div className="flex h-14 items-center px-4">
        <Link href="/dashboard" className="font-semibold tracking-tight">
          practice<span className="text-primary">lab</span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      <div className="border-sidebar-border border-t px-3 py-3">
        {isAdmin && <NavLink {...bottomItems[0]} />}
        <NavLink {...bottomItems[1]} />
      </div>
    </aside>
  )
}
