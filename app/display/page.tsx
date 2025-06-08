"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { VideoDisplay } from "@/components/display/video-display"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { Home, Phone, User, AlertCircle } from "lucide-react"
import { getCurrentLocation } from "@/lib/geolocation"
import { DeviceMonitor, KioskManager } from "@/lib/device-monitor"

export default function DisplayPage() {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [driverName, setDriverName] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [displayId, setDisplayId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string>("")
  const [driverId, setDriverId] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [authStep, setAuthStep] = useState<string>("")
  const { toast } = useToast()
  const router = useRouter()

  const addDebugInfo = (message: string) => {
    console.log("DEBUG:", message)
    setDebugInfo((prev) => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const goToSuperPage = () => {
    router.push("/")
  }

  // Format phone number as user types
  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "")
    const trimmed = cleaned.substring(0, 10)

    if (trimmed.length > 6) {
      return `${trimmed.substring(0, 3)}-${trimmed.substring(3, 6)}-${trimmed.substring(6)}`
    } else if (trimmed.length > 3) {
      return `${trimmed.substring(0, 3)}-${trimmed.substring(3)}`
    }
    return trimmed
  }

  // Check for existing authentication on component mount
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        addDebugInfo("Checking existing authentication...")
        setAuthStep("Checking stored credentials")

        const storedDisplayId = localStorage.getItem("displayId")
        const storedDisplayName = localStorage.getItem("displayName")
        const storedDriverId = localStorage.getItem("driverId")
        const storedPhoneNumber = localStorage.getItem("driverPhone")
        const storedSessionId = localStorage.getItem("sessionId")

        addDebugInfo(
          `Found stored data: Display=${!!storedDisplayId}, Driver=${!!storedDriverId}, Session=${!!storedSessionId}`,
        )

        if (storedDisplayId && storedDriverId && storedSessionId) {
          addDebugInfo("Verifying stored credentials with database...")
          setAuthStep("Verifying credentials")

          const displaysQuery = query(collection(db, "displays"), where("status", "==", "active"))
          const displaysSnapshot = await getDocs(displaysQuery)

          if (!displaysSnapshot.empty) {
            const displayDoc = displaysSnapshot.docs.find((doc) => doc.id === storedDisplayId)
            if (displayDoc) {
              addDebugInfo("Valid credentials found, restoring session...")

              // Set all state at once
              setDisplayId(storedDisplayId)
              setDisplayName(storedDisplayName || "Display")
              setDriverId(storedDriverId)

              // Update last seen
              try {
                await updateDoc(doc(db, "driver_sessions", storedSessionId), {
                  lastSeen: serverTimestamp(),
                })
                addDebugInfo("Session updated successfully")
              } catch (error) {
                addDebugInfo(`Session update failed: ${error.message}`)
              }

              // Set authenticated state LAST
              setIsAuthenticated(true)
              setAuthStep("Authenticated")

              toast({
                title: "Display Reconnected",
                description: `Connected to ${storedDisplayName || "Display"}`,
              })

              addDebugInfo("Authentication restored successfully!")
            } else {
              addDebugInfo("Display not found in database, clearing stored data")
              clearStoredData()
            }
          } else {
            addDebugInfo("No active displays found, clearing stored data")
            clearStoredData()
          }
        } else {
          addDebugInfo("No stored authentication data found")
        }
      } catch (error) {
        console.error("Error checking existing auth:", error)
        addDebugInfo(`Error checking auth: ${error.message}`)
        clearStoredData()
      } finally {
        setInitializing(false)
        setAuthStep("")
      }
    }

    checkExistingAuth()
  }, [toast])

  const clearStoredData = () => {
    localStorage.removeItem("displayId")
    localStorage.removeItem("displayName")
    localStorage.removeItem("driverId")
    localStorage.removeItem("driverPhone")
    localStorage.removeItem("sessionId")
    addDebugInfo("Cleared all stored data")
  }

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanedPhone = phoneNumber.replace(/\D/g, "")

    if (!cleanedPhone || cleanedPhone.length !== 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit phone number.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setDebugInfo([]) // Clear previous debug info
    addDebugInfo("Starting authentication process...")
    setAuthStep("Finding driver")

    try {
      // Step 1: Find driver by phone number
      addDebugInfo(`Looking for driver with phone: ${cleanedPhone}`)

      const driversQuery = query(
        collection(db, "drivers"),
        where("phone", "==", cleanedPhone),
        where("status", "==", "active"),
      )
      const driversSnapshot = await getDocs(driversQuery)

      if (driversSnapshot.empty) {
        addDebugInfo("❌ No driver found with this phone number")
        toast({
          title: "Driver Not Found",
          description: "No active driver found with this phone number. Please contact your administrator.",
          variant: "destructive",
        })
        setLoading(false)
        setAuthStep("")
        return
      }

      const driverDoc = driversSnapshot.docs[0]
      const driverData = driverDoc.data()
      addDebugInfo(`✅ Found driver: ${driverData.name} (ID: ${driverDoc.id})`)
      setAuthStep("Finding display")

      // Step 2: Get available displays
      addDebugInfo("Looking for available displays...")

      const displaysQuery = query(collection(db, "displays"), where("status", "==", "active"))
      const displaysSnapshot = await getDocs(displaysQuery)

      if (displaysSnapshot.empty) {
        addDebugInfo("❌ No active displays found")
        toast({
          title: "No Displays Available",
          description: "There are no active displays in the system. Please contact your administrator.",
          variant: "destructive",
        })
        setLoading(false)
        setAuthStep("")
        return
      }

      const displayDoc = displaysSnapshot.docs[0] // Use first available display
      const displayData = displayDoc.data()
      addDebugInfo(`✅ Selected display: ${displayData.name} (ID: ${displayDoc.id})`)
      setAuthStep("Getting location")

      // Step 3: Get current location (optional)
      addDebugInfo("Getting current location...")
      let locationData = null
      try {
        locationData = await getCurrentLocation()
        addDebugInfo(`✅ Location obtained: ${locationData.address || "Unknown"}`)
      } catch (error) {
        addDebugInfo(`⚠️ Location failed: ${error.message}`)
      }
      setAuthStep("Creating session")

      // Step 4: Create driver session
      addDebugInfo("Creating driver session...")

      const sessionData = {
        driverId: driverDoc.id,
        driverName: driverData.name,
        phoneNumber: cleanedPhone,
        displayId: displayDoc.id,
        displayName: displayData.name,
        startTime: serverTimestamp(),
        lastSeen: serverTimestamp(),
        isActive: true,
        location: locationData
          ? {
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              address: locationData.address || "",
              accuracy: locationData.accuracy,
            }
          : null,
      }

      const sessionRef = await addDoc(collection(db, "driver_sessions"), sessionData)
      addDebugInfo(`✅ Session created with ID: ${sessionRef.id}`)
      setAuthStep("Updating display")

      // Step 5: Update display
      try {
        await updateDoc(doc(db, "displays", displayDoc.id), {
          lastSeen: serverTimestamp(),
          currentDriverId: driverDoc.id,
          currentDriverName: driverData.name,
        })
        addDebugInfo("✅ Display updated successfully")
      } catch (error) {
        addDebugInfo(`⚠️ Display update failed: ${error.message}`)
      }

      // Step 6: Ensure display status remains consistent
      try {
        await updateDoc(doc(db, "displays", displayDoc.id), {
          status: "active", // Explicitly set to active
          isOnline: true,
          lastSeen: serverTimestamp(),
          currentDriverId: driverDoc.id,
          currentDriverName: driverData.name,
          updatedAt: serverTimestamp(),
        })
        addDebugInfo("✅ Display status set to active")
      } catch (error) {
        addDebugInfo(`⚠️ Display status update failed: ${error.message}`)
      }
      setAuthStep("Saving session")

      // Step 7: Store session information
      localStorage.setItem("displayId", displayDoc.id)
      localStorage.setItem("displayName", displayData.name || "Display")
      localStorage.setItem("driverId", driverDoc.id)
      localStorage.setItem("driverPhone", cleanedPhone)
      localStorage.setItem("sessionId", sessionRef.id)
      addDebugInfo("✅ Session data stored locally")
      setAuthStep("Finalizing")

      // Step 8: Update state to trigger redirect
      addDebugInfo("Setting authentication state...")

      // Set all state synchronously
      setDisplayId(displayDoc.id)
      setDisplayName(displayData.name || "Display")
      setDriverId(driverDoc.id)

      // Small delay to ensure state is set before authentication
      setTimeout(() => {
        setIsAuthenticated(true)
        addDebugInfo("🎉 Authentication completed successfully!")
        setAuthStep("Authenticated")

        toast({
          title: "Display Connected!",
          description: `Connected to ${displayData.name || "Display"} as ${driverData.name}`,
        })
      }, 100)
    } catch (error) {
      console.error("Error authenticating display:", error)
      addDebugInfo(`❌ Authentication failed: ${error.message}`)
      toast({
        title: "Authentication Error",
        description: `Failed to authenticate: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      const sessionId = localStorage.getItem("sessionId")
      const storedDisplayId = localStorage.getItem("displayId")

      if (sessionId) {
        await updateDoc(doc(db, "driver_sessions", sessionId), {
          isActive: false,
          endTime: serverTimestamp(),
        })
      }

      // Set display to inactive when disconnecting
      if (storedDisplayId) {
        await updateDoc(doc(db, "displays", storedDisplayId), {
          status: "inactive",
          isOnline: false,
          currentDriverId: null,
          currentDriverName: null,
          lastSeen: serverTimestamp(),
        })
      }
    } catch (error) {
      console.error("Error ending session:", error)
    }

    clearStoredData()
    setIsAuthenticated(false)
    setDisplayId(null)
    setDisplayName("")
    setDriverId(null)
    setPhoneNumber("")
    setDriverName("")
    setAuthStep("")
    addDebugInfo("Disconnected successfully")

    toast({
      title: "Disconnected",
      description: "Display has been disconnected.",
    })
  }

  // Force re-render when authentication state changes
  useEffect(() => {
    console.log("Authentication state changed:", {
      isAuthenticated,
      displayId,
      driverId,
      loading,
      initializing,
    })
  }, [isAuthenticated, displayId, driverId, loading, initializing])

  // Initialize device monitoring and kiosk mode
  useEffect(() => {
    const initializeDeviceFeatures = async () => {
      try {
        // Initialize device monitoring with display and driver IDs
        const monitor = DeviceMonitor.getInstance()
        await monitor.initialize(displayId || undefined, driverId || undefined)

        // Auto-enter kiosk mode after successful authentication
        if (isAuthenticated && displayId && driverId) {
          console.log("🖥️ Auto-entering kiosk mode for display...")
          await KioskManager.enterKioskMode()
        }
      } catch (error) {
        console.error("Failed to initialize device features:", error)
      }
    }

    if (isAuthenticated) {
      initializeDeviceFeatures()
    }

    return () => {
      // Cleanup on unmount
      if (isAuthenticated) {
        const monitor = DeviceMonitor.getInstance()
        monitor.destroy()
      }
    }
  }, [isAuthenticated, displayId, driverId])

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-lg">Initializing display...</p>
          {authStep && <p className="mt-2 text-sm text-blue-600">{authStep}</p>}
          <div className="mt-4 text-left">
            {debugInfo.map((info, index) => (
              <p key={index} className="text-xs text-gray-600 mb-1">
                {info}
              </p>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Enhanced VideoDisplay container with proper fullscreen support
  if (isAuthenticated && displayId && driverId) {
    console.log("Rendering VideoDisplay with:", { displayId, driverId })
    return (
      <div className="fixed inset-0 w-full h-full bg-black overflow-hidden">
        {/* VideoDisplay with full container */}
        <div className="w-full h-full relative">
          <VideoDisplay displayId={displayId} driverId={driverId} />
        </div>

        {/* Floating disconnect button with better positioning */}
        <div className="fixed top-4 right-4 z-[9999] opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDisconnect}
            className="shadow-lg backdrop-blur-sm bg-red-600/90 hover:bg-red-700 text-white border border-red-500"
          >
            Disconnect
          </Button>
        </div>

        {/* Debug info overlay (hidden by default, can be toggled) */}
        {process.env.NODE_ENV === "development" && (
          <div className="fixed bottom-4 left-4 z-[9998] max-w-sm opacity-0 hover:opacity-100 transition-opacity duration-300">
            <div className="bg-black/80 text-white text-xs p-2 rounded backdrop-blur-sm">
              <p>Display: {displayId}</p>
              <p>Driver: {driverId}</p>
              <p>Auth: {isAuthenticated.toString()}</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">REV Display Terminal</CardTitle>
          <CardDescription>Enter your phone number to start streaming content</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <Phone className="w-5 h-5 mr-2 text-gray-500" />
                <label htmlFor="phone">Driver Phone Number</label>
              </div>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter 10-digit phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                className="text-center text-xl tracking-wider font-mono"
                required
                autoFocus
                disabled={loading}
              />
              <p className="text-xs text-gray-500 text-center">Format: XXX-XXX-XXXX</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <User className="w-5 h-5 mr-2 text-gray-500" />
                <label htmlFor="name">Driver Name (Optional)</label>
              </div>
              <Input
                id="name"
                type="text"
                placeholder="Your name (optional)"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="text-center"
                disabled={loading}
              />
            </div>

            {authStep && (
              <div className="flex items-center justify-center p-2 bg-blue-50 rounded">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-sm text-blue-700">{authStep}...</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || phoneNumber.replace(/\D/g, "").length !== 10}>
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting...
                </div>
              ) : (
                "Connect Display"
              )}
            </Button>

            <Button type="button" variant="outline" className="w-full" onClick={goToSuperPage} disabled={loading}>
              <Home className="w-4 h-4 mr-2" />
              Go to Super Admin
            </Button>
          </form>

          {/* Debug Information */}
          {debugInfo.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded max-h-40 overflow-y-auto">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-4 h-4 text-gray-600 mr-2" />
                <span className="text-sm font-medium text-gray-800">Debug Log</span>
              </div>
              {debugInfo.map((info, index) => (
                <p key={index} className="text-xs text-gray-600 mb-1 font-mono">
                  {info}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
