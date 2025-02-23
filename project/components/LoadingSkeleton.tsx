"use client"

export default function LoadingSkeleton({ count = 3, className = "h-6" }: { count?: number; className?: string }) {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`bg-gray-300 rounded ${className}`} />
      ))}
    </div>
  )
}
