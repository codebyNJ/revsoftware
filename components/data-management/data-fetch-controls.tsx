"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { DataFetchService } from "@/lib/api-services"
import { DataStorageService } from "@/lib/data-storage"
import { Newspaper, Briefcase, Cloud, Download, Loader2, RefreshCw } from "lucide-react"

export function DataFetchControls() {
  const [loading, setLoading] = useState({
    news: false,
    jobs: false,
    weather: false,
    all: false,
  })

  const [lastFetch, setLastFetch] = useState({
    news: null as Date | null,
    jobs: null as Date | null,
    weather: null as Date | null,
    all: null as Date | null,
  })

  const { toast } = useToast()
  const dataFetcher = new DataFetchService()
  const dataStorage = new DataStorageService()

  const fetchNews = async () => {
    setLoading((prev) => ({ ...prev, news: true }))
    try {
      const newsData = await dataFetcher.newsAPI.fetchAllNews()
      await dataStorage.storeNews(newsData)
      setLastFetch((prev) => ({ ...prev, news: new Date() }))
      toast({
        title: "News Updated Successfully",
        description: `Fetched ${newsData.length} news articles from external APIs`,
      })
    } catch (error) {
      toast({
        title: "News Fetch Failed",
        description: "Failed to fetch latest news from external APIs",
        variant: "destructive",
      })
    } finally {
      setLoading((prev) => ({ ...prev, news: false }))
    }
  }

  const fetchJobs = async () => {
    setLoading((prev) => ({ ...prev, jobs: true }))
    try {
      const jobsData = await dataFetcher.jobsAPI.fetchIndianJobs()
      await dataStorage.storeJobs(jobsData)
      setLastFetch((prev) => ({ ...prev, jobs: new Date() }))
      toast({
        title: "Jobs Updated Successfully",
        description: `Fetched ${jobsData.length} job listings from external APIs`,
      })
    } catch (error) {
      toast({
        title: "Jobs Fetch Failed",
        description: "Failed to fetch latest jobs from external APIs",
        variant: "destructive",
      })
    } finally {
      setLoading((prev) => ({ ...prev, jobs: false }))
    }
  }

  const fetchWeather = async () => {
    setLoading((prev) => ({ ...prev, weather: true }))
    try {
      const weatherData = await dataFetcher.weatherAPI.fetchBangaloreWeather()
      if (weatherData) {
        await dataStorage.storeWeather(weatherData)
        setLastFetch((prev) => ({ ...prev, weather: new Date() }))
        toast({
          title: "Weather Updated Successfully",
          description: "Fetched latest weather data from external APIs",
        })
      }
    } catch (error) {
      toast({
        title: "Weather Fetch Failed",
        description: "Failed to fetch weather data from external APIs",
        variant: "destructive",
      })
    } finally {
      setLoading((prev) => ({ ...prev, weather: false }))
    }
  }

  const fetchAll = async () => {
    setLoading((prev) => ({ ...prev, all: true }))
    try {
      const data = await dataFetcher.fetchAllData()
      await Promise.all([
        dataStorage.storeNews(data.news),
        dataStorage.storeJobs(data.jobs),
        data.weather ? dataStorage.storeWeather(data.weather) : Promise.resolve(),
      ])
      setLastFetch((prev) => ({
        ...prev,
        all: new Date(),
        news: new Date(),
        jobs: new Date(),
        weather: new Date(),
      }))
      toast({
        title: "All Data Updated Successfully",
        description: `Fetched ${data.news.length} news articles, ${data.jobs.length} jobs, and weather data`,
      })
    } catch (error) {
      toast({
        title: "Data Fetch Failed",
        description: "Failed to fetch all data from external APIs",
        variant: "destructive",
      })
    } finally {
      setLoading((prev) => ({ ...prev, all: false }))
    }
  }

  const formatLastFetch = (date: Date | null) => {
    if (!date) return "Never"
    return date.toLocaleString()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* News Fetch */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-blue-600" />
            News Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-muted-foreground">Last fetch: {formatLastFetch(lastFetch.news)}</div>
          <Button
            size="sm"
            onClick={fetchNews}
            disabled={loading.news || loading.all}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading.news ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
            Fetch News
          </Button>
        </CardContent>
      </Card>

      {/* Jobs Fetch */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-green-600" />
            Jobs Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-muted-foreground">Last fetch: {formatLastFetch(lastFetch.jobs)}</div>
          <Button
            size="sm"
            onClick={fetchJobs}
            disabled={loading.jobs || loading.all}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {loading.jobs ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
            Fetch Jobs
          </Button>
        </CardContent>
      </Card>

      {/* Weather Fetch */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cloud className="w-4 h-4 text-purple-600" />
            Weather Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-muted-foreground">Last fetch: {formatLastFetch(lastFetch.weather)}</div>
          <Button
            size="sm"
            onClick={fetchWeather}
            disabled={loading.weather || loading.all}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {loading.weather ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="w-3 h-3 mr-1" />
            )}
            Fetch Weather
          </Button>
        </CardContent>
      </Card>

      {/* Fetch All */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Download className="w-4 h-4 text-orange-600" />
            All Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-muted-foreground">Last fetch: {formatLastFetch(lastFetch.all)}</div>
          <Button
            size="sm"
            onClick={fetchAll}
            disabled={Object.values(loading).some(Boolean)}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            {loading.all ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Download className="w-3 h-3 mr-1" />}
            Fetch All
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
