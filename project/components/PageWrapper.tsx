"use client"
import { usePathname } from "next/navigation"
import { ReactNode } from "react"

export function PageWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  // If not on an auth route, add top padding to separate from header.
  const className = pathname.startsWith("/auth/") ? "" : "pt-20"
  return <div className={className}>{children}</div>
}
