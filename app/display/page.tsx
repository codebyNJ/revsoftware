"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { VideoDisplay } from "@/components/display/video-display"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { Home } from "lucide-react"

export default function DisplayPage() {
  const [pin, setPin] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [displayId, setDisplayId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string>("")
  const [initializing, setInitializing] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  const goToSuperPage = () => {
    router.push("/super")
  }

  // Check for existing authentication on component mount
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const storedDisplayId = localStorage.getItem("displayId")
        const storedDisplayName = localStorage.getItem("displayName")
        const storedPin = localStorage.getItem("displayPin")

        if (storedDisplayId && storedPin) {
          // Verify the stored credentials are still valid
          const displaysQuery = query(
            collection(db, "displays"),
            where("pin", "==", storedPin),
            where("status", "==", "active"),
          )
          const displaysSnapshot = await getDocs(displaysQuery)

          if (!displaysSnapshot.empty) {
            const displayDoc = displaysSnapshot.docs.find((doc) => doc.id === storedDisplayId)
            if (displayDoc) {
              setDisplayId(storedDisplayId)
              setDisplayName(storedDisplayName || "Display")
              setIsAuthenticated(true)

              // Update last seen
              await updateDoc(doc(db, "displays", storedDisplayId), {
                lastSeen: serverTimestamp(),
              })

              toast({
                title: "Display Reconnected",
                description: `Connected to ${storedDisplayName || "Display"}`,
              })
            } else {
              // Clear invalid stored data
              localStorage.removeItem("displayId")
              localStorage.removeItem("displayName")
              localStorage.removeItem("displayPin")
            }
          } else {
            // Clear invalid stored data
            localStorage.removeItem("displayId")
            localStorage.removeItem("displayName")
            localStorage.removeItem("displayPin")
          }
        }
      } catch (error) {
        console.error("Error checking existing auth:", error)
        // Clear potentially corrupted data
        localStorage.removeItem("displayId")
        localStorage.removeItem("displayName")
        localStorage.removeItem("displayPin")
      } finally {
        setInitializing(false)
      }
    }

    checkExistingAuth()
  }, [toast])

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin || pin.length !== 6) {
      toast({
        title: "Invalid PIN",
        description: "Please enter a 6-digit PIN.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Query the displays collection to find a display with the matching PIN
      const displaysQuery = query(collection(db, "displays"), where("pin", "==", pin), where("status", "==", "active"))
      const displaysSnapshot = await getDocs(displaysQuery)

      if (displaysSnapshot.empty) {
        toast({
          title: "Invalid PIN",
          description: "The PIN you entered does not match any active display.",
          variant: "destructive",
        })
        return
      }

      // Get the first matching display
      const displayDoc = displaysSnapshot.docs[0]
      const displayData = displayDoc.data()

      // Store the display information in local storage for persistence
      localStorage.setItem("displayId", displayDoc.id)
      localStorage.setItem("displayName", displayData.name || "Display")
      localStorage.setItem("displayPin", pin)

      // Update last seen timestamp
      await updateDoc(doc(db, "displays", displayDoc.id), {
        lastSeen: serverTimestamp(),
      })

      setDisplayId(displayDoc.id)
      setDisplayName(displayData.name || "Display")
      setIsAuthenticated(true)

      toast({
        title: "Display Authenticated",
        description: `Connected to ${displayData.name || "Display"}`,
      })
    } catch (error) {
      console.error("Error authenticating display:", error)
      toast({
        title: "Authentication Error",
        description: "Failed to authenticate display. Please check your connection and try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = () => {
    localStorage.removeItem("displayId")
    localStorage.removeItem("displayName")
    localStorage.removeItem("displayPin")
    setIsAuthenticated(false)
    setDisplayId(null)
    setDisplayName("")
    setPin("")
    toast({
      title: "Disconnected",
      description: "Display has been disconnected.",
    })
  }

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Initializing display...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated && displayId) {
    return (
      <div className="relative">
        <VideoDisplay displayId={displayId} />
        {/* Hidden disconnect button - press Ctrl+D to disconnect */}
        <div className="fixed top-4 right-4 opacity-0 hover:opacity-100 transition-opacity">
          <Button variant="destructive" size="sm" onClick={handleDisconnect} className="bg-red-600 hover:bg-red-700">
            Disconnect
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">REV Display Terminal</CardTitle>
          <CardDescription>Enter the 6-digit display PIN to start streaming content</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                id="pin"
                type="text"
                placeholder="Enter 6-digit PIN"
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6)
                  setPin(value)
                }}
                className="text-center text-2xl tracking-widest font-mono"
                maxLength={6}
                required
                autoFocus
              />
              <p className="text-xs text-gray-500 text-center">Enter the PIN provided by your administrator</p>
            </div>
            <Button type="submit" className="w-full" disabled={loading || pin.length !== 6}>
              {loading ? "Authenticating..." : "Connect Display"}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={goToSuperPage}>
              <Home className="w-4 h-4 mr-2" />
              Go to Super Page
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
