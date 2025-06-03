"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { Shield, Users, Monitor, ArrowRight, BarChart3, Video } from "lucide-react"

export default function SuperPage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<string | null>(null)

  const userTypes = [
    {
      id: "super_admin",
      title: "Super Administrator",
      description: "Full system access with complete management capabilities",
      icon: Shield,
      color: "bg-red-500",
      features: [
        "Manage all users and permissions",
        "Create and manage ads",
        "Configure displays and drivers",
        "View all analytics and reports",
        "System settings and configuration",
      ],
      path: "/",
      badge: "Full Access",
      badgeVariant: "destructive" as const,
    },
    {
      id: "sub_admin",
      title: "Sub Administrator",
      description: "Limited access for content management and analytics",
      icon: Users,
      color: "bg-blue-500",
      features: [
        "View assigned ads",
        "Access personal analytics",
        "Generate reports",
        "Monitor ad performance",
        "Limited content management",
      ],
      path: "/sub-admin",
      badge: "Limited Access",
      badgeVariant: "default" as const,
    },
    {
      id: "display",
      title: "Display Terminal",
      description: "Kiosk mode for displaying ads on screens",
      icon: Monitor,
      color: "bg-green-500",
      features: [
        "Full-screen ad display",
        "Automatic content rotation",
        "PIN-based authentication",
        "Real-time content updates",
        "Analytics tracking",
      ],
      path: "/display",
      badge: "Display Only",
      badgeVariant: "secondary" as const,
    },
  ]

  const handleRoleSelect = (userType: any) => {
    setSelectedRole(userType.id)
    // Add a small delay for visual feedback
    setTimeout(() => {
      router.push(userType.path)
    }, 300)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">REV Ad Management System</h1>
            <p className="text-lg text-gray-600">Select your access level to continue</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {userTypes.map((userType) => {
            const IconComponent = userType.icon
            const isSelected = selectedRole === userType.id

            return (
              <Card
                key={userType.id}
                className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                  isSelected ? "ring-2 ring-blue-500 shadow-lg scale-105" : ""
                }`}
                onClick={() => handleRoleSelect(userType)}
              >
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    <div className={`${userType.color} p-4 rounded-full text-white`}>
                      <IconComponent className="w-8 h-8" />
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CardTitle className="text-xl">{userType.title}</CardTitle>
                    <Badge variant={userType.badgeVariant}>{userType.badge}</Badge>
                  </div>
                  <CardDescription className="text-center">{userType.description}</CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-gray-700 mb-3">Key Features:</h4>
                    <ul className="space-y-2">
                      {userType.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-4 border-t">
                    <Button className="w-full" variant={isSelected ? "default" : "outline"} disabled={isSelected}>
                      {isSelected ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Redirecting...
                        </>
                      ) : (
                        <>
                          Access {userType.title}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* System Info */}
        <div className="mt-16 bg-white rounded-lg shadow-sm border p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">REV Ad Management System</h2>
            <p className="text-gray-600">Comprehensive digital advertising management platform</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Video className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Content Management</h3>
              <p className="text-sm text-gray-600">Upload, organize, and schedule your advertising content</p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Monitor className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Display Control</h3>
              <p className="text-sm text-gray-600">Manage multiple displays and control what content appears where</p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Analytics & Reports</h3>
              <p className="text-sm text-gray-600">Track performance and generate detailed analytics reports</p>
            </div>
          </div>
        </div>

        {/* Quick Access Links */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-4">Quick Access:</p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
              <Shield className="w-4 h-4 mr-2" />
              Super Admin
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push("/sub-admin")}>
              <Users className="w-4 h-4 mr-2" />
              Sub Admin
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push("/display")}>
              <Monitor className="w-4 h-4 mr-2" />
              Display
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
