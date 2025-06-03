"use client"

import { useState, useEffect } from "react"
import { collection, query, onSnapshot, doc, updateDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { DisplaySettings } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { Settings, Save } from "lucide-react"

export function DisplaySettingsManager() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [settings, setSettings] = useState<DisplaySettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    autoPlay: true,
    showControls: false,
    transitionDuration: 2,
    backgroundColor: "#000000",
  })

  useEffect(() => {
    const settingsQuery = query(collection(db, "settings"))
    const unsubscribe = onSnapshot(settingsQuery, (snapshot) => {
      if (!snapshot.empty) {
        const settingsData = snapshot.docs[0].data() as DisplaySettings
        setSettings(settingsData)
        setFormData({
          autoPlay: settingsData.autoPlay,
          showControls: settingsData.showControls,
          transitionDuration: settingsData.transitionDuration,
          backgroundColor: settingsData.backgroundColor,
        })
      }
    })

    return () => unsubscribe()
  }, [])

  const handleSave = async () => {
    if (!user) return

    setLoading(true)
    try {
      const settingsData = {
        ...formData,
        updatedAt: new Date(),
        updatedBy: user.id,
      }

      if (settings) {
        await updateDoc(doc(db, "settings", "display_settings"), settingsData)
      } else {
        await setDoc(doc(db, "settings", "display_settings"), {
          id: "display_settings",
          ...settingsData,
        })
      }

      toast({
        title: "Settings Saved",
        description: "Display settings have been updated successfully.",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6" />
        <h2 className="text-2xl font-bold">Display Settings</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configure Display Behavior</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoplay">Auto Play</Label>
              <p className="text-sm text-muted-foreground">Automatically start playing videos when they load</p>
            </div>
            <Switch
              id="autoplay"
              checked={formData.autoPlay}
              onCheckedChange={(checked) => setFormData({ ...formData, autoPlay: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="controls">Show Controls</Label>
              <p className="text-sm text-muted-foreground">Display video controls (play, pause, volume, etc.)</p>
            </div>
            <Switch
              id="controls"
              checked={formData.showControls}
              onCheckedChange={(checked) => setFormData({ ...formData, showControls: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transition">Transition Duration (seconds)</Label>
            <Input
              id="transition"
              type="number"
              min="0"
              max="10"
              value={formData.transitionDuration}
              onChange={(e) => setFormData({ ...formData, transitionDuration: Number(e.target.value) })}
            />
            <p className="text-sm text-muted-foreground">Time to wait between ads (0-10 seconds)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="background">Background Color</Label>
            <div className="flex gap-2">
              <Input
                id="background"
                type="color"
                value={formData.backgroundColor}
                onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={formData.backgroundColor}
                onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                placeholder="#000000"
                className="flex-1"
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
