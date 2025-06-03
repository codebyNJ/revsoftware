"use client"

import { useState } from "react"
import { uploadFile, getPublicUrl } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { Upload } from "lucide-react"

interface FileUploadProps {
  onVideoUpload: (url: string) => void
  onThumbnailUpload: (url: string) => void
  bucket?: string
}

export function FileUpload({ onVideoUpload, onThumbnailUpload, bucket = "videos" }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const { toast } = useToast()

  const handleFileUpload = async (file: File, type: "video" | "thumbnail") => {
    if (!file) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${type}s/${fileName}`

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const { path } = await uploadFile(bucket, filePath, file)
      const publicUrl = getPublicUrl(bucket, path)

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (type === "video") {
        onVideoUpload(publicUrl)
      } else {
        onThumbnailUpload(publicUrl)
      }

      toast({
        title: "Upload Successful",
        description: `${type} uploaded successfully.`,
      })
    } catch (error: any) {
      console.error("Upload error:", error)
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="video-upload">Video File</Label>
        <div className="flex items-center gap-2">
          <Input
            id="video-upload"
            type="file"
            accept="video/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file, "video")
            }}
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => document.getElementById("video-upload")?.click()}
          >
            <Upload className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="thumbnail-upload">Thumbnail Image (Optional)</Label>
        <div className="flex items-center gap-2">
          <Input
            id="thumbnail-upload"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file, "thumbnail")
            }}
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => document.getElementById("thumbnail-upload")?.click()}
          >
            <Upload className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      )}
    </div>
  )
}
