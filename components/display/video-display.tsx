"use client"

import { useState, useEffect, useRef } from "react"
import { collection, query, where, orderBy, onSnapshot, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Ad, DisplaySettings } from "@/lib/types"
import { getCurrentLocation, watchLocation, type GeolocationData } from "@/lib/geolocation"
import { useToast } from "@/hooks/use-toast"

interface VideoDisplayProps {
  displayId: string
}

export function VideoDisplay({ displayId }: VideoDisplayProps) {
  const [ads, setAds] = useState<Ad[]>([])
  const [currentAdIndex, setCurrentAdIndex] = useState(0)
  const [settings, setSettings] = useState<DisplaySettings | null>(null)
  const [connectionError, setConnectionError] = useState(false)
  const [watchStartTime, setWatchStartTime] = useState<number>(0)
  const [currentLocation, setCurrentLocation] = useState<GeolocationData | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const locationWatchId = useRef<number | null>(null)
  const { toast } = useToast()

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

  useEffect(() => {
    try {
      // Fetch active ads
      const adsQuery = query(collection(db, "ads"), where("status", "==", "active"), orderBy("order"))

      const unsubscribeAds = onSnapshot(
        adsQuery,
        (snapshot) => {
          const adsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
          })) as Ad[]
          setAds(adsData)
          setConnectionError(false)

          if (adsData.length === 0) {
            console.log("No active ads found")
          } else {
            console.log(`Loaded ${adsData.length} active ads`)
          }
        },
        (error) => {
          console.error("Error fetching ads:", error)
          setConnectionError(true)
        },
      )

      // Fetch display settings
      const settingsQuery = query(collection(db, "settings"))
      const unsubscribeSettings = onSnapshot(
        settingsQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const settingsData = snapshot.docs[0].data() as DisplaySettings
            setSettings(settingsData)
            console.log("Display settings loaded:", settingsData)
          }
        },
        (error) => {
          console.error("Error fetching settings:", error)
        },
      )

      return () => {
        unsubscribeAds()
        unsubscribeSettings()
      }
    } catch (error) {
      console.error("Error setting up display:", error)
      setConnectionError(true)
    }
  }, [])

  // Track analytics with geolocation
  const trackView = async (adId: string, ownerId: string) => {
    try {
      const today = new Date().toISOString().split("T")[0]
      const hour = new Date().getHours()

      await addDoc(collection(db, "analytics"), {
        adId,
        clicks: 0,
        date: today,
        displayId,
        driverId: "",
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
      })
      console.log("View tracked for ad:", adId)
    } catch (error) {
      console.error("Error tracking view:", error)
    }
  }

  const trackWatchTime = async (adId: string, ownerId: string, watchTime: number) => {
    try {
      const today = new Date().toISOString().split("T")[0]

      await addDoc(collection(db, "analytics"), {
        adId,
        clicks: 0,
        date: today,
        displayId,
        driverId: "",
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
      })
      console.log("Watch time tracked:", Math.round(watchTime), "seconds")
    } catch (error) {
      console.error("Error tracking watch time:", error)
    }
  }

  const trackClick = async (adId: string, ownerId: string) => {
    try {
      const today = new Date().toISOString().split("T")[0]
      const hour = new Date().getHours()

      await addDoc(collection(db, "analytics"), {
        adId,
        clicks: 1,
        date: today,
        displayId,
        driverId: "",
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
      })
      console.log("Click tracked for ad:", adId)
    } catch (error) {
      console.error("Error tracking click:", error)
    }
  }

  const moveToNextAd = () => {
    setCurrentAdIndex((prev) => (prev + 1) % ads.length)
    setVideoError(null)
    setIsPlaying(false)
  }

  useEffect(() => {
    if (ads.length === 0) return

    const currentAd = ads[currentAdIndex]
    if (!currentAd || !videoRef.current) return

    const video = videoRef.current

    const handleVideoStart = () => {
      setWatchStartTime(Date.now())
      setIsPlaying(true)
      setVideoError(null)
      trackView(currentAd.id, currentAd.ownerId)
      console.log("Video started:", currentAd.title)
    }

    const handleVideoEnd = () => {
      const watchTime = (Date.now() - watchStartTime) / 1000
      setIsPlaying(false)

      if (watchTime > 1) {
        trackWatchTime(currentAd.id, currentAd.ownerId, watchTime)
      }

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
      setVideoError(`Failed to load: ${currentAd.title}`)
      setIsPlaying(false)

      setTimeout(() => {
        moveToNextAd()
      }, 3000)
    }

    const handleVideoClick = () => {
      trackClick(currentAd.id, currentAd.ownerId)
    }

    const handleCanPlay = () => {
      setVideoError(null)
      console.log("Video can play:", currentAd.title)
    }

    const handleLoadStart = () => {
      console.log("Loading video:", currentAd.videoUrl)
    }

    video.addEventListener("loadstart", handleLoadStart)
    video.addEventListener("canplay", handleCanPlay)
    video.addEventListener("play", handleVideoStart)
    video.addEventListener("ended", handleVideoEnd)
    video.addEventListener("error", handleVideoError)
    video.addEventListener("click", handleVideoClick)

    // Auto-play if enabled
    if (settings?.autoPlay) {
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
    }
  }, [currentAdIndex, ads, settings, watchStartTime, currentLocation, displayId])

  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-900 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connection Error</h2>
          <p>Unable to connect to the server. Please check your internet connection.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-white text-red-900 rounded hover:bg-gray-100"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (ads.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Active Ads</h2>
          <p>Please wait while content is being loaded...</p>
          <div className="mt-4 text-sm opacity-75">
            <p>Display ID: {displayId}</p>
            {currentLocation && <p>Location: {currentLocation.address || "Unknown"}</p>}
          </div>
        </div>
      </div>
    )
  }

  const currentAd = ads[currentAdIndex]

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{ backgroundColor: settings?.backgroundColor || "#000000" }}
    >
      <div className="w-full h-full relative">
        {videoError ? (
          <div className="w-full h-full flex items-center justify-center bg-red-900 text-white">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">{videoError}</h3>
              <p className="text-sm">Skipping to next ad...</p>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={currentAd.videoUrl}
            className="w-full h-full object-cover cursor-pointer"
            controls={settings?.showControls || false}
            muted
            playsInline
            poster={currentAd.thumbnailUrl}
            crossOrigin="anonymous"
          />
        )}

        {/* Ad Info Overlay */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white p-4 rounded">
          <h3 className="font-bold">{currentAd.title}</h3>
          <p className="text-sm">{currentAd.description}</p>
          <div className="text-xs mt-2">
            Ad {currentAdIndex + 1} of {ads.length}
            {isPlaying && " • Playing"}
          </div>
          <div className="text-xs mt-1 opacity-75">Display: {displayId.slice(0, 8)}...</div>
        </div>

        {/* Progress Indicator */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-600">
          <div
            className="h-full bg-white transition-all duration-1000"
            style={{
              width: `${((currentAdIndex + 1) / ads.length) * 100}%`,
            }}
          />
        </div>

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === "development" && (
          <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs">
            <p>Video URL: {currentAd.videoUrl.slice(0, 50)}...</p>
            <p>Status: {videoError ? "Error" : isPlaying ? "Playing" : "Loading"}</p>
          </div>
        )}
      </div>
    </div>
  )
}
