"use client"

import { useState, useEffect } from "react"
import { collection, query, onSnapshot, orderBy, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Ad, Analytics, User } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer } from "recharts"
import { Download, Eye, MousePointer, Clock, TrendingUp, BarChart3 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import type { DateRange } from "react-day-picker"
import { useToast } from "@/hooks/use-toast"

export function AnalyticsOverview() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [ads, setAds] = useState<Ad[]>([])
  const [analytics, setAnalytics] = useState<Analytics[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedAd, setSelectedAd] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<string>("all")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || user.role !== "super_admin") return

    setLoading(true)

    try {
      // Fetch all ads
      const adsQuery = query(collection(db, "ads"), orderBy("createdAt", "desc"))
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
          console.log("Loaded all ads:", adsData.length)
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
            console.log("Loaded all ads (fallback):", adsData.length)
          })
        },
      )

      // Fetch all users
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
          console.log("Loaded all users:", usersData.length)
        },
        (error) => {
          console.error("Error fetching users:", error)
        },
      )

      // Fetch all analytics
      const analyticsQuery = query(collection(db, "analytics"))
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

            // Ensure proper data structure
            return {
              id: doc.id,
              ...data,
              date: dateString,
              impressions: data.impressions || data.impression || 0,
              hourlyData: Array.isArray(data.hourlyData) ? data.hourlyData : [data.hourlyData || {}],
              timestamp: data.timestamp?.toDate() || data.createdAt?.toDate() || new Date(),
            }
          }) as Analytics[]

          // Sort by timestamp
          analyticsData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

          console.log("Loaded all analytics:", analyticsData.length)
          console.log("Sample analytics:", analyticsData[0])
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

                  return {
                    id: doc.id,
                    ...data,
                    date: dateString,
                    impressions: data.impressions || data.impression || 0,
                    hourlyData: Array.isArray(data.hourlyData) ? data.hourlyData : [data.hourlyData || {}],
                    timestamp: data.timestamp?.toDate() || data.createdAt?.toDate() || new Date(),
                  }
                })
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) as Analytics[]

              console.log("Loaded all analytics (fallback):", analyticsData.length)
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
        unsubscribeUsers()
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
  }, [user, toast])

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

  // Ad performance data
  const adPerformance = Object.entries(
    filteredAnalytics.reduce(
      (acc, item) => {
        const ad = ads.find((a) => a.id === item.adId)
        const adTitle = ad?.title || "Unknown Ad"
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
    .slice(0, 10) // Top 10 ads

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
            ad?.title || "Unknown",
            owner?.name || "Unknown",
            item.views || 0,
            item.clicks || 0,
            item.impressions || 0,
            Math.round((item.watchTime || 0) / 60),
            ctr,
            item.displayId || "Unknown",
            item.driverId || "Unknown",
          ].join(",")
        }),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `super-admin-analytics-${new Date().toISOString().split("T")[0]}.csv`
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
          <h2 className="text-2xl font-bold">Analytics Overview</h2>
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
        <h2 className="text-2xl font-bold">Analytics Overview</h2>
        <Button onClick={downloadAnalytics}>
          <Download className="w-4 h-4 mr-2" />
          Download Report
        </Button>
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
                {ad.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select User" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name} ({user.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
      </div>

      {/* Debug Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm">System Status</CardTitle>
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
                <strong>Date Range:</strong>{" "}
                {dateRange?.from
                  ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to?.toLocaleDateString() || "Now"}`
                  : "All Time"}
              </p>
            </div>
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
            <p className="text-xs text-muted-foreground">Across {filteredAnalytics.length} entries</p>
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
                  <Line type="monotone" dataKey="views" stroke="var(--color-views)" strokeWidth={2} />
                  <Line type="monotone" dataKey="clicks" stroke="var(--color-clicks)" strokeWidth={2} />
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
                  <Bar dataKey="views" fill="var(--color-views)" />
                  <Bar dataKey="clicks" fill="var(--color-clicks)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

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
