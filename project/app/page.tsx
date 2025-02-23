"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, FileSpreadsheet, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import LoadingSkeleton from "@/components/LoadingSkeleton"

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading)
    return (
      <div className="max-w-5xl mx-auto space-y-12 py-8">
        {/* Header skeleton */}
        <div className="space-y-4 text-center">
          <div className="h-10 bg-gray-300 rounded w-2/3 mx-auto"></div>
          <div className="h-6 bg-gray-300 rounded w-1/2 mx-auto"></div>
        </div>
        {/* Cards skeleton */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="border border-gray-200 rounded p-6 animate-pulse">
            <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
          </div>
          <div className="border border-gray-200 rounded p-6 animate-pulse">
            <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
          </div>
        </div>
        <div className="text-center">
          <div className="h-4 bg-gray-300 rounded inline-block w-1/3"></div>
        </div>
      </div>
    )

  return (
    <div className="max-w-5xl mx-auto space-y-12 py-8">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">
          Transform Your SQL Exports Into Signature Reports
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Streamline your workflow with powerful script management and professional report generation
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8">
        <Link href="/scripts" className="transition-transform hover:scale-[1.02]">
          <Card className="h-full border border-gray-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-xl">
                <FileText className="h-6 w-6 text-primary" />
                <span>Script Library</span>
              </CardTitle>
              <CardDescription>
                Store, organize, and version control your SQL scripts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center">
                  <ArrowRight className="h-4 w-4 mr-2 text-primary" />
                  Categorize and tag scripts
                </li>
                <li className="flex items-center">
                  <ArrowRight className="h-4 w-4 mr-2 text-primary" />
                  Track version history
                </li>
                <li className="flex items-center">
                  <ArrowRight className="h-4 w-4 mr-2 text-primary" />
                  Quick copy to clipboard
                </li>
                <li className="flex items-center">
                  <ArrowRight className="h-4 w-4 mr-2 text-primary" />
                  Collaborative editing
                </li>
              </ul>
              <Button className="w-full px-4 py-2">Browse Scripts</Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/reports" className="transition-transform hover:scale-[1.02]">
          <Card className="h-full border border-gray-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-xl">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
                <span>Report Designer</span>
              </CardTitle>
              <CardDescription>
                Transform data exports into branded reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center">
                  <ArrowRight className="h-4 w-4 mr-2 text-primary" />
                  Upload XLSX/CSV files
                </li>
                <li className="flex items-center">
                  <ArrowRight className="h-4 w-4 mr-2 text-primary" />
                  Apply institutional branding
                </li>
                <li className="flex items-center">
                  <ArrowRight className="h-4 w-4 mr-2 text-primary" />
                  Generate PDF reports
                </li>
                <li className="flex items-center">
                  <ArrowRight className="h-4 w-4 mr-2 text-primary" />
                  Data visualization
                </li>
              </ul>
              <Button className="w-full px-4 py-2">Design Reports</Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="text-center">
        <p className="text-muted-foreground">
          Get started by exploring the Script Library or creating a new report
        </p>
      </div>
    </div>
  )
}