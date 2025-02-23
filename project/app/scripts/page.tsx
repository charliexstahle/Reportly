"use client"
import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Plus, Tag, Clock, Copy, Moon, Sun, Code, FileText, History, Undo, Save, X } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

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
  // view: "list" | "new" | "editor"
  const [view, setView] = useState<"list" | "new" | "editor">("list")
  const [scripts, setScripts] = useState<any[]>([]);
  const [newScript, setNewScript] = useState({
    title: "",
    description: "",
    category: "",
    tags: "",
    content: "",
  })
  const [selectedScript, setSelectedScript] = useState<any>(null)
  const [darkTheme, setDarkTheme] = useState(false)

  // Add refs for both preview and editor
  const previewRef = useRef<HTMLPreElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  // Add new ref for line number container:
  const lineNumberRef = useRef<HTMLDivElement>(null);
  // In your component, add a new ref at the top:
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Updated scroll sync effect with better timing
  useEffect(() => {
    if (!editorRef.current || !previewRef.current) return;
    
    const editor = editorRef.current;
    const preview = previewRef.current;

    const syncScroll = () => {
      requestAnimationFrame(() => {
        preview.scrollTop = editor.scrollTop;
        preview.scrollLeft = editor.scrollLeft;
        lineNumberRef.current.scrollTop = editor.scrollTop; // Sync line numbers
      });
    };

    editor.addEventListener('scroll', syncScroll);
    editor.addEventListener('input', syncScroll);
    
    return () => {
      editor.removeEventListener('scroll', syncScroll);
      editor.removeEventListener('input', syncScroll);
    };
  }, []);

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

  // Define fetchScripts inside the component:
  const fetchScripts = async () => {
    const { data, error } = await supabase
      .from("script_library")
      .select("*")
    if (!error && data) {
      setScripts(data.map((row: any) => ({
        ...row,
        content: row.sql_script,                           // Map for editor usage
        updatedAt: new Date(row.updated_at).toLocaleDateString(), // Format for display
        category: row.categories?.[0] || "",                // Use first category if exists
        version: row.version ? parseInt(row.version) : 1      // Convert version to number
      })))
    }
  }

  // Update the useEffect to use fetchScripts:
  useEffect(() => {
    fetchScripts()
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading)
    return (
      <div className="max-w-6xl mx-auto space-y-8 py-8">
        {/* Header and Search bar skeleton */}
        <div className="flex flex-col space-y-4">
          <div className="h-8 bg-gray-300 rounded w-1/2"></div>
          <div className="h-10 bg-gray-300 rounded w-full"></div>
        </div>
        {/* Card list skeleton */}
        <div className="grid gap-4">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={idx} className="border border-gray-200 rounded p-4 animate-pulse">
              <div className="h-6 bg-gray-300 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-full mb-1"></div>
              <div className="h-4 bg-gray-300 rounded w-5/6 mb-1"></div>
              <div className="flex space-x-2 mt-2">
                <div className="h-4 bg-gray-300 rounded w-16"></div>
                <div className="h-4 bg-gray-300 rounded w-16"></div>
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

  // Replace handleScriptEditSave with Supabase update:
  const handleScriptEditSave = async () => {
    const newVersion = (parseInt(selectedScript.version) + 1).toString()
    const { error } = await supabase
      .from('script_library')
      .update({
        sql_script: selectedScript.content,
        version: newVersion,
      })
      .eq('id', selectedScript.id)
    if (error) {
      console.error("Error updating script", error)
    } else {
      await fetchScripts()
    }
    setView("list")
    setSelectedScript(null)
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
          <div className="flex items-center space-x-2 p-2 bg-muted/10 border-b rounded-t-lg">
            <Button variant="ghost" size="sm" onClick={handleFormat} className="hover:bg-primary/10">
              <Code className="mr-2 h-4 w-4" /> Format SQL
            </Button>
            <Button variant="ghost" size="sm" className="hover:bg-primary/10">
              <History className="mr-2 h-4 w-4" /> 
              Version History ({selectedScript.version})
            </Button>
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
                if(previewRef.current) previewRef.current.scrollTop = scrollTop;
                if(lineNumberRef.current) lineNumberRef.current.scrollTop = scrollTop;
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
                {selectedScript.content.split('\n').map((_, i) => (
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
                  onChange={(e) => setSelectedScript({ ...selectedScript, content: e.target.value })}
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

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 p-4 border-t">
            <Button variant="outline" onClick={() => { setView("list"); setSelectedScript(null) }}>
              Cancel
            </Button>
            <Button onClick={handleScriptEditSave} className="bg-primary hover:bg-primary/90">
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </div>
        </div>
      </div>
    )

  // Default "list" view
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold">Script Library</h1>
        <Button variant="primary" onClick={() => setView("new")}>
          <Plus className="mr-2 h-4 w-4 text-primary" /> New Script
        </Button>
      </div>
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input placeholder="Search scripts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Button variant="outline">Categories</Button>
        <Button variant="outline">Tags</Button>
      </div>
      <div className="grid gap-4">
        {scripts.filter(script => script.title.toLowerCase().includes(searchQuery.toLowerCase())).map((script) => (
          <Card
            key={script.id}
            className="border border-gray-200 hover:shadow-lg transition-shadow hover:scale-[1.01] cursor-pointer"
            onClick={() => { setSelectedScript({ ...script }); setView("editor") }}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-xl">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>{script.title}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(script.content);
                }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <p className="text-muted-foreground">{script.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Tag className="mr-2 h-4 w-4" />
                    {script.category}
                  </div>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    {script.updatedAt} (v{script.version})
                  </div>
                </div>
                <div className="flex gap-2">
                  {script.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}