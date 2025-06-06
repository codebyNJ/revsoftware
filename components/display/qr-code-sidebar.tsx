"use client"

import { useEffect, useState } from "react"
import { X, QrCode } from "lucide-react"
import QRCode from "qrcode"

interface QRCodeSidebarProps {
  url: string
  isOpen: boolean
  onClose: () => void
  title: string
}

export function QRCodeSidebar({ url, isOpen, onClose, title }: QRCodeSidebarProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("")

  useEffect(() => {
    if (url && isOpen) {
      QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
        .then((dataUrl) => {
          setQrCodeDataUrl(dataUrl)
        })
        .catch((error) => {
          console.error("Error generating QR code:", error)
        })
    }
  }, [url, isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300" onClick={onClose} />

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-6 h-6" />
            <h3 className="text-lg font-semibold">Scan to Continue</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-blue-700 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center justify-center h-full">
          <div className="text-center mb-6">
            <h4 className="text-xl font-bold text-gray-800 mb-2">{title}</h4>
            <p className="text-gray-600">Scan the QR code with your phone to continue</p>
          </div>

          {/* QR Code */}
          <div className="bg-white p-4 rounded-lg shadow-lg border-2 border-gray-200 mb-6">
            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl || "/placeholder.svg"} alt="QR Code" className="w-64 h-64" />
            ) : (
              <div className="w-64 h-64 bg-gray-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          {/* URL Display */}
          <div className="w-full bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Direct Link:</p>
            <p className="text-sm text-blue-600 break-all">{url}</p>
          </div>

          {/* Instructions */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              1. Open camera app on your phone
              <br />
              2. Point camera at QR code
              <br />
              3. Tap the notification to open link
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-50 border-t">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  )
}
