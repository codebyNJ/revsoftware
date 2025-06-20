"use client"

import { useAuth } from "@/hooks/use-auth"
import { LoginForm } from "@/components/auth/login-form"
import { AdManagement } from "@/components/super-admin/ad-management"
import { MovementTracker } from "@/components/super-admin/movement-tracker"
import { DisplaySettingsManager } from "@/components/super-admin/display-settings"
import { DisplayManagement } from "@/components/super-admin/display-management"
import { UserManagement } from "@/components/super-admin/user-management"
import { DriverManagement } from "@/components/super-admin/driver-management"
import { DataScheduler } from "@/components/data-management/data-scheduler"
import { NewsManagement } from "@/components/data-management/news-management"
import { JobsManagement } from "@/components/data-management/jobs-management"
import { PlaylistManager } from "@/components/data-management/playlist-manager"
import { AnalyticsDashboard } from "@/components/sub-admin/analytics-dashboard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import {
  LogOut,
  Settings,
  BarChart3,
  Navigation,
  Users,
  Video,
  Car,
  Tv,
  AlertTriangle,
  Database,
  Newspaper,
  Briefcase,
  ListOrdered,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function SuperAdminDashboard() {
  const { user, loading, authError } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

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

  const openDisplayPage = () => {
    window.open("/display", "_blank")
  }

  useEffect(() => {
    if (user) {
      toast({
        title: `Welcome, ${user.name}!`,
        description: `You are logged in as ${user.role.replace("_", " ")}.`,
      })
    }
  }, [user, toast])

  useEffect(() => {
    if (user && user.role === "sub_admin") {
      router.push("/sub-admin")
    }
  }, [user, router])

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

  // Only super admins can access the dashboard
  if (user.role !== "super_admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
          <div className="text-center mb-6">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Access Restricted</h1>
            <p className="text-gray-600 mt-2">Only super administrators have access to this system.</p>
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

          <Button onClick={handleSignOut} className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">REV Ad Management System</h1>
              <p className="text-sm text-gray-600">
                Welcome back, {user.name} ({user.role.replace("_", " ")})
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={openDisplayPage}>
                <Tv className="w-4 h-4 mr-2" />
                Open Display
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-gray-600 mt-2">
            Manage your ad campaigns, displays, and track real-time movement from one central location.
          </p>
        </div>

        <Tabs defaultValue="playlist" className="space-y-6">
          <TabsList className="grid w-full grid-cols-11">
            <TabsTrigger value="playlist" className="flex items-center gap-2">
              <ListOrdered className="w-4 h-4" />
              Playlist
            </TabsTrigger>
            <TabsTrigger value="ads" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Ads
            </TabsTrigger>
            <TabsTrigger value="displays" className="flex items-center gap-2">
              <Tv className="w-4 h-4" />
              Displays
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="drivers" className="flex items-center gap-2">
              <Car className="w-4 h-4" />
              Drivers
            </TabsTrigger>
            <TabsTrigger value="data-scheduler" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Data
            </TabsTrigger>
            <TabsTrigger value="news" className="flex items-center gap-2">
              <Newspaper className="w-4 h-4" />
              News
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Jobs
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              Tracking
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="playlist">
            <PlaylistManager />
          </TabsContent>

          <TabsContent value="ads">
            <AdManagement />
          </TabsContent>

          <TabsContent value="displays">
            <DisplayManagement />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="drivers">
            <DriverManagement />
          </TabsContent>

          <TabsContent value="data-scheduler">
            <DataScheduler />
          </TabsContent>

          <TabsContent value="news">
            <NewsManagement />
          </TabsContent>

          <TabsContent value="jobs">
            <JobsManagement />
          </TabsContent>

          <TabsContent value="settings">
            <DisplaySettingsManager />
          </TabsContent>

          <TabsContent value="tracking">
            <MovementTracker />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
