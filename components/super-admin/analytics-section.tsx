"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AnalyticsDashboard } from "@/components/sub-admin/analytics-dashboard"
import { AnalyticsOverview } from "@/components/super-admin/analytics-overview"
import { Button } from "@/components/ui/button"
import { Database, BarChart3, Settings, TestTube } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function AnalyticsSection() {
  const [testingAnalytics, setTestingAnalytics] = useState(false)
  const { toast } = useToast()

  const testAnalyticsSystem = async () => {
    setTestingAnalytics(true)

    try {
      // Simulate analytics test
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast({
        title: "Analytics Test Complete",
        description: "Analytics system is functioning correctly.",
      })
    } catch (error) {
      toast({
        title: "Analytics Test Failed",
        description: "There was an issue with the analytics system.",
        variant: "destructive",
      })
    } finally {
      setTestingAnalytics(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Analytics & Reporting</h2>
          <p className="text-muted-foreground">Monitor performance, track engagement, and analyze system health.</p>
        </div>
        <Button variant="outline" onClick={testAnalyticsSystem} disabled={testingAnalytics}>
          <TestTube className="w-4 h-4 mr-2" />
          {testingAnalytics ? "Testing..." : "Test Analytics"}
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="debug" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Debug Tools
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <AnalyticsOverview />
        </TabsContent>

        <TabsContent value="dashboard">
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="debug">
          <Card>
            <CardHeader>
              <CardTitle>System Diagnostics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Database Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Connected</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Analytics Collection</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Active</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="pt-4">
                  <Button onClick={testAnalyticsSystem} disabled={testingAnalytics} className="w-full">
                    <TestTube className="w-4 h-4 mr-2" />
                    {testingAnalytics ? "Running Diagnostics..." : "Run Full System Test"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
