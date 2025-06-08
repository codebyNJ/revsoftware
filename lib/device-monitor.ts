// Device monitoring utilities for display settings

import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore"
import { db } from "./firebase"

export interface DeviceInfo {
  batteryLevel: number
  batteryCharging: boolean
  networkType: string
  networkSpeed: number
  dataUsage: number
  location: {
    latitude: number
    longitude: number
    accuracy: number
    address?: string
  } | null
  lastPing: number
  isOnline: boolean
  timestamp: Date
}

export class DeviceMonitor {
  private static instance: DeviceMonitor
  private batteryAPI: any = null
  private networkAPI: any = null
  private dataUsageStart = 0
  private callbacks: ((info: DeviceInfo) => void)[] = []
  private monitoringInterval: NodeJS.Timeout | null = null
  private pingCheckInterval: NodeJS.Timeout | null = null
  private sessionStartTime: number
  private displayId: string | null = null
  private driverId: string | null = null
  private unsubscribes: (() => void)[] = []
  private lastStatusUpdate = 0
  private statusUpdateDebounce = 30000 // 30 seconds minimum between updates

  static getInstance(): DeviceMonitor {
    if (!DeviceMonitor.instance) {
      DeviceMonitor.instance = new DeviceMonitor()
    }
    return DeviceMonitor.instance
  }

  constructor(displayId?: string) {
    this.sessionStartTime = Date.now()
    if (displayId) {
      this.displayId = displayId
      this.startMonitoring()
      this.listenForPingRequests()
    }
  }

