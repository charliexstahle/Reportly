// filepath: c:\Users\charl\Reportly\project\components\sidebar.tsx

"use client"

import React from "react";
import { X } from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function Sidebar({
  isOpen,
  onClose,
  title = "Sidebar",
  children,
}: SidebarProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Sidebar Container */}
      <div className="relative ml-auto h-full w-64">
        <div className="flex flex-col h-full bg-gray-900 text-white shadow-xl">
          {/* Header */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-wide">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Close sidebar"
                className="p-1 rounded hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
