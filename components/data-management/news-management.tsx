"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { DataStorageService } from "@/lib/data-storage"
import { Newspaper, ExternalLink, Search, Eye, EyeOff, Calendar, Globe, Trash2 } from "lucide-react"
import type { NewsItem } from "@/lib/api-services"
import { useToast } from "@/hooks/use-toast"

export function NewsManagement() {
  const [news, setNews] = useState<(NewsItem & { createdAt: Date; isActive: boolean })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedNews, setSelectedNews] = useState<string[]>([])
  const [showInactive, setShowInactive] = useState(false)
  const [deletingItems, setDeletingItems] = useState<string[]>([])
  const { toast } = useToast()

  const dataStorage = new DataStorageService()

  useEffect(() => {
    loadNews()
  }, [showInactive])

  const loadNews = async () => {
    setLoading(true)
    try {
      const newsData = await dataStorage.getNews(!showInactive)
      setNews(newsData)
    } catch (error) {
      console.error("Error loading news:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredNews = news.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.source.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const toggleNewsSelection = (newsId: string) => {
    setSelectedNews((prev) => (prev.includes(newsId) ? prev.filter((id) => id !== newsId) : [...prev, newsId]))
  }

  const toggleAllSelection = () => {
    if (selectedNews.length === filteredNews.length) {
      setSelectedNews([])
    } else {
      setSelectedNews(filteredNews.map((item) => item.id))
    }
  }

  const toggleNewsStatus = async (newsId: string, currentStatus: boolean) => {
    try {
      await dataStorage.toggleItemStatus("news", newsId, !currentStatus)
      await loadNews()
    } catch (error) {
      console.error("Error toggling news status:", error)
    }
  }

  const deleteNewsItem = async (newsId: string) => {
    if (!confirm("Are you sure you want to permanently delete this news item?")) {
      return
    }

    setDeletingItems((prev) => [...prev, newsId])
    try {
      console.log(`Attempting to delete news item: ${newsId}`)
      await dataStorage.deleteNews(newsId)
      console.log(`Successfully deleted news item: ${newsId}`)

      // Remove from local state immediately for better UX
      setNews((prev) => prev.filter((item) => item.id !== newsId))
      setSelectedNews((prev) => prev.filter((id) => id !== newsId))

      // Reload to ensure consistency
      await loadNews()

      toast({
        title: "News Deleted",
        description: "News item has been permanently deleted.",
      })
    } catch (error) {
      console.error("Error deleting news:", error)
      toast({
        title: "Delete Failed",
        description: `Failed to delete news item: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setDeletingItems((prev) => prev.filter((id) => id !== newsId))
    }
  }

  const bulkDeleteSelected = async () => {
    if (selectedNews.length === 0) return

    if (!confirm(`Are you sure you want to permanently delete ${selectedNews.length} news item(s)?`)) {
      return
    }

    try {
      console.log(`Attempting to bulk delete ${selectedNews.length} news items`)
      await dataStorage.bulkDeleteNews(selectedNews)
      console.log(`Successfully bulk deleted ${selectedNews.length} news items`)

      // Remove from local state immediately
      setNews((prev) => prev.filter((item) => !selectedNews.includes(item.id)))
      setSelectedNews([])

      // Reload to ensure consistency
      await loadNews()

      toast({
        title: "News Deleted",
        description: `${selectedNews.length} news items have been permanently deleted.`,
      })
    } catch (error) {
      console.error("Error bulk deleting news:", error)
      toast({
        title: "Delete Failed",
        description: `Failed to delete news items: ${error.message}`,
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
              <div className="flex gap-6">
                <div className="w-48 h-32 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
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
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Newspaper className="w-6 h-6" />
          <h2 className="text-2xl font-bold">News Management</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="show-inactive" checked={showInactive} onCheckedChange={setShowInactive} />
            <label htmlFor="show-inactive" className="text-sm">
              Show inactive
            </label>
          </div>
          <Badge variant="outline">{news.length} total items</Badge>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search news by title, description, or source..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Button variant="outline" onClick={toggleAllSelection} disabled={filteredNews.length === 0}>
          {selectedNews.length === filteredNews.length ? "Deselect All" : "Select All"}
        </Button>
        {selectedNews.length > 0 && (
          <Button variant="destructive" onClick={bulkDeleteSelected}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected ({selectedNews.length})
          </Button>
        )}
      </div>

      {selectedNews.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-blue-800">{selectedNews.length} news item(s) selected for display</span>
              <Button size="sm" variant="outline">
                Add to Display Queue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {filteredNews.map((item) => (
          <Card key={item.id} className={`${!item.isActive ? "opacity-60" : ""} hover:shadow-lg transition-shadow`}>
            <CardContent className="p-6">
              <div className="flex gap-6">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={selectedNews.includes(item.id)}
                    onCheckedChange={() => toggleNewsSelection(item.id)}
                    className="mt-2"
                  />

                  {/* News Image */}
                  <div className="w-48 h-32 flex-shrink-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl || "/placeholder.svg"}
                        alt={item.title}
                        className="w-full h-full object-cover rounded-lg shadow-sm"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = "none"
                          target.nextElementSibling?.classList.remove("hidden")
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center ${item.imageUrl ? "hidden" : ""}`}
                    >
                      <Newspaper className="w-12 h-12 text-blue-400" />
                    </div>
                  </div>
                </div>

                {/* News Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 leading-tight mb-2 line-clamp-2">{item.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        <div className="flex items-center gap-1">
                          <Globe className="w-4 h-4" />
                          <span className="font-medium">{item.source}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{item.publishedAt.toLocaleDateString()}</span>
                        </div>
                        <Badge variant={item.isActive ? "default" : "secondary"}>
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 ml-4">
                      <Button size="sm" variant="ghost" onClick={() => toggleNewsStatus(item.id, item.isActive)}>
                        {item.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteNewsItem(item.id)}
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

                  {/* News Description */}
                  <p className="text-gray-700 leading-relaxed line-clamp-3">{item.description}</p>

                  {/* Category Badge */}
                  <div className="mt-4">
                    <Badge variant="outline" className="capitalize">
                      {item.category}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredNews.length === 0 && (
        <Card>
          <CardContent className="text-center py-10">
            <Newspaper className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No News Found</h3>
            <p className="text-gray-600">
              {searchTerm
                ? "No news matches your search criteria."
                : "No news data available. Run the data scheduler to fetch news."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
