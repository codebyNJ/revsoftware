"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, query, orderBy, limit, deleteDoc, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { analyticsService } from "@/lib/analytics-service"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, AlertTriangle, CheckCircle, Trash2, RefreshCw } from "lucide-react"

export function AnalyticsDebug() {
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [recentAnalytics, setRecentAnalytics] = useState<any[]>([])
  const [testResult, setTestResult] = useState<boolean | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  const loadRecentAnalytics = async () => {
    setLoading(true)
    try {
      const analyticsQuery = query(collection(db, "analytics"), orderBy("timestamp", "desc"), limit(10))
      const snapshot = await getDocs(analyticsQuery)

      const analytics = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      }))

      setRecentAnalytics(analytics)
      console.log("Loaded recent analytics:", analytics.length)
    } catch (error) {
      console.error("Error loading recent analytics:", error)
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecentAnalytics()
  }, [])

  const testAnalytics = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      const result = await analyticsService.testAnalyticsWrite()
      setTestResult(result)

      toast({
        title: result ? "Test Successful" : "Test Failed",
        description: result
          ? "Analytics system is working correctly"
          : "Analytics system is not working. Check Firestore permissions.",
        variant: result ? "default" : "destructive",
      })

      // Reload analytics to show the test entry
      await loadRecentAnalytics()
    } catch (error) {
      console.error("Analytics test error:", error)
      setTestResult(false)
      toast({
        title: "Test Failed",
        description: "Error testing analytics system",
        variant: "destructive",
      })
    } finally {
      setTesting(false)
    }
  }

  const deleteTestEntries = async () => {
    setDeleting(true)

    try {
      const analyticsQuery = query(collection(db, "analytics"), where("test", "==", true))
      const snapshot = await getDocs(analyticsQuery)

      const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref))
      await Promise.all(deletePromises)

      toast({
        title: "Cleanup Complete",
        description: `Deleted ${snapshot.docs.length} test analytics entries`,
      })

      // Reload analytics
      await loadRecentAnalytics()
    } catch (error) {
      console.error("Error deleting test entries:", error)
      toast({
        title: "Cleanup Failed",
        description: "Failed to delete test analytics entries",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Analytics System Diagnostics</span>
          <Button variant="outline" size="sm" onClick={loadRecentAnalytics} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">System Status</h3>
            <p className="text-sm text-muted-foreground">Check if analytics tracking is working properly</p>
          </div>
          <div className="flex items-center gap-2">
            {testResult === true && <CheckCircle className="h-5 w-5 text-green-500" />}
            {testResult === false && <AlertTriangle className="h-5 w-5 text-red-500" />}
            <Button onClick={testAnalytics} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {testing ? "Testing..." : "Test Analytics"}
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Recent Analytics Entries</h3>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : recentAnalytics.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left">Time</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Ad ID</th>
                      <th className="px-4 py-2 text-left">Owner ID</th>
                      <th className="px-4 py-2 text-left">Display ID</th>
                      <th className="px-4 py-2 text-left">Views</th>
                      <th className="px-4 py-2 text-left">Clicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAnalytics.map((entry) => (
                      <tr key={entry.id} className="border-t">
                        <td className="px-4 py-2">{entry.timestamp?.toLocaleString() || "Unknown"}</td>
                        <td className="px-4 py-2">{entry.eventType || entry.test ? "Test" : "Unknown"}</td>
                        <td className="px-4 py-2 font-mono text-xs">{entry.adId?.slice(0, 8) || "N/A"}</td>
                        <td className="px-4 py-2 font-mono text-xs">{entry.ownerId?.slice(0, 8) || "N/A"}</td>
                        <td className="px-4 py-2 font-mono text-xs">{entry.displayId?.slice(0, 8) || "N/A"}</td>
                        <td className="px-4 py-2">{entry.views || 0}</td>
                        <td className="px-4 py-2">{entry.clicks || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No analytics entries found</div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-sm text-muted-foreground">{recentAnalytics.length} recent entries shown</p>
        <Button
          variant="outline"
          size="sm"
          onClick={deleteTestEntries}
          disabled={deleting || recentAnalytics.filter((a) => a.test).length === 0}
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
          Clean Test Entries
        </Button>
      </CardFooter>
    </Card>
  )
}
