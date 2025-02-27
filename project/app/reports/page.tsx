"use client"

import { cn } from "@/lib/utils"
import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FileUp, Download, Image, Loader2, Check, Menu, BarChart2, Edit2, Trash2, FileSpreadsheet, Table, X, FileText, Plus, Save } from "lucide-react"
import * as XLSX from "xlsx"
import ExcelJS from "exceljs"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/contexts/AuthContext"
import { Sidebar, SidebarBody, SidebarLink } from "@/components/sidebar"
import { Skeleton as UISkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { RainbowButton } from "@/components/ui/rainbow-button"
import Link from 'next/link';
import { toast as showToast } from "@/components/ui/use-toast" // Fix the import path
import { recordReportGeneration, checkReportGenerationLimit } from "@/lib/usage-limits"
import { UsageLimitAlert } from "@/components/ui/usage-limit-alert"

// Helper to get dimensions of an uploaded image
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const img = new window.Image()
    img.src = URL.createObjectURL(file)
    img.onload = () => {
      const dimensions = { width: img.naturalWidth, height: img.naturalHeight }
      URL.revokeObjectURL(img.src)
      resolve(dimensions)
    }
    img.onerror = reject
  })

// Helper to upload a logo file to Supabase Storage and return its public URL
const uploadLogoFile = async (file: File, userId: string): Promise<string> => {
  const filePath = `${userId}/${Date.now()}-${file.name}`
  const { error: uploadError } = await supabase
    .storage
    .from("logos")
    .upload(filePath, file)
  if (uploadError) throw uploadError

  const { data } = supabase
    .storage
    .from("logos")
    .getPublicUrl(filePath)
  return data.publicUrl
}

