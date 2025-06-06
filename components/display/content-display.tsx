"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { collection, query, orderBy, onSnapshot, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getCurrentLocation, type GeolocationData } from "@/lib/geolocation"
import { WeatherWidget } from "./weather-widget"
import { QRCodeSidebar } from "./qr-code-sidebar"
import { ExternalLink, Newspaper, Briefcase, MapPin, Building, DollarSign } from "lucide-react"

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
  url?: string // Add URL field for actual links
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

  const videoRef = useRef<HTMLVideoElement>(null)
  const locationWatchId = useRef<number | null>(null)

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
          </div>
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white relative">
            <div className="text-center max-w-4xl p-8">
              <h2 className="text-5xl font-bold mb-8 leading-tight">{currentItem.title}</h2>
              <p className="text-2xl mb-8 leading-relaxed opacity-90">{currentItem.description}</p>
              {currentItem.imageUrl && (
                <img
                  src={currentItem.imageUrl || "/placeholder.svg"}
                  alt={currentItem.title}
                  className="mx-auto max-h-[50vh] object-contain mb-8 rounded-lg shadow-2xl"
                />
              )}
            </div>
          </div>
        )

      case "news":
        return (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 text-white relative">
            <div className="max-w-6xl w-full p-8 flex items-center gap-12">
              {/* News Image */}
              {currentItem.imageUrl && (
                <div className="w-1/2 flex-shrink-0">
                  <img
                    src={currentItem.imageUrl || "/placeholder.svg"}
                    alt={currentItem.title}
                    className="w-full h-[60vh] object-cover rounded-xl shadow-2xl"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = "none"
                    }}
                  />
                </div>
              )}

              {/* News Content */}
              <div className={`${currentItem.imageUrl ? "w-1/2" : "w-full text-center"} space-y-6 relative`}>
                <div className="flex items-center gap-3 mb-6">
                  <Newspaper className="w-12 h-12 text-blue-400" />
                  <h2 className="text-4xl font-bold">Breaking News</h2>
                </div>

                <h3 className="text-3xl font-bold leading-tight mb-6">{currentItem.title}</h3>
                <p className="text-xl leading-relaxed opacity-90">{currentItem.description}</p>

                <div className="pt-6">
                  <div className="inline-flex items-center gap-2 bg-white bg-opacity-20 px-6 py-3 rounded-full backdrop-blur-sm">
                    <Newspaper className="w-5 h-5" />
                    <span className="text-lg font-medium">Stay Informed</span>
                  </div>
                </div>

                {/* Read More Button for News */}
                {currentItem.url && (
                  <div className="absolute bottom-0 right-0">
                    <button
                      onClick={() => {
                        trackClick(currentItem)
                        setQrUrl(currentItem.url || "")
                        setQrTitle(`Read more: ${currentItem.title}`)
                        setShowQRCode(true)
                      }}
                      className="bg-white text-blue-900 px-6 py-3 rounded-xl font-bold text-lg hover:bg-blue-100 transition-all duration-200 flex items-center gap-3 shadow-2xl border-2 border-blue-400 hover:scale-105 z-10"
                    >
                      <ExternalLink className="w-5 h-5" />
                      Read Full Article
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case "job":
        return (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 text-white relative">
            <div className="max-w-6xl w-full p-8">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <Briefcase className="w-12 h-12 text-green-400" />
                  <h2 className="text-4xl font-bold">Career Opportunity</h2>
                </div>
              </div>

              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl relative">
                <h3 className="text-4xl font-bold mb-6 text-center">{currentItem.title}</h3>

                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Building className="w-6 h-6 text-green-400" />
                      <span className="text-xl">Company: {currentItem.title.split(" - ")[1] || "Great Company"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-6 h-6 text-green-400" />
                      <span className="text-xl">Location: Bangalore, India</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-6 h-6 text-green-400" />
                      <span className="text-xl">Competitive Salary</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-lg leading-relaxed">{currentItem.description}</p>
                  </div>
                </div>

                {/* Read More Button - Fixed positioning and visibility */}
                <div className="absolute bottom-6 right-6 z-50">
                  <button
                    onClick={() => {
                      trackClick(currentItem)
                      // Use actual URL from the job data
                      const jobUrl =
                        currentItem.url ||
                        `https://www.google.com/search?q=${encodeURIComponent(`${currentItem.title} job`)}`
                      setQrUrl(jobUrl)
                      setQrTitle(`Apply for: ${currentItem.title}`)
                      setShowQRCode(true)
                    }}
                    className="bg-white text-green-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-green-100 transition-all duration-200 flex items-center gap-3 shadow-2xl border-2 border-green-400 hover:scale-105"
                  >
                    <ExternalLink className="w-6 h-6" />
                    Apply Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }, [currentItemIndex, isPlaying, moveToNextItem, playlistItems, watchStartTime])

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

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-black overflow-hidden">
      {/* Weather Widget - Fixed overlay in top left with higher z-index */}
      <div className="fixed top-4 left-4 z-50">
        <WeatherWidget />
      </div>

      {/* Main content display */}
      <div className="w-full h-full relative z-10">
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

        {/* Progress Indicator */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-600 z-40">
          <div
            className="h-full bg-white transition-all duration-1000"
            style={{
              width: `${((currentItemIndex + 1) / playlistItems.length) * 100}%`,
            }}
          />
        </div>

        {/* Info Overlay - Bottom right */}
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-sm z-40">
          Item {currentItemIndex + 1} of {playlistItems.length}
        </div>
      </div>

      {/* QR Code Sidebar - Highest z-index */}
      <QRCodeSidebar url={qrUrl} isOpen={showQRCode} onClose={() => setShowQRCode(false)} title={qrTitle} />
    </div>
  )
}
