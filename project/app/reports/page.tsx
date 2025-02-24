"use client"

import { cn } from "@/lib/utils"
import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FileUp, Download, Image, Loader2, Check, Menu } from "lucide-react"
import * as XLSX from "xlsx"
import ExcelJS from "exceljs"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/contexts/AuthContext"
import { Sidebar, SidebarBody } from "@/components/ui/sidebar"
import { Skeleton as UISkeleton } from "@/components/ui/skeleton"

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

  // --- Fetching Templates ---
  async function refreshTemplates() {
    if (!user) return
    const { data, error } = await supabase
      .from("design_templates")
      .select("id, template_name, layout_config, logo_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    if (error) {
      console.error("Error fetching templates:", error)
    } else {
      setTemplates(data || [])
    }
  }

  useEffect(() => {
    if (!user) {
      setIsLoading(false)
      return
    }
    refreshTemplates().finally(() => setIsLoading(false))
  }, [user])

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
  const handleCreateTemplate = async () => {
    if (!user) {
      alert("You must be logged in to create templates.")
      return
    }
    if (!newTemplateName.trim()) {
      alert("Please enter a template name.")
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

    let uploadedLogoUrl: string | null = null
    if (logo) {
      try {
        uploadedLogoUrl = await uploadLogoFile(logo, user.id)
      } catch (error) {
        console.error("Error uploading logo:", error)
        alert("Failed to upload logo.")
        return
      }
    }

    const { error } = await supabase
      .from("design_templates")
      .insert({
        user_id: user.id,
        template_name: newTemplateName,
        layout_config: layout,
        logo_url: uploadedLogoUrl,
      })

    if (error) {
      console.error("Error creating template:", error)
      alert("Failed to create template.")
    } else {
      setNewTemplateName("")
      await refreshTemplates()
      alert("Template created successfully.")
    }
  }

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId)
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
    } catch (err) {
      console.error("Error parsing layout config:", err)
      setHeaderText("")
      setFooterText("")
      setTableTheme("TableStyleMedium2")
      setShowBorders(false)
      setAutoFitColumns(false)
      setLogoUrl(null)
    }
  }

  const handleUpdateTemplate = async () => {
    if (!user) {
      alert("You must be logged in to update templates.")
      return
    }
    if (!selectedTemplate) {
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
      alert("Failed to update template.")
    } else {
      await refreshTemplates()
      alert("Template updated successfully.")
    }
  }

  // --- Excel Report Generation ---
  const generateReport = async () => {
    if (!previewTable) {
      alert("No data to generate report.")
      return
    }
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("Report")
    let currentRow = 1

    if (logo) {
      const { width, height } = await getImageDimensions(logo)
      const arrayBuffer = await logo.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
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
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "report.xlsx"
    a.click()
    window.URL.revokeObjectURL(url)
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
    <div className="max-w-6xl mx-auto space-y-6 py-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Report Designer</h1>
        <Button
          variant="outline"
          className="flex items-center space-x-2"
          onClick={() => setShowTemplatesDrawer(true)}
        >
          <Menu className="h-4 w-4" />
          <span>Manage Templates</span>
        </Button>
      </div>

      {/* If no file is uploaded, show the file upload card */}
      {!file ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileUp className="h-10 w-10 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Upload Data File</h2>
            <p className="text-muted-foreground mb-4 text-center max-w-md">
              Drag and drop your XLSX or CSV file here, or click to browse
            </p>
            <Input
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={handleFileUpload}
              id="file-upload"
            />
            <Button asChild>
              <label htmlFor="file-upload">Choose File</label>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Back button */}
          <div className="mb-4">
            <Button variant="outline" onClick={() => setFile(null)}>
              Back
            </Button>
          </div>

          <p className="mb-4 text-center text-sm text-muted-foreground">
            Uploaded file: {file.name}
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Data Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Data Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] overflow-auto border rounded-lg bg-muted/50 p-3">
                  {previewTable ? (
                    <table className="w-full text-sm border-collapse">
                      <tbody>
                        {previewTable.map((row, i) => (
                          <tr key={i}>
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
                    <p className="text-muted-foreground">No preview available.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Branding & Report Options */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Branding Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Institution Logo */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Institution Logo
                    </label>
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                      id="logo-upload"
                    />
                    <Button asChild variant="outline" className="w-full">
                      <label htmlFor="logo-upload" className="flex items-center justify-center">
                        <Image className="mr-2 h-4 w-4" /> Choose Logo
                      </label>
                    </Button>
                    {logo && (
                      <div className="mt-2 text-sm flex items-center space-x-2">
                        <span>{logo.name}</span>
                        {logoStatus === "loading" ? (
                          <Loader2 className="animate-spin h-4 w-4" />
                        ) : logoStatus === "success" ? (
                          <Check className="text-green-500 h-4 w-4" />
                        ) : null}
                      </div>
                    )}
                    {logoUrl && !logo && (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground mb-1">Stored Logo:</p>
                        <img
                          src={logoUrl}
                          alt="Template logo"
                          className="h-16 w-auto border rounded"
                        />
                      </div>
                    )}
                  </div>

                  {/* Excel Table Theme */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Excel Table Theme
                    </label>
                    <select
                      value={tableTheme}
                      onChange={(e) => setTableTheme(e.target.value)}
                      className="border rounded p-2 w-full"
                    >
                      <option value="TableStyleLight1">Light - Minimal</option>
                      <option value="TableStyleLight2">Light - Crisp</option>
                      <option value="TableStyleMedium1">Medium - Standard</option>
                      <option value="TableStyleMedium2">Medium - Emphasized</option>
                      <option value="TableStyleDark1">Dark - Subtle</option>
                      <option value="TableStyleDark2">Dark - Bold</option>
                    </select>
                  </div>

                  {/* Table Options */}
                  <div className="flex flex-wrap gap-3">
                    <label className="inline-flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={showBorders}
                        onChange={(e) => setShowBorders(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">Show Table Borders</span>
                    </label>
                    <label className="inline-flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={autoFitColumns}
                        onChange={(e) => setAutoFitColumns(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">Auto-fit Columns</span>
                    </label>
                  </div>

                  {/* Header & Footer Text */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Header Text
                    </label>
                    <Input
                      placeholder="Enter header text"
                      value={headerText}
                      onChange={(e) => setHeaderText(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Footer Text
                    </label>
                    <Input
                      placeholder="Enter footer text"
                      value={footerText}
                      onChange={(e) => setFooterText(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Generate Report Button */}
              <Button className="w-full" onClick={generateReport}>
                <Download className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Templates Drawer */}
      {showTemplatesDrawer && (
        <Sidebar open={showTemplatesDrawer} setOpen={setShowTemplatesDrawer}>
          <SidebarBody className="justify-between gap-10">
            <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
              <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200 mb-6">
                Templates
              </h2>
              <div className="space-y-4">
                {templates.length === 0 ? (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    No templates found. Create one below.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {templates.map((tmpl) => (
                      <div
                        key={tmpl.id}
                        className={cn(
                          "p-4 rounded-lg transition-colors cursor-pointer",
                          tmpl.id === selectedTemplate
                            ? "bg-neutral-800 dark:bg-neutral-700 text-white"
                            : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                        )}
                        onClick={() => handleSelectTemplate(tmpl.id)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{tmpl.template_name}</span>
                          <Check
                            className={cn(
                              "h-4 w-4 transition-opacity",
                              tmpl.id === selectedTemplate
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 mt-6">
              <div className="space-y-4">
                {selectedTemplate && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleUpdateTemplate}
                  >
                    Update Selected Template
                  </Button>
                )}

                <div className="space-y-2">
                  <Input
                    placeholder="New Template Name"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="bg-neutral-50 dark:bg-neutral-800"
                  />
                  <Button className="w-full" onClick={handleCreateTemplate}>
                    Save New Template
                  </Button>
                </div>
              </div>
            </div>
          </SidebarBody>
        </Sidebar>
      )}
    </div>
  )
}
