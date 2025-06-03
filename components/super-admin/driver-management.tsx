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
import type { Driver } from "@/lib/types"
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
import { Plus, Edit, Trash2, Users, Car } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

export function DriverManagement() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    licenseNumber: "",
    vehicleInfo: {
      make: "",
      model: "",
      year: new Date().getFullYear(),
      plateNumber: "",
      color: "",
    },
    status: "active" as const,
  })
  const [loading, setLoading] = useState(false)

  // Update the handleSubmit function to properly handle permissions and data structure
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || user.role !== "super_admin") {
      toast({
        title: "Permission Denied",
        description: "Only super administrators can manage drivers.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Ensure all required fields are present
      const driverData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        licenseNumber: formData.licenseNumber,
        vehicleInfo: {
          make: formData.vehicleInfo.make,
          model: formData.vehicleInfo.model,
          year: formData.vehicleInfo.year,
          plateNumber: formData.vehicleInfo.plateNumber,
          color: formData.vehicleInfo.color,
        },
        status: formData.status,
        assignedDisplays: [], // Initialize as empty array
        createdBy: user.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      console.log("Attempting to save driver with data:", driverData)

      if (editingDriver) {
        // Update existing driver
        await updateDoc(doc(db, "drivers", editingDriver.id), {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          licenseNumber: formData.licenseNumber,
          vehicleInfo: formData.vehicleInfo,
          status: formData.status,
          updatedAt: serverTimestamp(),
        })
        toast({
          title: "Driver Updated",
          description: `${formData.name} has been updated successfully.`,
        })
        setEditingDriver(null)
      } else {
        // Create new driver
        const docRef = await addDoc(collection(db, "drivers"), driverData)
        console.log("Driver created with ID:", docRef.id)
        toast({
          title: "Driver Created",
          description: `${formData.name} has been added successfully.`,
        })
      }

      setFormData({
        name: "",
        email: "",
        phone: "",
        licenseNumber: "",
        vehicleInfo: {
          make: "",
          model: "",
          year: new Date().getFullYear(),
          plateNumber: "",
          color: "",
        },
        status: "active",
      })
      setIsAddDialogOpen(false)
    } catch (error: any) {
      console.error("Error saving driver:", error)
      // Provide more detailed error information
      const errorMessage = error.code
        ? `Error code: ${error.code} - ${error.message}`
        : error.message || "Unknown error occurred"

      toast({
        title: "Error",
        description: `Failed to save driver: ${errorMessage}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Also update the useEffect to add loading state
  useEffect(() => {
    setLoading(true)
    const driversQuery = query(collection(db, "drivers"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(
      driversQuery,
      (snapshot) => {
        const driversData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
        })) as Driver[]
        setDrivers(driversData)
        setLoading(false)
      },
      (error) => {
        console.error("Error fetching drivers:", error)
        toast({
          title: "Error Loading Drivers",
          description: "Failed to load drivers. Please check your connection.",
          variant: "destructive",
        })
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [toast])

  const handleDelete = async (driverId: string) => {
    const driverToDelete = drivers.find((driver) => driver.id === driverId)
    try {
      await deleteDoc(doc(db, "drivers", driverId))
      toast({
        title: "Driver Deleted",
        description: `${driverToDelete?.name || "Driver"} has been removed.`,
      })
    } catch (error) {
      console.error("Error deleting driver:", error)
      toast({
        title: "Error",
        description: "Failed to delete driver. Please try again.",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (driver: Driver) => {
    setEditingDriver(driver)
    setFormData({
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      licenseNumber: driver.licenseNumber,
      vehicleInfo: driver.vehicleInfo,
      status: driver.status,
    })
    setIsAddDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Driver Management</h2>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingDriver(null)
                setFormData({
                  name: "",
                  email: "",
                  phone: "",
                  licenseNumber: "",
                  vehicleInfo: {
                    make: "",
                    model: "",
                    year: new Date().getFullYear(),
                    plateNumber: "",
                    color: "",
                  },
                  status: "active",
                })
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Driver
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingDriver ? "Edit Driver" : "Add New Driver"}</DialogTitle>
              <DialogDescription>
                {editingDriver ? "Update driver information" : "Enter driver details and vehicle information"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license">License Number</Label>
                <Input
                  id="license"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  <Label className="text-base font-semibold">Vehicle Information</Label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="make">Make</Label>
                    <Input
                      id="make"
                      value={formData.vehicleInfo.make}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vehicleInfo: { ...formData.vehicleInfo, make: e.target.value },
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={formData.vehicleInfo.model}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vehicleInfo: { ...formData.vehicleInfo, model: e.target.value },
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      type="number"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      value={formData.vehicleInfo.year}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vehicleInfo: { ...formData.vehicleInfo, year: Number.parseInt(e.target.value) },
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      value={formData.vehicleInfo.color}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vehicleInfo: { ...formData.vehicleInfo, color: e.target.value },
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plate">Plate Number</Label>
                  <Input
                    id="plate"
                    value={formData.vehicleInfo.plateNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        vehicleInfo: { ...formData.vehicleInfo, plateNumber: e.target.value },
                      })
                    }
                    required
                  />
                </div>
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
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {editingDriver ? "Update Driver" : "Add Driver"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {drivers.map((driver) => (
          <Card key={driver.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {driver.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      driver.status === "active"
                        ? "default"
                        : driver.status === "suspended"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {driver.status}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(driver)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(driver.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Contact Information</h4>
                  <p className="text-sm text-gray-600">📧 {driver.email}</p>
                  <p className="text-sm text-gray-600">📱 {driver.phone}</p>
                  <p className="text-sm text-gray-600">🆔 License: {driver.licenseNumber}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-1">
                    <Car className="w-4 h-4" />
                    Vehicle Information
                  </h4>
                  <p className="text-sm text-gray-600">
                    {driver.vehicleInfo.year} {driver.vehicleInfo.make} {driver.vehicleInfo.model}
                  </p>
                  <p className="text-sm text-gray-600">🎨 {driver.vehicleInfo.color}</p>
                  <p className="text-sm text-gray-600">🚗 {driver.vehicleInfo.plateNumber}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Created: {driver.createdAt?.toLocaleDateString()}</span>
                  <span>Displays: {driver.assignedDisplays?.length || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {drivers.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Drivers Found</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first driver.</p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Driver
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
