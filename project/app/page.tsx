"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { FileText, FileSpreadsheet, CheckCircle2, Gift, ArrowRight, Sparkles } from "lucide-react"
import Link from "next/link"
import UnauthorizedPage from "@/app/unauthorized/page"
import { supabase } from "@/lib/supabaseClient"

// Subtle gradient background that works in both light and dark modes
const BackgroundGradient = () => (
  <div className="absolute inset-0 -z-10 bg-gradient-radial from-slate-200/30 to-transparent dark:from-gray-900/5 pointer-events-none" />
)

export default function Home() {
  const { user, loading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    scriptCount: 0,
    reportCount: 0,
    templateCount: 0,
    scriptsRemaining: 5, // Total script limit for free tier
    monthlyReportGenerations: 0, // Current month's report generations
    monthlyReportLimit: 10, // Default monthly generation limit for free tier
  })
  const [userSettings, setUserSettings] = useState<any>(null)

  // Fetch user stats and settings
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        // Fetch user settings
        const { data: settings } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (settings) {
          setUserSettings(settings)
        }

        // Fetch script count
        const { count: scriptCount } = await supabase
          .from('script_library')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        // Fetch report count and template count
        const { count: reportCount } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        const { count: templateCount } = await supabase
          .from('design_templates')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          
        // Get monthly report generations for the current month
        const { data: monthlyUsage } = await supabase
          .rpc('get_monthly_report_generations', { p_user_id: user.id })
        
        // Set appropriate limits based on plan
        const isPro = settings?.current_plan !== 'free';
        const monthlyReportLimit = isPro ? Infinity : 10;
        const scriptLimit = isPro ? Infinity : 5;

        setStats({
          scriptCount: scriptCount || 0,
          reportCount: reportCount || 0,
          templateCount: templateCount || 0,
          scriptsRemaining: isPro ? Infinity : Math.max(0, scriptLimit - (scriptCount || 0)),
          monthlyReportGenerations: monthlyUsage || 0,
          monthlyReportLimit: monthlyReportLimit,
        })
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchData()
    } else {
      // If no user, still stop loading after a short delay
      const timer = setTimeout(() => setIsLoading(false), 500)
      return () => clearTimeout(timer)
    }
  }, [user])
  
  // Calculate remaining report generations
  const reportsRemaining = 
    stats.monthlyReportLimit === Infinity 
      ? Infinity 
      : Math.max(0, stats.monthlyReportLimit - stats.monthlyReportGenerations);

  if (isLoading || authLoading) {
    // Enhanced loading skeleton that matches the page layout - more compact now
    return (
      <div className="max-w-5xl mx-auto space-y-3 pb-4 px-4 relative">
        {/* Welcome section skeleton - more compact */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            <div className="space-y-1">
              <div className="h-5 w-48 bg-muted rounded-md animate-pulse" />
              <div className="h-3 w-32 bg-muted rounded-md animate-pulse" />
            </div>
          </div>
          <div className="h-8 w-24 bg-muted rounded-md animate-pulse" />
        </div>
        
        {/* Stats cards skeleton - horizontal more compact layout */}
        <div className="flex flex-wrap gap-2 mt-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex-1 min-w-[110px]">
              <Card className="animate-pulse">
                <CardContent className="p-2.5 flex items-center justify-between">
                  <div>
                    <div className="h-3 w-14 bg-muted rounded-md mb-1" />
                    <div className="h-5 w-6 bg-muted rounded-md" />
                  </div>
                  <div className="h-7 w-7 rounded-full bg-muted/70" />
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
        
        {/* Secondary Nav skeleton */}
        <div className="flex w-full h-6 bg-muted/30 rounded-sm mt-1.5 animate-pulse" />
        
        {/* Main actions skeleton - 2 column layout with reduced height */}
        <div className="grid md:grid-cols-2 gap-3 mt-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="border-b border-muted pb-1.5 pt-2.5 px-4">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-md bg-muted" />
                  <div className="h-4 w-24 bg-muted rounded-md" />
                </div>
                <div className="h-3 w-36 mt-1 bg-muted rounded-md" />
              </CardHeader>
              <CardContent className="pt-2 px-4 pb-3">
                <div className="flex items-center gap-1 mb-2">
                  <div className="h-3 w-12 bg-muted rounded-md" />
                  <div className="h-3 w-3 bg-muted rounded-md" />
                  <div className="h-3 w-20 bg-muted rounded-md" />
                </div>
                <div className="space-y-1.5">
                  {[...Array(2)].map((_, j) => (
                    <div key={j} className="flex items-start">
                      <div className="h-3.5 w-3.5 rounded-full bg-muted mr-2 mt-0.5 shrink-0" />
                      <div className="h-3.5 w-full bg-muted rounded-md" />
                    </div>
                  ))}
                </div>
                <div className="h-7 w-full bg-muted mt-3 rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Upgrade CTA skeleton - more compact */}
        <div className="mt-3">
          <Card className="bg-muted/30 border-primary/10">
            <CardContent className="flex items-center justify-between py-2.5 px-4">
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
                <div className="space-y-1">
                  <div className="h-3.5 w-24 bg-muted rounded-md animate-pulse" />
                  <div className="h-2.5 w-32 bg-muted rounded-md animate-pulse" />
                </div>
              </div>
              <div className="h-7 w-16 bg-muted rounded-md animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!user) {
    return <UnauthorizedPage />
  }

  const getInitials = (name: string) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-5xl mx-auto space-y-3 pb-4 px-4 relative"
    >
      <BackgroundGradient />
      
      {/* Welcome Section - More compact with smaller text and less vertical space */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mt-1">
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2.5"
        >
          <Avatar className="h-10 w-10 border border-primary/20 shadow-sm">
            <AvatarImage src={userSettings?.avatar || user.photoURL} alt={userSettings?.full_name || user.displayName || "User avatar"} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(userSettings?.full_name || user.displayName || "User")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Welcome back, {userSettings?.full_name || user.displayName || "there"}!
            </h1>
            <p className="text-xs text-muted-foreground">
              Ready to create some stunning reports?
            </p>
          </div>
        </motion.div>
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Link href="/settings">
            <Button variant="outline" size="sm" className="font-medium">
              Manage Account
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Quick Stats - Horizontal layout with visual indicators - more compact */}
      <motion.div 
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap gap-2 mt-2"
      >
        <Card className="flex-1 min-w-[110px] border-primary/10 shadow-sm hover:border-primary/20 transition-colors">
          <CardContent className="p-2.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Scripts</p>
              <p className="text-lg font-semibold">{stats.scriptCount}</p>
            </div>
            <div className="p-1.5 bg-primary/10 rounded-full">
              <FileText className="h-4 w-4 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[110px] border-primary/10 shadow-sm hover:border-primary/20 transition-colors">
          <CardContent className="p-2.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Reports</p>
              <p className="text-lg font-semibold">{stats.reportCount}</p>
            </div>
            <div className="p-1.5 bg-primary/10 rounded-full">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[110px] border-primary/10 shadow-sm hover:border-primary/20 transition-colors">
          <CardContent className="p-2.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Templates</p>
              <p className="text-lg font-semibold">{stats.templateCount}</p>
            </div>
            <div className="p-1.5 bg-primary/10 rounded-full">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Secondary Navigation with limits information - updated to show monthly report generations */}
      <div className="flex items-center text-xs text-muted-foreground py-1 px-1 border-b">
        <span>Dashboard</span>
        {(reportsRemaining < Infinity || stats.scriptsRemaining < Infinity) && (
          <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {reportsRemaining < Infinity && (
              <div className="flex items-center">
                <span>{reportsRemaining} report exports remaining this month</span>
              </div>
            )}
            {stats.scriptsRemaining < Infinity && (
              <div className="flex items-center">
                <span>{stats.scriptsRemaining} saved scripts remaining</span>
              </div>
            )}
            <Link href="/pricing" className="text-primary hover:underline text-xs">Upgrade</Link>
          </div>
        )}
      </div>
      
      {/* Main Actions - 2 column layout with reduced spacing */}
      <motion.div 
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid md:grid-cols-2 gap-3 mt-2.5"
      >
        <Card className="h-full border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md bg-white/50 dark:bg-gray-900/50 hover:border-primary/30 transition-all">
          <CardHeader className="border-b border-gray-100 dark:border-gray-800/80 pb-1.5 pt-2.5 px-3.5">
            <CardTitle className="flex items-center space-x-2 text-base font-semibold">
              <FileText className="h-4 w-4 text-primary" />
              <span>Script Library</span>
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Store, organize, and version control your SQL scripts
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 px-3.5 pb-3">
            {/* Horizontal stats row */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-medium">{stats.scriptCount} scripts</span>
              <span className="h-3 border-r border-gray-200 dark:border-gray-700"></span>
              <span>Last edited 2 days ago</span>
            </div>
            
            <ul className="space-y-1.5 mt-2 text-xs text-gray-600 dark:text-gray-300">
              <li className="flex items-start">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-primary shrink-0 mt-0.5" />
                <span>Version control and change tracking</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-primary shrink-0 mt-0.5" />
                <span>Real-time team collaboration</span>
              </li>
            </ul>
            
            {/* Action buttons side-by-side */}
            <div className="flex space-x-2 mt-2.5">
              <Link href="/scripts" className="flex-1">
                <Button size="sm" className="w-full text-xs group">
                  Browse Scripts
                  <ArrowRight className="ml-1.5 h-3 w-3 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
              <Link href="/scripts/new" className="flex-1">
                <Button size="sm" variant="outline" className="w-full text-xs">
                  Create New
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md bg-white/50 dark:bg-gray-900/50 hover:border-primary/30 transition-all">
          <CardHeader className="border-b border-gray-100 dark:border-gray-800/80 pb-1.5 pt-2.5 px-3.5">
            <CardTitle className="flex items-center space-x-2 text-base font-semibold">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <span>Report Designer</span>
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Transform data exports into branded reports
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 px-3.5 pb-3">
            {/* Horizontal stats row */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-medium">{stats.reportCount} reports</span>
              <span className="h-3 border-r border-gray-200 dark:border-gray-700"></span>
              <span>{stats.templateCount} templates</span>
            </div>
            
            <ul className="space-y-1.5 mt-2 text-xs text-gray-600 dark:text-gray-300">
              <li className="flex items-start">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-primary shrink-0 mt-0.5" />
                <span>Professional design templates for your brand</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-primary shrink-0 mt-0.5" />
                <span>Auto-generated data visualizations</span>
              </li>
            </ul>
            
            {/* Action buttons side-by-side */}
            <div className="flex space-x-2 mt-2.5">
              <Link href="/reports" className="flex-1">
                <Button size="sm" className="w-full text-xs group">
                  Design Reports
                  <ArrowRight className="ml-1.5 h-3 w-3 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
              <Link href="/reports/templates" className="flex-1">
                <Button size="sm" variant="outline" className="w-full text-xs">
                  Templates
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Upgrade CTA - Much more compact */}
      {userSettings?.current_plan === 'free' && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-2.5"
        >
          <Card className="border-primary/20 shadow-sm overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent pointer-events-none" />
            <CardContent className="flex items-center justify-between py-2.5 px-4 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-primary/10 rounded-full">
                  <Gift className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Upgrade to Pro</h3>
                  <p className="text-xs text-muted-foreground">Unlimited monthly exports, 
                  {stats.scriptsRemaining < Infinity ? " unlimited saved scripts, " : " "}
                  premium templates</p>
                </div>
              </div>
              <div className="flex items-center">
                <Link href="/pricing">
                  <Button size="sm" variant="default" className="whitespace-nowrap text-xs h-7">
                    View Plans
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}