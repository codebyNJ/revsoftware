"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Display } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Monitor, Copy } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

export function DisplayManagement() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [displays, setDisplays] = useState<Display[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingDisplay, setEditingDisplay] = useState<Display | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    status: "active" as const,
    pin: generatePin(),
  })

  // Generate a random 6-digit PIN
  function generatePin() {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  useEffect(() => {
    const displaysQuery = query(collection(db, "displays"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(displaysQuery, (snapshot) => {
      const displaysData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        lastSeen: doc.data().lastSeen?.toDate(),
      })) as Display[]
      setDisplays(displaysData)
    })

    return () => unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const displayData = {
        name: formData.name,
        location: formData.location,
        status: formData.status,
        pin: formData.pin,
        createdBy: user.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      if (editingDisplay) {
        await updateDoc(doc(db, "displays", editingDisplay.id), {
          name: formData.name,
          location: formData.location,
          status: formData.status,
          pin: formData.pin,
          updatedAt: serverTimestamp(),
          updatedBy: user.id,
        })
        toast({
          title: "Display Updated",
          description: `${formData.name} has been updated successfully.`,
        })
        setEditingDisplay(null)
      } else {
        await addDoc(collection(db, "displays"), displayData)
        toast({
          title: "Display Created",
          description: `${formData.name} has been added successfully.`,
        })
      }

      setFormData({
        name: "",
        location: "",
        status: "active",
        pin: generatePin(),
      })
      setIsAddDialogOpen(false)
    } catch (error: any) {
      console.error("Error saving display:", error)
      toast({
        title: "Error",
        description: `Failed to save display: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (displayId: string) => {
    const displayToDelete = displays.find((display) => display.id === displayId)
    try {
      await deleteDoc(doc(db, "displays", displayId))
      toast({
        title: "Display Deleted",
        description: `${displayToDelete?.name || "Display"} has been removed.`,
      })
    } catch (error) {
      console.error("Error deleting display:", error)
      toast({
        title: "Error",
        description: "Failed to delete display. Please try again.",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (display: Display) => {
    setEditingDisplay(display)
    setFormData({
      name: display.name,
      location: display.location,
      status: display.status,
      pin: display.pin || generatePin(),
    })
    setIsAddDialogOpen(true)
  }

  const copyPinToClipboard = (pin: string) => {
    navigator.clipboard.writeText(pin)
    toast({
      title: "PIN Copied",
      description: "Display PIN has been copied to clipboard.",
    })
  }

  const resetForm = () => {
    setFormData({
      name: "",
      location: "",
      status: "active",
      pin: generatePin(),
    })
    setEditingDisplay(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Monitor className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Display Management</h2>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Display
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingDisplay ? "Edit Display" : "Add New Display"}</DialogTitle>
              <DialogDescription>
                {editingDisplay ? "Update display information" : "Enter display details and location"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Main Lobby Display"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., koramangala"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin">Display PIN</Label>
                <div className="flex gap-2">
                  <Input
                    id="pin"
                    value={formData.pin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 6)
                      setFormData({ ...formData, pin: value })
                    }}
                    className="font-mono"
                    maxLength={6}
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormData({ ...formData, pin: generatePin() })}
                  >
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-gray-500">6-digit PIN used to authenticate the display</p>
              </div>

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
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full">
                {editingDisplay ? "Update Display" : "Add Display"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {displays.map((display) => (
          <Card key={display.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  {display.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      display.status === "active"
                        ? "default"
                        : display.status === "maintenance"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {display.status}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(display)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(display.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Location</h4>
                  <p className="text-sm text-gray-600">{display.location}</p>
                  {display.lastSeen && (
                    <p className="text-xs text-gray-500">Last active: {display.lastSeen.toLocaleString()}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    Authentication PIN
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyPinToClipboard(display.pin)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </h4>
                  <p className="text-lg font-mono bg-gray-100 p-2 rounded text-center">{display.pin}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Created: {display.createdAt?.toLocaleDateString()}</span>
                  <span>ID: {display.id.slice(0, 8)}...</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {displays.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Monitor className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Displays Found</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first display.</p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Display
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
