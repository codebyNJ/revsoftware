"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { DataStorageService } from "@/lib/data-storage"
import { Briefcase, Search, Eye, EyeOff, MapPin, Building, DollarSign, Clock, QrCode, Trash2 } from "lucide-react"
import type { JobItem } from "@/lib/api-services"
import { useToast } from "@/hooks/use-toast"

export function JobsManagement() {
  const [jobs, setJobs] = useState<(JobItem & { createdAt: Date; isActive: boolean })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedJobs, setSelectedJobs] = useState<string[]>([])
  const [showInactive, setShowInactive] = useState(false)
  const [deletingItems, setDeletingItems] = useState<string[]>([])
  const { toast } = useToast()

  const dataStorage = new DataStorageService()

  useEffect(() => {
    loadJobs()
  }, [showInactive])

  const loadJobs = async () => {
    setLoading(true)
    try {
      const jobsData = await dataStorage.getJobs(!showInactive)
      setJobs(jobsData)
    } catch (error) {
      console.error("Error loading jobs:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredJobs = jobs.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobs((prev) => (prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]))
  }

  const toggleAllSelection = () => {
    if (selectedJobs.length === filteredJobs.length) {
      setSelectedJobs([])
    } else {
      setSelectedJobs(filteredJobs.map((item) => item.id))
    }
  }

  const toggleJobStatus = async (jobId: string, currentStatus: boolean) => {
    try {
      await dataStorage.toggleItemStatus("jobs", jobId, !currentStatus)
      await loadJobs()
    } catch (error) {
      console.error("Error toggling job status:", error)
    }
  }

  const deleteJobItem = async (jobId: string) => {
    if (!confirm("Are you sure you want to permanently delete this job item?")) {
      return
    }

    setDeletingItems((prev) => [...prev, jobId])
    try {
      console.log(`Attempting to delete job item: ${jobId}`)
      await dataStorage.deleteJob(jobId)
      console.log(`Successfully deleted job item: ${jobId}`)

      // Remove from local state immediately for better UX
      setJobs((prev) => prev.filter((item) => item.id !== jobId))
      setSelectedJobs((prev) => prev.filter((id) => id !== jobId))

      // Reload to ensure consistency
      await loadJobs()

      toast({
        title: "Job Deleted",
        description: "Job item has been permanently deleted.",
      })
    } catch (error) {
      console.error("Error deleting job:", error)
      toast({
        title: "Delete Failed",
        description: `Failed to delete job item: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setDeletingItems((prev) => prev.filter((id) => id !== jobId))
    }
  }

  const bulkDeleteSelected = async () => {
    if (selectedJobs.length === 0) return

    if (!confirm(`Are you sure you want to permanently delete ${selectedJobs.length} job item(s)?`)) {
      return
    }

    try {
      console.log(`Attempting to bulk delete ${selectedJobs.length} job items`)
      await dataStorage.bulkDeleteJobs(selectedJobs)
      console.log(`Successfully bulk deleted ${selectedJobs.length} job items`)

      // Remove from local state immediately
      setJobs((prev) => prev.filter((item) => !selectedJobs.includes(item.id)))
      setSelectedJobs([])

      // Reload to ensure consistency
      await loadJobs()

      toast({
        title: "Jobs Deleted",
        description: `${selectedJobs.length} job items have been permanently deleted.`,
      })
    } catch (error) {
      console.error("Error bulk deleting jobs:", error)
      toast({
        title: "Delete Failed",
        description: `Failed to delete job items: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Briefcase className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Jobs Management</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="show-inactive-jobs" checked={showInactive} onCheckedChange={setShowInactive} />
            <label htmlFor="show-inactive-jobs" className="text-sm">
              Show inactive
            </label>
          </div>
          <Badge variant="outline">{jobs.length} total items</Badge>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search jobs by title, company, location, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Button variant="outline" onClick={toggleAllSelection} disabled={filteredJobs.length === 0}>
          {selectedJobs.length === filteredJobs.length ? "Deselect All" : "Select All"}
        </Button>
        {selectedJobs.length > 0 && (
          <Button variant="destructive" onClick={bulkDeleteSelected}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected ({selectedJobs.length})
          </Button>
        )}
      </div>

      {selectedJobs.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-green-800">{selectedJobs.length} job(s) selected for display</span>
              <Button size="sm" variant="outline">
                Add to Display Queue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {filteredJobs.map((item) => (
          <Card key={item.id} className={`${!item.isActive ? "opacity-60" : ""} hover:shadow-lg transition-shadow`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Checkbox
                  checked={selectedJobs.includes(item.id)}
                  onCheckedChange={() => toggleJobSelection(item.id)}
                  className="mt-2"
                />

                {/* Job Icon */}
                <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-8 h-8 text-green-600" />
                </div>

                {/* Job Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 leading-tight mb-2">{item.title}</h3>

                      {/* Company and Location */}
                      <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <Building className="w-4 h-4" />
                          <span className="font-medium">{item.company}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{item.location}</span>
                        </div>
                        {item.salary && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            <span className="font-medium text-green-600">{item.salary}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 ml-4">
                      <Button size="sm" variant="ghost" onClick={() => toggleJobStatus(item.id, item.isActive)}>
                        {item.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          <QrCode className="w-4 h-4 mr-1" />
                          Apply
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteJobItem(item.id)}
                        disabled={deletingItems.includes(item.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deletingItems.includes(item.id) ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Job Description */}
                  <p className="text-gray-700 leading-relaxed mb-4 line-clamp-3">{item.description}</p>

                  {/* Job Details */}
                  <div className="flex items-center gap-4 text-sm">
                    <Badge variant="outline" className="capitalize">
                      {item.type.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline">{item.experience}</Badge>
                    <div className="flex items-center gap-1 text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>Posted: {item.postedAt.toLocaleDateString()}</span>
                    </div>
                    <Badge variant={item.isActive ? "default" : "secondary"}>
                      {item.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredJobs.length === 0 && (
        <Card>
          <CardContent className="text-center py-10">
            <Briefcase className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Jobs Found</h3>
            <p className="text-gray-600">
              {searchTerm
                ? "No jobs match your search criteria."
                : "No job data available. Run the data scheduler to fetch jobs."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
