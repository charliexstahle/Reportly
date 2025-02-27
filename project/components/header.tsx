"use client"

import { BarChart2, Settings, Moon, Sun, ChevronDown } from "lucide-react" 
import { useTheme } from "next-themes"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export function Header() {
    const { theme, setTheme } = useTheme()
    const { user, signOut } = useAuth()
    const [mounted, setMounted] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [displayName, setDisplayName] = useState<string | null>(null)
    
    // Make sure the component is mounted before rendering theme-dependent elements
    useEffect(() => {
        setMounted(true)
    }, [])

    // Get user initials for avatar fallback
    const getInitials = (name: string) => {
        if (!name) return "U"
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2)
    }

    // Fetch user settings when user is loaded
    useEffect(() => {
        const fetchUserSettings = async () => {
            if (!user) return;
            
            try {
                // First try to get avatar from auth context
                if (user.photoURL) {
                    setAvatarUrl(user.photoURL);
                }
                
                if (user.displayName) {
                    setDisplayName(user.displayName);
                }
                
                // Then try to get from Supabase
                const { data, error } = await supabase
                    .from('user_settings')
                    .select('avatar, full_name, dark_mode')
                    .eq('user_id', user.id)
                    .single();
                
                if (error) {
                    console.error('Error fetching user settings:', error);
                    return;
                }
                
                // Update avatar and name if available from Supabase
                if (data) {
                    if (data.avatar) {
                        setAvatarUrl(data.avatar);
                    }
                    
                    if (data.full_name) {
                        setDisplayName(data.full_name);
                    }
                    
                    // Apply theme preference if available and not already applied via localStorage
                    // This only runs once when mounted becomes true
                    if (data.dark_mode !== undefined && mounted && 
                        !localStorage.getItem('theme-preference-manual-override')) {
                        setTheme(data.dark_mode ? "dark" : "light");
                    }
                }
            } catch (error) {
                console.error('Error in fetchUserSettings:', error);
            }
        };
        
        fetchUserSettings();
    }, [user, mounted, setTheme]);

    // Track when user manually changes theme in header
    const handleThemeChange = async (newTheme: string) => {
        // Set a flag that user manually overrode theme preference
        localStorage.setItem('theme-preference-manual-override', 'true');
        setTheme(newTheme);
        
        // Update the user settings in Supabase if user is logged in
        if (user) {
            try {
                const { error } = await supabase
                    .from('user_settings')
                    .update({
                        dark_mode: newTheme === 'dark',
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', user.id);
                    
                if (error) {
                    console.error('Error updating theme preference in database:', error);
                }
            } catch (error) {
                console.error('Failed to update theme preference:', error);
            }
        }
    }

    return (
        <header className="border-b bg-background/95 dark:bg-background/95 dark:bg-gradient-to-l dark:from-slate-950 dark:to-black backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-8">
                    <Link href="/" className="flex items-center space-x-2">
                        <BarChart2 className="h-6 w-6 text-primary" />
                        <span className="font-bold text-lg">Reportly</span>
                    </Link>
                    {user ? (
                      <nav className="hidden md:flex items-center space-x-6">
                          <Link href="/scripts" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">
                              Script Library
                          </Link>
                          <Link href="/reports" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">
                              Report Designer
                          </Link>
                      </nav>
                    ) : (
                      <nav className="hidden md:flex items-center space-x-6">
                          <Link href="/" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">
                              Home
                          </Link>
                          <Link href="/pricing" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">
                              Pricing
                          </Link>
                      </nav>
                    )}
                </div>
                <div className="flex items-center space-x-4">
                    {user ? (
                        <>
                            <Link href="/pricing">
                                <Button variant="outline" size="sm">
                                    Upgrade
                                </Button>
                            </Link>
                            
                            {/* User Profile Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <div className="flex items-center space-x-2 cursor-pointer rounded-full hover:bg-muted/50 py-1 px-1 pl-2 transition-colors">
                                        <div className="hidden sm:block">
                                            <p className="text-sm font-medium">{displayName || user.displayName || "User"}</p>
                                        </div>
                                        <Avatar className="h-8 w-8 border border-muted">
                                            <AvatarImage src={avatarUrl || ""} alt={displayName || user.displayName || "User"} />
                                            <AvatarFallback>{getInitials(displayName || user.displayName || "User")}</AvatarFallback>
                                        </Avatar>
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <div className="flex items-center justify-start gap-2 p-2">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={avatarUrl || ""} alt={displayName || user.displayName || "User"} />
                                            <AvatarFallback>{getInitials(displayName || user.displayName || "User")}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col space-y-0.5">
                                            <p className="text-sm font-medium truncate">{displayName || user.displayName || "User"}</p>
                                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                        </div>
                                    </div>
                                    <DropdownMenuSeparator />
                                    <Link href="/settings">
                                        <DropdownMenuItem className="cursor-pointer">
                                            <Settings className="mr-2 h-4 w-4" />
                                            <span>Settings</span>
                                        </DropdownMenuItem>
                                    </Link>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-red-600 focus:text-red-600">
                                        Sign out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
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
                    {mounted && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                                    <span className="sr-only">Toggle theme</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleThemeChange("light")}>
                                    <Sun className="mr-2 h-4 w-4" />
                                    <span>Light</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
                                    <Moon className="mr-2 h-4 w-4" />
                                    <span>Dark</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>
        </header>
    )
}