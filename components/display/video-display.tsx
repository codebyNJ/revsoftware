"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { collection, query, where, orderBy, onSnapshot, addDoc, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Ad, DisplaySettings } from "@/lib/types"
import { getCurrentLocation, watchLocation, type GeolocationData } from "@/lib/geolocation"
import { useToast } from "@/hooks/use-toast"
import { QRCodeModal } from "./qr-code-modal"
import { WeatherWidget } from "./weather-widget"
import { ExternalLink } from "lucide-react"
import { ContentDisplay } from "./content-display"

interface VideoDisplayProps {
  displayId: string
  driverId?: string
}

export function VideoDisplay({ displayId, driverId = "unknown" }: VideoDisplayProps) {
  const [playlistMode, setPlaylistMode] = useState(true)
  const [loading, setLoading] = useState(true)
  const [ads, setAds] = useState<Ad[]>([])
  const [currentAdIndex, setCurrentAdIndex] = useState(0)
  const [settings, setSettings] = useState<DisplaySettings | null>(null)
  const [connectionError, setConnectionError] = useState(false)
  const [watchStartTime, setWatchStartTime] = useState<number>(0)
  const [currentLocation, setCurrentLocation] = useState<GeolocationData | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [connectionRetries, setConnectionRetries] = useState(0)
  const [indexError, setIndexError] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const nextVideoRef = useRef<HTMLVideoElement>(null)
  const locationWatchId = useRef<number | null>(null)
  const { toast } = useToast()

  const MAX_RETRIES = 3
  const MAX_CONNECTION_RETRIES = 5

  useEffect(() => {
    const checkPlaylistItems = async () => {
      try {
        const playlistQuery = query(collection(db, "playlist"))
        const snapshot = await getDocs(playlistQuery)

        // If we have playlist items, use the unified content display
        // Otherwise, fall back to the original video-only display
        setPlaylistMode(!snapshot.empty)
        setLoading(false)
      } catch (error) {
        console.error("Error checking playlist:", error)
        // Fall back to video-only display if we can't check playlist
        setPlaylistMode(false)
        setLoading(false)
      }
    }

    checkPlaylistItems()
  }, [])

  // Initialize geolocation tracking
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const location = await getCurrentLocation()
        setCurrentLocation(location)

        // Start watching location changes
        locationWatchId.current = watchLocation((newLocation) => {
          setCurrentLocation(newLocation)
        })

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

  // Setup Firebase listeners with proper cleanup
  useEffect(() => {
    if (!playlistMode) {
      setLoading(true)
      console.log("Initializing display with ID:", displayId)

      let unsubscribeAds: (() => void) | null = null
      let unsubscribeSettings: (() => void) | null = null

      const setupListeners = async () => {
        try {
          // Fetch active ads - MODIFIED to handle missing index
          console.log("Fetching active ads...")

          // Try first without orderBy to avoid index error
          const adsQuery = indexError
            ? query(collection(db, "ads"), where("status", "==", "active"))
            : query(collection(db, "ads"), where("status", "==", "active"), orderBy("order"))

          try {
            // First try with onSnapshot (real-time updates)
            unsubscribeAds = onSnapshot(
              adsQuery,
              (snapshot) => {
                let adsData = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                  createdAt: doc.data().createdAt?.toDate(),
                  updatedAt: doc.data().updatedAt?.toDate(),
                })) as Ad[]

                // If we're not using orderBy in the query, sort manually
                if (indexError) {
                  adsData = adsData.sort((a, b) => {
                    // Default to 0 if order is undefined
                    const orderA = a.order !== undefined ? a.order : 0
                    const orderB = b.order !== undefined ? b.order : 0
                    return orderA - orderB
                  })
                }

                console.log(`Loaded ${adsData.length} active ads`)
                setAds(adsData)
                setConnectionError(false)
                setConnectionRetries(0)
                setLoading(false)
              },
              (error) => {
                console.error("Error in onSnapshot for ads:", error)

                // Check if it's an index error
                if (error.message && error.message.includes("index")) {
                  console.log("Index error detected, switching to non-ordered query")
                  setIndexError(true)
                }

                // Fallback to getDocs if onSnapshot fails
                getDocs(indexError ? query(collection(db, "ads"), where("status", "==", "active")) : adsQuery)
                  .then((snapshot) => {
                    let adsData = snapshot.docs.map((doc) => ({
                      id: doc.id,
                      ...doc.data(),
                      createdAt: doc.data().createdAt?.toDate(),
                      updatedAt: doc.data().updatedAt?.toDate(),
                    })) as Ad[]

                    // Manual sort if needed
                    if (indexError) {
                      adsData = adsData.sort((a, b) => {
                        const orderA = a.order !== undefined ? a.order : 0
                        const orderB = b.order !== undefined ? b.order : 0
                        return orderA - orderB
                      })
                    }

                    console.log(`Loaded ${adsData.length} active ads (fallback)`)
                    setAds(adsData)
                    setLoading(false)
                  })
                  .catch((error) => {
                    console.error("Error in getDocs fallback for ads:", error)

                    // If this is also an index error, try one more time without orderBy
                    if (!indexError && error.message && error.message.includes("index")) {
                      console.log("Index error in fallback, trying without ordering")
                      setIndexError(true)
                      getDocs(query(collection(db, "ads"), where("status", "==", "active")))
                        .then((snapshot) => {
                          const adsData = snapshot.docs
                            .map((doc) => ({
                              id: doc.id,
                              ...doc.data(),
                              createdAt: doc.data().createdAt?.toDate(),
                              updatedAt: doc.data().updatedAt?.toDate(),
                            }))
                            .sort((a, b) => {
                              const orderA = a.order !== undefined ? a.order : 0
                              const orderB = b.order !== undefined ? b.order : 0
                              return orderA - orderB
                            }) as Ad[]

                          console.log(`Loaded ${adsData.length} active ads (no-index fallback)`)
                          setAds(adsData)
                          setLoading(false)
                        })
                        .catch((finalError) => {
                          console.error("Final error fetching ads:", finalError)
                          setConnectionError(true)
                          setLoading(false)
                        })
                    } else {
                      setConnectionError(true)
                      setLoading(false)
                    }
                  })
              },
            )
          } catch (error) {
            console.error("Error setting up ads listener:", error)
            setConnectionError(true)
            setLoading(false)
          }

          // Fetch display settings
          console.log("Fetching display settings...")
          const settingsQuery = query(collection(db, "settings"))

          // First try with onSnapshot
          unsubscribeSettings = onSnapshot(
            settingsQuery,
            (snapshot) => {
              if (!snapshot.empty) {
                const settingsData = snapshot.docs[0].data() as DisplaySettings
                setSettings(settingsData)
                console.log("Display settings loaded:", settingsData)
              }
            },
            (error) => {
              console.error("Error in onSnapshot for settings:", error)

              // Fallback to getDocs
              getDocs(settingsQuery)
                .then((snapshot) => {
                  if (!snapshot.empty) {
                    const settingsData = snapshot.docs[0].data() as DisplaySettings
                    setSettings(settingsData)
                    console.log("Display settings loaded (fallback):", settingsData)
                  }
                })
                .catch((error) => {
                  console.error("Error in getDocs fallback for settings:", error)
                })
            },
          )
        } catch (error) {
          console.error("Error setting up display:", error)
          setConnectionError(true)
          setLoading(false)
        }
      }

      setupListeners()

      return () => {
        if (unsubscribeAds) unsubscribeAds()
        if (unsubscribeSettings) unsubscribeSettings()
      }
    }
  }, [displayId, connectionRetries, indexError])

  // Track analytics with geolocation - FIXED
  const trackView = async (adId: string, ownerId: string) => {
    try {
      const today = new Date().toISOString().split("T")[0]
      const hour = new Date().getHours()

      const analyticsData = {
        adId,
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
          : {
              accuracy: 0,
              address: "",
              latitude: 0,
              longitude: 0,
              timestamp: new Date(),
            },
        hourlyData: [
          {
            clicks: 0,
            geolocation: currentLocation
              ? {
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                }
              : {
                  latitude: 0,
                  longitude: 0,
                },
            hour,
            views: 1,
          },
        ],
        impressions: 1,
        ownerId,
        views: 1,
        watchTime: 0,
        timestamp: new Date(),
      }

      await addDoc(collection(db, "analytics"), analyticsData)
      console.log("View tracked for ad:", adId, analyticsData)
    } catch (error) {
      console.error("Error tracking view:", error)
    }
  }

  const trackWatchTime = async (adId: string, ownerId: string, watchTime: number) => {
    try {
      const today = new Date().toISOString().split("T")[0]

      const analyticsData = {
        adId,
        clicks: 0,
        date: today,
        displayId,
        driverId: driverId,
        geolocation: currentLocation
          ? {
              accuracy: currentLocation.accuracy,
              address: currentLocation.address || "",
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              timestamp: currentLocation.timestamp,
            }
          : {
              accuracy: 0,
              address: "",
              latitude: 0,
              longitude: 0,
              timestamp: new Date(),
            },
        hourlyData: [],
        impressions: 0,
        ownerId,
        views: 0,
        watchTime: Math.round(watchTime),
        timestamp: new Date(),
      }

      await addDoc(collection(db, "analytics"), analyticsData)
      console.log("Watch time tracked:", Math.round(watchTime), "seconds", analyticsData)
    } catch (error) {
      console.error("Error tracking watch time:", error)
    }
  }

  const trackClick = async (adId: string, ownerId: string) => {
    try {
      const today = new Date().toISOString().split("T")[0]
      const hour = new Date().getHours()

      const analyticsData = {
        adId,
        clicks: 1,
        date: today,
        displayId,
        driverId: driverId,
        geolocation: currentLocation
          ? {
              accuracy: currentLocation.accuracy,
              address: currentLocation.address || "",
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              timestamp: currentLocation.timestamp,
            }
          : {
              accuracy: 0,
              address: "",
              latitude: 0,
              longitude: 0,
              timestamp: new Date(),
            },
        hourlyData: [
          {
            clicks: 1,
            geolocation: currentLocation
              ? {
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                }
              : {
                  latitude: 0,
                  longitude: 0,
                },
            hour,
            views: 0,
          },
        ],
        impressions: 0,
        ownerId,
        views: 0,
        watchTime: 0,
        timestamp: new Date(),
      }

      await addDoc(collection(db, "analytics"), analyticsData)
      console.log("Click tracked for ad:", adId, analyticsData)
    } catch (error) {
      console.error("Error tracking click:", error)
    }
  }

  const handleReadMoreClick = () => {
    const currentAd = ads[currentAdIndex]
    if (currentAd && currentAd.readMoreUrl) {
      // Track the click
      trackClick(currentAd.id, currentAd.ownerId)
      // Show QR code modal
      setShowQRCode(true)
    }
  }

  const moveToNextAd = useCallback(() => {
    // Track watch time before moving to next ad
    const currentAd = ads[currentAdIndex]
    if (currentAd && watchStartTime > 0) {
      const watchTime = (Date.now() - watchStartTime) / 1000
      if (watchTime > 1) {
        trackWatchTime(currentAd.id, currentAd.ownerId, watchTime)
      }
    }

    setCurrentAdIndex((prev) => (prev + 1) % ads.length)
    setVideoError(null)
    setIsPlaying(false)
    setRetryCount(0)
    setWatchStartTime(0)
  }, [ads, currentAdIndex, watchStartTime])

  // Improved preload function with useCallback
  const preloadNextVideo = useCallback(() => {
    if (ads.length <= 1) return

    const nextIndex = (currentAdIndex + 1) % ads.length
    const nextAd = ads[nextIndex]

    if (nextAd && nextAd.videoUrl && nextVideoRef.current) {
      // Only set src if it's different
      if (nextVideoRef.current.src !== nextAd.videoUrl) {
        nextVideoRef.current.src = nextAd.videoUrl
        nextVideoRef.current.preload = "metadata" // Save bandwidth
        nextVideoRef.current.load()
      }
    }
  }, [ads, currentAdIndex])

  // Connection retry function
  const retryConnection = () => {
    if (connectionRetries < MAX_CONNECTION_RETRIES) {
      setConnectionRetries((prev) => prev + 1)
      setConnectionError(false)
      setLoading(true)
    } else {
      toast({
        title: "Connection Failed",
        description: "Please check your internet connection and refresh the page.",
        variant: "destructive",
      })
    }
  }

  // Video event handlers with improved error handling and looping
  useEffect(() => {
    if (!playlistMode && ads.length === 0) return

    const currentAd = ads[currentAdIndex]
    if (!currentAd || !videoRef.current) return

    const video = videoRef.current

    const handleVideoStart = () => {
      setWatchStartTime(Date.now())
      setIsPlaying(true)
      setVideoError(null)
      setRetryCount(0)
      trackView(currentAd.id, currentAd.ownerId)
      console.log("Video started:", currentAd.title)

      // Start preloading next video when current starts playing
      setTimeout(preloadNextVideo, 1000)
    }

    const handleVideoEnd = () => {
      const watchTime = (Date.now() - watchStartTime) / 1000
      setIsPlaying(false)

      if (watchTime > 1) {
        trackWatchTime(currentAd.id, currentAd.ownerId, watchTime)
      }

      // Move to next ad after transition delay
      setTimeout(
        () => {
          moveToNextAd()
        },
        (settings?.transitionDuration || 2) * 1000,
      )
    }

    const handleVideoError = (e: Event) => {
      const error = (e.target as HTMLVideoElement)?.error
      const errorMessage = error ? `Error ${error.code}: ${error.message}` : "Unknown video error"

      console.error("Video error for URL:", currentAd.videoUrl, errorMessage)

      // Add retry logic
      if (retryCount < MAX_RETRIES) {
        setRetryCount((prev) => prev + 1)
        console.log(`Retrying video load (attempt ${retryCount + 1}/${MAX_RETRIES})`)
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.load()
          }
        }, 1000)
      } else {
        setVideoError(`Failed to load: ${currentAd.title}`)
        setIsPlaying(false)
        setTimeout(() => {
          moveToNextAd()
        }, 3000)
      }
    }

    const handleVideoClick = () => {
      // Only track click if it's not a "Read More" click
      // Those are tracked separately
      if (!currentAd.readMoreUrl) {
        trackClick(currentAd.id, currentAd.ownerId)
      }
    }

    const handleCanPlay = () => {
      setVideoError(null)
      console.log("Video can play:", currentAd.title)
    }

    const handleLoadStart = () => {
      console.log("Loading video:", currentAd.videoUrl)
    }

    const handleWaiting = () => {
      console.log("Video buffering...")
    }

    const handleStalled = () => {
      console.log("Video stalled, checking connection...")
    }

    video.addEventListener("loadstart", handleLoadStart)
    video.addEventListener("canplay", handleCanPlay)
    video.addEventListener("play", handleVideoStart)
    video.addEventListener("ended", handleVideoEnd)
    video.addEventListener("error", handleVideoError)
    video.addEventListener("click", handleVideoClick)
    video.addEventListener("waiting", handleWaiting)
    video.addEventListener("stalled", handleStalled)

    // Set video source and load
    if (video.src !== currentAd.videoUrl) {
      video.src = currentAd.videoUrl
      video.load()
    }

    // Auto-play if enabled
    if (settings?.autoPlay !== false) {
      // Default to true if not set
      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error("Autoplay failed:", error)
          setVideoError("Autoplay blocked - click to start")
        })
      }
    }

    return () => {
      video.removeEventListener("loadstart", handleLoadStart)
      video.removeEventListener("canplay", handleCanPlay)
      video.removeEventListener("play", handleVideoStart)
      video.removeEventListener("ended", handleVideoEnd)
      video.removeEventListener("error", handleVideoError)
      video.removeEventListener("click", handleVideoClick)
      video.removeEventListener("waiting", handleWaiting)
      video.removeEventListener("stalled", handleStalled)
    }
  }, [
    currentAdIndex,
    ads,
    settings,
    watchStartTime,
    currentLocation,
    displayId,
    driverId,
    retryCount,
    preloadNextVideo,
    playlistMode,
    moveToNextAd,
  ])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-xl">Initializing display...</p>
        </div>
      </div>
    )
  }

  // Connection error state with retry options
  if (!playlistMode && connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-900 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connection Error</h2>
          <p className="mb-2">Unable to connect to the server. Please check your internet connection.</p>
          <p className="text-sm mb-4">
            Retry attempt: {connectionRetries + 1}/{MAX_CONNECTION_RETRIES + 1}
          </p>
          <div className="space-x-2">
            <button
              onClick={retryConnection}
              disabled={connectionRetries >= MAX_CONNECTION_RETRIES}
              className="px-4 py-2 bg-white text-red-900 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connectionRetries >= MAX_CONNECTION_RETRIES ? "Max Retries Reached" : "Retry Connection"}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Refresh Page
            </button>
          </div>
          {indexError && (
            <div className="mt-4 max-w-md mx-auto p-3 bg-yellow-800 bg-opacity-75 rounded">
              <p className="text-yellow-300 text-sm">
                Firestore index not found. Please create the required index by clicking the link in the console.
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // No ads state
  if (!playlistMode && ads.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Active Ads</h2>
          <p>Please wait while content is being loaded...</p>
          <div className="mt-4 text-sm opacity-75">
            <p>Display ID: {displayId}</p>
            {currentLocation && <p>Location: {currentLocation.address || "Unknown"}</p>}
          </div>
          {indexError && (
            <div className="mt-4 max-w-md mx-auto p-3 bg-yellow-800 bg-opacity-50 rounded">
              <p className="text-yellow-300 text-sm">
                Firestore index not found. Please create the required index by clicking the link in the console.
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (playlistMode) {
    return <ContentDisplay displayId={displayId} driverId={driverId} />
  }

  const currentAd = ads[currentAdIndex]

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: settings?.backgroundColor || "#000000" }}
    >
      {/* Weather Widget - Always visible in top left with high z-index */}
      <div className="fixed top-4 left-4 z-50">
        <WeatherWidget />
      </div>

      <div className="w-full h-full relative">
        {videoError ? (
          <div className="w-full h-full flex items-center justify-center bg-red-900 text-white">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">{videoError}</h3>
              <p className="text-sm mb-2">Skipping to next ad...</p>
              {retryCount > 0 && (
                <p className="text-xs opacity-75">
                  Retry attempts: {retryCount}/{MAX_RETRIES}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Main video */}
            <video
              ref={videoRef}
              className="w-full h-full object-cover cursor-pointer"
              controls={settings?.showControls || false}
              muted
              playsInline
              poster={currentAd.thumbnailUrl}
              preload="metadata"
              loop={false} // Don't loop individual videos, we handle looping manually
            />

            {/* Hidden preload video for next ad */}
            <video ref={nextVideoRef} className="hidden" muted playsInline preload="metadata" />
          </>
        )}

        {/* Ad Info Overlay - Fixed positioning with high z-index */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white p-4 rounded-lg max-w-sm z-40">
          <h3 className="font-bold text-lg">{currentAd.title}</h3>
          <p className="text-sm mt-1">{currentAd.description}</p>
          <div className="text-xs mt-2 opacity-75">
            Ad {currentAdIndex + 1} of {ads.length}
            {isPlaying && " • Playing"}
            {retryCount > 0 && ` • Retry ${retryCount}/${MAX_RETRIES}`}
          </div>
          <div className="text-xs mt-1 opacity-75">
            Display: {displayId.slice(0, 8)}... • Driver: {driverId.slice(0, 8)}...
          </div>

          {/* Read More Button - FIXED with proper visibility and positioning */}
          {currentAd.readMoreUrl && (
            <div className="mt-3">
              <button
                onClick={handleReadMoreClick}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 shadow-lg border-2 border-blue-400 hover:scale-105 z-50 relative"
              >
                <ExternalLink className="w-4 h-4" />
                Read More
              </button>
            </div>
          )}

          {/* Debug info for readMoreUrl */}
          {process.env.NODE_ENV === "development" && (
            <div className="text-xs mt-2 p-2 bg-yellow-600 bg-opacity-50 rounded">
              <p>ReadMore URL: {currentAd.readMoreUrl || "Not set"}</p>
              <p>Has URL: {currentAd.readMoreUrl ? "Yes" : "No"}</p>
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-600 z-30">
          <div
            className="h-full bg-white transition-all duration-1000"
            style={{
              width: `${((currentAdIndex + 1) / ads.length) * 100}%`,
            }}
          />
        </div>

        {/* Index Error Warning */}
        {indexError && (
          <div className="absolute top-4 right-4 bg-yellow-800 bg-opacity-75 text-yellow-300 p-2 rounded text-xs max-w-xs z-40">
            <p>Firestore index missing. Create the index using the link in the console.</p>
          </div>
        )}

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === "development" && (
          <div className="absolute top-20 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs z-40">
            <p>Video URL: {currentAd.videoUrl?.slice(0, 50)}...</p>
            <p>Status: {videoError ? "Error" : isPlaying ? "Playing" : "Loading"}</p>
            <p>
              Retries: {retryCount}/{MAX_RETRIES}
            </p>
            <p>
              Connection Retries: {connectionRetries}/{MAX_CONNECTION_RETRIES}
            </p>
            <p>Index Error: {indexError ? "Yes" : "No"}</p>
            {currentAd.readMoreUrl && <p>Read More URL: {currentAd.readMoreUrl.slice(0, 30)}...</p>}
            <p>Current Ad Index: {currentAdIndex}</p>
            <p>Total Ads: {ads.length}</p>
            <p>Watch Start Time: {watchStartTime}</p>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {currentAd.readMoreUrl && (
        <QRCodeModal
          url={currentAd.readMoreUrl}
          isOpen={showQRCode}
          onClose={() => setShowQRCode(false)}
          title={`Learn more about ${currentAd.title}`}
        />
      )}
    </div>
  )
}