  async initialize(displayId?: string, driverId?: string): Promise<void> {
    try {
      console.log("Initializing Device Monitor...")

      if (displayId) this.displayId = displayId
      if (driverId) this.driverId = driverId

      // Try to get from localStorage if not provided
      if (!this.displayId) {
        this.displayId = localStorage.getItem("displayId")
      }

      if (!this.driverId) {
        this.driverId = localStorage.getItem("driverId")
      }

      // Initialize Battery API
      if ("getBattery" in navigator) {
        try {
          this.batteryAPI = await (navigator as any).getBattery()
          console.log("✅ Battery API initialized")

          // Listen for battery events
          this.batteryAPI.addEventListener("chargingchange", () => this.updateDeviceInfo())
          this.batteryAPI.addEventListener("levelchange", () => this.updateDeviceInfo())
        } catch (error) {
          console.warn("❌ Battery API not available:", error)
        }
      } else {
        console.warn("❌ Battery API not supported")
      }

      // Initialize Network API
      if ("connection" in navigator) {
        this.networkAPI = (navigator as any).connection
        console.log("✅ Network API initialized")

        // Listen for network changes
        this.networkAPI.addEventListener("change", () => this.updateDeviceInfo())
      } else {
        console.warn("❌ Network API not supported")
      }

      // Listen for online/offline events
      window.addEventListener("online", () => this.updateDeviceInfo())
      window.addEventListener("offline", () => this.updateDeviceInfo())

      // Request notification permission for low battery alerts
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission()
      }

      // Start monitoring
      this.startMonitoring()

      // Start ping response system if we have a display ID
      if (this.displayId) {
        this.startPingResponseSystem()
      }

      console.log("🚀 Device Monitor fully initialized")
    } catch (error) {
      console.error("❌ Device monitoring initialization failed:", error)
    }
  }

  private startMonitoring(): void {
    // Clear any existing interval
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }

    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.updateDeviceInfo()
    }, 30000)

    // Initial update
    this.updateDeviceInfo()
    console.log("📊 Device monitoring started (30s intervals)")
  }

  private startPingResponseSystem(): void {
    // Clear any existing interval
    if (this.pingCheckInterval) {
      clearInterval(this.pingCheckInterval)
    }

    if (!this.displayId) {
      console.warn("Cannot start ping response system: No display ID")
      return
    }

    // Import Firebase here to avoid circular dependencies
    import("@/lib/firebase")
      .then(({ db }) => {
        const { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } = require("firebase/firestore")

        console.log("🔔 Starting ping response system for display:", this.displayId)

        // Check for ping requests every 5 seconds
        this.pingCheckInterval = setInterval(async () => {
          try {
            // Only check if we have a display ID
            if (!this.displayId) return

            // Get pending ping requests for this display
            const pingRequestsQuery = query(
              collection(db, "ping_requests"),
              where("displayId", "==", this.displayId),
              where("status", "==", "pending"),
            )

            const snapshot = await getDocs(pingRequestsQuery)

            if (snapshot.empty) return

            console.log(`📡 Found ${snapshot.size} pending ping requests`)

            // Get current device info
            const deviceInfo = await this.getDeviceInfo()

            // Respond to each ping request
            for (const pingDoc of snapshot.docs) {
              console.log("🔄 Responding to ping request:", pingDoc.id)

              try {
                await updateDoc(doc(db, "ping_requests", pingDoc.id), {
                  status: "completed",
                  responseTimestamp: serverTimestamp(),
                  batteryLevel: deviceInfo.batteryLevel,
                  batteryCharging: deviceInfo.batteryCharging,
                  networkType: deviceInfo.networkType,
                  networkSpeed: deviceInfo.networkSpeed,
                  isOnline: deviceInfo.isOnline,
                  driverId: this.driverId || null,
                })

                console.log("✅ Ping response sent successfully")
              } catch (error) {
                console.error("❌ Failed to respond to ping:", error)
              }
            }
          } catch (error) {
            console.error("❌ Error checking for ping requests:", error)
          }
        }, 5000)
      })
      .catch((error) => {
        console.error("Failed to import Firebase for ping system:", error)
      })
  }

  private async updateDeviceInfo(): Promise<void> {
    try {
      const info = await this.getDeviceInfo()

      // Check for low battery alert (40% threshold)
      if (info.batteryLevel <= 40 && !info.batteryCharging) {
        this.triggerLowBatteryAlert(info.batteryLevel)
      }

      // Notify all callbacks
      this.callbacks.forEach((callback) => {
        try {
          callback(info)
        } catch (error) {
          console.error("Error in device info callback:", error)
        }
      })
    } catch (error) {
      console.error("Error updating device info:", error)
    }
  }

  async getDeviceInfo(): Promise<DeviceInfo> {
    const info: DeviceInfo = {
      batteryLevel: 100,
      batteryCharging: false,
      networkType: "unknown",
      networkSpeed: 0,
      dataUsage: 0,
      location: null,
      lastPing: 0,
      isOnline: navigator.onLine,
      timestamp: new Date(),
    }

    try {
      // Battery Information
      if (this.batteryAPI) {
        info.batteryLevel = Math.round(this.batteryAPI.level * 100)
        info.batteryCharging = this.batteryAPI.charging
      } else {
        // Simulate battery for testing
        info.batteryLevel = Math.floor(Math.random() * 100)
        info.batteryCharging = Math.random() > 0.7
      }

      // Network Information
      if (this.networkAPI) {
        info.networkType = this.networkAPI.effectiveType || "unknown"
        info.networkSpeed = this.networkAPI.downlink || 0
      } else {
        // Simulate network for testing
        info.networkType = ["slow-2g", "2g", "3g", "4g"][Math.floor(Math.random() * 4)]
        info.networkSpeed = Math.random() * 10
      }

      // Location Information
      info.location = await this.getCurrentLocation()

      // Ping Test
      info.lastPing = await this.performPingTest()

      // Data Usage (estimated)
      info.dataUsage = this.estimateDataUsage()
    } catch (error) {
      console.warn("Error getting device info:", error)
    }

    return info
  }

  private async getCurrentLocation(): Promise<DeviceInfo["location"]> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn("Geolocation not supported")
        resolve(null)
        return
      }

      const timeout = setTimeout(() => {
        console.warn("Geolocation timeout")
        resolve(null)
      }, 10000)

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          clearTimeout(timeout)
          try {
            // Try to get address using a free geocoding service
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`,
            )

            let address = "Unknown location"
            if (response.ok) {
              const data = await response.json()
              address = data.display_name || data.locality || "Unknown location"
            }

            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              address,
            })
          } catch (error) {
            console.warn("Geocoding failed:", error)
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              address: "Address lookup failed",
            })
          }
        },
        (error) => {
          clearTimeout(timeout)
          console.warn("Geolocation error:", error)
          resolve(null)
        },
        {
          timeout: 8000,
          enableHighAccuracy: false,
          maximumAge: 300000, // 5 minutes
        },
      )
    })
  }

  private async performPingTest(): Promise<number> {
    const startTime = Date.now()
    try {
      // Use a reliable endpoint for ping test
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      await fetch("https://www.google.com/favicon.ico", {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-cache",
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return Date.now() - startTime
    } catch (error) {
      console.warn("Ping test failed:", error)
      return -1 // Ping failed
    }
  }

  private estimateDataUsage(): number {
    // Calculate session duration in minutes
    const sessionDuration = (Date.now() - this.sessionStartTime) / 1000 / 60

    // Estimate data usage:
    // - Video streaming: ~2MB per minute
    // - Image loading: ~0.5MB per minute
    // - API calls: ~0.1MB per minute
    const estimatedUsage = sessionDuration * 2.6 // Total ~2.6MB per minute

    return Math.round(estimatedUsage * 100) / 100 // Round to 2 decimal places
  }

  private triggerLowBatteryAlert(batteryLevel: number): void {
    console.warn(`🔋 Low battery alert: ${batteryLevel}%`)

    // Create a custom event for low battery
    const event = new CustomEvent("lowBattery", {
      detail: { batteryLevel },
    })
    window.dispatchEvent(event)

    // Show browser notification if permitted
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("🔋 Low Battery Warning", {
        body: `Battery level is ${batteryLevel}%. Please charge your device immediately.`,
        icon: "/favicon.ico",
        tag: "low-battery", // Prevent duplicate notifications
        requireInteraction: true,
      })
    }

    // Also log to console for debugging
    console.warn(`🚨 LOW BATTERY ALERT: ${batteryLevel}% - Please charge device!`)
  }

  onDeviceInfoUpdate(callback: (info: DeviceInfo) => void): () => void {
    this.callbacks.push(callback)

    // Return cleanup function
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback)
    }
  }

  public destroy() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    if (this.pingCheckInterval) {
      clearInterval(this.pingCheckInterval)
      this.pingCheckInterval = null
    }

    this.callbacks = []

    this.unsubscribes.forEach((unsubscribe) => unsubscribe())
    this.unsubscribes = []

    console.log("🛑 Device Monitor destroyed")
  }

  private listenForPingRequests() {
    if (!this.displayId) return

    const unsubscribe = onSnapshot(doc(db, "ping_requests", `ping_${this.displayId}_*`), async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data()
        if (data.displayId === this.displayId && data.status === "pending") {
          try {
            const battery = await this.getBatteryInfo()

            // Respond to ping
            await setDoc(doc(db, "ping_responses", snapshot.id), {
              displayId: this.displayId,
              batteryLevel: battery.level,
              isCharging: battery.charging,
              timestamp: new Date(),
              status: "success",
            })
          } catch (error) {
            console.error("Failed to respond to ping:", error)
          }
        }
      }
    })

    this.unsubscribes.push(unsubscribe)
  }

  private async getBatteryInfo(): Promise<{ level: number; charging: boolean }> {
    try {
      if ("getBattery" in navigator) {
        const battery = await (navigator as any).getBattery()
        return {
          level: Math.round(battery.level * 100),
          charging: battery.charging,
        }
      }
    } catch (error) {
      console.warn("Battery API not supported:", error)
    }

    // Fallback for testing
    return {
      level: Math.floor(Math.random() * 100),
      charging: Math.random() > 0.5,
    }
  }

  private startMonitoring() {
    if (!this.displayId) return

    // Update device status every 60 seconds (increased from 30)
    const updateStatus = async () => {
      try {
        const now = Date.now()

        // Debounce status updates to prevent rapid changes
        if (now - this.lastStatusUpdate < this.statusUpdateDebounce) {
          return
        }

        const battery = await this.getBatteryInfo()

        // Only update if there's a significant change or it's been a while
        await updateDoc(doc(db, "displays", this.displayId), {
          status: "active", // Keep status consistent
          isOnline: true,
          lastSeen: new Date(),
          batteryLevel: battery.level,
          isCharging: battery.charging,
          updatedAt: new Date(),
        })

        this.lastStatusUpdate = now
        console.log("📊 Device status updated")
      } catch (error) {
        console.error("Failed to update device status:", error)
      }
    }

    // Initial update after 5 seconds
    setTimeout(updateStatus, 5000)

    // Set up interval for every 60 seconds
    const interval = setInterval(updateStatus, 60000)

    // Cleanup function
    this.unsubscribes.push(() => clearInterval(interval))
  }
}

// Enhanced Kiosk mode utilities with better fullscreen support
export class KioskManager {
  private static isKioskMode = false
  private static exitCode = ""
  private static keydownHandler: ((e: KeyboardEvent) => void) | null = null
  private static mouseMoveHandler: (() => void) | null = null
  private static cursorTimeout: NodeJS.Timeout | null = null
  private static fullscreenChangeHandler: (() => void) | null = null

  static async enterKioskMode(): Promise<boolean> {
    try {
      console.log("🖥️ Entering Kiosk Mode...")

      // Generate random 6-digit exit code
      this.exitCode = Math.floor(100000 + Math.random() * 900000).toString()
      console.log(`🔐 Exit code generated: ${this.exitCode}`)

      // Store exit code
      localStorage.setItem("kioskExitCode", this.exitCode)
      localStorage.setItem("kioskModeActive", "true")

      // Enhanced fullscreen request with better browser support
      const element = document.documentElement
      try {
        // Try different fullscreen APIs
        if (element.requestFullscreen) {
          await element.requestFullscreen({ navigationUI: "hide" })
        } else if ((element as any).webkitRequestFullscreen) {
          await (element as any).webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT)
        } else if ((element as any).msRequestFullscreen) {
          await (element as any).msRequestFullscreen()
        } else if ((element as any).mozRequestFullScreen) {
          await (element as any).mozCancelFullScreen()
        }

        // Listen for fullscreen changes
        this.setupFullscreenListener()

        console.log("✅ Fullscreen activated")
      } catch (error) {
        console.warn("⚠️ Fullscreen request failed:", error)
        // Continue with kiosk mode even if fullscreen fails
      }

      // Setup cursor hiding
      this.setupCursorHiding()

      // Disable common exit shortcuts
      this.disableExitShortcuts()

      // Prevent context menu
      this.disableContextMenu()

      // Hide scrollbars
      this.hideScrollbars()

      // Prevent page zoom
      this.preventZoom()

      // Lock orientation if possible
      this.lockOrientation()

      this.isKioskMode = true
      console.log("🎯 Kiosk mode activated successfully!")

      // Dispatch custom event
      window.dispatchEvent(
        new CustomEvent("kioskModeEntered", {
          detail: { exitCode: this.exitCode },
        }),
      )

      return true
    } catch (error) {
      console.error("❌ Failed to enter kiosk mode:", error)
      return false
    }
  }

  static async exitKioskMode(inputCode: string): Promise<boolean> {
    const storedCode = localStorage.getItem("kioskExitCode")

    if (inputCode === storedCode) {
      try {
        console.log("🚪 Exiting Kiosk Mode...")

        // Exit fullscreen
        try {
          if (document.exitFullscreen) {
            await document.exitFullscreen()
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen()
          } else if ((document as any).msExitFullscreen) {
            await (document as any).msExitFullscreen()
          } else if ((document as any).mozCancelFullScreen) {
            await (document as any).mozCancelFullScreen()
          }
          console.log("✅ Fullscreen exited")
        } catch (error) {
          console.warn("⚠️ Fullscreen exit failed:", error)
        }

        // Re-enable shortcuts and restore normal behavior
        this.enableExitShortcuts()
        this.enableContextMenu()
        this.showScrollbars()
        this.showCursor()
        this.enableZoom()
        this.unlockOrientation()
        this.removeFullscreenListener()

        this.isKioskMode = false
        localStorage.removeItem("kioskExitCode")
        localStorage.removeItem("kioskModeActive")

        console.log("✅ Kiosk mode deactivated")

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent("kioskModeExited"))

        return true
      } catch (error) {
        console.error("❌ Failed to exit kiosk mode:", error)
        return false
      }
    }

    console.warn("🚫 Invalid exit code provided")
    return false
  }

  static getExitCode(): string {
    return this.exitCode
  }

  static isInKioskMode(): boolean {
    return this.isKioskMode || localStorage.getItem("kioskModeActive") === "true"
  }

  private static setupFullscreenListener(): void {
    this.fullscreenChangeHandler = () => {
      const isFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement ||
        (document as any).mozFullScreenElement
      )

      if (!isFullscreen && this.isKioskMode) {
        console.log("🔄 Fullscreen exited unexpectedly, re-entering...")
        // Re-enter fullscreen if it was exited unexpectedly
        setTimeout(() => {
          this.enterKioskMode()
        }, 1000)
      }
    }

    document.addEventListener("fullscreenchange", this.fullscreenChangeHandler)
    document.addEventListener("webkitfullscreenchange", this.fullscreenChangeHandler)
    document.addEventListener("msfullscreenchange", this.fullscreenChangeHandler)
    document.addEventListener("mozfullscreenchange", this.fullscreenChangeHandler)
  }

  private static removeFullscreenListener(): void {
    if (this.fullscreenChangeHandler) {
      document.removeEventListener("fullscreenchange", this.fullscreenChangeHandler)
      document.removeEventListener("webkitfullscreenchange", this.fullscreenChangeHandler)
      document.removeEventListener("msfullscreenchange", this.fullscreenChangeHandler)
      document.removeEventListener("mozfullscreenchange", this.fullscreenChangeHandler)
      this.fullscreenChangeHandler = null
    }
  }

  private static setupCursorHiding(): void {
    console.log("👆 Setting up cursor hiding...")

    const hideCursor = () => {
      document.body.style.cursor = "none"
      document.documentElement.style.cursor = "none"
    }

    const showCursor = () => {
      document.body.style.cursor = "default"
      document.documentElement.style.cursor = "default"

      if (this.cursorTimeout) {
        clearTimeout(this.cursorTimeout)
      }

      this.cursorTimeout = setTimeout(hideCursor, 3000)
    }

    // Remove existing handlers
    if (this.mouseMoveHandler) {
      document.removeEventListener("mousemove", this.mouseMoveHandler)
      document.removeEventListener("mousedown", this.mouseMoveHandler)
      document.removeEventListener("touchstart", this.mouseMoveHandler)
    }

    this.mouseMoveHandler = showCursor
    document.addEventListener("mousemove", this.mouseMoveHandler)
    document.addEventListener("mousedown", this.mouseMoveHandler)
    document.addEventListener("touchstart", this.mouseMoveHandler)

    // Initial hide after 3 seconds
    this.cursorTimeout = setTimeout(hideCursor, 3000)
  }

  private static disableExitShortcuts(): void {
    console.log("🚫 Disabling exit shortcuts...")

    const preventExit = (e: KeyboardEvent) => {
      // List of blocked key combinations
      const blockedKeys = [
        "F11",
        "F5",
        "F12", // Dev tools
        "Escape",
      ]

      const blockedCombinations = [
        { alt: true, key: "F4" }, // Alt+F4
        { ctrl: true, key: "w" }, // Ctrl+W
        { ctrl: true, key: "W" },
        { ctrl: true, key: "r" }, // Ctrl+R (refresh)
        { ctrl: true, key: "R" },
        { ctrl: true, key: "t" }, // Ctrl+T (new tab)
        { ctrl: true, key: "T" },
        { ctrl: true, key: "n" }, // Ctrl+N (new window)
        { ctrl: true, key: "N" },
        { ctrl: true, shift: true, key: "I" }, // Ctrl+Shift+I (dev tools)
        { ctrl: true, shift: true, key: "J" }, // Ctrl+Shift+J (console)
        { ctrl: true, key: "u" }, // Ctrl+U (view source)
        { ctrl: true, key: "U" },
        { alt: true, key: "Tab" }, // Alt+Tab
        { ctrl: true, key: "+" }, // Ctrl++ (zoom in)
        { ctrl: true, key: "-" }, // Ctrl+- (zoom out)
        { ctrl: true, key: "0" }, // Ctrl+0 (reset zoom)
      ]

      // Check single keys
      if (blockedKeys.includes(e.key)) {
        console.log(`🚫 Blocked key: ${e.key}`)
        e.preventDefault()
        e.stopPropagation()
        return false
      }

      // Check key combinations
      for (const combo of blockedCombinations) {
        let matches = true

        if (combo.ctrl && !e.ctrlKey) matches = false
        if (combo.alt && !e.altKey) matches = false
        if (combo.shift && !e.shiftKey) matches = false
        if (combo.key && e.key.toLowerCase() !== combo.key.toLowerCase()) matches = false

        if (matches) {
          console.log(`🚫 Blocked combination: ${JSON.stringify(combo)}`)
          e.preventDefault()
          e.stopPropagation()
          return false
        }
      }
    }

    // Remove existing handler
    if (this.keydownHandler) {
      document.removeEventListener("keydown", this.keydownHandler, true)
    }

    this.keydownHandler = preventExit
    document.addEventListener("keydown", this.keydownHandler, true)
  }

  private static disableContextMenu(): void {
    document.addEventListener("contextmenu", (e) => {
      e.preventDefault()
      return false
    })
  }

  private static hideScrollbars(): void {
    const style = document.createElement("style")
    style.id = "kiosk-scrollbar-hide"
    style.textContent = `
      ::-webkit-scrollbar { display: none !important; }
      * { scrollbar-width: none !important; }
      body { overflow: hidden !important; }
      html { overflow: hidden !important; }
    `
    document.head.appendChild(style)
  }

  private static preventZoom(): void {
    const style = document.createElement("style")
    style.id = "kiosk-zoom-prevent"
    style.textContent = `
      body { 
        touch-action: pan-x pan-y !important;
        user-zoom: fixed !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
      }
    `
    document.head.appendChild(style)

    // Prevent pinch zoom
    document.addEventListener("gesturestart", (e) => e.preventDefault())
    document.addEventListener("gesturechange", (e) => e.preventDefault())
    document.addEventListener("gestureend", (e) => e.preventDefault())
  }

  private static lockOrientation(): void {
    try {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("landscape").catch((error) => {
          console.warn("Could not lock orientation:", error)
        })
      }
    } catch (error) {
      console.warn("Orientation lock not supported:", error)
    }
  }

  private static enableExitShortcuts(): void {
    console.log("✅ Re-enabling exit shortcuts...")

    if (this.keydownHandler) {
      document.removeEventListener("keydown", this.keydownHandler, true)
      this.keydownHandler = null
    }
  }

  private static enableContextMenu(): void {
    // Remove all contextmenu event listeners (simplified approach)
    document.removeEventListener("contextmenu", (e) => e.preventDefault())
  }

  private static showScrollbars(): void {
    const style = document.getElementById("kiosk-scrollbar-hide")
    if (style) {
      style.remove()
    }
  }

  private static enableZoom(): void {
    const style = document.getElementById("kiosk-zoom-prevent")
    if (style) {
      style.remove()
    }
  }

  private static unlockOrientation(): void {
    try {
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock()
      }
    } catch (error) {
      console.warn("Could not unlock orientation:", error)
    }
  }

  private static showCursor(): void {
    if (this.cursorTimeout) {
      clearTimeout(this.cursorTimeout)
      this.cursorTimeout = null
    }

    if (this.mouseMoveHandler) {
      document.removeEventListener("mousemove", this.mouseMoveHandler)
      document.removeEventListener("mousedown", this.mouseMoveHandler)
      document.removeEventListener("touchstart", this.mouseMoveHandler)
      this.mouseMoveHandler = null
    }

    document.body.style.cursor = "default"
    document.documentElement.style.cursor = "default"
  }

  // Initialize kiosk mode on page load if it was previously active
  static initializeOnLoad(): void {
    if (localStorage.getItem("kioskModeActive") === "true") {
      console.log("🔄 Restoring kiosk mode from previous session...")
      this.isKioskMode = true
      this.exitCode = localStorage.getItem("kioskExitCode") || ""

      // Re-apply kiosk restrictions without requesting fullscreen again
      this.setupCursorHiding()
      this.disableExitShortcuts()
      this.disableContextMenu()
      this.hideScrollbars()
      this.preventZoom()
      this.lockOrientation()
    }
  }
}

// Initialize kiosk mode restoration on module load
if (typeof window !== "undefined") {
  KioskManager.initializeOnLoad()
}
