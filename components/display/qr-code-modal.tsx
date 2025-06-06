"use client"

import { useEffect, useRef } from "react"
import QRCode from "qrcode"
import { X } from "lucide-react"

interface QRCodeModalProps {
  url: string
  isOpen: boolean
  onClose: () => void
  title?: string
}

export function QRCodeModal({ url, isOpen, onClose, title }: QRCodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (isOpen && canvasRef.current && url) {
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
        },
        (error) => {
          if (error) console.error("Error generating QR code:", error)
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
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center">
          <h3 className="text-xl font-bold mb-4">{title || "Scan QR Code"}</h3>
          <p className="text-gray-600 mb-6">Scan this code to learn more</p>

          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white border rounded-lg shadow-inner">
              <canvas ref={canvasRef} className="mx-auto" />
            </div>
          </div>

          <div className="text-sm text-gray-500 mb-4">
            <p>URL: {url}</p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
