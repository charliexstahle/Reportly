"use client"
import { usePathname } from "next/navigation"
import { Header } from "./header"

// A simple client component that conditionally renders the Header.
// If the current path starts with "/auth/", returns null.
export function ConditionalHeader() {
  const pathname = usePathname()
  if (pathname.startsWith('/auth/')) return null
  return <Header />
}
