"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/sessions", label: "Sessions" },
  { href: "/scorecards", label: "Scorecards" },
  { href: "/scenarios", label: "Scenarios" },
]

const bottomItems = [
  { href: "/team", label: "Team" },
  { href: "/settings", label: "Settings" },
]

export function AppSidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname()

  const NavLink = ({ href, label }: { href: string; label: string }) => (
    <Link
      href={href}
      className={cn(
        "block py-1.5 text-sm transition-colors",
        pathname === href || pathname.startsWith(href + "/")
          ? "font-normal text-foreground"
          : "font-light text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </Link>
  )

  return (
    <aside className="flex h-full w-40 shrink-0 flex-col border-r">
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-6 py-4">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>
      <div className="border-t px-6 h-14 flex flex-col justify-center gap-0.5">
        {isAdmin && <NavLink {...bottomItems[0]} />}
        <NavLink {...bottomItems[1]} />
      </div>
    </aside>
  )
}
