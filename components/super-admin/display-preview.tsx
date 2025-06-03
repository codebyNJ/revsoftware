"use client"

import { VideoDisplay } from "@/components/display/video-display"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Monitor } from "lucide-react"

export function DisplayPreview() {
  // Generate a preview display ID
  const previewDisplayId = "preview_display"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Monitor className="w-6 h-6" />
        <h2 className="text-2xl font-bold">Display Preview</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Live Display Preview</CardTitle>
          <CardDescription>
            This shows exactly how the display will appear to viewers. All changes are reflected in real-time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
            <VideoDisplay displayId={previewDisplayId} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
