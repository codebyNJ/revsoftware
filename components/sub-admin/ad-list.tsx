"use client"

import { useState, useEffect } from "react"
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Ad } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { Video, Clock, Calendar } from "lucide-react"

export function AdList() {
  const { user } = useAuth()
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (!user) return

    try {
      setLoading(true)
      // Fetch user's ads
      const adsQuery = query(collection(db, "ads"), where("ownerId", "==", user.id), orderBy("createdAt", "desc"))

      const unsubscribe = onSnapshot(
        adsQuery,
        (snapshot) => {
          const adsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
          })) as Ad[]

          setAds(adsData)
          setLoading(false)

          if (adsData.length === 0) {
            toast({
              title: "No Ads Found",
              description: "You don't have any ads yet. Contact your super admin to create ads.",
            })
          }
        },
        (error) => {
          console.error("Error fetching ads:", error)
          toast({
            title: "Error",
            description: "Failed to load your ads. Please refresh the page.",
            variant: "destructive",
          })
          setLoading(false)
        },
      )

      return () => unsubscribe()
    } catch (error) {
      console.error("Error setting up listeners:", error)
      toast({
        title: "Connection Error",
        description: "Failed to connect to the database. Please check your internet connection.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }, [user, toast])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="w-full">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse"></div>
                <div className="flex justify-between mt-4">
                  <div className="h-4 w-1/4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-1/4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Video className="w-6 h-6" />
        <h2 className="text-2xl font-bold">My Ads</h2>
      </div>

      {ads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Video className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-600">No Ads Found</h3>
            <p className="text-gray-500 text-center mt-2">You don't have any ads assigned to you yet.</p>
            <p className="text-gray-400 text-sm text-center mt-1">
              Contact your super administrator to have ads assigned to your account.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {ads.map((ad) => (
            <Card key={ad.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle>{ad.title}</CardTitle>
                  <Badge variant={ad.status === "active" ? "default" : "secondary"}>{ad.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{ad.description}</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Duration: {ad.duration} seconds</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Created: {ad.createdAt?.toLocaleDateString()}</span>
                  </div>
                </div>

                {ad.thumbnailUrl && (
                  <div className="mt-4">
                    <img
                      src={ad.thumbnailUrl || "/placeholder.svg"}
                      alt={ad.title}
                      className="rounded-md h-32 object-cover"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = "none"
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
