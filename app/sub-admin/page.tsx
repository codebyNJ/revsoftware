"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { LoginForm } from "@/components/auth/login-form"
import { AnalyticsDashboard } from "@/components/sub-admin/analytics-dashboard"
import { AnalyticsReport } from "@/components/sub-admin/analytics-report"
import { AdList } from "@/components/sub-admin/ad-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { LogOut, BarChart3, Video, FileBarChart, Home } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function SubAdminPage() {
  const { user, loading, authError } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("dashboard")
  const router = useRouter()

  const goToSuperPage = () => {
    router.push("/super")
  }

  useEffect(() => {
    if (user) {
      toast({
        title: `Welcome, ${user.name}!`,
        description: `You are logged in as ${user.role.replace("_", " ")}.`,
      })
    }
  }, [user, toast])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm authError={authError} />
  }

  // Only sub admins can access this page
  if (user.role !== "sub_admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
          <div className="text-center mb-6">
            <AlertTitle>Access Restricted</AlertTitle>
            <p className="text-gray-600 mt-2">This page is only for sub administrators.</p>
            <p className="text-gray-600 mt-2">
              Please go to the{" "}
              <a href="/" className="text-blue-600 hover:underline">
                main dashboard
              </a>{" "}
              instead.
            </p>
          </div>

          <Alert className="mb-6">
            <AlertTitle>User Information</AlertTitle>
            <AlertDescription>
              <div className="mt-2">
                <p>
                  <strong>Name:</strong> {user.name}
                </p>
                <p>
                  <strong>Email:</strong> {user.email}
                </p>
                <p>
                  <strong>Role:</strong> {user.role.replace("_", " ")}
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <Button onClick={() => signOut(auth)} className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    )
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      toast({
        title: "Signed Out",
        description: "You have been signed out successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">REV Ad Management System</h1>
              <p className="text-sm text-gray-600">Sub Admin Dashboard - Welcome back, {user.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={goToSuperPage}>
                <Home className="w-4 h-4 mr-2" />
                Super Page
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px:6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileBarChart className="w-4 h-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="ads" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              My Ads
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="reports">
            <AnalyticsReport />
          </TabsContent>

          <TabsContent value="ads">
            <AdList />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
