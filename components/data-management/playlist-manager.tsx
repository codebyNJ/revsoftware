"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { FilePlus, Search, Trash2, GripVertical, VideoIcon, Newspaper, Briefcase, ArrowRight } from "lucide-react"
import { DataStorageService } from "@/lib/data-storage"
import type { NewsItem, JobItem } from "@/lib/api-services"
import type { Ad } from "@/lib/types"

type ContentType = "ad" | "news" | "job"

interface PlaylistItem {
  id: string
  type: ContentType
  title: string
  description: string
  imageUrl?: string
  videoUrl?: string
  originalId: string
  order: number
  duration: number
  createdAt: Date
}

export function PlaylistManager() {
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([])
  const [selectedAds, setSelectedAds] = useState<string[]>([])
  const [selectedNews, setSelectedNews] = useState<string[]>([])
  const [selectedJobs, setSelectedJobs] = useState<string[]>([])
  const [availableAds, setAvailableAds] = useState<Ad[]>([])
  const [availableNews, setAvailableNews] = useState<(NewsItem & { createdAt: Date; isActive: boolean })[]>([])
  const [availableJobs, setAvailableJobs] = useState<(JobItem & { createdAt: Date; isActive: boolean })[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const dataStorage = new DataStorageService()

  useEffect(() => {
    loadPlaylist()
    loadAvailableContent()
  }, [])

  const loadPlaylist = async () => {
    try {
      const playlistQuery = query(collection(db, "playlist"), orderBy("order"))
      const snapshot = await getDocs(playlistQuery)
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as PlaylistItem[]

      setPlaylistItems(items)
    } catch (error) {
      console.error("Error loading playlist:", error)
      toast({
        title: "Error",
        description: "Failed to load playlist items.",
        variant: "destructive",
      })
    }
  }

  const loadAvailableContent = async () => {
    setLoading(true)
    try {
      // Get ads
      const adsQuery = query(collection(db, "ads"), where("status", "==", "active"))
      const adsSnapshot = await getDocs(adsQuery)
      const adsData = adsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Ad[]
      setAvailableAds(adsData)

      // Get news
      const newsData = await dataStorage.getNews(true)
      setAvailableNews(newsData)

      // Get jobs
      const jobsData = await dataStorage.getJobs(true)
      setAvailableJobs(jobsData)
    } catch (error) {
      console.error("Error loading available content:", error)
      toast({
        title: "Error",
        description: "Failed to load available content.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const addToPlaylist = async () => {
    try {
      const batch = []

      // Process selected ads
      for (const adId of selectedAds) {
        const ad = availableAds.find((a) => a.id === adId)
        if (ad) {
          const playlistItem: any = {
            type: "ad",
            title: ad.title,
            description: ad.description,
            originalId: ad.id,
            order: playlistItems.length + batch.length,
            duration: ad.duration,
            createdAt: serverTimestamp(),
          }

          // Only add optional fields if they exist
          if (ad.thumbnailUrl) {
            playlistItem.imageUrl = ad.thumbnailUrl
          }
          if (ad.videoUrl) {
            playlistItem.videoUrl = ad.videoUrl
          }

          batch.push(addDoc(collection(db, "playlist"), playlistItem))
        }
      }

      // Process selected news
      for (const newsId of selectedNews) {
        const newsItem = availableNews.find((n) => n.id === newsId)
        if (newsItem) {
          const playlistItem: any = {
            type: "news",
            title: newsItem.title,
            description: newsItem.description,
            originalId: newsItem.id,
            order: playlistItems.length + batch.length,
            duration: 15, // Default duration for news items
            createdAt: serverTimestamp(),
          }

          // Only add imageUrl if it exists
          if (newsItem.imageUrl) {
            playlistItem.imageUrl = newsItem.imageUrl
          }

          batch.push(addDoc(collection(db, "playlist"), playlistItem))
        }
      }

      // Process selected jobs
      for (const jobId of selectedJobs) {
        const jobItem = availableJobs.find((j) => j.id === jobId)
        if (jobItem) {
          const playlistItem: any = {
            type: "job",
            title: jobItem.title,
            description: jobItem.description,
            originalId: jobItem.id,
            order: playlistItems.length + batch.length,
            duration: 20, // Default duration for job items
            createdAt: serverTimestamp(),
          }

          batch.push(addDoc(collection(db, "playlist"), playlistItem))
        }
      }

      if (batch.length > 0) {
        await Promise.all(batch)
        toast({
          title: "Content Added",
          description: `Added ${batch.length} items to the playlist.`,
        })
        setSelectedAds([])
        setSelectedNews([])
        setSelectedJobs([])
        loadPlaylist()
      }
    } catch (error) {
      console.error("Error adding to playlist:", error)
      toast({
        title: "Error",
        description: "Failed to add items to the playlist.",
        variant: "destructive",
      })
    }
  }

  const removeFromPlaylist = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, "playlist", itemId))
      setPlaylistItems((prev) => prev.filter((item) => item.id !== itemId))
      toast({
        title: "Item Removed",
        description: "Item removed from playlist.",
      })

      // Update order for remaining items
      const updatedItems = playlistItems
        .filter((item) => item.id !== itemId)
        .map((item, index) => ({ ...item, order: index }))

      setPlaylistItems(updatedItems)

      // Update order in Firestore
      const updateBatch = updatedItems.map((item) => updateDoc(doc(db, "playlist", item.id), { order: item.order }))

      await Promise.all(updateBatch)
    } catch (error) {
      console.error("Error removing item:", error)
      toast({
        title: "Error",
        description: "Failed to remove item from playlist.",
        variant: "destructive",
      })
    }
  }

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return

    const items = Array.from(playlistItems)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Update local state immediately
    setPlaylistItems(items)

    try {
      // Update order in Firestore
      const batch = items.map((item, index) => updateDoc(doc(db, "playlist", item.id), { order: index }))
      await Promise.all(batch)

      toast({
        title: "Order Updated",
        description: "Playlist order has been updated.",
      })
    } catch (error) {
      console.error("Error updating order:", error)
      toast({
        title: "Error",
        description: "Failed to update playlist order.",
        variant: "destructive",
      })
    }
  }

  const getContentTypeIcon = (type: ContentType) => {
    switch (type) {
      case "ad":
        return <VideoIcon className="w-4 h-4" />
      case "news":
        return <Newspaper className="w-4 h-4" />
      case "job":
        return <Briefcase className="w-4 h-4" />
    }
  }

  const getContentTypeBadge = (type: ContentType) => {
    switch (type) {
      case "ad":
        return <Badge variant="default">Ad</Badge>
      case "news":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
            News
          </Badge>
        )
      case "job":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
            Job
          </Badge>
        )
    }
  }

  // Filter content based on search term
  const filteredAds = availableAds.filter(
    (ad) =>
      ad.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ad.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredNews = availableNews.filter(
    (news) =>
      news.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      news.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      news.source.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredJobs = availableJobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Playlist Manager</h2>
        <div>
          <Button onClick={loadPlaylist} variant="outline" className="mr-2">
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left side: Available content */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Ads Section */}
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <VideoIcon className="w-4 h-4" /> Ads ({filteredAds.length})
                    </h3>
                    <div className="max-h-48 overflow-y-auto border rounded p-2">
                      {filteredAds.map((ad) => (
                        <div key={ad.id} className="flex items-center py-1">
                          <input
                            type="checkbox"
                            id={`ad-${ad.id}`}
                            checked={selectedAds.includes(ad.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAds([...selectedAds, ad.id])
                              } else {
                                setSelectedAds(selectedAds.filter((id) => id !== ad.id))
                              }
                            }}
                            className="mr-2"
                          />
                          <label htmlFor={`ad-${ad.id}`} className="text-sm cursor-pointer">
                            {ad.title} ({ad.duration}s)
                          </label>
                        </div>
                      ))}
                      {filteredAds.length === 0 && <p className="text-sm text-gray-500 p-2">No ads found</p>}
                    </div>
                  </div>

                  {/* News Section */}
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Newspaper className="w-4 h-4" /> News ({filteredNews.length})
                    </h3>
                    <div className="max-h-48 overflow-y-auto border rounded p-2">
                      {filteredNews.map((news) => (
                        <div key={news.id} className="flex items-center py-1">
                          <input
                            type="checkbox"
                            id={`news-${news.id}`}
                            checked={selectedNews.includes(news.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedNews([...selectedNews, news.id])
                              } else {
                                setSelectedNews(selectedNews.filter((id) => id !== news.id))
                              }
                            }}
                            className="mr-2"
                          />
                          <label htmlFor={`news-${news.id}`} className="text-sm cursor-pointer">
                            {news.title} ({news.source})
                          </label>
                        </div>
                      ))}
                      {filteredNews.length === 0 && <p className="text-sm text-gray-500 p-2">No news found</p>}
                    </div>
                  </div>

                  {/* Jobs Section */}
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" /> Jobs ({filteredJobs.length})
                    </h3>
                    <div className="max-h-48 overflow-y-auto border rounded p-2">
                      {filteredJobs.map((job) => (
                        <div key={job.id} className="flex items-center py-1">
                          <input
                            type="checkbox"
                            id={`job-${job.id}`}
                            checked={selectedJobs.includes(job.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedJobs([...selectedJobs, job.id])
                              } else {
                                setSelectedJobs(selectedJobs.filter((id) => id !== job.id))
                              }
                            }}
                            className="mr-2"
                          />
                          <label htmlFor={`job-${job.id}`} className="text-sm cursor-pointer">
                            {job.title} ({job.company})
                          </label>
                        </div>
                      ))}
                      {filteredJobs.length === 0 && <p className="text-sm text-gray-500 p-2">No jobs found</p>}
                    </div>
                  </div>

                  {/* Add to playlist button */}
                  <Button
                    onClick={addToPlaylist}
                    disabled={selectedAds.length === 0 && selectedNews.length === 0 && selectedJobs.length === 0}
                    className="w-full"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Add to Playlist ({selectedAds.length + selectedNews.length + selectedJobs.length} selected)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right side: Current playlist */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Current Playlist ({playlistItems.length} items)</CardTitle>
            </CardHeader>
            <CardContent>
              {playlistItems.length === 0 ? (
                <div className="text-center py-8">
                  <FilePlus className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">No items in playlist. Select content from the left panel to add.</p>
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="playlist">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2 max-h-[500px] overflow-y-auto"
                      >
                        {playlistItems.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="border rounded p-3 bg-white flex items-center justify-between"
                              >
                                <div className="flex items-center gap-2">
                                  <div {...provided.dragHandleProps} className="cursor-grab hover:cursor-grabbing">
                                    <GripVertical className="h-5 w-5 text-gray-400" />
                                  </div>
                                  <div className="bg-gray-100 rounded-full w-6 h-6 flex items-center justify-center text-sm">
                                    {index + 1}
                                  </div>
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                      {getContentTypeIcon(item.type)}
                                      <span className="font-medium">{item.title}</span>
                                      {getContentTypeBadge(item.type)}
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      {item.duration}s • {new Date(item.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFromPlaylist(item.id)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </CardContent>
          </Card>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
            <h3 className="font-medium text-blue-800 mb-2">How Playlist Works</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Content will play in the order shown above (drag to reorder)</li>
              <li>• Video ads will play their video content</li>
              <li>• News and jobs will display as slides with formatted content</li>
              <li>• Each news item shows for 15 seconds by default</li>
              <li>• Each job listing shows for 20 seconds by default</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
