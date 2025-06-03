"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Ad, User, Display, Driver } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Plus, Edit, Trash2, GripVertical, Monitor, Car, Hash } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

export function AdManagement() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [ads, setAds] = useState<Ad[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [displays, setDisplays] = useState<Display[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingAd, setEditingAd] = useState<Ad | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    videoUrl: "",
    thumbnailUrl: "",
    duration: 0,
    status: "active" as const,
    assignedToUserId: "none",
    assignedToUserEmail: "",
    assignedDisplays: [] as string[], // Array of display IDs
    assignedDrivers: [] as string[], // Array of driver IDs
    displayAll: true, // Show on all displays by default
    assignAllDrivers: true, // Assign to all drivers by default
  })

  const initializeAdAnalytics = async (adId: string, ownerId: string) => {
    try {
      const today = new Date().toISOString().split("T")[0]

      await addDoc(collection(db, "analytics"), {
        adId,
        clicks: 0,
        date: today,
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
        impressions: 0,
        ownerId,
        views: 0,
        watchTime: 0,
      })

      console.log("Initial analytics created for ad ID:", adId)
    } catch (error) {
      console.error("Error initializing analytics:", error)
      toast({
        title: "Analytics Error",
        description: "Failed to initialize analytics for this ad.",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    const q = query(collection(db, "ads"), orderBy("order"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const adsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        scheduledStart: doc.data().scheduledStart?.toDate(),
        scheduledEnd: doc.data().scheduledEnd?.toDate(),
      })) as Ad[]
      setAds(adsData)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!user || user.role !== "super_admin") return

    try {
      // Fetch users
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
        },
        (error) => {
          console.error("Error fetching users:", error)
        },
      )

      // Fetch displays
      const displaysQuery = query(collection(db, "displays"))
      const unsubscribeDisplays = onSnapshot(
        displaysQuery,
        (snapshot) => {
          const displaysData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
            lastSeen: doc.data().lastSeen?.toDate(),
          })) as Display[]
          setDisplays(displaysData)
        },
        (error) => {
          console.error("Error fetching displays:", error)
        },
      )

      // Fetch drivers
      const driversQuery = query(collection(db, "drivers"))
      const unsubscribeDrivers = onSnapshot(
        driversQuery,
        (snapshot) => {
          const driversData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
          })) as Driver[]
          setDrivers(driversData)
        },
        (error) => {
          console.error("Error fetching drivers:", error)
        },
      )

      return () => {
        unsubscribeUsers()
        unsubscribeDisplays()
        unsubscribeDrivers()
      }
    } catch (error) {
      console.error("Error setting up listeners:", error)
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const adData = {
        title: formData.title,
        description: formData.description,
        videoUrl: formData.videoUrl,
        thumbnailUrl: formData.thumbnailUrl,
        duration: formData.duration,
        status: formData.status,
        ownerId: formData.assignedToUserId !== "none" ? formData.assignedToUserId : user.id,
        ownerEmail: formData.assignedToUserEmail || user.email,
        createdBy: user.id,
        createdByEmail: user.email,
        order: editingAd ? editingAd.order : ads.length, // Keep existing order when editing
        // New fields for display and driver assignment
        assignedDisplays: formData.displayAll ? [] : formData.assignedDisplays, // Empty array means all displays
        assignedDrivers: formData.assignAllDrivers ? [] : formData.assignedDrivers, // Empty array means all drivers
        displayAll: formData.displayAll,
        assignAllDrivers: formData.assignAllDrivers,
        createdAt: editingAd ? editingAd.createdAt : serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      console.log("Submitting ad data:", adData)

      if (editingAd) {
        await updateDoc(doc(db, "ads", editingAd.id), {
          ...adData,
          updatedAt: serverTimestamp(),
        })
        if (editingAd.ownerId !== adData.ownerId) {
          await initializeAdAnalytics(editingAd.id, adData.ownerId)
        }
        toast({
          title: "Ad Updated",
          description: `"${formData.title}" has been updated successfully.`,
        })
        setEditingAd(null)
      } else {
        const docRef = await addDoc(collection(db, "ads"), adData)
        await initializeAdAnalytics(docRef.id, adData.ownerId)
        toast({
          title: "Ad Created",
          description: `"${formData.title}" has been added successfully.`,
        })
      }

      setFormData({
        title: "",
        description: "",
        videoUrl: "",
        thumbnailUrl: "",
        duration: 0,
        status: "active",
        assignedToUserId: "none",
        assignedToUserEmail: "",
        assignedDisplays: [],
        assignedDrivers: [],
        displayAll: true,
        assignAllDrivers: true,
      })
      setIsAddDialogOpen(false)
    } catch (error: any) {
      console.error("Error saving ad:", error)
      toast({
        title: "Error",
        description: `Failed to save ad: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (adId: string) => {
    const adToDelete = ads.find((ad) => ad.id === adId)
    try {
      await deleteDoc(doc(db, "ads", adId))
      toast({
        title: "Ad Deleted",
        description: `"${adToDelete?.title || "Ad"}" has been deleted successfully.`,
      })
    } catch (error) {
      console.error("Error deleting ad:", error)
      toast({
        title: "Error",
        description: "Failed to delete ad. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return

    const items = Array.from(ads)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    try {
      const batch = items.map((ad, index) => updateDoc(doc(db, "ads", ad.id), { order: index }))
      await Promise.all(batch)

      toast({
        title: "Order Updated",
        description: "Ad order has been updated successfully.",
      })
    } catch (error) {
      console.error("Error updating order:", error)
      toast({
        title: "Error",
        description: "Failed to update ad order. Please try again.",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (ad: Ad) => {
    setEditingAd(ad)
    setFormData({
      title: ad.title,
      description: ad.description,
      videoUrl: ad.videoUrl,
      thumbnailUrl: ad.thumbnailUrl || "",
      duration: ad.duration,
      status: ad.status,
      assignedToUserId: ad.ownerId || "none",
      assignedToUserEmail: ad.ownerEmail || "",
      assignedDisplays: (ad as any).assignedDisplays || [],
      assignedDrivers: (ad as any).assignedDrivers || [],
      displayAll: (ad as any).displayAll !== false,
      assignAllDrivers: (ad as any).assignAllDrivers !== false,
    })
    setIsAddDialogOpen(true)
  }

  const handleDisplaySelection = (displayId: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        assignedDisplays: [...formData.assignedDisplays, displayId],
      })
    } else {
      setFormData({
        ...formData,
        assignedDisplays: formData.assignedDisplays.filter((id) => id !== displayId),
      })
    }
  }

  const handleDriverSelection = (driverId: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        assignedDrivers: [...formData.assignedDrivers, driverId],
      })
    } else {
      setFormData({
        ...formData,
        assignedDrivers: formData.assignedDrivers.filter((id) => id !== driverId),
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Ad Management</h2>
          <p className="text-sm text-gray-600 mt-1">Total Ads: {ads.length} | Drag to reorder playback sequence</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingAd(null)
                setFormData({
                  title: "",
                  description: "",
                  videoUrl: "",
                  thumbnailUrl: "",
                  duration: 0,
                  status: "active",
                  assignedToUserId: "none",
                  assignedToUserEmail: "",
                  assignedDisplays: [],
                  assignedDrivers: [],
                  displayAll: true,
                  assignAllDrivers: true,
                })
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Ad
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAd ? "Edit Ad" : "Add New Ad"}</DialogTitle>
              <DialogDescription>
                {editingAd ? "Update the ad details" : "Enter the video URL and ad details"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (seconds)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: Number.parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="videoUrl">Video URL</Label>
                <Input
                  id="videoUrl"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  placeholder="https://example.com/video.mp4"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="thumbnailUrl">Thumbnail URL (Optional)</Label>
                <Input
                  id="thumbnailUrl"
                  value={formData.thumbnailUrl}
                  onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                  placeholder="https://example.com/thumbnail.jpg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignedUser">Assign to Sub Admin</Label>
                  <Select
                    value={formData.assignedToUserId}
                    onValueChange={(value) => {
                      if (value === "none") {
                        setFormData({
                          ...formData,
                          assignedToUserId: "none",
                          assignedToUserEmail: "",
                        })
                      } else {
                        const selectedUser = users.find((u) => u.id === value)
                        setFormData({
                          ...formData,
                          assignedToUserId: value,
                          assignedToUserEmail: selectedUser?.email || "",
                        })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sub admin or keep unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Assignment (Super Admin)</SelectItem>
                      {users
                        .filter((u) => u.role === "sub_admin")
                        .map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Display Assignment Section */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  <Label className="text-base font-semibold">Display Assignment</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="displayAll"
                    checked={formData.displayAll}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        displayAll: checked as boolean,
                        assignedDisplays: checked ? [] : formData.assignedDisplays,
                      })
                    }
                  />
                  <Label htmlFor="displayAll">Show on all displays</Label>
                </div>

                {!formData.displayAll && (
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                    {displays.map((display) => (
                      <div key={display.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`display-${display.id}`}
                          checked={formData.assignedDisplays.includes(display.id)}
                          onCheckedChange={(checked) => handleDisplaySelection(display.id, checked as boolean)}
                        />
                        <Label htmlFor={`display-${display.id}`} className="text-sm">
                          {display.name} ({display.location})
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Driver Assignment Section */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  <Label className="text-base font-semibold">Driver Assignment</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="assignAllDrivers"
                    checked={formData.assignAllDrivers}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        assignAllDrivers: checked as boolean,
                        assignedDrivers: checked ? [] : formData.assignedDrivers,
                      })
                    }
                  />
                  <Label htmlFor="assignAllDrivers">Assign to all drivers</Label>
                </div>

                {!formData.assignAllDrivers && (
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                    {drivers.map((driver) => (
                      <div key={driver.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`driver-${driver.id}`}
                          checked={formData.assignedDrivers.includes(driver.id)}
                          onCheckedChange={(checked) => handleDriverSelection(driver.id, checked as boolean)}
                        />
                        <Label htmlFor={`driver-${driver.id}`} className="text-sm">
                          {driver.name} - {driver.vehicleInfo.make} {driver.vehicleInfo.model} (
                          {driver.vehicleInfo.plateNumber})
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full">
                {editingAd ? "Update Ad" : "Add Ad"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="ads">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
              {ads.map((ad, index) => (
                <Draggable key={ad.id} draggableId={ad.id} index={index}>
                  {(provided) => (
                    <Card ref={provided.innerRef} {...provided.draggableProps} className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Order Number Badge */}
                        <div className="flex flex-col items-center gap-1">
                          <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div {...provided.dragHandleProps} className="cursor-grab hover:cursor-grabbing">
                            <GripVertical className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold">{ad.title}</h3>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Hash className="w-3 h-3" />
                                <span>Order: {ad.order !== undefined ? ad.order + 1 : index + 1}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={ad.status === "active" ? "default" : "secondary"}>{ad.status}</Badge>
                              <Button variant="outline" size="sm" onClick={() => openEditDialog(ad)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDelete(ad.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{ad.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span>Duration: {ad.duration}s</span>
                            <span>Owner: {ad.ownerEmail}</span>
                            <span className="flex items-center gap-1">
                              <Hash className="w-3 h-3" />
                              Play Order: {index + 1}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Monitor className="w-3 h-3" />
                              Displays: {(ad as any).displayAll ? "All" : (ad as any).assignedDisplays?.length || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Car className="w-3 h-3" />
                              Drivers: {(ad as any).assignAllDrivers ? "All" : (ad as any).assignedDrivers?.length || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {ads.length === 0 && (
        <Card>
          <div className="text-center py-10">
            <Hash className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Ads Created</h3>
            <p className="text-gray-600 mb-4">Create your first ad to start managing your video content.</p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Ad
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
