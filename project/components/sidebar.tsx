// filepath: c:\Users\charl\Reportly\project\components\sidebar.tsx
"use client"

import React from "react";
import { X } from "lucide-react";
import { Sidebar as ShadcnSidebar, SidebarHeader, SidebarContent } from "./ui/sidebar";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function Sidebar({ isOpen, onClose, title = "Sidebar", children }: SidebarProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <div className="relative ml-auto h-full" style={{ width: "16rem" }}>
        <ShadcnSidebar className="h-full bg-gray-800 text-white shadow-lg">
          <SidebarHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{title}</h2>
              <button onClick={onClose} aria-label="Close sidebar" className="p-1 rounded hover:bg-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
          </SidebarHeader>
          <SidebarContent>
            {children}
          </SidebarContent>
        </ShadcnSidebar>
      </div>
    </div>
  );
}
