"use client"

import { useState, useEffect } from "react"
import { Hand } from "lucide-react"

export function TouchIndicator() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Hide the indicator after 10 seconds
    const timer = setTimeout(() => {
      setVisible(false)
    }, 10000)

    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed bottom-6 right-6 z-40 animate-pulse">
      <div className="relative">
        {/* Pulsing dot */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>

        {/* Hand icon */}
        <div className="bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg border border-white/20">
          <Hand className="w-6 h-6 text-gray-700" />
        </div>
      </div>
    </div>
  )
}
