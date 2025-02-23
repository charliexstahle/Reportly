"use client"

import { FileText, Settings, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from '@/contexts/AuthContext'

export function Header() {
  const { setTheme } = useTheme()
  const { user, signOut } = useAuth()

  return (
    <header className="border-b bg-background/95 dark:bg-background/95 dark:bg-gradient-to-l dark:from-slate-950 dark:to-black backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Reportly</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/scripts" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">
              Script Library
            </Link>
            <Link href="/reports" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">
              Report Designer
            </Link>
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <Link href="/pricing">
                <Button variant="outline" size="sm">
                  Upgrade
                </Button>
              </Link>
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/pricing">
                <Button variant="outline" size="sm">
                  Sign up
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="default">Sign in</Button>
              </Link>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}