export default function ReportDesigner() {
  const { user } = useAuth()

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  
  // Usage limit states
  const [reportUsage, setReportUsage] = useState({
    currentCount: 0,
    limit: 10,
    remaining: 10,
    hasReachedLimit: false
  })
  const [checkingLimit, setCheckingLimit] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  // File data & preview
  const [file, setFile] = useState<File | null>(null)
  const [previewTable, setPreviewTable] = useState<any[][] | null>(null)

  // Branding options
  const [headerText, setHeaderText] = useState("")
  const [footerText, setFooterText] = useState("")
  const [logo, setLogo] = useState<File | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoStatus, setLogoStatus] = useState<"idle" | "loading" | "success">("idle")
  const [tableTheme, setTableTheme] = useState("TableStyleMedium2")
  const [showBorders, setShowBorders] = useState(false)
  const [autoFitColumns, setAutoFitColumns] = useState(false)

  // Template drawer UI
  const [showTemplatesDrawer, setShowTemplatesDrawer] = useState(false)

  // Templates
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [newTemplateName, setNewTemplateName] = useState("")
  const [editedTemplateName, setEditedTemplateName] = useState("");
  const [editedTemplateDescription, setEditedTemplateDescription] = useState("");

  // Update success indicator
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Add computed variable for dirty state
  const isDirty = headerText !== "" || footerText !== "" || logo || tableTheme !== "TableStyleMedium2" || showBorders || autoFitColumns;

  // New state variables for edit flow and toast messages
  const [isEditing, setIsEditing] = useState(false)
  const [originalTemplate, setOriginalTemplate] = useState<any>(null)
  const [toastMessage, setToastMessage] = useState("")

  // Add new state for template modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Add a useEffect hook to control body scrolling
  useEffect(() => {
    // When sidebar or modal is open, prevent body scrolling
    if (showTemplatesDrawer || showTemplateModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    // Cleanup function to ensure scroll is re-enabled when component unmounts
    return () => {
      document.body.style.overflow = '';
    };
  }, [showTemplatesDrawer, showTemplateModal]);

  // --- Fetching Templates & Usage Limits ---
  useEffect(() => {
    if (!user) {
      setIsLoading(false)
      return
    }
    
    const fetchData = async () => {
      // Fetch templates in parallel with usage data
      const [templatesPromise, usagePromise] = await Promise.all([
        refreshTemplates(),
        fetchReportUsage()
      ]);
      
      setIsLoading(false);
    };
    
    fetchData();
  }, [user])
  
  // Fetch report usage limits
  const fetchReportUsage = async () => {
    if (!user) return;
    
    try {
      const result = await checkReportGenerationLimit(user.id);
      setReportUsage(result);
      return result;
    } catch (error) {
      console.error("Error fetching report usage:", error);
      return null;
    }
  }

  async function refreshTemplates() {
    if (!user) return
    const { data, error } = await supabase
      .from("design_templates")
      .select("id, template_name, description, layout_config, logo_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    if (error) {
      console.error("Error fetching templates:", error)
    } else {
      setTemplates(data || [])
    }
  }

  // --- File Upload Handlers ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (uploadedFile) {
      setFile(uploadedFile)
      const extension = uploadedFile.name.split(".").pop()?.toLowerCase()

      if (extension === "csv") {
        const text = await uploadedFile.text()
        const workbook = XLSX.read(text, { type: "string" })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        setPreviewTable(jsonData as any[][])
      } else if (extension === "xlsx") {
        const arrayBuffer = await uploadedFile.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: "array" })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        setPreviewTable(jsonData as any[][])
      } else {
        setPreviewTable([["Unsupported file type."]])
      }
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedLogo = e.target.files?.[0]
    if (uploadedLogo) {
      setLogo(uploadedLogo)
      setLogoStatus("loading")
      setTimeout(() => setLogoStatus("success"), 1500)
    }
  }

  // --- Template Handlers ---
  // Remove handleSelectTemplate usage and add a new handleEditTemplate function
  const handleEditTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    if (!template) return
  
    try {
      const layout = JSON.parse(template.layout_config || "{}")
      setHeaderText(layout.headerText || "")
      setFooterText(layout.footerText || "")
      setTableTheme(layout.tableTheme || "TableStyleMedium2")
      setShowBorders(!!layout.showBorders)
      setAutoFitColumns(!!layout.autoFitColumns)
  
      setLogoUrl(template.logo_url || null)
      setLogo(null)
      setEditedTemplateName(template.template_name)
      setEditedTemplateDescription(template.description || "")
      // Save original values for change detection
      setOriginalTemplate({
        template_name: template.template_name,
        description: template.description || "",
        headerText: layout.headerText || "",
        footerText: layout.footerText || "",
        tableTheme: layout.tableTheme || "TableStyleMedium2",
        showBorders: !!layout.showBorders,
        autoFitColumns: !!layout.autoFitColumns,
      })
      setSelectedTemplate(templateId)
      setIsEditing(true)
    } catch (err) {
      console.error("Error parsing layout config:", err)
      // Reset on error
      setHeaderText("")
      setFooterText("")
      setTableTheme("TableStyleMedium2")
      setShowBorders(false)
      setAutoFitColumns(false)
      setLogoUrl(null)
      setEditedTemplateName("")
      setEditedTemplateDescription("")
      setOriginalTemplate(null)
    }
  };
  
  const handleCreateTemplate = async () => {
    if (!user) {
      showToast({
        title: "Authentication Required",
        description: "You must be logged in to create templates.",
        variant: "destructive"
      });
      return;
    }
    
    if (!newTemplateName.trim()) {
      showToast({
        title: "Template Name Required",
        description: "Please enter a name for your template.",
        variant: "destructive"
      });
      return;
    }

    const layoutObj = {
      headerText,
      footerText,
      tableTheme,
      showBorders,
      autoFitColumns
    }
    const layout = JSON.stringify(layoutObj)

    let uploadedLogoUrl: string | null = null
    if (logo) {
      try {
        uploadedLogoUrl = await uploadLogoFile(logo, user.id)
      } catch (error) {
        console.error("Error uploading logo:", error)
        showToast({
          title: "Upload Failed",
          description: "Failed to upload logo.",
          variant: "destructive"
        });
        return;
      }
    }

    const { error } = await supabase
      .from("design_templates")
      .insert({
        user_id: user.id,
        template_name: newTemplateName,
        description: editedTemplateDescription, // Include description
        layout_config: layout,
        logo_url: uploadedLogoUrl,
      })

    if (error) {
      console.error("Error creating template:", error)
      showToast({
        title: "Template Creation Failed",
        description: "Failed to create template.",
        variant: "destructive"
      });
    } else {
      setNewTemplateName("")
      setEditedTemplateDescription("")
      setShowTemplateModal(false)
      await refreshTemplates()
      showToast({
        title: "Success",
        description: "Template created successfully.",
        variant: "success"
      });
    }
  }

  const handleUpdateTemplate = async () => {
    if (!user || !selectedTemplate) {
      alert("No template selected.")
      return
    }

    const layoutObj = {
      headerText,
      footerText,
      tableTheme,
      showBorders,
      autoFitColumns
    }
    const layout = JSON.stringify(layoutObj)

    let updatePayload: any = { layout_config: layout }

    if (editedTemplateName && editedTemplateName.trim().length > 0) {
      updatePayload.template_name = editedTemplateName;
    }
    updatePayload.description = editedTemplateDescription;

    if (logo) {
      try {
        const uploadedLogoUrl = await uploadLogoFile(logo, user.id)
        updatePayload.logo_url = uploadedLogoUrl
      } catch (error) {
        console.error("Error uploading logo:", error)
        alert("Failed to update logo.")
        return
      }
    }

    const { error } = await supabase
      .from("design_templates")
      .update(updatePayload)
      .eq("id", selectedTemplate)

    if (error) {
      console.error("Error updating template:", error)
      setToastMessage("Failed to update template.")
    } else {
      await refreshTemplates()
      setToastMessage("Template updated successfully.")
      setTimeout(() => setToastMessage(""), 3000)
      // Update original values to current for subsequent change detection
      setOriginalTemplate({
        template_name: editedTemplateName,
        description: editedTemplateDescription,
        headerText,
        footerText,
        tableTheme,
        showBorders,
        autoFitColumns,
      })
    }
  }

  // Add delete template function
  const handleDeleteTemplate = async (templateId: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this template?")) return;
    const { error } = await supabase.from("design_templates").delete().eq("id", templateId);
    if (error) {
      console.error("Error deleting template:", error);
      alert("Failed to delete template.");
    } else {
      if (selectedTemplate === templateId) {
        setSelectedTemplate("");
      }
      await refreshTemplates();
    }
  };

  // Compute a flag that determines if changes were made
  const isModified = isEditing && originalTemplate && (
    originalTemplate.template_name !== editedTemplateName ||
    originalTemplate.description !== editedTemplateDescription ||
    originalTemplate.headerText !== headerText ||
    originalTemplate.footerText !== footerText ||
    originalTemplate.tableTheme !== tableTheme ||
    originalTemplate.showBorders !== showBorders ||
    originalTemplate.autoFitColumns !== autoFitColumns
  );

  // Function to open the template modal
  const openTemplateModal = () => {
    setNewTemplateName("")
    setEditedTemplateDescription("")
    setShowTemplateModal(true)
  }

  // --- Excel Report Generation ---
  const generateReport = async () => {
    if (!previewTable) {
      showToast({
        title: "No data available",
        description: "Please upload a file to generate a report",
        variant: "destructive"
      })
      return
    }
    
    if (!user) {
      showToast({
        title: "Authentication Required", 
        description: "You must be logged in to generate reports.",
        variant: "destructive"
      })
      return
    }
    
    setCheckingLimit(true)
    const currentUsage = await fetchReportUsage()
    setCheckingLimit(false)
    
    if (currentUsage?.hasReachedLimit) {
      showToast({
        title: "Monthly Limit Reached",
        description: "You've reached your monthly report generation limit. Please upgrade to continue.",
        variant: "destructive"
      })
      return
    }
    
    try {
      setIsGeneratingReport(true)
      const startTime = Date.now()
      
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet("Report")
      let currentRow = 1
  
      if (logo) {
        const { width, height } = await getImageDimensions(logo)
        const arrayBuffer = await logo.arrayBuffer()
        
        // Fix the buffer creation to match ExcelJS requirements
        const buffer = Buffer.from(new Uint8Array(arrayBuffer))
        
        const ext = logo.name.split(".").pop()?.toLowerCase()
        const imageId = workbook.addImage({
          buffer: buffer,
          extension: ext === "png" ? "png" : "jpeg",
        })
        worksheet.addImage(imageId, {
          tl: { col: 0, row: 0 },
          ext: { width, height },
        })
        currentRow = Math.ceil(height / 20) + 1
      }
      else if (logoUrl) {
        // Optionally fetch the existing logo as a Blob and embed it
      }
  
      if (headerText) {
        const headerRow = worksheet.getRow(currentRow)
        headerRow.getCell(1).value = headerText
        headerRow.font = { bold: true, size: 16 }
        worksheet.mergeCells(currentRow, 1, currentRow, previewTable[0].length)
        currentRow += 2
      }
  
      {
        const headerRowData = previewTable[0] || []
        const dataRows = previewTable.slice(1)
  
        worksheet.addTable({
          name: "DataTable",
          ref: `A${currentRow}`,
          headerRow: true,
          style: {
            theme: tableTheme as "TableStyleMedium2",
            showRowStripes: true,
          },
          columns: headerRowData.map((col, i) => ({
            name: col || `Column ${i + 1}`,
          })),
          rows: dataRows,
        })
  
        if (showBorders) {
          const tableRowCount = previewTable.length
          const tableColumnCount = headerRowData.length
          for (let r = currentRow; r < currentRow + tableRowCount; r++) {
            const row = worksheet.getRow(r)
            for (let c = 1; c <= tableColumnCount; c++) {
              row.getCell(c).border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
              }
            }
          }
        }
  
        currentRow += previewTable.length + 2
  
        if (autoFitColumns) {
          const colCount = headerRowData.length
          const multiplier = 1.2
          for (let col = 0; col < colCount; col++) {
            let maxWidth = 0
            for (let r = 0; r < previewTable.length; r++) {
              const cellText = previewTable[r][col] ? String(previewTable[r][col]) : ""
              const lines = cellText.split("\n")
              for (const line of lines) {
                maxWidth = Math.max(maxWidth, line.length)
              }
            }
            worksheet.getColumn(col + 1).width = Math.ceil(maxWidth * multiplier) + 2
          }
        }
      }
  
      if (footerText) {
        const footerRow = worksheet.getRow(currentRow)
        footerRow.getCell(1).value = footerText
        footerRow.font = { italic: true, size: 12 }
        worksheet.mergeCells(currentRow, 1, currentRow, previewTable[0].length)
      }
  
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      
      // Create filename with date for better organization
      const date = new Date()
      const dateStr = date.toISOString().split('T')[0]
      const filename = `report_${dateStr}.xlsx`
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      window.URL.revokeObjectURL(url)
      
      // Record the report generation after successful download
      const generationTime = Date.now() - startTime
      
      // Determine which report ID to use - if working from a saved report
      // For now we'll pass null since we're just exporting from uploaded files
      const reportId = null 
      
      // Get file size in KB
      const fileSizeKB = Math.round(blob.size / 1024)
      
      // Record in database
      const { success, error } = await recordReportGeneration(
        user.id,
        reportId,
        'excel',
        {
          fileName: filename,
          fileSize: fileSizeKB,
          templateId: selectedTemplate || null,
          duration: generationTime,
          isScheduled: false
        }
      )
      
      if (!success) {
        console.error("Failed to record report generation:", error)
      } else {
        // Update local usage count
        setReportUsage(prev => ({
          ...prev,
          currentCount: prev.currentCount + 1,
          remaining: Math.max(0, prev.remaining - 1),
          hasReachedLimit: prev.limit !== Infinity && prev.remaining <= 1
        }))
      }
      
      showToast({
        title: "Report Generated",
        description: "Your Excel report has been downloaded successfully.",
        variant: "success"
      })
    } catch (error) {
      console.error("Error generating report:", error)
      showToast({
        title: "Generation Failed",
        description: "There was an error generating your report. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsGeneratingReport(false)
    }
  }

  // --- Loading Skeleton ---
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 py-6">
        {/* Header skeleton */}
        <div className="flex justify-between items-center">
          <UISkeleton className="h-8 w-1/3" />
          <UISkeleton className="h-8 w-20" />
        </div>
        {/* File Upload Card skeleton */}
        <div className="border-2 border-dashed rounded p-8">
          <UISkeleton className="h-12 w-12 mb-4" />
          <UISkeleton className="h-6 w-1/2 mb-2" />
          <UISkeleton className="h-4 w-full mb-2" />
        </div>
        {/* Branding Options skeleton */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border rounded p-6 space-y-3">
            <UISkeleton className="h-6 w-1/3" />
            <UISkeleton className="h-4 w-full" />
            <UISkeleton className="h-4 w-5/6" />
            <UISkeleton className="h-4 w-2/3" />
          </div>
          <div className="border rounded p-6">
            <UISkeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    )
  }

  // --- Main Render ---
  return (
    <>
      <div className={cn("max-w-6xl mx-auto space-y-8 py-6", { "filter blur-sm": showTemplatesDrawer || showTemplateModal })}>
        {/* Page Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Report Designer</h1>
            <p className="text-muted-foreground mt-1">Create professional-looking reports from your data</p>
          </div>
          <Button
            variant="outline"
            className="flex items-center space-x-2"
            onClick={() => setShowTemplatesDrawer(true)}
          >
            <Menu className="h-4 w-4" />
            <span>Manage Templates</span>
          </Button>
        </div>
        
        {/* Usage Alert for Free Tier Users */}
        {user && reportUsage.limit < Infinity && (
          <UsageLimitAlert 
            type="report-generation"
            currentUsage={reportUsage.currentCount}
            limit={reportUsage.limit}
            isLimitReached={reportUsage.hasReachedLimit}
          />
        )}

        {/* If no file is uploaded, show the empty state component */}
        {!file ? (
          <div>
            <EmptyState
              title="Upload Data File"
              description="Upload your XLSX or CSV file to create professional reports.\nSupports formatting, branding, and custom templates."
              icons={[FileSpreadsheet, Table, FileUp]}
              className="w-full max-w-6xl mx-auto"
              action={{
                label: "Choose File",
                onClick: () => document.getElementById("file-upload")?.click()
              }}
            />
            <Input
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={handleFileUpload}
              id="file-upload"
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* File info and actions bar */}
            <div className="flex justify-between items-center px-4 py-3 bg-muted/30 border rounded-lg">
              <div className="flex items-center space-x-3">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <span className="font-medium">{file.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                Change File
              </Button>
            </div>

            {/* Main design area - Two columns with visual consistency */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Data Preview Panel */}
              <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
                <div className="bg-muted/20 px-6 py-4 border-b">
                  <h2 className="text-xl font-semibold flex items-center">
                    <FileSpreadsheet className="h-5 w-5 mr-2 text-primary" />
                    Data Preview
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Preview how your data will appear in the report
                  </p>
                </div>
                <div className="p-6">
                  <div className="h-[350px] overflow-auto border rounded-lg bg-background">
                    {previewTable ? (
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-muted/50 text-left">
                            {previewTable[0]?.map((cell, j) => (
                              <th key={j} className="border p-2 font-medium">
                                {cell || `Column ${j + 1}`}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewTable.slice(1).map((row, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-muted/10' : ''}>
                              {row.map((cell, j) => (
                                <td key={j} className="border p-2">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">No preview available.</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 italic">
                    This is how your data will look in the generated report. The actual Excel styling will be applied during export.
                  </p>
                </div>
              </div>

              {/* Report Customization Options */}
              <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
                <div className="bg-muted/20 px-6 py-4 border-b">
                  <h2 className="text-xl font-semibold flex items-center">
                    <BarChart2 className="h-5 w-5 mr-2 text-primary" />
                    Report Options
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Customize the appearance and branding of your report
                  </p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Group 1: Branding Options */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                      Branding
                    </h3>
                    
                    {/* Logo Upload with preview */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Institution Logo
                      </label>
                      <div className="space-y-3">
                        <Input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                          id="logo-upload"
                        />
                        <Button asChild variant="outline" className="w-full">
                          <label htmlFor="logo-upload" className="flex items-center justify-center cursor-pointer">
                            <Image className="mr-2 h-4 w-4" /> Choose Logo
                          </label>
                        </Button>
                        
                        {logo && (
                          <div className="flex items-center p-3 bg-muted/30 rounded-md">
                            {logoStatus === "loading" ? (
                              <div className="flex items-center space-x-2">
                                <Loader2 className="animate-spin h-4 w-4" />
                                <span className="text-sm">Uploading {logo.name}...</span>
                              </div>
                            ) : logoStatus === "success" ? (
                              <div className="flex items-center space-x-2">
                                <Check className="text-green-500 h-4 w-4" />
                                <span className="text-sm">{logo.name} uploaded</span>
                              </div>
                            ) : null}
                          </div>
                        )}
                        
                        {logoUrl && !logo && (
                          <div className="flex items-center p-3 bg-muted/30 rounded-md">
                            <img
                              src={logoUrl}
                              alt="Template logo"
                              className="h-8 w-auto mr-3"
                            />
                            <span className="text-sm">Logo from template</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Header & Footer Text */}
                    <div className="grid grid-cols-1 gap-4 pt-2">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Header Text
                        </label>
                        <Input
                          placeholder="Enter header text"
                          value={headerText}
                          onChange={(e) => setHeaderText(e.target.value)}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Appears at the top of your report, often includes company name
                        </p>
                      </div>
                      <div>  {/* Fixed: This was an empty div followed by uncontained elements */}
                        <label className="block text-sm font-medium mb-2">
                          Footer Text
                        </label>
                        <Input
                          placeholder="Enter footer text"
                          value={footerText}
                          onChange={(e) => setFooterText(e.target.value)}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Appears at the bottom, often includes data source(s), disclaimers or contact info
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Group 2: Table Styling */}
                  <div className="space-y-4 pt-2 border-t">
                    <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground pt-3">
                      Table Styling
                    </h3>
                    
                    {/* Excel Table Theme */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Excel Table Theme
                      </label>
                      <select
                        value={tableTheme}
                        onChange={(e) => setTableTheme(e.target.value)}
                        className="w-full border rounded-md p-2 text-sm bg-background"
                      >
                        <option value="TableStyleLight1">Light - Minimal</option>
                        <option value="TableStyleLight2">Light - Crisp</option>
                        <option value="TableStyleMedium1">Medium - Standard</option>
                        <option value="TableStyleMedium2">Medium - Emphasized</option>
                        <option value="TableStyleDark1">Dark - Subtle</option>
                        <option value="TableStyleDark2">Dark - Bold</option>
                      </select>
                    </div>

                    {/* Table Options Checkboxes */}
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      <div className="bg-muted/20 p-3 rounded-md">
                        <label className="inline-flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showBorders}
                            onChange={(e) => setShowBorders(e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm font-medium">Show Table Borders</span>
                        </label>
                        <p className="text-xs text-muted-foreground mt-1 ml-5">
                          Add clear borders around cells
                        </p>
                      </div>
                      <div className="bg-muted/20 p-3 rounded-md">
                        <label className="inline-flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoFitColumns}
                            onChange={(e) => setAutoFitColumns(e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm font-medium">Auto-fit Columns</span>
                        </label>
                        <p className="text-xs text-muted-foreground mt-1 ml-5">
                          Adjust column width to content
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Generate Report Button */}
                  <div className="pt-6 border-t flex justify-between items-center">
                    {isDirty && (
                      <Button 
                        variant="outline"
                        onClick={openTemplateModal}
                        className="flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Save as Template
                      </Button>
                    )}
                    
                    <Button 
                      onClick={generateReport} 
                      className="bg-primary hover:bg-primary/90 text-white px-6"
                      size="lg"
                      disabled={isGeneratingReport || checkingLimit || reportUsage.hasReachedLimit}
                    >
                      {isGeneratingReport ? (
                        <>
                          <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-5 w-5" />
                          Generate Report
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* Free tier info text */}
                  {user && reportUsage.limit < Infinity && (
                    <p className="text-xs text-muted-foreground text-right">
                      {reportUsage.remaining} of {reportUsage.limit} report exports remaining this month
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Templates Drawer on right side with backdrop for blur effect - Improved for dark mode */}
      {showTemplatesDrawer && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/25 dark:bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => { setShowTemplatesDrawer(false); setIsEditing(false); }}
          ></div>
          <div 
            className="fixed top-0 right-0 bottom-0 z-50 w-[400px] bg-white dark:bg-slate-900 shadow-xl overflow-y-auto transition-transform"
            style={{ 
              boxShadow: "-4px 0 16px rgba(0, 0, 0, 0.1)"
            }}
          >
            {/* Sidebar Header with Close Button */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center space-x-3">
                <BarChart2 className="h-6 w-6 text-primary" />
                <span className="font-bold text-xl text-slate-800 dark:text-slate-100">Templates</span>
              </div>
              <button 
                onClick={() => setShowTemplatesDrawer(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* Saved Templates Section with improved styling */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-primary" />
                    Saved Templates
                  </h3>
                  {templates.length > 0 && (
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {templates.length} template{templates.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                
                {templates.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center">
                    <FileText className="h-10 w-10 mx-auto mb-2 text-slate-400 dark:text-slate-600" />
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      No templates found
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mb-4">
                      Create your first template by customizing a report
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setShowTemplatesDrawer(false);
                        openTemplateModal();
                      }}
                      className="mx-auto"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Create Template
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto max-h-[240px] pr-1">
                    {templates.map((tmpl) => (
                      <div
                        key={tmpl.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-md border transition-all",
                          selectedTemplate === tmpl.id 
                            ? "bg-primary/5 border-primary/20" 
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        <div 
                          className="flex-1 cursor-pointer" 
                          onClick={() => handleEditTemplate(tmpl.id)}
                        >
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {tmpl.template_name}
                          </div>
                          {tmpl.description && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                              {tmpl.description}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditTemplate(tmpl.id)}
                            className="h-8 w-8 text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary hover:bg-primary/10"
                            title="Edit Template"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteTemplate(tmpl.id)}
                            className="h-8 w-8 text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Delete Template"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Divider with visual indicator of state - Dark mode aware */}
              {isEditing ? (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-2 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900">
                      Editing Template
                    </span>
                  </div>
                </div>
              ) : (
                <hr className="border-slate-200 dark:border-slate-700" />
              )}

              {isEditing && selectedTemplate ? (
                <div className="space-y-5 animate-in fade-in slide-in-from-right duration-300">
                  {/* Template Info Section - With collapsible panels - Fixed dark mode */}
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center rounded-t-lg">
                      <FileText className="h-4 w-4 text-primary mr-2" />
                      <h3 className="font-medium text-slate-800 dark:text-slate-200">
                        Template Details
                      </h3>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="space-y-1.5">
                        <label htmlFor="template-name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Template Name
                        </label>
                        <Input
                          id="template-name"
                          type="text"
                          placeholder="What is this template for?"
                          value={editedTemplateName}
                          onChange={(e) => setEditedTemplateName(e.target.value)}
                          className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label htmlFor="template-description" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Description
                        </label>
                        <textarea
                          id="template-description"
                          placeholder="Provide a brief description for this template..."
                          value={editedTemplateDescription}
                          onChange={(e) => setEditedTemplateDescription(e.target.value)}
                          className="w-full p-3 border rounded-md resize-none bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                          rows={3}
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          This will help you identify the purpose of the template.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Design Settings Section - Fixed dark mode */}
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center rounded-t-lg">
                      <BarChart2 className="h-4 w-4 text-primary mr-2" />
                      <h3 className="font-medium text-slate-800 dark:text-slate-200">
                        Report Design
                      </h3>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="space-y-1.5">
                        <label htmlFor="header-text" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Header Text
                        </label>
                        <Input
                          id="header-text"
                          type="text"
                          placeholder="Enter header text"
                          value={headerText}
                          onChange={(e) => setHeaderText(e.target.value)}
                          className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Displayed at the top of the report
                        </p>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label htmlFor="footer-text" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Footer Text
                        </label>
                        <Input
                          id="footer-text"
                          type="text"
                          placeholder="Enter footer text"
                          value={footerText}
                          onChange={(e) => setFooterText(e.target.value)}
                          className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Displayed at the bottom of the report
                        </p>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label htmlFor="table-theme" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Excel Table Theme
                        </label>
                        <select
                          id="table-theme"
                          value={tableTheme}
                          onChange={(e) => setTableTheme(e.target.value)}
                          className="w-full p-2 border rounded-md bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                        >
                          <option value="TableStyleLight1">Light - Minimal</option>
                          <option value="TableStyleLight2">Light - Crisp</option>
                          <option value="TableStyleMedium1">Medium - Standard</option>
                          <option value="TableStyleMedium2">Medium - Emphasized</option>
                          <option value="TableStyleDark1">Dark - Subtle</option>
                          <option value="TableStyleDark2">Dark - Bold</option>
                        </select>
                      </div>
                      
                      <div className="space-y-3 pt-2">
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Table Options
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-start space-x-2 p-3 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <input
                              type="checkbox"
                              id="show-borders"
                              checked={showBorders}
                              onChange={(e) => setShowBorders(e.target.checked)}
                              className="rounded mt-0.5 border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:checked:bg-primary"
                            />
                            <div>
                              <label htmlFor="show-borders" className="text-sm font-medium cursor-pointer text-slate-800 dark:text-slate-200">
                                Show Borders
                              </label>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Add borders to all table cells
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-2 p-3 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <input
                              type="checkbox"
                              id="autofit"
                              checked={autoFitColumns}
                              onChange={(e) => setAutoFitColumns(e.target.checked)}
                              className="rounded mt-0.5 border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:checked:bg-primary"
                            />
                            <div>
                              <label htmlFor="autofit" className="text-sm font-medium cursor-pointer text-slate-800 dark:text-slate-200">
                                Auto-fit Columns
                              </label>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Adjust widths to content
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                    
                  {/* Action Buttons - Dark mode aware */}
                  <div className="flex justify-between items-center pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setSelectedTemplate("");
                      }}
                      className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUpdateTemplate}
                      disabled={!isModified}
                      className={cn(
                        "relative overflow-hidden",
                        isModified 
                          ? "bg-primary hover:bg-primary/90 text-white" 
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                      )}
                    >
                      {updateSuccess ? (
                        <>
                          <Check className="mr-2 h-4 w-4" /> Saved!
                        </>
                      ) : (
                        <>
                          <Edit2 className="mr-2 h-4 w-4" /> Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : !templates.length ? null : (
                <div className="text-center p-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                    <FileText className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                  </div>
                  <h4 className="text-slate-700 dark:text-slate-300 mb-1">Select a template to edit</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Choose a template from the list above to modify its settings
                  </p>
                </div>
              )}
            </div>

            {/* Toast Message - Dark mode aware */}
            {toastMessage && (
              <div className="fixed bottom-4 right-4 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 px-4 py-3 rounded-md shadow-lg flex items-center animate-in fade-in slide-in-from-bottom duration-300 z-50 border border-green-200 dark:border-green-900">
                <Check className="h-5 w-5 mr-2 text-green-500 dark:text-green-400" />
                <span>{toastMessage}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Template Creation Modal */}
      {showTemplateModal && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/25 dark:bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowTemplateModal(false)}
          ></div>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Save className="h-4 w-4 text-primary" />
                  <h3 className="font-medium text-slate-800 dark:text-slate-200">Save as Template</h3>
                </div>
                <button 
                  onClick={() => setShowTemplateModal(false)}
                  className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <X className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </button>
              </div>
              
              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="new-template-name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Template Name*
                  </label>
                  <Input
                    id="new-template-name"
                    type="text"
                    placeholder="Enter a name for this template"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700"
                    autoFocus
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="new-template-description" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Description (optional)
                  </label>
                  <textarea
                    id="new-template-description"
                    placeholder="What is this template for?"
                    value={editedTemplateDescription}
                    onChange={(e) => setEditedTemplateDescription(e.target.value)}
                    className="w-full p-3 border rounded-md resize-none bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    rows={3}
                  />
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md text-xs text-slate-500 dark:text-slate-400 flex items-start space-x-2 border border-slate-200 dark:border-slate-700">
                  <div className="text-primary mt-0.5">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    This template will save your current design settings, including header text, footer text, table theme, and other display options.
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                <Button
                  variant="outline"
                  onClick={() => setShowTemplateModal(false)}
                  className="border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateTemplate}
                  disabled={!newTemplateName.trim()}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  Save Template
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
