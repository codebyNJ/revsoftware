"use client"

import { useState, useEffect } from "react"
import { collection, query, onSnapshot, orderBy, getDocs, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Ad, Analytics, User } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer, Legend } from "recharts"
import { Download, Eye, MousePointer, Clock, TrendingUp, BarChart3, RefreshCw, MapPin } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import type { DateRange } from "react-day-picker"
import { useToast } from "@/hooks/use-toast"

export function AnalyticsDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [ads, setAds] = useState<Ad[]>([])
  const [analytics, setAnalytics] = useState<Analytics[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedAd, setSelectedAd] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<string>("all")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = async () => {
    if (!user) return

    setLoading(true)

    try {
      // Fetch all ads (super admin sees all, sub admin sees only their own)
      let adsQuery
      if (user.role === "super_admin") {
        adsQuery = query(collection(db, "ads"), orderBy("createdAt", "desc"))
      } else {
        adsQuery = query(collection(db, "ads"), where("ownerId", "==", user.id), orderBy("createdAt", "desc"))
      }

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
          console.log("Loaded ads:", adsData.length)
        },
        (error) => {
          console.error("Error fetching ads:", error)
          // Fallback without orderBy
          getDocs(collection(db, "ads")).then((snapshot) => {
            const adsData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate(),
              updatedAt: doc.data().updatedAt?.toDate(),
            })) as Ad[]
            setAds(adsData)
            console.log("Loaded ads (fallback):", adsData.length)
          })
        },
      )

      // Fetch all users (only for super admin)
      if (user.role === "super_admin") {
        const usersQuery = query(collection(db, "users"))
        const unsubscribeUsers = onSnapshot(
          usersQuery,
          (snapshot) => {
            const usersData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate(),
            })) as User[]
            setUsers(usersData)
            console.log("Loaded users:", usersData.length)
          },
          (error) => {
            console.error("Error fetching users:", error)
          },
        )
      }

      // Fetch analytics (super admin sees all, sub admin sees only their own)
      let analyticsQuery
      if (user.role === "super_admin") {
        analyticsQuery = query(collection(db, "analytics"))
      } else {
        analyticsQuery = query(collection(db, "analytics"), where("ownerId", "==", user.id))
      }

      const unsubscribeAnalytics = onSnapshot(
        analyticsQuery,
        (snapshot) => {
          const analyticsData = snapshot.docs.map((doc) => {
            const data = doc.data()

            // Handle date conversion
            let dateString = data.date
            if (data.date && typeof data.date === "object" && data.date.toDate) {
              dateString = data.date.toDate().toISOString().split("T")[0]
            }

            // Extract location data - Only use real Firebase data
            const location = data.geolocation || null
            const locationAddress = location?.address || "Unknown Location"
            const locationCoords =
              location?.latitude && location?.longitude
                ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                : null

            return {
              id: doc.id,
              ...data,
              date: dateString,
              impressions: data.impressions || data.impression || 0,
              hourlyData: Array.isArray(data.hourlyData) ? data.hourlyData : [data.hourlyData || {}],
              location: locationAddress,
              coordinates: locationCoords,
              geolocation: location,
              timestamp: data.timestamp?.toDate() || data.createdAt?.toDate() || new Date(),
            }
          }) as Analytics[]

          // Sort by timestamp
          analyticsData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

          console.log("Loaded analytics:", analyticsData.length)
          console.log("Sample analytics with location:", analyticsData[0])
          setAnalytics(analyticsData)
          setLoading(false)
        },
        (error) => {
          console.error("Error fetching analytics:", error)
          // Fallback query
          getDocs(collection(db, "analytics"))
            .then((snapshot) => {
              const analyticsData = snapshot.docs
                .map((doc) => {
                  const data = doc.data()
                  let dateString = data.date
                  if (data.date && typeof data.date === "object" && data.date.toDate) {
                    dateString = data.date.toDate().toISOString().split("T")[0]
                  }

                  const location = data.geolocation || data.location || null
                  const locationAddress = location?.address || data.locationAddress || "Unknown Location"
                  const locationCoords =
                    location?.latitude && location?.longitude
                      ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                      : data.coordinates || null

                  return {
                    id: doc.id,
                    ...data,
                    date: dateString,
                    impressions: data.impressions || data.impression || 0,
                    hourlyData: Array.isArray(data.hourlyData) ? data.hourlyData : [data.hourlyData || {}],
                    location: locationAddress,
                    coordinates: locationCoords,
                    geolocation: location,
                    timestamp: data.timestamp?.toDate() || data.createdAt?.toDate() || new Date(),
                  }
                })
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) as Analytics[]

              console.log("Loaded analytics (fallback):", analyticsData.length)
              setAnalytics(analyticsData)
              setLoading(false)
            })
            .catch((fallbackError) => {
              console.error("Fallback analytics query failed:", fallbackError)
              setLoading(false)
              toast({
                title: "Error",
                description: "Failed to load analytics data. Please refresh the page.",
                variant: "destructive",
              })
            })
        },
      )

      return () => {
        unsubscribeAds()
        if (user.role === "super_admin") {
          // unsubscribeUsers()
        }
        unsubscribeAnalytics()
      }
    } catch (error) {
      console.error("Error setting up analytics listeners:", error)
      setLoading(false)
      toast({
        title: "Connection Error",
        description: "Failed to connect to analytics database.",
        variant: "destructive",
      })
    }
  }

  // Helper function to get display name for unknown items
  const getDisplayName = (item: any, type: "ad" | "user" | "display" | "driver") => {
    switch (type) {
      case "ad":
        if (item?.title) return item.title
        if (item?.id) return `Ad ${item.id.slice(0, 8)}`
        return "Unknown Ad"
      case "user":
        if (item?.name) return item.name
        if (item?.email) return item.email
        if (item?.id) return `User ${item.id.slice(0, 8)}`
        return "Unknown User"
      case "display":
        if (item) return `Display ${item.slice(0, 8)}`
        return "Unknown Display"
      case "driver":
        if (item) return `Driver ${item.slice(0, 8)}`
        return "Unknown Driver"
      default:
        return "Unknown"
    }
  }

  // Initial data load
  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  // Manual refresh function
  const refreshData = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)

    toast({
      title: "Data Refreshed",
      description: "Analytics data has been updated.",
    })
  }

  // Filter analytics based on selections
  const filteredAnalytics = analytics.filter((item) => {
    if (selectedAd !== "all" && item.adId !== selectedAd) return false
    if (selectedUser !== "all" && item.ownerId !== selectedUser) return false
    if (dateRange?.from && new Date(item.date) < dateRange.from) return false
    if (dateRange?.to && new Date(item.date) > dateRange.to) return false
    return true
  })

  // Calculate totals
  const totalViews = filteredAnalytics.reduce((sum, item) => sum + (item.views || 0), 0)
  const totalClicks = filteredAnalytics.reduce((sum, item) => sum + (item.clicks || 0), 0)
  const totalWatchTime = filteredAnalytics.reduce((sum, item) => sum + (item.watchTime || 0), 0)
  const totalImpressions = filteredAnalytics.reduce((sum, item) => sum + (item.impressions || 0), 0)

  // Get unique locations for filtering - only real locations
  const uniqueLocations = [
    ...new Set(
      filteredAnalytics
        .filter((item) => item.geolocation?.latitude && item.geolocation?.longitude)
        .map((item) => item.location)
        .filter(Boolean),
    ),
  ]

  // Group analytics by date for charts
  const chartData = Object.entries(
    filteredAnalytics.reduce(
      (acc, item) => {
        const date = item.date
        if (!acc[date]) {
          acc[date] = { date, views: 0, clicks: 0, impressions: 0, watchTime: 0 }
        }
        acc[date].views += item.views || 0
        acc[date].clicks += item.clicks || 0
        acc[date].impressions += item.impressions || 0
        acc[date].watchTime += item.watchTime || 0
        return acc
      },
      {} as Record<string, any>,
    ),
  )
    .map(([_, data]) => ({
      ...data,
      watchTime: Math.round(data.watchTime / 60), // Convert to minutes
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Ad performance data with better naming
  const adPerformance = Object.entries(
    filteredAnalytics.reduce(
      (acc, item) => {
        const ad = ads.find((a) => a.id === item.adId)
        const adTitle = getDisplayName(ad, "ad")
        if (!acc[adTitle]) {
          acc[adTitle] = { name: adTitle, views: 0, clicks: 0, impressions: 0 }
        }
        acc[adTitle].views += item.views || 0
        acc[adTitle].clicks += item.clicks || 0
        acc[adTitle].impressions += item.impressions || 0
        return acc
      },
      {} as Record<string, any>,
    ),
  )
    .map(([_, data]) => data)
    .sort((a, b) => b.views - a.views) // Sort by views descending
    .slice(0, 10) // Top 10 ads

  // Location performance data
  const locationPerformance = Object.entries(
    filteredAnalytics
      .filter((item) => item.geolocation?.latitude && item.geolocation?.longitude)
      .reduce(
        (acc, item) => {
          const locationName = item.location || "Unknown Location"
          if (!acc[locationName]) {
            acc[locationName] = { name: locationName, views: 0, clicks: 0, impressions: 0 }
          }
          acc[locationName].views += item.views || 0
          acc[locationName].clicks += item.clicks || 0
          acc[locationName].impressions += item.impressions || 0
          return acc
        },
        {} as Record<string, any>,
      ),
  )
    .map(([_, data]) => data)
    .sort((a, b) => b.views - a.views) // Sort by views descending
    .slice(0, 8) // Top 8 locations

  const downloadAnalytics = () => {
    try {
      const csvContent = [
        [
          "Date",
          "Ad Title",
          "Owner",
          "Views",
          "Clicks",
          "Impressions",
          "Watch Time (minutes)",
          "CTR (%)",
          "Location",
          "Coordinates",
          "Display ID",
          "Driver ID",
        ].join(","),
        ...filteredAnalytics.map((item) => {
          const ad = ads.find((a) => a.id === item.adId)
          const owner = users.find((u) => u.id === item.ownerId)
          const ctr =
            (item.impressions || 0) > 0 ? (((item.clicks || 0) / (item.impressions || 0)) * 100).toFixed(2) : "0"
          return [
            item.date,
            getDisplayName(ad, "ad"),
            getDisplayName(owner, "user"),
            item.views || 0,
            item.clicks || 0,
            item.impressions || 0,
            Math.round((item.watchTime || 0) / 60),
            ctr,
            item.location || "Unknown Location",
            item.coordinates || "No coordinates",
            getDisplayName(item.displayId, "display"),
            getDisplayName(item.driverId, "driver"),
          ].join(",")
        }),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `analytics-${user?.role}-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      toast({
        title: "Download Complete",
        description: "Analytics report has been downloaded successfully.",
      })
    } catch (error) {
      console.error("Error downloading analytics:", error)
      toast({
        title: "Download Failed",
        description: "Failed to download analytics report. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        </div>
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          {user?.role === "super_admin" ? "Super Admin Analytics" : "Analytics Dashboard"}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshData} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </Button>
          <Button onClick={downloadAnalytics}>
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Select value={selectedAd} onValueChange={setSelectedAd}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Ad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ads</SelectItem>
            {ads.map((ad) => (
              <SelectItem key={ad.id} value={ad.id}>
                {getDisplayName(ad, "ad")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {user?.role === "super_admin" && (
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select User" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {getDisplayName(user, "user")} ({user.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
      </div>

      {/* Location Summary - Only Real Data */}
      {uniqueLocations.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Actual Location Analytics Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {uniqueLocations.slice(0, 8).map((location, index) => {
                const locationAnalytics = filteredAnalytics.filter((item) => item.location === location)
                const locationViews = locationAnalytics.reduce((sum, item) => sum + (item.views || 0), 0)
                const locationClicks = locationAnalytics.reduce((sum, item) => sum + (item.clicks || 0), 0)
                const sampleEntry = locationAnalytics.find(
                  (item) => item.geolocation?.latitude && item.geolocation?.longitude,
                )

                return (
                  <div key={index} className="bg-white p-3 rounded border">
                    <p className="font-medium text-xs truncate" title={location}>
                      {location}
                    </p>
                    <p className="text-xs text-blue-600">{locationViews} views</p>
                    <p className="text-xs text-green-600">{locationClicks} clicks</p>
                    <p className="text-xs text-gray-500">{locationAnalytics.length} entries</p>
                    {sampleEntry?.geolocation && (
                      <button
                        onClick={() => {
                          const lat = sampleEntry.geolocation.latitude
                          const lng = sampleEntry.geolocation.longitude
                          if (lat && lng) {
                            window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank")
                          }
                        }}
                        className="text-xs text-blue-500 hover:text-blue-700 underline mt-1 block"
                        title="Click to view on Google Maps"
                      >
                        📍 View on Map
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            {uniqueLocations.length > 8 && (
              <p className="text-xs text-gray-500 mt-2">+{uniqueLocations.length - 8} more locations</p>
            )}
            {uniqueLocations.length === 0 && (
              <p className="text-sm text-gray-500">No location data available in current analytics</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* System Status */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm">System Status & Location Data</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p>
                <strong>Total Ads:</strong> {ads.length}
              </p>
              <p>
                <strong>Active Ads:</strong> {ads.filter((ad) => ad.status === "active").length}
              </p>
            </div>
            <div>
              <p>
                <strong>Total Users:</strong> {users.length}
              </p>
              <p>
                <strong>Sub Admins:</strong> {users.filter((u) => u.role === "sub_admin").length}
              </p>
            </div>
            <div>
              <p>
                <strong>Total Analytics:</strong> {analytics.length}
              </p>
              <p>
                <strong>Filtered Analytics:</strong> {filteredAnalytics.length}
              </p>
            </div>
            <div>
              <p>
                <strong>Unique Locations:</strong> {uniqueLocations.length}
              </p>
              <p>
                <strong>With GPS Coordinates:</strong>{" "}
                {analytics.filter((a) => a.geolocation?.latitude && a.geolocation?.longitude).length}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p>
              <strong>Date Range:</strong>{" "}
              {dateRange?.from
                ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to?.toLocaleDateString() || "Now"}`
                : "All Time"}
            </p>
          </div>
          {analytics.length > 0 && (
            <div className="mt-4">
              <p>
                <strong>Latest Analytics Entry:</strong>
              </p>
              <pre className="text-xs bg-white p-2 rounded mt-1 overflow-auto max-h-32">
                {JSON.stringify(
                  {
                    ...analytics[0],
                    timestamp: analytics[0].timestamp?.toISOString(),
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From {uniqueLocations.length} location{uniqueLocations.length !== 1 ? "s" : ""} •{" "}
              {filteredAnalytics.length} entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Click-through rate: {totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Watch Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(totalWatchTime / 3600)}h</div>
            <p className="text-xs text-muted-foreground">{Math.round(totalWatchTime / 60)} minutes total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impressions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total ad displays</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Views & Clicks Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                views: { label: "Views", color: "hsl(var(--chart-1))" },
                clicks: { label: "Clicks", color: "hsl(var(--chart-2))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line type="monotone" dataKey="views" stroke="var(--color-views)" strokeWidth={2} name="Views" />
                  <Line type="monotone" dataKey="clicks" stroke="var(--color-clicks)" strokeWidth={2} name="Clicks" />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performing Ads</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                views: { label: "Views", color: "hsl(var(--chart-1))" },
                clicks: { label: "Clicks", color: "hsl(var(--chart-2))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="views" fill="var(--color-views)" name="Views" />
                  <Bar dataKey="clicks" fill="var(--color-clicks)" name="Clicks" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Impressions & Watch Time Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                impressions: { label: "Impressions", color: "hsl(var(--chart-3))" },
                watchTime: { label: "Watch Time (min)", color: "hsl(var(--chart-4))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="impressions"
                    stroke="var(--color-impressions)"
                    strokeWidth={2}
                    name="Impressions"
                  />
                  <Line
                    type="monotone"
                    dataKey="watchTime"
                    stroke="var(--color-watchTime)"
                    strokeWidth={2}
                    name="Watch Time (min)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {locationPerformance.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  views: { label: "Views", color: "hsl(var(--chart-1))" },
                  clicks: { label: "Clicks", color: "hsl(var(--chart-2))" },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={locationPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="views" fill="var(--color-views)" name="Views" />
                    <Bar dataKey="clicks" fill="var(--color-clicks)" name="Clicks" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Analytics with Location */}
      {filteredAnalytics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Analytics Entries with Location Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left">Time</th>
                    <th className="px-4 py-2 text-left">Ad</th>
                    <th className="px-4 py-2 text-left">Owner</th>
                    <th className="px-4 py-2 text-left">Views</th>
                    <th className="px-4 py-2 text-left">Clicks</th>
                    <th className="px-4 py-2 text-left">Location</th>
                    <th className="px-4 py-2 text-left">Coordinates</th>
                    <th className="px-4 py-2 text-left">Display</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAnalytics.slice(0, 15).map((entry) => {
                    const ad = ads.find((a) => a.id === entry.adId)
                    const owner = users.find((u) => u.id === entry.ownerId)
                    return (
                      <tr key={entry.id} className="border-t">
                        <td className="px-4 py-2">{entry.timestamp?.toLocaleString() || "Unknown"}</td>
                        <td className="px-4 py-2">{getDisplayName(ad, "ad")}</td>
                        <td className="px-4 py-2">{getDisplayName(owner, "user")}</td>
                        <td className="px-4 py-2">{entry.views || 0}</td>
                        <td className="px-4 py-2">{entry.clicks || 0}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1 text-gray-500" />
                            <span className="truncate max-w-[150px]" title={entry.location}>
                              {entry.location || "Unknown Location"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          {entry.geolocation?.latitude && entry.geolocation?.longitude ? (
                            <button
                              onClick={() => {
                                const lat = entry.geolocation.latitude
                                const lng = entry.geolocation.longitude
                                window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank")
                              }}
                              className="font-mono text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer"
                              title="Click to open in Google Maps"
                            >
                              {entry.coordinates}
                            </button>
                          ) : (
                            <span className="font-mono text-xs text-gray-400">No coordinates</span>
                          )}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">{getDisplayName(entry.displayId, "display")}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {filteredAnalytics.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <BarChart3 className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-600">No Analytics Data</h3>
            <p className="text-gray-500 text-center mt-2">No analytics data available for the selected filters.</p>
            <p className="text-gray-400 text-sm text-center mt-1">
              Data will appear as displays start playing ads and users interact with them.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
