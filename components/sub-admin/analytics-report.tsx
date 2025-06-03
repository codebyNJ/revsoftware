"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Ad, Analytics } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from "recharts"
import { Download, PieChartIcon, BarChart3 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import type { DateRange } from "react-day-picker"
import { useToast } from "@/hooks/use-toast"

export function AnalyticsReport() {
  const { user } = useAuth()
  const [ads, setAds] = useState<Ad[]>([])
  const [analytics, setAnalytics] = useState<Analytics[]>([])
  const [selectedAd, setSelectedAd] = useState<string>("all")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [reportType, setReportType] = useState<"performance" | "distribution">("performance")
  const { toast } = useToast()

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      try {
        // Fetch user's ads
        const adsQuery = query(collection(db, "ads"), where("ownerId", "==", user.id), orderBy("createdAt", "desc"))
        const adsSnapshot = await getDocs(adsQuery)

        const adsData = adsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
        })) as Ad[]

        setAds(adsData)

        // Fetch analytics for user's ads
        const analyticsQuery = query(
          collection(db, "analytics"),
          where("ownerId", "==", user.id),
          orderBy("date", "desc"),
        )

        const analyticsSnapshot = await getDocs(analyticsQuery)

        const analyticsData = analyticsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Analytics[]

        setAnalytics(analyticsData)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load analytics data. Please refresh the page.",
          variant: "destructive",
        })
      }
    }

    fetchData()
  }, [user, toast])

  const filteredAnalytics = analytics.filter((item) => {
    if (selectedAd !== "all" && item.adId !== selectedAd) return false
    if (dateRange?.from && new Date(item.date) < dateRange.from) return false
    if (dateRange?.to && new Date(item.date) > dateRange.to) return false
    return true
  })

  // Aggregate data for performance report
  const performanceData = filteredAnalytics
    .reduce((acc, item) => {
      const existingDate = acc.find((d) => d.date === item.date)

      if (existingDate) {
        existingDate.views += item.views
        existingDate.clicks += item.clicks
        existingDate.impressions += item.impressions
        existingDate.watchTime += item.watchTime
      } else {
        acc.push({
          date: item.date,
          views: item.views,
          clicks: item.clicks,
          impressions: item.impressions,
          watchTime: Math.round(item.watchTime / 60), // Convert to minutes
        })
      }

      return acc
    }, [] as any[])
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Aggregate data for distribution report
  const adDistributionData = filteredAnalytics.reduce((acc, item) => {
    const ad = ads.find((ad) => ad.id === item.adId)
    const adName = ad ? ad.title : "Unknown Ad"

    const existingAd = acc.find((d) => d.name === adName)

    if (existingAd) {
      existingAd.views += item.views
      existingAd.clicks += item.clicks
      existingAd.watchTime += item.watchTime
    } else {
      acc.push({
        name: adName,
        views: item.views,
        clicks: item.clicks,
        watchTime: Math.round(item.watchTime / 60), // Convert to minutes
      })
    }

    return acc
  }, [] as any[])

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#8dd1e1"]

  const downloadReport = () => {
    try {
      let csvContent = ""

      if (reportType === "performance") {
        csvContent = [
          ["Date", "Views", "Clicks", "Impressions", "Watch Time (minutes)", "CTR (%)"].join(","),
          ...performanceData.map((item) => {
            const ctr = item.impressions > 0 ? ((item.clicks / item.impressions) * 100).toFixed(2) : "0"
            return [item.date, item.views, item.clicks, item.impressions, item.watchTime, ctr].join(",")
          }),
        ].join("\n")
      } else {
        csvContent = [
          ["Ad Name", "Views", "Clicks", "Watch Time (minutes)"].join(","),
          ...adDistributionData.map((item) => {
            return [item.name, item.views, item.clicks, item.watchTime].join(",")
          }),
        ].join("\n")
      }

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `analytics-report-${reportType}-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      toast({
        title: "Download Complete",
        description: "Analytics report has been downloaded successfully.",
      })
    } catch (error) {
      console.error("Error downloading report:", error)
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
        <h2 className="text-2xl font-bold">Analytics Report</h2>
        <Button onClick={downloadReport}>
          <Download className="w-4 h-4 mr-2" />
          Download Report
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
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

        <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Report Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="performance">
              <div className="flex items-center">
                <BarChart3 className="w-4 h-4 mr-2" />
                Performance Over Time
              </div>
            </SelectItem>
            <SelectItem value="distribution">
              <div className="flex items-center">
                <PieChartIcon className="w-4 h-4 mr-2" />
                Ad Distribution
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {reportType === "performance" ? (
        <Card>
          <CardHeader>
            <CardTitle>Performance Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                views: {
                  label: "Views",
                  color: "hsl(var(--chart-1))",
                },
                clicks: {
                  label: "Clicks",
                  color: "hsl(var(--chart-2))",
                },
                impressions: {
                  label: "Impressions",
                  color: "hsl(var(--chart-3))",
                },
              }}
              className="h-[400px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="views" fill="var(--color-views)" />
                  <Bar dataKey="clicks" fill="var(--color-clicks)" />
                  <Bar dataKey="impressions" fill="var(--color-impressions)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Views Distribution by Ad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={adDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="views"
                    >
                      {adDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} views`, "Views"]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Watch Time Distribution by Ad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={adDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="watchTime"
                    >
                      {adDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} minutes`, "Watch Time"]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {filteredAnalytics.length === 0 && (
        <Card>
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
