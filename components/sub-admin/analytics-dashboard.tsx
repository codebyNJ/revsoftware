"use client"

import { useState, useEffect } from "react"
import { collection, query, where, onSnapshot, orderBy, getDocs, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Ad, Analytics } from "@/lib/types"
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

export function AnalyticsDashboard() {
  const { user } = useAuth()
  const [ads, setAds] = useState<Ad[]>([])
  const [analytics, setAnalytics] = useState<Analytics[]>([])
  const [selectedAd, setSelectedAd] = useState<string>("all")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const { toast } = useToast()

  const ensureAnalyticsForAllAds = async () => {
    if (!user || ads.length === 0) return

    try {
      const today = new Date().toISOString().split("T")[0]

      // Check which ads don't have analytics entries
      for (const ad of ads) {
        const analyticsQuery = query(
          collection(db, "analytics"),
          where("adId", "==", ad.id),
          where("date", "==", today),
        )

        const analyticsSnapshot = await getDocs(analyticsQuery)

        if (analyticsSnapshot.empty) {
          // Create initial analytics for this ad
          await addDoc(collection(db, "analytics"), {
            adId: ad.id,
            clicks: 0,
            date: today, // String format YYYY-MM-DD
            displayId: "",
            driverId: "",
            geolocation: {
              accuracy: 0,
              address: "",
              latitude: 0,
              longitude: 0,
              timestamp: new Date(),
            },
            hourlyData: [
              {
                clicks: 0,
                geolocation: {
                  latitude: 0,
                  longitude: 0,
                },
                hour: new Date().getHours(),
                views: 0,
              },
            ],
            impressions: 0, // Note: plural form
            ownerId: user.id,
            views: 0,
            watchTime: 0,
          })

          console.log("Created missing analytics for ad:", ad.title)
        }
      }
    } catch (error) {
      console.error("Error ensuring analytics for all ads:", error)
    }
  }

  useEffect(() => {
    if (!user) return

    try {
      console.log("Current user ID:", user.id)

      // Fetch user's ads
      const adsQuery = query(collection(db, "ads"), where("ownerId", "==", user.id), orderBy("createdAt", "desc"))

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

          if (adsData.length === 0) {
            toast({
              title: "No Ads Found",
              description: "You don't have any ads yet. Contact your super admin to create ads.",
            })
          }

          // Ensure all ads have analytics entries
          if (adsData.length > 0) {
            ensureAnalyticsForAllAds()
          }
        },
        (error) => {
          console.error("Error fetching ads:", error)
          toast({
            title: "Error",
            description: "Failed to load your ads. Please refresh the page.",
            variant: "destructive",
          })
        },
      )

      // Fetch analytics for user's ads - Updated to handle both string and timestamp dates
      const analyticsQuery = query(collection(db, "analytics"), where("ownerId", "==", user.id))

      const unsubscribeAnalytics = onSnapshot(
        analyticsQuery,
        (snapshot) => {
          const analyticsData = snapshot.docs.map((doc) => {
            const data = doc.data()

            // Handle date conversion - convert timestamp to string if needed
            let dateString = data.date
            if (data.date && typeof data.date === "object" && data.date.toDate) {
              // It's a Firestore timestamp
              dateString = data.date.toDate().toISOString().split("T")[0]
            }

            // Handle impressions vs impression field name mismatch
            const impressions = data.impressions || data.impression || 0

            // Ensure hourlyData is an array
            let hourlyData = data.hourlyData || []
            if (!Array.isArray(hourlyData)) {
              // Convert single object to array
              hourlyData = [hourlyData]
            }

            return {
              id: doc.id,
              ...data,
              date: dateString,
              impressions,
              hourlyData,
              // Add timestamp for better sorting
              timestamp: data.timestamp?.toDate() || data.createdAt?.toDate() || new Date(),
            }
          }) as Analytics[]

          // Sort by timestamp for better chronological order
          analyticsData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

          console.log("Loaded analytics:", analyticsData.length)
          console.log("Sample analytics data:", analyticsData[0])
          setAnalytics(analyticsData)
        },
        (error) => {
          console.error("Error fetching analytics:", error)
          toast({
            title: "Error",
            description: "Failed to load analytics data. Please refresh the page.",
            variant: "destructive",
          })
        },
      )

      return () => {
        unsubscribeAds()
        unsubscribeAnalytics()
      }
    } catch (error) {
      console.error("Error setting up listeners:", error)
      toast({
        title: "Connection Error",
        description: "Failed to connect to the database. Please check your internet connection.",
        variant: "destructive",
      })
    }
  }, [user, toast])

  const filteredAnalytics = analytics.filter((item) => {
    if (selectedAd !== "all" && item.adId !== selectedAd) return false
    if (dateRange?.from && new Date(item.date) < dateRange.from) return false
    if (dateRange?.to && new Date(item.date) > dateRange.to) return false
    return true
  })

  const totalViews = filteredAnalytics.reduce((sum, item) => sum + (item.views || 0), 0)
  const totalClicks = filteredAnalytics.reduce((sum, item) => sum + (item.clicks || 0), 0)
  const totalWatchTime = filteredAnalytics.reduce((sum, item) => sum + (item.watchTime || 0), 0)
  const totalImpressions = filteredAnalytics.reduce((sum, item) => sum + (item.impressions || 0), 0)

  const chartData = filteredAnalytics.map((item) => ({
    date: item.date,
    views: item.views || 0,
    clicks: item.clicks || 0,
    impressions: item.impressions || 0,
    watchTime: Math.round((item.watchTime || 0) / 60), // Convert to minutes
  }))

  const downloadAnalytics = () => {
    try {
      const csvContent = [
        ["Date", "Ad Title", "Views", "Clicks", "Impressions", "Watch Time (minutes)", "CTR (%)"].join(","),
        ...filteredAnalytics.map((item) => {
          const ad = ads.find((a) => a.id === item.adId)
          const ctr =
            (item.impressions || 0) > 0 ? (((item.clicks || 0) / (item.impressions || 0)) * 100).toFixed(2) : "0"
          return [
            item.date,
            ad?.title || "Unknown",
            item.views || 0,
            item.clicks || 0,
            item.impressions || 0,
            Math.round((item.watchTime || 0) / 60),
            ctr,
          ].join(",")
        }),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `analytics-${selectedAd}-${new Date().toISOString().split("T")[0]}.csv`
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <Button onClick={downloadAnalytics}>
          <Download className="w-4 h-4 mr-2" />
          Download Report
        </Button>
      </div>

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
        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
      </div>

      {/* Debug Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm">Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p>
            <strong>User ID:</strong> {user?.id}
          </p>
          <p>
            <strong>Total Ads:</strong> {ads.length}
          </p>
          <p>
            <strong>Total Analytics:</strong> {analytics.length}
          </p>
          <p>
            <strong>Filtered Analytics:</strong> {filteredAnalytics.length}
          </p>
          {analytics.length > 0 && (
            <div className="mt-2">
              <p>
                <strong>Sample Analytics:</strong>
              </p>
              <pre className="text-xs bg-white p-2 rounded mt-1 overflow-auto max-h-40">
                {JSON.stringify(
                  {
                    ...analytics[0],
                    timestamp: analytics[0].timestamp?.toISOString(),
                  },
                  null,
                  2,
                )}
              </pre>
              <p className="text-xs mt-1">
                <strong>Recent Analytics Count by Date:</strong>
              </p>
              <div className="text-xs">
                {Object.entries(
                  analytics.reduce(
                    (acc, item) => {
                      acc[item.date] = (acc[item.date] || 0) + 1
                      return acc
                    },
                    {} as Record<string, number>,
                  ),
                )
                  .slice(0, 5)
                  .map(([date, count]) => (
                    <div key={date}>
                      {date}: {count} entries
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Watch Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(totalWatchTime / 3600)}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CTR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0"}%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Views Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                views: {
                  label: "Views",
                  color: "hsl(var(--chart-1))",
                },
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
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engagement Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                clicks: {
                  label: "Clicks",
                  color: "hsl(var(--chart-2))",
                },
                impressions: {
                  label: "Impressions",
                  color: "hsl(var(--chart-3))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="clicks" fill="var(--color-clicks)" />
                  <Bar dataKey="impressions" fill="var(--color-impressions)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {filteredAnalytics.length === 0 && (
        <Card className="col-span-1 lg:col-span-2">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <BarChart3 className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-600">No Analytics Data</h3>
            <p className="text-gray-500 text-center mt-2">
              {selectedAd !== "all"
                ? "No data available for the selected ad yet."
                : "No analytics data available for your ads yet."}
            </p>
            <p className="text-gray-400 text-sm text-center mt-1">
              Data will appear as viewers interact with your ads.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
