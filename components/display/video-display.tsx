"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { collection, query, where, orderBy, onSnapshot, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { analyticsService } from "@/lib/analytics-service"
import type { Ad, DisplaySettings } from "@/lib/types"
import { getCurrentLocation, watchLocation, type GeolocationData } from "@/lib/geolocation"
import { useToast } from "@/hooks/use-toast"
import { QRCodeModal } from "./qr-code-modal"
import { WeatherWidget } from "./weather-widget"
import { DigitalClock } from "./digital-clock"
import { TouchIndicator } from "./touch-indicator"
import { X } from "lucide-react"
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
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true)
  const [showTouchHint, setShowTouchHint] = useState(true)

  const videoRef = useRef<HTMLVideoElement>(null)
  const nextVideoRef = useRef<HTMLVideoElement>(null)
  const locationWatchId = useRef<number | null>(null)
  const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  const MAX_RETRIES = 3
  const MAX_CONNECTION_RETRIES = 5

  // Hide touch hint after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTouchHint(false)
    }, 10000)

    return () => clearTimeout(timer)
  }, [])

  // Test analytics on component mount
  useEffect(() => {
    const testAnalytics = async () => {
      try {
        const result = await analyticsService.testAnalyticsWrite()
        setAnalyticsEnabled(result)
        console.log("Analytics system test:", result ? "PASSED" : "FAILED")

        if (!result) {
          toast({
            title: "Analytics Warning",
            description: "Analytics tracking is not working. Data may not be recorded.",
            variant: "warning",
          })
        }
      } catch (error) {
        console.error("Analytics test error:", error)
        setAnalyticsEnabled(false)
      }
    }

    testAnalytics()
  }, [toast])

  useEffect(() => {
    const checkPlaylistItems = async () => {
      try {
        const playlistQuery = query(collection(db, "playlist"))
        const snapshot = await getDocs(playlistQuery)

        setPlaylistMode(!snapshot.empty)
        setLoading(false)
      } catch (error) {
        console.error("Error checking playlist:", error)
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
          console.log("Fetching active ads...")

          const adsQuery = indexError
            ? query(collection(db, "ads"), where("status", "==", "active"))
            : query(collection(db, "ads"), where("status", "==", "active"), orderBy("order"))

          try {
            unsubscribeAds = onSnapshot(
              adsQuery,
              (snapshot) => {
                let adsData = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                  createdAt: doc.data().createdAt?.toDate(),
                  updatedAt: doc.data().updatedAt?.toDate(),
                })) as Ad[]

                if (indexError) {
                  adsData = adsData.sort((a, b) => {
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

                if (error.message && error.message.includes("index")) {
                  console.log("Index error detected, switching to non-ordered query")
                  setIndexError(true)
                }

                getDocs(indexError ? query(collection(db, "ads"), where("status", "==", "active")) : adsQuery)
                  .then((snapshot) => {
                    let adsData = snapshot.docs.map((doc) => ({
                      id: doc.id,
                      ...doc.data(),
                      createdAt: doc.data().createdAt?.toDate(),
                      updatedAt: doc.data().updatedAt?.toDate(),
                    })) as Ad[]

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

          console.log("Fetching display settings...")
          const settingsQuery = query(collection(db, "settings"))

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

  // Track view using analytics service
  const trackView = async (adId: string, ownerId: string) => {
    if (!analyticsEnabled) return

    try {
      await analyticsService.trackView(adId, ownerId, displayId, driverId, "ad", currentLocation || undefined)
      console.log("View tracked for ad:", adId, "Owner:", ownerId)
    } catch (error) {
      console.error("Error tracking view:", error)
    }
  }

  // Track watch time using analytics service
  const trackWatchTime = async (adId: string, ownerId: string, watchTime: number) => {
    if (!analyticsEnabled) return

    try {
      await analyticsService.trackWatchTime(
        adId,
        ownerId,
        displayId,
        driverId,
        watchTime,
        "ad",
        currentLocation || undefined,
      )
      console.log("Watch time tracked:", Math.round(watchTime), "seconds for ad:", adId)
    } catch (error) {
      console.error("Error tracking watch time:", error)
    }
  }

  // Track click using analytics service
  const trackClick = async (adId: string, ownerId: string) => {
    if (!analyticsEnabled) return

    try {
      await analyticsService.trackClick(adId, ownerId, displayId, driverId, "ad", currentLocation || undefined)
      console.log("Click tracked for ad:", adId, "Owner:", ownerId)
    } catch (error) {
      console.error("Error tracking click:", error)
    }
  }

  const handleReadMoreClick = () => {
    const currentAd = ads[currentAdIndex]
    if (currentAd && currentAd.readMoreUrl) {
      trackClick(currentAd.id, currentAd.ownerId)
      setShowQRCode(true)
    }
  }

  // Enhanced moveToNextAd with proper looping
  const moveToNextAd = useCallback(() => {
    // Clear any existing timeout
    if (loopTimeoutRef.current) {
      clearTimeout(loopTimeoutRef.current)
      loopTimeoutRef.current = null
    }

    // Track watch time before moving to next ad
    const currentAd = ads[currentAdIndex]
    if (currentAd && watchStartTime > 0) {
      const watchTime = (Date.now() - watchStartTime) / 1000
      if (watchTime > 1) {
        trackWatchTime(currentAd.id, currentAd.ownerId, watchTime)
      }
    }

    // Move to next ad (loop back to 0 if at end)
    setCurrentAdIndex((prev) => {
      const nextIndex = (prev + 1) % ads.length
      console.log(`Moving from ad ${prev + 1} to ad ${nextIndex + 1} of ${ads.length}`)
      return nextIndex
    })

    setVideoError(null)
    setIsPlaying(false)
    setRetryCount(0)
    setWatchStartTime(0)
  }, [ads, currentAdIndex, watchStartTime])

  const preloadNextVideo = useCallback(() => {
    if (ads.length <= 1) return

    const nextIndex = (currentAdIndex + 1) % ads.length
    const nextAd = ads[nextIndex]

    if (nextAd && nextAd.videoUrl && nextVideoRef.current) {
      if (nextVideoRef.current.src !== nextAd.videoUrl) {
        nextVideoRef.current.src = nextAd.videoUrl
        nextVideoRef.current.preload = "metadata"
        nextVideoRef.current.load()
      }
    }
  }, [ads, currentAdIndex])

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

  // Enhanced video event handlers with proper looping
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

      setTimeout(preloadNextVideo, 1000)
    }

    const handleVideoEnd = () => {
      const watchTime = (Date.now() - watchStartTime) / 1000
      setIsPlaying(false)

      if (watchTime > 1) {
        trackWatchTime(currentAd.id, currentAd.ownerId, watchTime)
      }

      console.log("Video ended, moving to next ad in", settings?.transitionDuration || 2, "seconds")

      // Use timeout for transition delay, then move to next ad
      loopTimeoutRef.current = setTimeout(
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
        loopTimeoutRef.current = setTimeout(() => {
          moveToNextAd()
        }, 3000)
      }
    }

    const handleVideoClick = () => {
      if (currentAd.readMoreUrl) {
        trackClick(currentAd.id, currentAd.ownerId)
        handleReadMoreClick()
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loopTimeoutRef.current) {
        clearTimeout(loopTimeoutRef.current)
      }
    }
  }, [])

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
    <>
      {/* Main Container - Full viewport */}
      <div className="fixed inset-0 w-screen h-screen bg-black overflow-hidden">
        {/* Video Container */}
        <div className="relative w-full h-full">
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
                className="w-full h-full object-cover"
                controls={settings?.showControls || false}
                muted
                playsInline
                poster={currentAd.thumbnailUrl}
                preload="metadata"
                style={{ backgroundColor: settings?.backgroundColor || "#000000" }}
              />

              {/* Hidden preload video for next ad */}
              <video ref={nextVideoRef} className="hidden" muted playsInline preload="metadata" />

              {/* Ad Info Panel - Right Side (like in your image) */}
              <div className="absolute top-0 right-0 w-80 h-full bg-white/95 backdrop-blur-sm flex flex-col">
                <div className="flex-1 p-6 flex flex-col justify-center">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentAd.title}</h2>
                    <p className="text-gray-700 leading-relaxed">{currentAd.description}</p>
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
            </>
          )}
        </div>
      </div>

      {/* Fixed UI Elements */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Top Left - Weather Widget */}
        <div className="absolute top-4 left-4 pointer-events-auto">
          <WeatherWidget />
        </div>

        {/* Top Right - Digital Clock */}
        <div className="absolute top-4 right-4 pointer-events-auto mr-80">
          <DigitalClock />
        </div>

        {/* Bottom Right - Touch Indicator */}
        {showTouchHint && (
          <div className="absolute bottom-4 right-4 pointer-events-auto mr-80">
            <TouchIndicator />
          </div>
        )}

        {/* Progress Indicator - Bottom Full Width */}
        <div className="absolute bottom-0 left-0 w-full">
          <div className="w-full h-1 bg-gray-600">
            <div
              className="h-full bg-white transition-all duration-1000"
              style={{
                width: `${((currentAdIndex + 1) / ads.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Item Counter - Bottom Center */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <div className="bg-black/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
            {currentAdIndex + 1} / {ads.length}
          </div>
        </div>

        {/* Analytics Status Indicator */}
        {!analyticsEnabled && (
          <div className="absolute top-16 right-4 pointer-events-auto mr-80">
            <div className="bg-red-600 text-white px-3 py-1 rounded text-sm">Analytics Disabled</div>
          </div>
        )}

        {/* Index Error Warning */}
        {indexError && (
          <div className="absolute top-28 right-4 pointer-events-auto mr-80">
            <div className="bg-yellow-800/75 text-yellow-300 p-2 rounded text-xs max-w-xs">
              <p>Firestore index missing. Create the index using the link in the console.</p>
            </div>
          </div>
        )}
      </div>

      {/* QR Code Modal - Portal level */}
      {currentAd.readMoreUrl && (
        <QRCodeModal
          url={currentAd.readMoreUrl}
          isOpen={showQRCode}
          onClose={() => setShowQRCode(false)}
          title={`Learn more about ${currentAd.title}`}
        />
      )}
    </>
  )
}
