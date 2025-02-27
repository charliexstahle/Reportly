"use client"
import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Plus, Tag, Clock, Copy, Moon, Sun, Code, FileText, History, Undo, Save, X, ChevronDown, Check } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { Skeleton as UISkeleton } from "@/components/ui/skeleton"
import { VersionDropdown } from "@/components/VersionDropdown"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

interface ScriptVersion {
  id: string
  script_id: string
  version: string
  description: string
  sql_script: string
  created_at: string
}

// Add this helper function near the top of the file:
function highlightSQL(sql: string): string {
  let highlighted = sql
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const keywords = /\b(SELECT|FROM|WHERE|INSERT|INTO|UPDATE|DELETE|JOIN|ON|GROUP BY|ORDER BY|HAVING|AS|AND|OR|NOT|NULL)\b/gi;
  const functions = /\b(COUNT|SUM|AVG|MIN|MAX|NOW)\b/gi;
  highlighted = highlighted.replace(keywords, '<span class="dark:text-blue-400 text-blue-600 font-bold">$1</span>');
  highlighted = highlighted.replace(functions, '<span class="dark:text-purple-400 text-purple-600">$1</span>');
  return highlighted;
}

// Add this SQL formatting function near the top of the file, after highlightSQL:
function formatSQL(sql: string): string {
  // Remove extra whitespace and ensure single spaces
  let formatted = sql.trim().replace(/\s+/g, ' ');

  // Capitalize SQL keywords
  const keywords = [
    'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'UPDATE', 'DELETE',
    'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AS',
    'GROUP BY', 'ORDER BY', 'HAVING', 'AND', 'OR', 'NOT', 'NULL',
    'LIMIT', 'OFFSET', 'VALUES', 'CREATE', 'ALTER', 'DROP', 'TABLE'
  ];

  // Case-insensitive replacement of keywords
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    formatted = formatted.replace(regex, keyword);
  });

  // Add newlines after significant clauses
  const clauseKeywords = ['FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING'];
  clauseKeywords.forEach(keyword => {
    formatted = formatted.replace(new RegExp(`\\b${keyword}\\b`, 'g'), `\n${keyword}`);
  });

  // Ensure semicolon at the end
  if (!formatted.endsWith(';')) {
    formatted += ';';
  }

  return formatted;
}

