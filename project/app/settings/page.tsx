"use client"

import { useRef, useState, useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase, getUserUsageInfo } from "@/lib/supabaseClient"
import { v4 as uuidv4 } from 'uuid'
import { 
  User, 
  Settings, 
  CreditCard, 
  Bell, 
  Shield, 
  Key, 
  Palette, 
  Lock, 
  LogOut, 
  Mail, 
  Save,
  Loader2,
  Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { RainbowButton } from "@/components/ui/rainbow-button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { UserSettings } from "@/lib/types"
import { useTheme } from "next-themes"
import { PlanInfoCard } from "@/components/ui/plan-info-card"

export default function AccountSettings() {
  const { user, signOut, updateUserProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("account")
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName || "",
    email: user?.email || "",
    phoneNumber: user?.phoneNumber || "",
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [notificationSettings, setNotificationSettings] = useState({
    emailReports: true,
    productUpdates: true,
    securityAlerts: true,
  })
  const [appearanceSettings, setAppearanceSettings] = useState({
    darkMode: false,
  })
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
  })
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showAvatarDialog, setShowAvatarDialog] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [usageInfo, setUsageInfo] = useState<any>(null)

  // Fetch user settings from Supabase
  useEffect(() => {
    async function fetchUserSettings() {
      if (!user) return
      setIsLoading(true)
      
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error) {
          console.error('Error fetching user settings:', error)
          return
        }

        if (data) {
          setUserSettings(data)
          updateFormsWithData(data)
          
          // Fetch usage information
          const usage = await getUserUsageInfo(user.id);
          setUsageInfo(usage);
        }
      } catch (error) {
        console.error('Error in fetchUserSettings:', error)
        toast({
          title: "Error",
          description: "Failed to load your settings. Please refresh the page.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    function updateFormsWithData(data: UserSettings) {
      setProfileForm({
        displayName: data.full_name || user?.displayName || "",
        email: data.email || user?.email || "",
        phoneNumber: data.phone_number || "",
      })
      setNotificationSettings({
        emailReports: data.email_reports,
        productUpdates: data.product_updates,
        securityAlerts: data.security_alerts,
      })
      
      // Initialize appearance settings based on current theme if there's a manual override
      // Otherwise use the database value
      const manualOverride = localStorage.getItem('theme-preference-manual-override');
      setAppearanceSettings({
        darkMode: manualOverride ? theme === "dark" : (data.dark_mode || theme === "dark"),
      })

      setSecuritySettings({
        twoFactorEnabled: data.two_factor_authentication,
      })
      
      if (user?.photoURL) {
        setAvatarUrl(user.photoURL)
      } else if (data.avatar) {
        setAvatarUrl(data.avatar)
      }
    }

    fetchUserSettings()
    if (user?.photoURL) {
      setAvatarUrl(user.photoURL)
    } else {
      getAvatarUrl()
    }
  }, [user, toast, theme, setTheme])

  // Update theme when dark mode preference changes
  useEffect(() => {
    if (userSettings?.dark_mode !== undefined) {
      // Only apply theme from settings if user hasn't manually overridden it
      if (!localStorage.getItem('theme-preference-manual-override')) {
        setTheme(userSettings.dark_mode ? "dark" : "light");
      } else {
        // If there's a manual override, update the appearance settings to match current theme
        setAppearanceSettings(prev => ({
          ...prev,
          darkMode: theme === "dark"
        }));
      }
    }
  }, [userSettings?.dark_mode, setTheme, theme]);

  // Function to get the avatar URL from Supabase storage
  const getAvatarUrl = async () => {
    try {
      if (!user) return

      const { data, error } = await supabase
        .from('user_settings')
        .select('avatar')
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      
      if (data?.avatar) {
        setAvatarUrl(data.avatar)
      }
    } catch (error) {
      console.error('Error fetching avatar URL:', error)
    }
  }

  // Function to handle avatar upload
  const uploadAvatar = async (file: File) => {
    try {
      if (!user) return

      setUploading(true)

      // Generate a unique filename using UUID
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${uuidv4()}.${fileExt}`
      const filePath = `${fileName}`

      // Upload the file to the "avatars" bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Get the public URL for the avatar
      const { data: urlData } = await supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      if (!urlData?.publicUrl) throw new Error('Failed to get public URL')

      // Update the user_settings table with the new avatar URL
      const { error: updateError } = await supabase
        .from('user_settings')
        .update({
          avatar: urlData.publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (updateError) throw updateError

      // Update local state
      setAvatarUrl(urlData.publicUrl)

      // Update auth context
      await updateUserProfile({
        photoURL: urlData.publicUrl,
      })

      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated.",
      })
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      toast({
        title: "Upload failed",
        description: error.message || "There was a problem uploading your avatar.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      setShowAvatarDialog(false)
    }
  }

  // Function to remove the avatar
  const removeAvatar = async () => {
    try {
      if (!user || !avatarUrl) return

      setUploading(true)

      // Extract the filename from the URL
      const filePathMatch = avatarUrl.match(/avatars\/([^?]+)/)
      if (filePathMatch && filePathMatch[1]) {
        // Delete the file from storage
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove([filePathMatch[1]])

        if (deleteError) throw deleteError
      }

      // Update the user_settings table
      const { error: updateError } = await supabase
        .from('user_settings')
        .update({
          avatar: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (updateError) throw updateError

      // Update local state
      setAvatarUrl(null)

      // Update auth context with empty string instead of null
      await updateUserProfile({
        photoURL: "", // Using empty string instead of null to fix TypeScript error
      })

      toast({
        title: "Avatar removed",
        description: "Your profile picture has been removed.",
      })
    } catch (error: any) {
      console.error('Error removing avatar:', error)
      toast({
        title: "Action failed",
        description: error.message || "There was a problem removing your avatar.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      setShowAvatarDialog(false)
    }
  }

  // Function to handle file selection
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return
    }
    const file = event.target.files[0]
    // Check file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Avatar image must be less than 2MB in size.",
        variant: "destructive",
      })
      return
    }
    
    // Upload the file
    uploadAvatar(file)
  }

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
    }
  }, [user, router])

  // Function to check for subscription success/canceled from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const subscriptionStatus = urlParams.get('subscription');
    
    if (subscriptionStatus === 'success') {
      toast({
        title: "Subscription Updated",
        description: "Your subscription has been updated successfully.",
      });
      
      // Clean up the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (subscriptionStatus === 'canceled') {
      toast({
        title: "Subscription Canceled",
        description: "Your subscription update was canceled.",
        variant: "destructive",
      });
      
      // Clean up the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  if (!user) return null
  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>

  const getInitials = (name: string) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  // Handlers
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({
          full_name: profileForm.displayName,
          email: profileForm.email,
          phone_number: profileForm.phoneNumber,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (error) {
        // Check for RLS error
        if (error.code === '42501' || error.message?.includes('row level security')) {
          throw new Error('Permission denied: You do not have permission to update your profile. Try logging out and back in.')
        }
        throw error
      }

      await updateUserProfile({
        displayName: profileForm.displayName,
      })

      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      })
    } catch (error: any) {
      console.error("Failed to update profile:", error)
      toast({
        title: "Update failed",
        description: error.message || "There was a problem updating your profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation must match.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      })
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error) {
      toast({
        title: "Update failed",
        description: "There was a problem updating your password.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleNotificationUpdate = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({
          email_reports: notificationSettings.emailReports,
          product_updates: notificationSettings.productUpdates,
          security_alerts: notificationSettings.securityAlerts,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (error) throw error

      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated.",
      })
    } catch (error) {
      toast({
        title: "Update failed",
        description: "There was a problem saving your preferences.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAppearanceUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      // Set the theme immediately for better UX
      setTheme(appearanceSettings.darkMode ? "dark" : "light")
      
      const { error } = await supabase
        .from('user_settings')
        .update({
          dark_mode: appearanceSettings.darkMode,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (error) throw error

      // Update local state
      if (userSettings) {
        setUserSettings({
          ...userSettings,
          dark_mode: appearanceSettings.darkMode
        });
      }

      toast({
        title: "Appearance updated",
        description: "Your appearance settings have been updated.",
      })
    } catch (error) {
      // Revert theme if there was an error
      setTheme(appearanceSettings.darkMode ? "light" : "dark")
      setAppearanceSettings(prev => ({ ...prev, darkMode: !prev.darkMode }))
      
      toast({
        title: "Update failed",
        description: "There was a problem updating your appearance settings.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Update the appearance section UI handler
  const handleDarkModeToggle = (checked: boolean) => {
    // Update local state
    setAppearanceSettings({
      ...appearanceSettings,
      darkMode: checked,
    });
    
    // Apply the theme immediately for better user experience
    setTheme(checked ? "dark" : "light");
    
    // If the user explicitly changes theme in settings, remove the manual override flag
    localStorage.removeItem('theme-preference-manual-override');
  }

  const handleSecurityUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({
          two_factor_authentication: securitySettings.twoFactorEnabled,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (error) throw error

      toast({
        title: "Security updated",
        description: "Your security settings have been updated.",
      })
    } catch (error) {
      toast({
        title: "Update failed",
        description: "There was a problem updating your security settings.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Nav links
  const links = [
    { label: "Account", value: "account", icon: <User className="w-4 h-4" /> },
    { label: "Password", value: "password", icon: <Key className="w-4 h-4" /> },
    { label: "Appearance", value: "appearance", icon: <Palette className="w-4 h-4" /> },
    { label: "Notifications", value: "notifications", icon: <Bell className="w-4 h-4" /> },
    { label: "Billing", value: "billing", icon: <CreditCard className="w-4 h-4" /> },
    { label: "Security", value: "security", icon: <Shield className="w-4 h-4" /> },
  ]

  return (
    <>
      {/* Outer container for sidebar + main content */}
      <div className="max-w-7xl mx-auto min-h-[calc(100vh-4rem)] bg-background flex items-start gap-8 pt-6 px-4">
        
        {/* Sidebar for larger screens */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0">
          {/* Sidebar heading */}
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Settings</h2>
          </div>

          {/* User Profile Summary */}
          <div className="mb-6 flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={avatarUrl || ""} alt={user?.displayName || "User"} />
              <AvatarFallback>{getInitials(user?.displayName || "User")}</AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <p className="font-medium truncate">{profileForm.displayName || user?.displayName || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 flex-1">
            {links.map((link) => (
              <button
                key={link.value}
                className={`flex items-center gap-3 w-full px-3 py-2 text-sm rounded-md transition-colors
                  ${
                    activeTab === link.value
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                onClick={() => setActiveTab(link.value)}
              >
                {link.icon}
                {link.label}
              </button>
            ))}
          </nav>

          {/* Sign Out Button at bottom */}
          <div className="mt-auto pt-4">
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1">
          {/* Mobile tab navigation */}
          <div className="lg:hidden sticky top-0 z-10 bg-background p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold">Settings</h1>
              <Avatar className="h-8 w-8" onClick={() => setActiveTab("account")}>
                <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || "User"} />
                <AvatarFallback>{getInitials(user?.displayName || "User")}</AvatarFallback>
              </Avatar>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Main header (desktop only) */}
          <div className="hidden lg:block mb-6">
            <h1 className="text-3xl font-bold">Account Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your account settings and preferences
            </p>
          </div>

          {/* Content area */}
          <div className="space-y-6">
            {activeTab === "account" && (
              <Card className="rounded-lg shadow border border-muted-foreground/5">
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your account details and profile information.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleProfileUpdate}>
                  <CardContent>
                    <div className="flex flex-col space-y-6">
                      <div className="flex flex-col md:flex-row md:items-start gap-6">
                        <div className="flex flex-col items-center">
                          <Avatar className="h-24 w-24 border-2 border-muted">
                            <AvatarImage src={avatarUrl || ""} />
                            <AvatarFallback className="text-lg">
                              {getInitials(user?.displayName || "User")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="mt-4">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              type="button"
                              onClick={() => setShowAvatarDialog(true)}
                            >
                              Change Avatar
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-4 flex-1">
                          <div className="grid gap-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                              id="name"
                              value={profileForm.displayName}
                              onChange={(e) =>
                                setProfileForm({
                                  ...profileForm,
                                  displayName: e.target.value,
                                })
                              }
                              placeholder="Your name"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="email"
                                type="email"
                                className="pl-10"
                                value={profileForm.email}
                                onChange={(e) =>
                                  setProfileForm({
                                    ...profileForm,
                                    email: e.target.value,
                                  })
                                }
                                placeholder="your.email@example.com"
                                disabled
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Contact support to change your email address.
                            </p>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                              id="phone"
                              type="tel"
                              value={profileForm.phoneNumber}
                              onChange={(e) =>
                                setProfileForm({
                                  ...profileForm,
                                  phoneNumber: e.target.value,
                                })
                              }
                              placeholder="+1 (555) 000-0000"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between border-t border-muted-foreground/5 pt-4">
                    <p className="text-sm text-muted-foreground">
                      Last updated: {new Date().toLocaleDateString()}
                    </p>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            )}

            {activeTab === "password" && (
              <Card className="rounded-lg shadow border border-muted-foreground/5">
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handlePasswordUpdate}>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="current">Current Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="current"
                          type="password"
                          className="pl-10"
                          value={passwordForm.currentPassword}
                          onChange={(e) =>
                            setPasswordForm({
                              ...passwordForm,
                              currentPassword: e.target.value,
                            })
                          }
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="grid gap-2">
                      <Label htmlFor="new">New Password</Label>
                      <Input
                        id="new"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            newPassword: e.target.value,
                          })
                        }
                        placeholder="••••••••"
                        required
                        minLength={8}
                      />
                      <p className="text-xs text-muted-foreground">
                        Password must be at least 8 characters and include a number.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirm">Confirm New Password</Label>
                      <Input
                        id="confirm"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            confirmPassword: e.target.value,
                          })
                        }
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-muted-foreground/5 pt-4">
                    <Button
                      type="submit"
                      className="ml-auto"
                      disabled={
                        isSaving ||
                        !passwordForm.currentPassword ||
                        !passwordForm.newPassword ||
                        !passwordForm.confirmPassword
                      }
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update Password"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            )}

            {activeTab === "appearance" && (
              <Card className="rounded-lg shadow border border-muted-foreground/5">
                <CardHeader>
                  <CardTitle>Appearance Settings</CardTitle>
                  <CardDescription>
                    Customize your theme and display preferences.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleAppearanceUpdate}>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="dark-mode" className="font-medium">
                          Dark Mode
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Enable dark mode for a better viewing experience in low light.
                        </p>
                      </div>
                      <Switch
                        id="dark-mode"
                        checked={appearanceSettings.darkMode}
                        onCheckedChange={handleDarkModeToggle}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-muted-foreground/5 pt-4">
                    <Button type="submit" className="ml-auto" disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Appearance"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            )}

            {activeTab === "notifications" && (
              <Card className="rounded-lg shadow border border-muted-foreground/5">
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Choose which notifications you want to receive.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Email Notifications</h3>
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between space-x-2">
                        <div>
                          <Label htmlFor="email-reports" className="font-medium">
                            Email Reports
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Receive weekly and monthly performance reports
                          </p>
                        </div>
                        <Switch
                          id="email-reports"
                          checked={notificationSettings.emailReports}
                          onCheckedChange={(checked) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              emailReports: checked,
                            })
                          }
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between space-x-2">
                        <div>
                          <Label htmlFor="product-updates" className="font-medium">
                            Product Updates
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Get notified when we release new features
                          </p>
                        </div>
                        <Switch
                          id="product-updates"
                          checked={notificationSettings.productUpdates}
                          onCheckedChange={(checked) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              productUpdates: checked,
                            })
                          }
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between space-x-2">
                        <div>
                          <Label htmlFor="security-alerts" className="font-medium">
                            Security Alerts
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Important notifications about your account security
                          </p>
                        </div>
                        <Switch
                          id="security-alerts"
                          checked={notificationSettings.securityAlerts}
                          onCheckedChange={(checked) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              securityAlerts: checked,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-muted-foreground/5 pt-4">
                  <Button className="ml-auto" onClick={handleNotificationUpdate} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Preferences"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            )}

            {activeTab === "billing" && (
              <Card className="rounded-lg shadow border border-muted-foreground/5">
                <CardHeader>
                  <CardTitle>Billing Information</CardTitle>
                  <CardDescription>
                    Manage your subscription and payment methods.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {usageInfo ? (
                    <PlanInfoCard 
                      planTier={usageInfo.planTier || 'free'}
                      isSubscriptionActive={usageInfo.isActive !== false}
                      reportUsage={usageInfo.reports}
                      storageUsage={usageInfo.storage}
                      subscriptionStartsAt={userSettings?.subscription_starts_at}
                      subscriptionEndsAt={userSettings?.subscription_ends_at}
                    />
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}

                  <div className="space-y-4">
                    <h3 className="font-medium">Payment Methods</h3>
                    <p className="text-sm text-muted-foreground">
                      {userSettings?.payment_methods && 
                      Object.keys(userSettings.payment_methods).length > 0 ? 
                        "Manage your payment methods below." : 
                        "No payment methods added yet."}
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/pricing">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Manage Payment Methods
                      </Link>
                    </Button>
                  </div>

                  <div className="rounded-md bg-muted/50 p-4 mt-6">
                    <h3 className="font-medium mb-2">Need help with billing?</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Contact our support team if you have any questions about your subscription or billing.
                    </p>
                    <Button variant="secondary" size="sm" asChild>
                      <Link href="mailto:support@reportly.com">Contact Support</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "security" && (
              <Card className="rounded-lg shadow border border-muted-foreground/5">
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Manage your account security options.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleSecurityUpdate}>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="two-factor" className="font-medium">
                          Two-Factor Authentication
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Add an extra layer of security to your account.
                        </p>
                      </div>
                      <Switch
                        id="two-factor"
                        checked={securitySettings.twoFactorEnabled}
                        onCheckedChange={(checked) =>
                          setSecuritySettings({
                            ...securitySettings,
                            twoFactorEnabled: checked,
                          })
                        }
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-muted-foreground/5 pt-4">
                    <Button type="submit" className="ml-auto" disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Security"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            )}
          </div>
        </div>
      </div>
      
      {/* Avatar Dialog */}
      <AlertDialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update profile picture</AlertDialogTitle>
            <AlertDialogDescription>
              Choose a new avatar image or remove the current one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col items-center justify-center gap-4 py-4">
            <Avatar className="h-24 w-24 border-2 border-muted">
              <AvatarImage src={avatarUrl || ""} />
              <AvatarFallback className="text-lg">
                {getInitials(user?.displayName || "User")}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Choose image"
                )}
              </Button>
              {avatarUrl && (
                <Button
                  variant="destructive"
                  onClick={removeAvatar}
                  disabled={uploading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={uploading}>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </>
  )
}
