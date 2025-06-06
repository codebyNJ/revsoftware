"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DeviceMonitor, KioskManager, type DeviceInfo } from "@/lib/device-monitor"
import { useToast } from "@/hooks/use-toast"
import {
  Battery,
  Wifi,
  MapPin,
  Monitor,
  AlertTriangle,
  Maximize,
  Minimize,
  RefreshCw,
  Database,
  Activity,
  Signal,
  Globe,
  Clock,
  Zap,
} from "lucide-react"

export function DeviceSettings() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [isKioskMode, setIsKioskMode] = useState(false)
  const [exitCode, setExitCode] = useState("")
  const [inputExitCode, setInputExitCode] = useState("")
  const [showLowBatteryAlert, setShowLowBatteryAlert] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const initializeMonitoring = async () => {
      try {
        console.log("🚀 Initializing Device Settings...")

        const monitor = DeviceMonitor.getInstance()
        await monitor.initialize()

        // Set up device info updates
        const cleanup = monitor.onDeviceInfoUpdate((info) => {
          console.log("📊 Device info updated:", info)
          setDeviceInfo(info)
          setLastUpdate(new Date())
          setLoading(false)
        })

        // Listen for low battery alerts
        const handleLowBattery = (event: CustomEvent) => {
          console.log("🔋 Low battery event received:", event.detail)
          setShowLowBatteryAlert(true)
          toast({
            title: "🔋 Low Battery Warning",
            description: `Battery level is ${event.detail.batteryLevel}%. Please charge your device.`,
            variant: "destructive",
          })
          setTimeout(() => setShowLowBatteryAlert(false), 10000)
        }

        // Listen for kiosk mode events
        const handleKioskEntered = (event: CustomEvent) => {
          console.log("🖥️ Kiosk mode entered:", event.detail)
          setIsKioskMode(true)
          setExitCode(event.detail.exitCode)
          toast({
            title: "🖥️ Kiosk Mode Activated",
            description: `Exit code: ${event.detail.exitCode}`,
          })
        }

        const handleKioskExited = () => {
          console.log("🚪 Kiosk mode exited")
          setIsKioskMode(false)
          setExitCode("")
          setInputExitCode("")
          toast({
            title: "🚪 Kiosk Mode Deactivated",
            description: "Normal mode restored",
          })
        }

        window.addEventListener("lowBattery", handleLowBattery as EventListener)
        window.addEventListener("kioskModeEntered", handleKioskEntered as EventListener)
        window.addEventListener("kioskModeExited", handleKioskExited as EventListener)

        // Check if already in kiosk mode
        setIsKioskMode(KioskManager.isInKioskMode())
        if (KioskManager.isInKioskMode()) {
          setExitCode(KioskManager.getExitCode())
        }

        return () => {
          cleanup()
          window.removeEventListener("lowBattery", handleLowBattery as EventListener)
          window.removeEventListener("kioskModeEntered", handleKioskEntered as EventListener)
          window.removeEventListener("kioskModeExited", handleKioskExited as EventListener)
        }
      } catch (error) {
        console.error("❌ Failed to initialize device monitoring:", error)
        setLoading(false)
        toast({
          title: "❌ Initialization Failed",
          description: "Failed to initialize device monitoring",
          variant: "destructive",
        })
      }
    }

    initializeMonitoring()
  }, [toast])

  const handleEnterKioskMode = async () => {
    const success = await KioskManager.enterKioskMode()
    if (!success) {
      toast({
        title: "❌ Kiosk Mode Failed",
        description: "Failed to enter kiosk mode. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleExitKioskMode = async () => {
    if (!inputExitCode.trim()) {
      toast({
        title: "❌ Invalid Code",
        description: "Please enter the exit code.",
        variant: "destructive",
      })
      return
    }

    const success = await KioskManager.exitKioskMode(inputExitCode)
    if (!success) {
      toast({
        title: "❌ Invalid Exit Code",
        description: "The exit code is incorrect. Please try again.",
        variant: "destructive",
      })
    }
  }

  const refreshDeviceInfo = async () => {
    setLoading(true)
    try {
      const monitor = DeviceMonitor.getInstance()
      const info = await monitor.getDeviceInfo()
      setDeviceInfo(info)
      setLastUpdate(new Date())
      toast({
        title: "🔄 Refreshed",
        description: "Device information updated successfully",
      })
    } catch (error) {
      console.error("Error refreshing device info:", error)
      toast({
        title: "❌ Refresh Failed",
        description: "Failed to refresh device information",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getBatteryColor = (level: number) => {
    if (level > 60) return "text-green-600"
    if (level > 40) return "text-yellow-600"
    return "text-red-600"
  }

  const getBatteryBgColor = (level: number) => {
    if (level > 60) return "bg-green-500"
    if (level > 40) return "bg-yellow-500"
    return "bg-red-500"
  }

  const getNetworkQuality = (speed: number) => {
    if (speed > 5) return { label: "Excellent", color: "text-green-600" }
    if (speed > 2) return { label: "Good", color: "text-blue-600" }
    if (speed > 1) return { label: "Fair", color: "text-yellow-600" }
    return { label: "Poor", color: "text-red-600" }
  }

  const getPingQuality = (ping: number) => {
    if (ping === -1) return { label: "Failed", color: "text-red-600" }
    if (ping < 50) return { label: "Excellent", color: "text-green-600" }
    if (ping < 100) return { label: "Good", color: "text-blue-600" }
    if (ping < 200) return { label: "Fair", color: "text-yellow-600" }
    return { label: "Poor", color: "text-red-600" }
  }

  if (loading && !deviceInfo) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Monitor className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Device Settings</h2>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Initializing device monitoring...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Device Settings</h2>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdate && (
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
          <Button onClick={refreshDeviceInfo} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Low Battery Alert */}
      {showLowBatteryAlert && deviceInfo && (
        <Alert className="border-red-500 bg-red-50 animate-pulse">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>🔋 Critical Battery Warning!</strong> Battery level is {deviceInfo.batteryLevel}%. Please charge
            your device immediately to prevent shutdown.
          </AlertDescription>
        </Alert>
      )}

      {/* Kiosk Mode Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Maximize className="w-5 h-5" />
            Kiosk Mode Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isKioskMode ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Enable kiosk mode for full-screen display with restricted access. This will:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Enter fullscreen mode</li>
                <li>Hide cursor after 3 seconds of inactivity</li>
                <li>Disable keyboard shortcuts (F11, Alt+F4, Ctrl+W, etc.)</li>
                <li>Disable right-click context menu</li>
                <li>Generate a 6-digit exit code for secure exit</li>
              </ul>
              <Button onClick={handleEnterKioskMode} className="w-full">
                <Maximize className="w-4 h-4 mr-2" />
                Enter Kiosk Mode
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-green-800 font-medium">🖥️ Kiosk Mode Active</p>
                </div>
                <p className="text-green-600 text-sm mb-2">
                  System is running in secure kiosk mode with restricted access.
                </p>
                <p className="text-green-600 text-sm">
                  Exit Code: <code className="bg-green-100 px-2 py-1 rounded font-mono text-lg">{exitCode}</code>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="exitCode">Enter Exit Code to Disable Kiosk Mode</Label>
                <div className="flex gap-2">
                  <Input
                    id="exitCode"
                    type="password"
                    placeholder="Enter 6-digit code"
                    value={inputExitCode}
                    onChange={(e) => setInputExitCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    className="font-mono text-center text-lg"
                  />
                  <Button onClick={handleExitKioskMode} variant="destructive">
                    <Minimize className="w-4 h-4 mr-2" />
                    Exit Kiosk
                  </Button>
                </div>
                <p className="text-xs text-gray-500">Enter the 6-digit code shown above to exit kiosk mode</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Device Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Battery Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Battery className="w-5 h-5" />
              Battery Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Battery Level</span>
              <div className="flex items-center gap-2">
                <span className={`font-bold text-2xl ${getBatteryColor(deviceInfo?.batteryLevel || 0)}`}>
                  {deviceInfo?.batteryLevel || 0}%
                </span>
                {deviceInfo?.batteryCharging && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <Zap className="w-3 h-3 mr-1" />
                    Charging
                  </Badge>
                )}
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all duration-500 ${getBatteryBgColor(deviceInfo?.batteryLevel || 0)}`}
                style={{ width: `${deviceInfo?.batteryLevel || 0}%` }}
              />
            </div>

            {(deviceInfo?.batteryLevel || 0) <= 40 && !deviceInfo?.batteryCharging && (
              <Alert className="border-orange-500 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>Low battery detected!</strong> Please charge your device soon.
                </AlertDescription>
              </Alert>
            )}

            {(deviceInfo?.batteryLevel || 0) <= 20 && !deviceInfo?.batteryCharging && (
              <Alert className="border-red-500 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Critical battery level!</strong> Device may shut down soon.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Network Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5" />
              Network Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Connection</span>
              <Badge variant={deviceInfo?.isOnline ? "default" : "destructive"}>
                <Globe className="w-3 h-3 mr-1" />
                {deviceInfo?.isOnline ? "Online" : "Offline"}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span>Network Type</span>
              <Badge variant="outline" className="capitalize">
                <Signal className="w-3 h-3 mr-1" />
                {deviceInfo?.networkType || "Unknown"}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span>Speed</span>
              <div className="text-right">
                <div className="font-medium">{(deviceInfo?.networkSpeed || 0).toFixed(1)} Mbps</div>
                <div className={`text-xs ${getNetworkQuality(deviceInfo?.networkSpeed || 0).color}`}>
                  {getNetworkQuality(deviceInfo?.networkSpeed || 0).label}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span>Ping</span>
              <div className="text-right">
                <div className="font-medium">
                  {deviceInfo?.lastPing === -1 ? "Failed" : `${deviceInfo?.lastPing || 0}ms`}
                </div>
                <div className={`text-xs ${getPingQuality(deviceInfo?.lastPing || 0).color}`}>
                  {getPingQuality(deviceInfo?.lastPing || 0).label}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Data Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Session Usage</span>
              <div className="text-right">
                <div className="font-medium text-2xl">{deviceInfo?.dataUsage || 0} MB</div>
                <div className="text-xs text-gray-500">This session</div>
              </div>
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <p className="font-medium">Estimated rates:</p>
              <p>• Video streaming: ~2MB/min</p>
              <p>• Image loading: ~0.5MB/min</p>
              <p>• API calls: ~0.1MB/min</p>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Activity className="w-4 h-4" />
                <span>Real-time monitoring active</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deviceInfo?.location ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">Latitude</Label>
                  <div className="font-mono text-sm">{deviceInfo.location.latitude.toFixed(6)}</div>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Longitude</Label>
                  <div className="font-mono text-sm">{deviceInfo.location.longitude.toFixed(6)}</div>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Accuracy</Label>
                  <div className="font-medium">{Math.round(deviceInfo.location.accuracy)}m</div>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Status</Label>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <MapPin className="w-3 h-3 mr-1" />
                    Located
                  </Badge>
                </div>

                {deviceInfo.location.address && (
                  <div className="md:col-span-2 lg:col-span-4">
                    <Label className="text-sm text-gray-500">Address</Label>
                    <div className="font-medium">{deviceInfo.location.address}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-2">Location not available</p>
                <p className="text-sm text-gray-400">Location services may be disabled or permission not granted</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <Label className="text-gray-500">User Agent</Label>
              <div className="font-mono text-xs break-all">{navigator.userAgent.slice(0, 50)}...</div>
            </div>
            <div>
              <Label className="text-gray-500">Platform</Label>
              <div>{navigator.platform}</div>
            </div>
            <div>
              <Label className="text-gray-500">Language</Label>
              <div>{navigator.language}</div>
            </div>
            <div>
              <Label className="text-gray-500">Timezone</Label>
              <div>{Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
