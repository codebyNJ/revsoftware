import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { GeolocationData } from "@/lib/geolocation"

// Standardized analytics data structure
export interface AnalyticsEvent {
  adId: string
  ownerId: string
  displayId: string
  driverId: string
  eventType: "view" | "click" | "watchTime"
  date: string
  timestamp: Date
  views?: number
  clicks?: number
  impressions?: number
  watchTime?: number
  contentType: "ad" | "news" | "job"
  geolocation?: {
    latitude: number
    longitude: number
    accuracy: number
    address?: string
    timestamp: Date
  }
  hourlyData?: Array<{
    hour: number
    views?: number
    clicks?: number
    geolocation?: {
      latitude: number
      longitude: number
    }
  }>
}

export class AnalyticsService {
  // Track a view event
  async trackView(
    adId: string,
    ownerId: string,
    displayId: string,
    driverId: string,
    contentType: "ad" | "news" | "job" = "ad",
    geolocation?: GeolocationData,
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split("T")[0]
      const hour = new Date().getHours()

      const analyticsData: AnalyticsEvent = {
        adId,
        ownerId,
        displayId,
        driverId,
        eventType: "view",
        date: today,
        timestamp: new Date(),
        views: 1,
        clicks: 0,
        impressions: 1,
        watchTime: 0,
        contentType,
        geolocation: geolocation
          ? {
              latitude: geolocation.latitude,
              longitude: geolocation.longitude,
              accuracy: geolocation.accuracy,
              address: geolocation.address,
              timestamp: geolocation.timestamp,
            }
          : undefined,
        hourlyData: [
          {
            hour,
            views: 1,
            clicks: 0,
            geolocation: geolocation
              ? {
                  latitude: geolocation.latitude,
                  longitude: geolocation.longitude,
                }
              : undefined,
          },
        ],
      }

      const docRef = await addDoc(collection(db, "analytics"), analyticsData)
      console.log("View tracked successfully with ID:", docRef.id, {
        adId,
        ownerId,
        displayId,
        driverId,
        contentType,
      })
      return docRef.id
    } catch (error) {
      console.error("Error tracking view:", error)
      throw error
    }
  }

  // Track a click event
  async trackClick(
    adId: string,
    ownerId: string,
    displayId: string,
    driverId: string,
    contentType: "ad" | "news" | "job" = "ad",
    geolocation?: GeolocationData,
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split("T")[0]
      const hour = new Date().getHours()

      const analyticsData: AnalyticsEvent = {
        adId,
        ownerId,
        displayId,
        driverId,
        eventType: "click",
        date: today,
        timestamp: new Date(),
        views: 0,
        clicks: 1,
        impressions: 0,
        watchTime: 0,
        contentType,
        geolocation: geolocation
          ? {
              latitude: geolocation.latitude,
              longitude: geolocation.longitude,
              accuracy: geolocation.accuracy,
              address: geolocation.address,
              timestamp: geolocation.timestamp,
            }
          : undefined,
        hourlyData: [
          {
            hour,
            views: 0,
            clicks: 1,
            geolocation: geolocation
              ? {
                  latitude: geolocation.latitude,
                  longitude: geolocation.longitude,
                }
              : undefined,
          },
        ],
      }

      const docRef = await addDoc(collection(db, "analytics"), analyticsData)
      console.log("Click tracked successfully with ID:", docRef.id, {
        adId,
        ownerId,
        displayId,
        driverId,
        contentType,
      })
      return docRef.id
    } catch (error) {
      console.error("Error tracking click:", error)
      throw error
    }
  }

  // Track watch time
  async trackWatchTime(
    adId: string,
    ownerId: string,
    displayId: string,
    driverId: string,
    seconds: number,
    contentType: "ad" | "news" | "job" = "ad",
    geolocation?: GeolocationData,
  ): Promise<void> {
    try {
      if (seconds < 1) return // Don't track very short watch times

      const today = new Date().toISOString().split("T")[0]

      const analyticsData: AnalyticsEvent = {
        adId,
        ownerId,
        displayId,
        driverId,
        eventType: "watchTime",
        date: today,
        timestamp: new Date(),
        views: 0,
        clicks: 0,
        impressions: 0,
        watchTime: Math.round(seconds),
        contentType,
        geolocation: geolocation
          ? {
              latitude: geolocation.latitude,
              longitude: geolocation.longitude,
              accuracy: geolocation.accuracy,
              address: geolocation.address,
              timestamp: geolocation.timestamp,
            }
          : undefined,
      }

      const docRef = await addDoc(collection(db, "analytics"), analyticsData)
      console.log("Watch time tracked successfully with ID:", docRef.id, {
        adId,
        ownerId,
        displayId,
        driverId,
        seconds: Math.round(seconds),
        contentType,
      })
      return docRef.id
    } catch (error) {
      console.error("Error tracking watch time:", error)
      throw error
    }
  }

  // Verify analytics collection is working
  async testAnalyticsWrite(): Promise<boolean> {
    try {
      const testData = {
        adId: "test_ad",
        ownerId: "test_owner",
        displayId: "test_display",
        driverId: "test_driver",
        eventType: "test",
        date: new Date().toISOString().split("T")[0],
        timestamp: new Date(),
        views: 0,
        clicks: 0,
        impressions: 0,
        watchTime: 0,
        contentType: "ad",
        test: true,
      }

      const docRef = await addDoc(collection(db, "analytics"), testData)
      console.log("Test analytics write successful with ID:", docRef.id)
      return true
    } catch (error) {
      console.error("Test analytics write failed:", error)
      return false
    }
  }

  // Get analytics for debugging
  async getRecentAnalytics(limit = 10): Promise<any[]> {
    try {
      const analyticsQuery = query(collection(db, "analytics"), orderBy("timestamp", "desc"), limit)
      const snapshot = await getDocs(analyticsQuery)

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      }))
    } catch (error) {
      console.error("Error getting recent analytics:", error)
      return []
    }
  }
}

// Export a singleton instance
export const analyticsService = new AnalyticsService()
