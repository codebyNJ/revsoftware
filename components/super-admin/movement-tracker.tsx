"use client"

import { useState, useEffect } from "react"
import { collection, query, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Navigation, Clock, Activity, Car, Monitor, Zap, Battery, Wifi, WifiOff } from "lucide-react"

interface MovementData {
  id: string
  displayName: string
  driverName: string
  location: string
  status: "online" | "offline"
  currentLocation?: {
    latitude: number
    longitude: number
    address: string
    accuracy: number
  }
  speed?: number
  heading?: number
  lastSeen: Date
  batteryLevel?: number
  isCharging?: boolean
  isMoving?: boolean
  currentDriverId?: string
  currentDriverName?: string
}

export function MovementTracker() {
  const [movements, setMovements] = useState<MovementData[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Load real display data from Firebase
  useEffect(() => {
    console.log("Setting up real-time display tracking...")

    const displaysQuery = query(collection(db, "displays"))

    const unsubscribe = onSnapshot(
      displaysQuery,
      (snapshot) => {
        console.log(`Received ${snapshot.docs.length} displays from Firebase`)

        const displaysData = snapshot.docs.map((doc) => {
          const data = doc.data()
          console.log(`Display ${doc.id}:`, data)

          return {
            id: doc.id,
            displayName: data.name || "Unknown Display",
            driverName: data.currentDriverName || "No Driver",
            location: data.location || "Unknown Location",
            status: data.status || "offline",
            currentLocation: data.currentLocation
              ? {
                  latitude: data.currentLocation.latitude || 0,
                  longitude: data.currentLocation.longitude || 0,
                  address: data.currentLocation.address || "Unknown Address",
                  accuracy: data.currentLocation.accuracy || 0,
                }
              : undefined,
            speed: data.speed || 0,
            heading: data.heading || 0,
            lastSeen: data.lastSeen?.toDate() || new Date(),
            batteryLevel: data.batteryLevel || 0,
            isCharging: data.isCharging || false,
            isMoving: data.isMoving || false,
            currentDriverId: data.currentDriverId || null,
            currentDriverName: data.currentDriverName || null,
          } as MovementData
        })

        setMovements(displaysData)
        setLastUpdate(new Date())
        setLoading(false)
      },
      (error) => {
        console.error("Error fetching displays:", error)
        setLoading(false)
      },
    )

    return () => {
      console.log("Cleaning up display tracking subscription")
      unsubscribe()
    }
  }, [])

  const getSpeedColor = (speed: number) => {
    if (speed === 0) return "text-gray-500"
    if (speed < 20) return "text-green-500"
    if (speed < 40) return "text-yellow-500"
    return "text-red-500"
  }

  const getDirectionIcon = (heading: number) => {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    const index = Math.round(heading / 45) % 8
    return directions[index]
  }

  const getBatteryIcon = (level: number, isCharging: boolean) => {
    if (isCharging) return <Zap className="w-4 h-4 text-yellow-500" />
    if (level < 20) return <Battery className="w-4 h-4 text-red-500" />
    return <Battery className="w-4 h-4 text-green-500" />
  }

  const getBatteryColor = (level: number) => {
    if (level < 20) return "text-red-500"
    if (level < 40) return "text-orange-500"
    if (level < 60) return "text-yellow-500"
    return "text-green-500"
  }

  const getStatusIcon = (status: string) => {
    return status === "online" ? (
      <Wifi className="w-4 h-4 text-green-500" />
    ) : (
      <WifiOff className="w-4 h-4 text-red-500" />
    )
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
            <Navigation className="w-5 h-5" />
            Real-time Movement Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading display data from Firebase...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              Real-time Movement Tracker
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Last updated: {lastUpdate.toLocaleTimeString()}</span>
              <Badge variant="outline" className="text-xs">
                Live Data
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <div className="text-center py-8">
              <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No displays found in Firebase</p>
              <p className="text-sm text-gray-400 mt-2">Make sure displays are registered in the system</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {movements.map((movement) => (
                <Card key={movement.id} className="p-4">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Monitor className="w-5 h-5 text-blue-600" />
                        <div>
                          <h3 className="font-medium">{movement.displayName}</h3>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {movement.location}
                          </p>
                          {movement.currentDriverName && (
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <Car className="w-3 h-3" />
                              {movement.currentDriverName}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(movement.status)}
                        <Badge variant={movement.status === "online" ? "default" : "secondary"}>
                          {movement.status}
                        </Badge>
                        {movement.batteryLevel && movement.batteryLevel < 40 && (
                          <Badge variant="destructive">Low Battery</Badge>
                        )}
                        {isRecentlyActive(movement.lastSeen) && (
                          <Badge variant="outline" className="text-green-600">
                            Active
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Location Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-green-600" />
                          <span className="font-medium">Current Location</span>
                        </div>
                        {movement.currentLocation ? (
                          <>
                            <p className="text-sm text-gray-700 ml-6">{movement.currentLocation.address}</p>
                            <p className="text-xs text-gray-500 ml-6">
                              {movement.currentLocation.latitude.toFixed(6)},{" "}
                              {movement.currentLocation.longitude.toFixed(6)}
                            </p>
                            <p className="text-xs text-gray-500 ml-6">
                              Accuracy: ±{movement.currentLocation.accuracy}m
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-500 ml-6">Location not available</p>
                        )}
                      </div>

                      <div className="space-y-3">
                        {/* Speed */}
                        {movement.speed !== undefined && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Activity className="w-4 h-4" />
                              <span className="text-sm">Speed</span>
                            </div>
                            <span className={`font-medium ${getSpeedColor(movement.speed)}`}>
                              {movement.speed} km/h
                            </span>
                          </div>
                        )}

                        {/* Direction */}
                        {movement.heading !== undefined && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Navigation className="w-4 h-4" />
                              <span className="text-sm">Direction</span>
                            </div>
                            <span className="font-medium">
                              {getDirectionIcon(movement.heading)} ({movement.heading}°)
                            </span>
                          </div>
                        )}

                        {/* Battery */}
                        {movement.batteryLevel !== undefined && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getBatteryIcon(movement.batteryLevel, movement.isCharging || false)}
                              <span className="text-sm">Battery</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${getBatteryColor(movement.batteryLevel)}`}>
                                {movement.batteryLevel}%
                              </span>
                              {movement.isCharging && (
                                <Badge variant="outline" className="text-xs">
                                  Charging
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Last Seen */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">Last Seen</span>
                          </div>
                          <span className="text-sm text-gray-500">{movement.lastSeen.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Map Link */}
                    {movement.currentLocation && (
                      <div className="pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const url = `https://www.google.com/maps?q=${movement.currentLocation!.latitude},${movement.currentLocation!.longitude}`
                            window.open(url, "_blank")
                          }}
                        >
                          <MapPin className="w-4 h-4 mr-2" />
                          View on Map
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
