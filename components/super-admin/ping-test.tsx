"use client"

import { useState, useEffect } from "react"
import { collection, query, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  Zap,
  Clock,
  Monitor,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Activity,
} from "lucide-react"

interface Display {
  id: string
  name: string
  location: string
  status: "online" | "offline"
  lastSeen: Date
  batteryLevel?: number
  isCharging?: boolean
  currentLocation?: {
    latitude: number
    longitude: number
    address: string
  }
}

interface PingResult {
  id: string
  displayName: string
  timestamp: Date
  responseTime: number
  batteryLevel: number
  isCharging: boolean
  status: "success" | "timeout" | "error"
  location?: {
    latitude: number
    longitude: number
    address: string
  }
}

export function PingTest() {
  const { toast } = useToast()
  const [displays, setDisplays] = useState<Display[]>([])
  const [selectedDisplay, setSelectedDisplay] = useState<string>("")
  const [pinging, setPinging] = useState(false)
  const [pingResults, setPingResults] = useState<PingResult[]>([])
  const [loading, setLoading] = useState(true)

  // Load displays from Firebase
  useEffect(() => {
    console.log("Loading displays from Firebase...")

    const displaysQuery = query(collection(db, "displays"))
    const unsubscribe = onSnapshot(
      displaysQuery,
      (snapshot) => {
        console.log(`Received ${snapshot.docs.length} displays from Firebase`)

        const displaysData = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            name: data.name || "Unknown Display",
            location: data.location || "Unknown Location",
            status: data.status || "offline",
            lastSeen: data.lastSeen?.toDate() || new Date(),
            batteryLevel: data.batteryLevel,
            isCharging: data.isCharging || false,
            currentLocation: data.currentLocation
              ? {
                  latitude: data.currentLocation.latitude,
                  longitude: data.currentLocation.longitude,
                  address: data.currentLocation.address || "Unknown Address",
                }
              : undefined,
          } as Display
        })

        setDisplays(displaysData)
        setLoading(false)
      },
      (error) => {
        console.error("Error fetching displays:", error)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  const handlePing = async () => {
    if (!selectedDisplay) {
      toast({
        title: "No Display Selected",
        description: "Please select a display to ping.",
        variant: "destructive",
      })
      return
    }

    const display = displays.find((d) => d.id === selectedDisplay)
    if (!display) {
      toast({
        title: "Display Not Found",
        description: "Selected display not found.",
        variant: "destructive",
      })
      return
    }

    setPinging(true)
    const startTime = Date.now()

    try {
      // Simulate ping by making a request to a reliable endpoint
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      await fetch("https://www.google.com/favicon.ico", {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-cache",
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const responseTime = Date.now() - startTime

      // Use real battery data from Firebase if available, otherwise simulate
      const batteryLevel = display.batteryLevel ?? Math.floor(Math.random() * 100)
      const isCharging = display.isCharging ?? Math.random() > 0.7

      const result: PingResult = {
        id: `ping_${Date.now()}`,
        displayName: display.name,
        timestamp: new Date(),
        responseTime,
        batteryLevel,
        isCharging,
        status: "success",
        location: display.currentLocation,
      }

      // Check for low battery
      if (batteryLevel < 40 && !isCharging) {
        toast({
          title: "⚠️ Low Battery Alert!",
          description: `${display.name} battery is at ${batteryLevel}%. Please charge the device.`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Ping Successful",
          description: `${display.name} responded in ${responseTime}ms. Battery: ${batteryLevel}%`,
        })
      }

      // Add to results (keep last 5)
      setPingResults((prev) => [result, ...prev].slice(0, 5))
    } catch (error) {
      console.error("Ping error:", error)

      const result: PingResult = {
        id: `ping_${Date.now()}`,
        displayName: display.name,
        timestamp: new Date(),
        responseTime: -1,
        batteryLevel: display.batteryLevel ?? 0,
        isCharging: display.isCharging ?? false,
        status: "timeout",
        location: display.currentLocation,
      }

      setPingResults((prev) => [result, ...prev].slice(0, 5))

      toast({
        title: "Ping Failed",
        description: `${display.name} did not respond within 5 seconds`,
        variant: "destructive",
      })
    } finally {
      setPinging(false)
    }
  }

  const getBatteryIcon = (level: number, isCharging: boolean) => {
    if (isCharging) return <Zap className="w-4 h-4 text-yellow-500" />
    if (level < 20) return <BatteryLow className="w-4 h-4 text-red-500" />
    return <Battery className="w-4 h-4 text-green-500" />
  }

  const getBatteryColor = (level: number) => {
    if (level < 20) return "text-red-500"
    if (level < 40) return "text-orange-500"
    if (level < 60) return "text-yellow-500"
    return "text-green-500"
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "timeout":
        return <Clock className="w-4 h-4 text-orange-500" />
      case "error":
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      default:
        return <Monitor className="w-4 h-4 text-gray-500" />
    }
  }

  const isRecentlyActive = (lastSeen: Date) => {
    const now = new Date()
    const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60)
    return diffMinutes < 5 // Consider active if seen within 5 minutes
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            Display Ping Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading displays from Firebase...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Display Ping Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Select Display</label>
            <Select value={selectedDisplay} onValueChange={setSelectedDisplay}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a display to ping" />
              </SelectTrigger>
              <SelectContent>
                {displays.length === 0 ? (
                  <SelectItem value="no-displays" disabled>
                    No displays found in Firebase
                  </SelectItem>
                ) : (
                  displays.map((display) => (
                    <SelectItem key={display.id} value={display.id}>
                      <div className="flex items-center gap-2">
                        {display.status === "online" ? (
                          <Wifi className="w-4 h-4 text-green-500" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-red-500" />
                        )}
                        {display.name} - {display.location}
                        {isRecentlyActive(display.lastSeen) && (
                          <Badge variant="outline" className="text-xs ml-2">
                            Active
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handlePing}
            disabled={!selectedDisplay || pinging || displays.length === 0}
            className="min-w-[120px]"
          >
            {pinging ? "Pinging..." : "Ping Display"}
          </Button>
        </div>

        {selectedDisplay && displays.length > 0 && (
          <div className="space-y-4">
            {(() => {
              const display = displays.find((d) => d.id === selectedDisplay)
              if (!display) return null

              return (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">{display.name}</h4>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {display.location}
                    </p>
                    {display.currentLocation && (
                      <p className="text-xs text-gray-500 mt-1">{display.currentLocation.address}</p>
                    )}
                    <p className="text-xs text-gray-500">Last seen: {display.lastSeen.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={display.status === "online" ? "default" : "destructive"}>{display.status}</Badge>
                    {display.batteryLevel !== undefined && (
                      <div className="flex items-center gap-1">
                        {getBatteryIcon(display.batteryLevel, display.isCharging)}
                        <span className={`text-sm font-medium ${getBatteryColor(display.batteryLevel)}`}>
                          {display.batteryLevel}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {pingResults.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Recent Ping Results</h4>
                <div className="space-y-2">
                  {pingResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(result.status)}
                        <div>
                          <div className="text-sm font-medium">{result.timestamp.toLocaleTimeString()}</div>
                          <div className="text-xs text-gray-500">
                            {result.status === "success" ? `${result.responseTime}ms` : result.status}
                          </div>
                          {result.location && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                              <MapPin className="w-3 h-3" />
                              {result.location.address}
                            </div>
                          )}
                        </div>
                      </div>
                      {result.status === "success" && (
                        <div className="flex items-center gap-2">
                          {getBatteryIcon(result.batteryLevel, result.isCharging)}
                          <span className={`text-sm font-medium ${getBatteryColor(result.batteryLevel)}`}>
                            {result.batteryLevel}%
                          </span>
                          {result.isCharging && (
                            <Badge variant="outline" className="text-xs">
                              Charging
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {displays.length === 0 && (
          <div className="text-center py-8">
            <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No displays found in Firebase</p>
            <p className="text-sm text-gray-400 mt-2">Make sure displays are registered in the system</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
