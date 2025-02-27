"use client"
import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, History } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ScriptVersion {
  id: string;
  script_id: string;
  version: string;
  description: string;
  sql_script: string;
  created_at: string;
}

interface VersionDropdownProps {
  versions: ScriptVersion[];
  onVersionSelect: (version: ScriptVersion) => void;
  currentVersion: string;
}

export const VersionDropdown: React.FC<VersionDropdownProps> = ({ versions, onVersionSelect, currentVersion }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center space-x-1 h-8 px-3 hover:bg-primary/10">
          <History className="h-4 w-4 mr-1" />
          <span className="font-medium">v{currentVersion}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={5} className="w-56 p-0">
        <DropdownMenuLabel className="font-semibold py-2 px-3 border-b">Version History</DropdownMenuLabel>
        <div className="max-h-[280px] overflow-y-auto py-1">
          {versions.length > 0 ? (
            versions.map((v) => (
              <DropdownMenuItem 
                key={v.id} 
                onClick={() => onVersionSelect(v)} 
                className={`px-3 py-2 cursor-pointer ${v.version === currentVersion ? 'bg-muted/50' : ''}`}
              >
                <div className="flex flex-col w-full">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">Version {v.version}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(v.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {v.description && (
                    <span className="text-xs text-muted-foreground mt-1 line-clamp-2">{v.description}</span>
                  )}
                </div>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground text-center">No versions available</div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
