"use client"

import { useState } from "react"

import { DataScheduler } from "@/components/data-management/data-scheduler"
import { PlaylistManager } from "@/components/data-management/playlist-manager"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DeleteTest } from "@/components/data-management/delete-test"

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("data")

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-semibold mb-6">Super Admin Dashboard</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="data">Data Management</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="data">
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DataScheduler />
              <DeleteTest />
            </div>
            <PlaylistManager />
          </div>
        </TabsContent>
        <TabsContent value="users">
          <div>User Management Content</div>
        </TabsContent>
        <TabsContent value="settings">
          <div>Settings Content</div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SuperAdminDashboard