export default function ScriptLibrary() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<"list" | "new" | "editor">("list")
  const [scripts, setScripts] = useState<any[]>([])
  const [newScript, setNewScript] = useState({
    title: "",
    description: "",
    category: "",
    tags: "",
    content: "",
  })
  const [selectedScript, setSelectedScript] = useState<any>(null)
  const [darkTheme, setDarkTheme] = useState(false)
  const [versionDescription, setVersionDescription] = useState("")
  const [showVersionDialog, setShowVersionDialog] = useState(false)

  // Add refs for both preview and editor
  const previewRef = useRef<HTMLPreElement>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const lineNumberRef = useRef<HTMLDivElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)

  // Add new state for version history
  const [versions, setVersions] = useState<ScriptVersion[]>([]);

  // Add a new state to track if we're updating an existing version or creating a new one
  const [saveMode, setSaveMode] = useState<"new" | "update">("new");

  // Add a title for dialog reference
  const dialogTitleRef = useRef<string>("Save New Version");

  // Add a new state to track if the content was modified
  const [contentModified, setContentModified] = useState(false);

  // Track the original version when loading a script
  const originalVersionRef = useRef<ScriptVersion | null>(null);

  // Add these states for managing tags and categories in the dialog
  const [dialogTags, setDialogTags] = useState<string[]>([]);
  const [dialogCategory, setDialogCategory] = useState("");
  const [showMetadataFields, setShowMetadataFields] = useState(false);

  // Add new state for filters
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Replace the fetchVersions function:
  const fetchVersions = async (scriptTitle: string) => {
    const { data, error } = await supabase
      .from("script_library")
      .select("*")
      .eq("title", scriptTitle)
      .order("version", { ascending: true }); // assumes version numbers are stored as strings
    console.log("fetchVersions result for", scriptTitle, data, error);
    if (error) {
      console.error("Error fetching versions", error);
      return;
    }
    if (data && data.length > 0) {
      setVersions(data as ScriptVersion[]);
    } else {
      console.log("No versions found for script", scriptTitle);
      setVersions([]);
    }
  };

  // Updated scroll sync effect with better timing
  useEffect(() => {
    if (!editorRef.current || !previewRef.current || !lineNumberRef.current) return

    const editor = editorRef.current
    const preview = previewRef.current
    const lineNumbers = lineNumberRef.current

    const syncScroll = () => {
      requestAnimationFrame(() => {
        preview.scrollTop = editor.scrollTop
        preview.scrollLeft = editor.scrollLeft
        lineNumbers.scrollTop = editor.scrollTop
      })
    }

    editor.addEventListener('scroll', syncScroll)
    editor.addEventListener('input', syncScroll)

    return () => {
      editor.removeEventListener('scroll', syncScroll)
      editor.removeEventListener('input', syncScroll)
    }
  }, [])

  // Simplified auto-scroll logic
  useEffect(() => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const isAtBottom = editor.scrollHeight - editor.scrollTop === editor.clientHeight;

    if (isAtBottom) {
      setTimeout(() => {
        editor.scrollTop = editor.scrollHeight;
      }, 50);
    }
  }, [selectedScript?.content]);

  // Add a function to extract unique categories and tags from scripts
  const extractMetadata = (scripts: any[]) => {
    const categories = new Set<string>();
    const tags = new Set<string>();
    
    scripts.forEach(script => {
      if (script.category) {
        categories.add(script.category);
      }
      
      if (script.tags && Array.isArray(script.tags)) {
        script.tags.forEach((tag: string) => {
          if (tag) tags.add(tag);
        });
      }
    });
    
    setAvailableCategories(Array.from(categories).sort());
    setAvailableTags(Array.from(tags).sort());
  };

  // Update fetchScripts to extract metadata after processing
  const fetchScripts = async () => {
    console.log('Fetching scripts...');
    const { data, error } = await supabase
      .from("script_library")
      .select("*")
      .order('updated_at', { ascending: false });

    console.log('Fetched data:', data);
    console.log('Error if any:', error);

    if (error) {
      console.error("Error fetching scripts:", error);
      return;
    }

    if (!data) {
      console.log("No data returned");
      return;
    }

    // Group scripts by title to find latest versions and count total versions
    const scriptsByTitle = new Map();
    const versionCountByTitle = new Map();
    
    // First pass: count versions for each title
    data.forEach((script) => {
      const title = script.title;
      versionCountByTitle.set(title, (versionCountByTitle.get(title) || 0) + 1);
      
      // Keep track of the highest version for each title
      if (!scriptsByTitle.has(title) || 
          parseInt(script.version) > parseInt(scriptsByTitle.get(title).version)) {
        scriptsByTitle.set(title, script);
      }
    });
    
    // Second pass: create processed scripts with only the latest version of each
    const processedScripts = Array.from(scriptsByTitle.values()).map((row: any) => ({
      ...row,
      content: row.sql_script, // use sql_script field
      updatedAt: new Date(row.updated_at).toLocaleDateString(),
      category: row.categories?.[0] || "",
      version: row.version || "1",
      tags: row.tags || [],
      versionCount: versionCountByTitle.get(row.title) || 1 // Add version count
    }));

    console.log('Processed scripts:', processedScripts);
    setScripts(processedScripts);
    setIsLoading(false);
    
    // Extract metadata for filters
    extractMetadata(processedScripts);
  };

  // Add a function to clear all filters
  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedTags([]);
  };

  // Toggle a tag in the filter
  const toggleTagFilter = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  };

  // Function to check if a script matches the active filters
  const matchesFilters = (script: any) => {
    // Match category filter
    if (selectedCategory && script.category !== selectedCategory) {
      return false;
    }
    
    // Match tags filter - script must include ALL selected tags
    if (selectedTags.length > 0) {
      return selectedTags.every(tag => script.tags.includes(tag));
    }
    
    return true;
  };

  // Replace the existing useEffect
  useEffect(() => {
    const loadScripts = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user);
      if (user) {
        await fetchScripts();
      }
    };
    
    loadScripts();
  }, []); // Only run on mount

  if (isLoading)
    return (
      <div className="max-w-6xl mx-auto space-y-8 py-8">
        {/* Page Header Skeleton */}
        <div className="border-b pb-6">
          <UISkeleton className="h-10 w-1/3" />
          <UISkeleton className="h-6 w-1/2 mt-2" />
        </div>

        {/* Search & Filter Group Skeleton */}
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <UISkeleton className="h-10 w-full md:w-2/3" />
            <UISkeleton className="h-10 w-32" />
          </div>
          
          {/* Filter Section Skeleton */}
          <div className="bg-gray-50/80 dark:bg-gray-800/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex gap-4 items-center">
              <UISkeleton className="h-8 w-24" />
              <UISkeleton className="h-8 w-28" />
              <UISkeleton className="h-8 w-28" />
            </div>
          </div>
        </div>

        {/* Script Cards Skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="border rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <UISkeleton className="h-10 w-10 rounded-lg" />
                  <UISkeleton className="h-6 w-48" />
                </div>
                <UISkeleton className="h-8 w-8 rounded-full" />
              </div>
              <UISkeleton className="h-4 w-full" />
              <div className="flex flex-wrap items-center justify-between gap-y-3">
                <div className="flex items-center gap-3">
                  <UISkeleton className="h-6 w-24 rounded-full" />
                  <UISkeleton className="h-6 w-32 rounded-full" />
                  <UISkeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="flex gap-2">
                  <UISkeleton className="h-6 w-16 rounded-full" />
                  <UISkeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )

  // Replace handleNewScriptSubmit:
  const handleNewScriptSubmit = async () => {
    // Retrieve current user info from Supabase auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No authenticated user found");
      return;
    }

    const newRecord = {
      user_id: user.id, // Include user_id to satisfy NOT NULL constraint
      title: newScript.title,
      description: newScript.description,
      sql_script: newScript.content,
      categories: [newScript.category],
      tags: newScript.tags.split(",").map(t => t.trim()),
      version: "1"  // Insert version as a string
    }
    const { error } = await supabase
      .from('script_library')
      .insert([newRecord])
    if (error) {
      console.error("Error inserting script", error)
    } else {
      await fetchScripts()
    }
    setNewScript({ title: "", description: "", category: "", tags: "", content: "" })
    setView("list")
  }

  // Update the handleScriptEditSave to set better context for description-only updates
  const handleScriptEditSave = async () => {
    if (!selectedScript || !originalVersionRef.current) return;

    // Check if content was modified from the original selected version
    const contentChanged = originalVersionRef.current.sql_script !== selectedScript.content;
    setContentModified(contentChanged);
    
    // Initialize with current description, tags, and category
    setVersionDescription(selectedScript.description || "");
    setDialogTags(selectedScript.tags || []);
    setDialogCategory(selectedScript.category || "");
    setShowMetadataFields(false); // Start with metadata fields hidden
    
    // Set appropriate save mode and dialog title
    if (contentChanged) {
      setSaveMode("new");
    } else {
      setSaveMode("update");
    }
    
    setShowVersionDialog(true);
  }

  // Update handleVersionSave to handle both update and new version cases
  const handleVersionSave = async () => {
    if (!selectedScript) return;

    // For either mode, require a description
    if (!versionDescription) return;

    if (saveMode === "new") {
      // Create a new version with incremented version number
      const newVersion = (parseInt(selectedScript.version) + 1).toString();

      const { error: updateError } = await supabase
        .from("script_library")
        .insert([{
          user_id: selectedScript.user_id,
          title: selectedScript.title,
          description: versionDescription,
          sql_script: selectedScript.content,
          categories: [dialogCategory], // Update to use the dialog category
          tags: dialogTags, // Update to use the dialog tags
          version: newVersion,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (!updateError) {
        await fetchScripts();
        await fetchVersions(selectedScript.title);
        setVersionDescription("");
        setShowVersionDialog(false);
        setView("list");
        setSelectedScript(null);
      } else {
        console.error("Error creating new version:", updateError);
      }
    } else {
      // Update both SQL and description of the current version
      const { error: updateError } = await supabase
        .from("script_library")
        .update({
          sql_script: selectedScript.content,
          description: versionDescription,
          categories: [dialogCategory], // Update to use the dialog category
          tags: dialogTags, // Update to use the dialog tags
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedScript.id);

      if (!updateError) {
        await fetchScripts();
        await fetchVersions(selectedScript.title);
        setVersionDescription("");
        setShowVersionDialog(false);
        setView("list");
        setSelectedScript(null);
      } else {
        console.error("Error updating version description:", updateError);
      }
    }
  }

  // Add format handler
  const handleFormat = () => {
    if (selectedScript) {
      setSelectedScript({
        ...selectedScript,
        content: formatSQL(selectedScript.content)
      });
    }
  };

  // Add version restore handler
  const handleVersionRestore = async (version: ScriptVersion) => {
    if (selectedScript) {
      setSelectedScript({
        ...selectedScript,
        content: version.sql_script,
        version: version.version,
        description: version.description
      });
      // Update the original version reference when switching versions
      originalVersionRef.current = version;
      // Initialize the description field with the current description
      setVersionDescription(version.description);
    }
  }

  // Helper function to add a new tag
  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !dialogTags.includes(trimmedTag)) {
      setDialogTags([...dialogTags, trimmedTag]);
    }
  }

  // Helper function to remove a tag
  const removeTag = (tagToRemove: string) => {
    setDialogTags(dialogTags.filter(tag => tag !== tagToRemove));
  }

  // Full-screen New Script view
  if (view === "new")
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">New Script</h1>
          <Button variant="outline" onClick={() => setView("list")}>
            Back
          </Button>
        </div>
        <div className="space-y-4">
          <Input placeholder="Title" value={newScript.title} onChange={(e) => setNewScript({ ...newScript, title: e.target.value })} />
          <Input placeholder="Description" value={newScript.description} onChange={(e) => setNewScript({ ...newScript, description: e.target.value })} />
          <Input placeholder="Category" value={newScript.category} onChange={(e) => setNewScript({ ...newScript, category: e.target.value })} />
          <Input placeholder="Tags (comma separated)" value={newScript.tags} onChange={(e) => setNewScript({ ...newScript, tags: e.target.value })} />
          <textarea placeholder="SQL Content" className="w-full border rounded p-2 h-64 font-mono" value={newScript.content} onChange={(e) => setNewScript({ ...newScript, content: e.target.value })} />
          <div className="flex space-x-2">
            <Button onClick={handleNewScriptSubmit}>Save Script</Button>
            <Button variant="outline" onClick={() => setView("list")}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )

  // Update SQL Editor view with precise height calculations
  if (view === "editor" && selectedScript)
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">SQL Editor</h1>
            <p className="text-sm text-muted-foreground">
              {selectedScript.title} (v{selectedScript.version})
              <span className="mx-2">•</span>
              Last updated: {selectedScript.updatedAt}
            </p>
          </div>
        </div>

        {/* Editor Container */}
        <div className="rounded-lg border shadow-sm">
          {/* Toolbar */}
          <div className="flex items-center gap-2 p-2 bg-muted/10 border-b rounded-t-lg">
            <Button variant="ghost" size="sm" onClick={handleFormat} className="hover:bg-primary/10">
              <Code className="mr-2 h-4 w-4" /> Format SQL
            </Button>
            <VersionDropdown 
              versions={versions}
              onVersionSelect={handleVersionRestore}
              currentVersion={selectedScript.version}
            />
            <div className="flex-1" />
            <Button variant="ghost" size="sm" className="hover:bg-primary/10">
              <Undo className="mr-2 h-4 w-4" /> Undo Changes
            </Button>
          </div>

          {/* Query Tab */}
          <div className="flex items-center px-4 border-b bg-muted/5">
            <div className="py-2 px-4 border-b-2 border-primary font-medium text-primary">
              Query 1
            </div>
          </div>

          {/* Editor Area - Revised container */}
          <div className="h-[calc(100vh-450px)] relative border rounded-none overflow-hidden">
            <div
              className="flex h-full overflow-auto"
              ref={editorContainerRef}
              onScroll={() => {
                const scrollTop = editorContainerRef.current?.scrollTop || 0;
                if (previewRef.current) previewRef.current.scrollTop = scrollTop;
                if (lineNumberRef.current) lineNumberRef.current.scrollTop = scrollTop;
              }}
            >
              {/* Line Numbers */}
              <div
                className="w-10 bg-muted/30 text-muted-foreground dark:text-gray-400 select-none text-right py-4 pr-2"
                ref={lineNumberRef}
                style={{
                  fontSize: "15px",
                  lineHeight: "1.75rem",
                  fontFamily: "monospace"
                }}
              >
                {selectedScript.content.split('\n').map((line: string, i: number) => (
                  <div key={i} style={{ height: "1.75rem", lineHeight: "1.75rem" }}>
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Editor Content */}
              <div className="flex-1 relative">
                {/* Syntax highlighting layer */}
                <pre
                  ref={previewRef}
                  className="absolute inset-0 pointer-events-none font-mono"
                  style={{
                    padding: "1rem",
                    boxSizing: "border-box",
                    margin: 0,
                    fontSize: "15px",
                    lineHeight: "1.75rem",
                    tabSize: 4,
                    whiteSpace: "pre-wrap",
                    fontFamily: "monospace",
                    color: "transparent",
                    backgroundColor: "transparent"
                  }}
                  dangerouslySetInnerHTML={{ __html: highlightSQL(selectedScript.content) }}
                />

                {/* Text editor */}
                <textarea
                  ref={editorRef}
                  spellCheck={false}
                  className="absolute inset-0 w-full h-full resize-none font-mono focus:outline-none bg-transparent text-black dark:text-white rounded-none"
                  value={selectedScript.content}
                  onChange={(e) => {
                    setSelectedScript({ ...selectedScript, content: e.target.value });
                    // Check if content changed from original
                    if (originalVersionRef.current) {
                      setContentModified(originalVersionRef.current.sql_script !== e.target.value);
                    }
                  }}
                  style={{
                    padding: "1rem",
                    boxSizing: "border-box",
                    margin: 0,
                    caretColor: "currentColor",
                    fontSize: "15px",
                    lineHeight: "1.75rem",
                    tabSize: 4,
                    whiteSpace: "pre-wrap",
                    fontFamily: "monospace"
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons - Remove the version description input */}
          <div className="flex items-center justify-end space-x-3 p-4 border-t">
            <Button variant="outline" onClick={() => { setView("list"); setSelectedScript(null) }}>
              Cancel
            </Button>
            <Button onClick={handleScriptEditSave} className="bg-primary hover:bg-primary/90">
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </div>
        </div>

        {/* Completely redesigned AlertDialog with improved UI/UX */}
        <AlertDialog 
          open={showVersionDialog} 
          onOpenChange={(open) => {
            if (!open) setShowVersionDialog(false);
          }}
        >
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl">
                {contentModified 
                  ? "Save SQL Changes" 
                  : "Update Version Details"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground">
                {contentModified 
                  ? "Choose how you want to save your changes to this query." 
                  : "Your SQL code hasn't changed. You can update the metadata for this version."}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="py-4 space-y-6">
              {/* Version Description - Always visible */}
              <div className="space-y-2">
                <label htmlFor="version-description" className="text-sm font-medium block">
                  {contentModified 
                    ? "Version Description" 
                    : "Description"}
                </label>
                <Input
                  id="version-description"
                  placeholder={contentModified 
                    ? "Add a short note about your changes..." 
                    : "Add a clearer description for this version..."}
                  value={versionDescription}
                  onChange={(e) => setVersionDescription(e.target.value)}
                  className="w-full"
                  autoFocus // Auto-focus for accessibility
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {contentModified 
                    ? "This helps you and others understand what changed in this version." 
                    : "A good description helps clarify the purpose and contents of this query."}
                </p>
              </div>

              {/* Expandable section for metadata */}
              <div className="rounded-md border p-4">
                <button 
                  type="button" 
                  onClick={() => setShowMetadataFields(!showMetadataFields)}
                  className="flex justify-between w-full text-left font-medium text-sm"
                >
                  <span>Metadata Options</span>
                  <span className="transition-transform duration-200" style={{ transform: showMetadataFields ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <ChevronDown className="h-4 w-4" />
                  </span>
                </button>

                {showMetadataFields && (
                  <div className="mt-4 space-y-4">
                    {/* Category field */}
                    <div className="space-y-2">
                      <label htmlFor="category" className="text-sm font-medium block">
                        Category
                      </label>
                      <Input
                        id="category"
                        placeholder="Enter a category"
                        value={dialogCategory}
                        onChange={(e) => setDialogCategory(e.target.value)}
                        className="w-full"
                      />
                    </div>

                    {/* Tags field */}
                    <div className="space-y-2">
                      <label htmlFor="tags" className="text-sm font-medium block">
                        Tags
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {dialogTags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium flex items-center"
                          >
                            {tag}
                            <button 
                              type="button" 
                              onClick={() => removeTag(tag)}
                              className="ml-1 text-primary hover:text-primary/80"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          id="tags"
                          placeholder="Add a new tag"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addTag((e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }}
                          className="flex-1"
                        />
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="outline" 
                          onClick={(e) => {
                            const input = document.getElementById('tags') as HTMLInputElement;
                            addTag(input.value);
                            input.value = '';
                          }}
                        >
                          Add
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Press Enter after typing to add a tag, or click the Add button.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Save Options - Only show when content modified */}
              {contentModified && (
                <div className="space-y-3 rounded-md border p-4 bg-muted/5">
                  <label className="text-sm font-medium block">
                    How do you want to save these changes?
                  </label>
                  
                  <div className="space-y-3 mt-2">
                    {/* New Version Option */}
                    <div 
                      className={`flex items-start space-x-3 p-3 rounded-md cursor-pointer transition-colors ${
                        saveMode === "new" 
                          ? "bg-primary/10 border border-primary/20" 
                          : "hover:bg-muted/40"
                      }`}
                      onClick={() => {
                        setSaveMode("new");
                        dialogTitleRef.current = "Save As New Version";
                      }}
                    >
                      <div className={`w-4 h-4 mt-0.5 rounded-full border ${
                        saveMode === "new" 
                          ? "border-primary bg-primary" 
                          : "border-muted-foreground"
                      }`}>
                        {saveMode === "new" && (
                          <div className="w-2 h-2 mx-auto mt-0.5 rounded-full bg-white"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">Create New Version</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Preserves the original version and creates a new version number.
                          Best for significant changes or when you want to keep history.
                        </p>
                      </div>
                    </div>
                    
                    {/* Update Current Option */}
                    <div 
                      className={`flex items-start space-x-3 p-3 rounded-md cursor-pointer transition-colors ${
                        saveMode === "update" 
                          ? "bg-primary/10 border border-primary/20" 
                          : "hover:bg-muted/40"
                      }`}
                      onClick={() => {
                        setSaveMode("update");
                        dialogTitleRef.current = "Update Existing Version";
                      }}
                    >
                      <div className={`w-4 h-4 mt-0.5 rounded-full border ${
                        saveMode === "update" 
                          ? "border-primary bg-primary" 
                          : "border-muted-foreground"
                      }`}>
                        {saveMode === "update" && (
                          <div className="w-2 h-2 mx-auto mt-0.5 rounded-full bg-white"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">Update Current Version</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Overwrites the existing version ({selectedScript?.version}) with these changes.
                          Best for minor edits or description updates.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* When SQL hasn't changed, show a clear explanation */}
              {!contentModified && (
                <div className="rounded-md border p-4 bg-blue-50 dark:bg-blue-950/20">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        You're updating the description without changing the SQL code. 
                        This won't create a new version but will update the metadata for version {selectedScript?.version}.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel 
                className="text-sm font-normal" 
                onClick={() => setShowVersionDialog(false)}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleVersionSave}
                disabled={!versionDescription}
                className="bg-primary text-white hover:bg-primary/90"
              >
                {contentModified 
                  ? (saveMode === "new" ? "Create New Version" : "Update Version") 
                  : "Save Changes"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )

  // Default "list" view
  return (
    <div className="max-w-6xl mx-auto space-y-8 py-8">
      {/* Enhanced Page Header - Improved hierarchy with subheading */}
      <div className="border-b pb-6">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Script Library</h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          Manage and discover all your SQL scripts in one place
        </p>
      </div>
      
      {/* Enhanced Search & Filter Group - Improved visual grouping */}
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative flex-1 w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 h-4 w-4" />
              <Input 
                placeholder="Search scripts by title, tags, or description..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="pl-10 border-gray-300 dark:border-gray-600 transition-all focus:border-primary focus:ring-1 focus:ring-primary rounded-md w-full"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setView("new")} 
              className="bg-primary text-white hover:bg-primary/90 transition-all shadow-sm px-5 py-2 rounded-md flex items-center"
            >
              <Plus className="mr-2 h-4 w-4" /> 
              <span>New Script</span>
            </Button>
          </div>
        </div>

        {/* Filter Section - Now visually separated */}
        <div className="bg-gray-50/80 dark:bg-gray-800/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Filter by:</div>
            
            {/* Categories Dropdown - Enhanced with consistent styling */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant={selectedCategory ? "default" : "outline"} 
                  className={`border-gray-300 dark:border-gray-600 ${selectedCategory ? 'bg-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} 
                  transition-all flex justify-between min-w-[120px] rounded-md text-sm`}
                  size="sm"
                >
                  <div className="flex items-center">
                    <Tag className="mr-2 h-3.5 w-3.5" /> 
                    {selectedCategory ? 'Category: ' + selectedCategory : 'Categories'}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 ml-2 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-md border border-gray-200 dark:border-gray-700 shadow-md">
                <DropdownMenuItem 
                  onClick={() => setSelectedCategory(null)}
                  className="flex items-center justify-between"
                >
                  <span>All Categories</span>
                  {!selectedCategory && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {availableCategories.length > 0 ? (
                  availableCategories.map(category => (
                    <DropdownMenuItem 
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className="flex items-center justify-between"
                    >
                      <span>{category}</span>
                      {selectedCategory === category && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>No categories found</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Tags Dropdown - Enhanced with consistent styling */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant={selectedTags.length > 0 ? "default" : "outline"} 
                  className={`border-gray-300 dark:border-gray-600 ${selectedTags.length > 0 ? 'bg-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} 
                  transition-all flex justify-between min-w-[120px] rounded-md text-sm`}
                  size="sm"
                >
                  <div className="flex items-center">
                    <Tag className="mr-2 h-3.5 w-3.5" /> 
                    {selectedTags.length > 0 ? `Tags (${selectedTags.length})` : 'Tags'}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 ml-2 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-md border border-gray-200 dark:border-gray-700 shadow-md">
                {availableTags.length > 0 ? (
                  <>
                    {availableTags.map(tag => (
                      <DropdownMenuCheckboxItem
                        key={tag}
                        checked={selectedTags.includes(tag)}
                        onCheckedChange={() => toggleTagFilter(tag)}
                      >
                        {tag}
                      </DropdownMenuCheckboxItem>
                    ))}
                    {selectedTags.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setSelectedTags([])}
                          className="text-red-600 dark:text-red-400"
                        >
                          Clear tag filters
                        </DropdownMenuItem>
                      </>
                    )}
                  </>
                ) : (
                  <DropdownMenuItem disabled>No tags found</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Clear Filters Button - Now more cohesive with overall design */}
            {(selectedCategory || selectedTags.length > 0) && (
              <Button 
                variant="ghost" 
                onClick={clearFilters}
                size="sm"
                className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md text-sm"
              >
                <X className="mr-2 h-3.5 w-3.5" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Active filters display - Enhanced with consistent badge styling */}
          {(selectedCategory || selectedTags.length > 0) && (
            <div className="flex flex-wrap gap-2 mt-4 items-center pt-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">Active filters:</span>
              {selectedCategory && (
                <Badge 
                  className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 cursor-pointer rounded-full px-3 py-1 text-xs"
                  onClick={() => setSelectedCategory(null)}
                >
                  Category: {selectedCategory} <X className="ml-1 h-3 w-3" />
                </Badge>
              )}
              {selectedTags.map(tag => (
                <Badge 
                  key={tag}
                  className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 cursor-pointer rounded-full px-3 py-1 text-xs"
                  onClick={() => toggleTagFilter(tag)}
                >
                  Tag: {tag} <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Enhanced Script Cards Section */}
      <div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {scripts.filter(script => 
            script.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
            matchesFilters(script)
          ).length} scripts found
        </div>
        
        {/* Enhanced Script Cards - Better spacing, typography, and interactions */}
        <div className="space-y-4">
          {scripts
            .filter(script => script.title.toLowerCase().includes(searchQuery.toLowerCase()))
            .filter(matchesFilters)
            .map((script) => (
            <Card
              key={script.id}
              className="border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 
                       hover:border-primary/30 dark:hover:border-primary/30 bg-white dark:bg-gray-800/50
                       hover:bg-gray-50 dark:hover:bg-gray-800/90 cursor-pointer 
                       transform hover:-translate-y-0.5 rounded-lg overflow-hidden"
              onClick={async () => { 
                setSelectedScript({ ...script }); 
                await fetchVersions(script.title);
                // Store the original version for comparison
                originalVersionRef.current = {
                  id: script.id,
                  script_id: script.id,
                  version: script.version,
                  description: script.description,
                  sql_script: script.sql_script,
                  created_at: script.created_at
                };
                setView("editor");
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-lg">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-xl font-semibold text-gray-900 dark:text-gray-50">{script.title}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(script.content);
                      }}
                    >
                      <Copy className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="sr-only">Copy script</span>
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="pt-0 pb-4 space-y-4">
                <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
                  {script.description || "No description provided."}
                </p>
                
                <div className="flex flex-wrap items-center gap-y-3 justify-between">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    {script.category && (
                      <div className="flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1">
                        <Tag className="mr-2 h-3.5 w-3.5" />
                        {script.category}
                      </div>
                    )}
                    <div className="flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1">
                      <Clock className="mr-2 h-3.5 w-3.5" />
                      {script.updatedAt}
                    </div>
                    <div className="group relative flex items-center rounded-full bg-primary/10 dark:bg-primary/20 px-3 py-1">
                      <span className="text-primary font-medium">v{script.version}</span>
                      {script.versionCount > 1 && (
                        <>
                          <span className="ml-1 text-primary/70 text-xs"> 
                            ({script.versionCount} {script.versionCount === 1 ? 'version' : 'versions'})
                          </span>
                          <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                            View all versions in editor
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {script.tags && script.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {script.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 
                                  rounded-full text-xs font-medium border border-blue-100 dark:border-blue-800/30"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Enhanced Empty State - Fixed structure */}
          {scripts.filter(script => 
            script.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
            matchesFilters(script)
          ).length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                <FileText className="h-7 w-7 text-gray-500 dark:text-gray-400" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-gray-50">No scripts found</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                {searchQuery || selectedCategory || selectedTags.length > 0 ? 
                  "No scripts match your current filters. Try adjusting your search terms or filters." : 
                  "Create your first script to get started with your SQL library."
                }
              </p>
              <div className="mt-6">
                {(searchQuery || selectedCategory || selectedTags.length > 0) ? (
                  <Button onClick={clearFilters} className="bg-primary text-white hover:bg-primary/90 shadow-sm">
                    Clear Filters
                  </Button>
                ) : (
                  <Button onClick={() => setView("new")} className="bg-primary text-white hover:bg-primary/90 shadow-sm">
                    <Plus className="mr-2 h-4 w-4" /> Create New Script
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {/* Enhanced Loading State for Pagination */}
          {scripts.length > 0 && scripts.length % 10 === 0 && (
            <div className="flex justify-center py-6">
              <Button 
                variant="outline" 
                className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Load more scripts
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}