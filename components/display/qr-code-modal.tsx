"use client"

import { useEffect, useRef, useState } from "react"
import QRCode from "qrcode"
import { X, Loader2 } from "lucide-react"

interface QRCodeModalProps {
  url: string
  isOpen: boolean
  onClose: () => void
  title?: string
}

export function QRCodeModal({ url, isOpen, onClose, title }: QRCodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && canvasRef.current && url) {
      setIsGenerating(true)
      setError(null)

      // Generate QR code when modal opens
      QRCode.toCanvas(
        canvasRef.current,
        url,
        {
          width: 250,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
          errorCorrectionLevel: "M",
        },
        (error) => {
          setIsGenerating(false)
          if (error) {
            console.error("Error generating QR code:", error)
            setError("Failed to generate QR code")
          } else {
            console.log("QR code generated successfully for URL:", url)
          }
        },
      )
    }
  }, [isOpen, url])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 m-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center">
          <h3 className="text-xl font-bold mb-4">{title || "Scan QR Code"}</h3>
          <p className="text-gray-600 mb-6">Scan this code to learn more</p>

          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white border-2 border-gray-200 rounded-lg shadow-inner">
              {isGenerating ? (
                <div className="w-[250px] h-[250px] flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Generating QR Code...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="w-[250px] h-[250px] flex items-center justify-center bg-red-50 border border-red-200 rounded">
                  <div className="text-center">
                    <p className="text-red-600 text-sm">{error}</p>
                    <p className="text-xs text-gray-500 mt-1">Please try again</p>
                  </div>
                </div>
              ) : (
                <canvas ref={canvasRef} className="mx-auto block" style={{ maxWidth: "250px", maxHeight: "250px" }} />
              )}
            </div>
          </div>

          <div className="text-sm text-gray-500 mb-4 break-all">
            <p>
              <strong>URL:</strong> {url}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                navigator.clipboard
                  .writeText(url)
                  .then(() => {
                    // Could add a toast here
                    console.log("URL copied to clipboard")
                  })
                  .catch((err) => {
                    console.error("Failed to copy URL:", err)
                  })
              }}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Copy URL
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
