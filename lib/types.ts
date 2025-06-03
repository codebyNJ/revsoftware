export interface User {
  id: string
  email: string
  role: "super_admin" | "sub_admin"
  name: string
  createdAt: Date
}

export interface Driver {
  id: string
  name: string
  email: string
  phone: string
  licenseNumber: string
  vehicleInfo: {
    make: string
    model: string
    year: number
    plateNumber: string
    color: string
  }
  status: "active" | "inactive" | "suspended"
  assignedDisplays: string[] // Array of display IDs
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

export interface Display {
  id: string
  name: string
  location: string // Simplified to match database schema
  status: "active" | "inactive" | "maintenance"
  pin: string // 6-digit PIN for display authentication
  lastSeen?: Date
  createdAt: Date
  updatedAt?: Date
  createdBy: string
  updatedBy?: string
}

export interface Ad {
  id: string
  title: string
  description: string
  videoUrl: string // Direct video URL
  thumbnailUrl?: string
  duration: number // in seconds
  ownerId: string
  ownerEmail: string
  status: "active" | "inactive" | "scheduled"
  order: number
  scheduledStart?: Date
  scheduledEnd?: Date
  // New fields for targeting
  assignedDisplays: string[] // Array of display IDs, empty means all displays
  assignedDrivers: string[] // Array of driver IDs, empty means all drivers
  displayAll: boolean // If true, show on all displays
  assignAllDrivers: boolean // If true, assign to all drivers
  createdAt: Date
  updatedAt: Date
  createdBy: string
  createdByEmail: string
}

export interface Analytics {
  id: string
  adId: string
  clicks: number
  date: string // YYYY-MM-DD format
  displayId?: string // Which display this came from
  driverId?: string // Which driver was operating
  geolocation?: {
    accuracy: number
    address: string
    latitude: number
    longitude: number
    timestamp: Date
  }
  hourlyData: {
    clicks: number
    geolocation?: {
      latitude: number
      longitude: number
    }
    hour: number
    views: number
  }[]
  impressions: number
  ownerId: string
  views: number
  watchTime: number // total watch time in seconds
}

export interface DisplaySettings {
  id: string
  autoPlay: boolean
  showControls: boolean
  transitionDuration: number // in seconds
  backgroundColor: string
  updatedAt: Date
  updatedBy: string
}
