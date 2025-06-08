"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { collection, query, orderBy, onSnapshot, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getCurrentLocation, type GeolocationData } from "@/lib/geolocation"
import { WeatherWidget } from "./weather-widget"
import { DigitalClock } from "./digital-clock"
import { TouchIndicator } from "./touch-indicator"
import { QRCodeSidebar } from "./qr-code-sidebar"
import { ExternalLink, Briefcase, MapPin, Building, DollarSign, Info, X } from "lucide-react"

interface ContentDisplayProps {
  displayId: string
  driverId: string
}

interface PlaylistItem {
  id: string
  type: "ad" | "news" | "job"
  title: string
  description: string
  imageUrl?: string
  videoUrl?: string
  originalId: string
  order: number
  duration: number
  createdAt: Date
  url?: string
}

export function ContentDisplay({ displayId, driverId }: ContentDisplayProps) {
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([])
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [currentLocation, setCurrentLocation] = useState<GeolocationData | null>(null)
  const [showQRCode, setShowQRCode] = useState(false)
  const [qrUrl, setQrUrl] = useState("")
  const [qrTitle, setQrTitle] = useState("")
  const [watchStartTime, setWatchStartTime] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTouchHint, setShowTouchHint] = useState(true)

  const videoRef = useRef<HTMLVideoElement>(null)
  const locationWatchId = useRef<number | null>(null)

  // Hide touch hint after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTouchHint(false)
    }, 10000)

    return () => clearTimeout(timer)
  }, [])

  // Initialize geolocation tracking
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const location = await getCurrentLocation()
        setCurrentLocation(location)

        locationWatchId.current = navigator.geolocation.watchPosition(
          (position) => {
            setCurrentLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: new Date(),
            })
          },
          (error) => {
            console.error("Error watching location:", error)
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          },
        )

        console.log("Location enabled:", location.address || "Unknown location")
      } catch (error) {
        console.error("Failed to get location:", error)
      }
    }

    initializeLocation()

    return () => {
      if (locationWatchId.current) {
        navigator.geolocation.clearWatch(locationWatchId.current)
      }
    }
  }, [])

  // Load playlist items
  useEffect(() => {
    setLoading(true)
    console.log("Initializing content display with ID:", displayId)

    const playlistQuery = query(collection(db, "playlist"), orderBy("order"))

    const unsubscribe = onSnapshot(playlistQuery, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as PlaylistItem[]

      console.log(`Loaded ${items.length} playlist items`)
      setPlaylistItems(items)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [displayId])

  // Track analytics for a view
  const trackView = async (item: PlaylistItem) => {
    try {
      const today = new Date().toISOString().split("T")[0]
      const hour = new Date().getHours()

      await addDoc(collection(db, "analytics"), {
        adId: item.originalId,
        contentType: item.type,
        clicks: 0,
        date: today,
        displayId,
        driverId,
        geolocation: currentLocation
          ? {
              accuracy: currentLocation.accuracy,
              address: currentLocation.address || "",
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              timestamp: currentLocation.timestamp,
            }
          : null,
        hourlyData: [
          {
            clicks: 0,
            hour,
            views: 1,
          },
        ],
        impressions: 1,
        ownerId: "",
        views: 1,
        watchTime: 0,
      })
      console.log(`View tracked for ${item.type}:`, item.title)
    } catch (error) {
      console.error("Error tracking view:", error)
    }
  }

  // Track watch time
  const trackWatchTime = async (item: PlaylistItem, watchTime: number) => {
    try {
      const today = new Date().toISOString().split("T")[0]

      await addDoc(collection(db, "analytics"), {
        adId: item.originalId,
        contentType: item.type,
        clicks: 0,
        date: today,
        displayId,
        driverId,
        impressions: 0,
        ownerId: "",
        views: 0,
        watchTime: Math.round(watchTime),
      })
      console.log("Watch time tracked:", Math.round(watchTime), "seconds")
    } catch (error) {
      console.error("Error tracking watch time:", error)
    }
  }

  // Track click
  const trackClick = async (item: PlaylistItem) => {
    try {
      const today = new Date().toISOString().split("T")[0]
      const hour = new Date().getHours()

      await addDoc(collection(db, "analytics"), {
        adId: item.originalId,
        contentType: item.type,
        clicks: 1,
        date: today,
        displayId,
        driverId,
        hourlyData: [
          {
            clicks: 1,
            hour,
            views: 0,
          },
        ],
        impressions: 0,
        ownerId: "",
        views: 0,
        watchTime: 0,
      })
      console.log(`Click tracked for ${item.type}:`, item.title)
    } catch (error) {
      console.error("Error tracking click:", error)
    }
  }

  // Move to the next item in the playlist
  const moveToNextItem = useCallback(() => {
    if (playlistItems.length === 0) return

    const currentItem = playlistItems[currentItemIndex]
    if (currentItem && watchStartTime > 0) {
      const watchTime = (Date.now() - watchStartTime) / 1000
      if (watchTime > 1) {
        trackWatchTime(currentItem, watchTime)
      }
    }

    setCurrentItemIndex((prev) => (prev + 1) % playlistItems.length)
    setIsPlaying(false)
    setWatchStartTime(0)
    setError(null)
  }, [currentItemIndex, playlistItems, watchStartTime])

  // Handle showing items based on their type
  const displayCurrentItem = useCallback(() => {
    if (playlistItems.length === 0 || currentItemIndex >= playlistItems.length) {
      return null
    }

    const currentItem = playlistItems[currentItemIndex]

    // Track view when item is displayed
    if (!isPlaying && watchStartTime === 0) {
      trackView(currentItem)
      setWatchStartTime(Date.now())
      setIsPlaying(true)

      // Set timer to move to next item based on duration
      if (currentItem.type !== "ad" || !currentItem.videoUrl) {
        setTimeout(() => {
          moveToNextItem()
        }, currentItem.duration * 1000)
      }
    }

    switch (currentItem.type) {
      case "ad":
        return currentItem.videoUrl ? (
          <div className="w-full h-full relative">
            <video
              ref={videoRef}
              src={currentItem.videoUrl}
              className="w-full h-full object-cover"
              controls={false}
              muted
              playsInline
              poster={currentItem.imageUrl}
              autoPlay
              onEnded={moveToNextItem}
              onError={() => {
                setError(`Error loading video: ${currentItem.title}`)
                setTimeout(moveToNextItem, 3000)
              }}
            />

            {/* Ad Info Panel - Right Side */}
            <div className="absolute top-0 right-0 w-80 h-full bg-white/95 backdrop-blur-sm flex flex-col">
              <div className="flex-1 p-6 flex flex-col justify-center">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentItem.title}</h2>
                  <p className="text-gray-700 leading-relaxed">{currentItem.description}</p>
                </div>

                {/* QR Code Placeholder */}
                <div className="bg-gray-100 p-4 rounded-lg mb-6">
                  <div className="w-32 h-32 bg-black mx-auto mb-3 rounded"></div>
                  <p className="text-sm text-gray-600 text-center">Scan this QR code to learn more</p>
                </div>
              </div>

              <button
                onClick={() => setShowTouchHint(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full h-full relative">
            {/* Background Image/Video */}
            <div
              className="w-full h-full bg-cover bg-center"
              style={{
                backgroundImage: currentItem.imageUrl
                  ? `url(${currentItem.imageUrl})`
                  : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              }}
            >
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/40"></div>

              {/* Content */}
              <div className="absolute inset-0 flex">
                {/* Left side - Title and description */}
                <div className="flex-1 flex items-end p-8">
                  <div className="text-white">
                    <h1 className="text-4xl font-bold mb-4">{currentItem.title}</h1>
                    <p className="text-xl opacity-90">{currentItem.description}</p>

                    {/* Touch indicator */}
                    {showTouchHint && (
                      <div className="mt-6 flex items-center gap-2 text-white/80">
                        <Info className="w-4 h-4" />
                        <span className="text-sm">Tap anywhere on screen for more information</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side - Action button */}
                <div className="w-80 flex items-center justify-center p-8">
                  <button
                    onClick={() => {
                      trackClick(currentItem)
                      const adUrl =
                        currentItem.url || `https://www.google.com/search?q=${encodeURIComponent(currentItem.title)}`
                      setQrUrl(adUrl)
                      setQrTitle(`Learn more: ${currentItem.title}`)
                      setShowQRCode(true)
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-all duration-200 flex items-center gap-3 shadow-lg hover:scale-105 active:scale-95"
                  >
                    <Info className="w-6 h-6" />
                    Tap for Details
                  </button>
                </div>
              </div>

              {/* Tap indicator in center */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-16 h-16 border-4 border-white/30 rounded-full flex items-center justify-center">
                  <div className="text-white text-xs font-medium">TAP</div>
                </div>
              </div>
            </div>
          </div>
        )

      case "news":
        return (
          <div className="w-full h-full relative">
            {/* Background with blur */}
            <div
              className="w-full h-full bg-cover bg-center filter blur-sm"
              style={{
                backgroundImage: currentItem.imageUrl
                  ? `url(${currentItem.imageUrl})`
                  : "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
              }}
            ></div>

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/60"></div>

            {/* Content Card - Centered */}
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
                {/* Source and Date */}
                <div className="text-sm text-gray-600 mb-4">
                  <span className="font-medium">News Source</span> • {new Date().toLocaleDateString()}
                </div>

                {/* News Image */}
                {currentItem.imageUrl && (
                  <div className="mb-6">
                    <img
                      src={currentItem.imageUrl || "/placeholder.svg"}
                      alt={currentItem.title}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}

                {/* Title and Description */}
                <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">{currentItem.title}</h2>
                <p className="text-gray-700 leading-relaxed mb-6">{currentItem.description}</p>

                {/* Action Button */}
                <button
                  onClick={() => {
                    trackClick(currentItem)
                    setQrUrl(currentItem.url || "")
                    setQrTitle(`Read more: ${currentItem.title}`)
                    setShowQRCode(true)
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 hover:scale-105 active:scale-95"
                >
                  <ExternalLink className="w-5 h-5" />
                  Read Full Article
                </button>
              </div>
            </div>
          </div>
        )

      case "job":
        return (
          <div className="w-full h-full relative">
            {/* Background */}
            <div className="w-full h-full bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900"></div>

            {/* Content Card - Centered */}
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 max-w-3xl w-full shadow-2xl">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <Briefcase className="w-8 h-8 text-green-600" />
                  <h2 className="text-3xl font-bold text-gray-900">Career Opportunity</h2>
                </div>

                {/* Job Title */}
                <h3 className="text-2xl font-bold text-gray-900 mb-6">{currentItem.title}</h3>

                {/* Job Details Grid */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Building className="w-5 h-5 text-green-600" />
                      <span className="text-gray-700">
                        Company: {currentItem.title.split(" - ")[1] || "Great Company"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-green-600" />
                      <span className="text-gray-700">Location: Bangalore, India</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <span className="text-gray-700">Competitive Salary</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-gray-700 leading-relaxed">{currentItem.description}</p>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => {
                    trackClick(currentItem)
                    const jobUrl =
                      currentItem.url ||
                      `https://www.google.com/search?q=${encodeURIComponent(`${currentItem.title} job`)}`
                    setQrUrl(jobUrl)
                    setQrTitle(`Apply for: ${currentItem.title}`)
                    setShowQRCode(true)
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-all duration-200 flex items-center gap-3 hover:scale-105 active:scale-95"
                >
                  <ExternalLink className="w-6 h-6" />
                  Apply Now
                </button>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }, [currentItemIndex, isPlaying, moveToNextItem, playlistItems, watchStartTime, showTouchHint])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-xl">Loading playlist...</p>
          <p className="mt-2 text-sm text-gray-400">Display ID: {displayId}</p>
        </div>
      </div>
    )
  }

  // No content state
  if (playlistItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Content in Playlist</h2>
          <p>Please add content to the playlist from the admin dashboard.</p>
          <div className="mt-4 text-sm opacity-75">
            <p>Display ID: {displayId}</p>
            {currentLocation && <p>Location: {currentLocation.address || "Unknown"}</p>}
          </div>
        </div>
      </div>
    )
  }

  const currentItem = playlistItems[currentItemIndex]

  return (
    <div className="fixed inset-0 w-full h-full bg-black">
      {/* Main content display */}
      <div className="relative w-full h-full">
        {error ? (
          <div className="w-full h-full flex items-center justify-center bg-red-900 text-white">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">{error}</h3>
              <p className="text-sm mb-2">Skipping to next item...</p>
            </div>
          </div>
        ) : (
          displayCurrentItem()
        )}
      </div>

      {/* Fixed UI Elements */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Top Left - Weather Widget */}
        <div className="absolute top-4 left-4 pointer-events-auto">
          <WeatherWidget />
        </div>

        {/* Top Right - Digital Clock */}
        <div className="absolute top-4 right-4 pointer-events-auto">
          <DigitalClock />
        </div>

        {/* Bottom Right - Touch Indicator */}
        {showTouchHint && (
          <div className="absolute bottom-4 right-4 pointer-events-auto">
            <TouchIndicator />
          </div>
        )}

        {/* Progress Indicator - Bottom Full Width */}
        <div className="absolute bottom-0 left-0 w-full">
          <div className="w-full h-1 bg-gray-600">
            <div
              className="h-full bg-white transition-all duration-1000"
              style={{
                width: `${((currentItemIndex + 1) / playlistItems.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Item Counter - Bottom Center */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <div className="bg-black/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
            {currentItemIndex + 1} / {playlistItems.length}
          </div>
        </div>
      </div>

      {/* QR Code Sidebar */}
      <QRCodeSidebar url={qrUrl} isOpen={showQRCode} onClose={() => setShowQRCode(false)} title={qrTitle} />
    </div>
  )
}
