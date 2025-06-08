"use client"

import { useState, useEffect } from "react"
import { Calendar, Clock } from "lucide-react"

export function DigitalClock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="bg-black/80 backdrop-blur-sm text-white p-4 rounded-lg border border-white/20">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-2xl font-mono font-bold">
          <Clock className="w-5 h-5" />
          {formatTime(time)}
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-300">
          <Calendar className="w-4 h-4" />
          {formatDate(time)}
        </div>
      </div>
    </div>
  )
}
