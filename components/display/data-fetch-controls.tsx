"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { DataFetchService } from "@/lib/api-services"
import { DataStorageService } from "@/lib/data-storage"
import { Newspaper, Briefcase, Cloud, Download, Loader2 } from "lucide-react"

export function DataFetchControls() {
  const [loading, setLoading] = useState({
    news: false,
    jobs: false,
    weather: false,
    all: false,
  })

  const { toast } = useToast()
  const dataFetcher = new DataFetchService()
  const dataStorage = new DataStorageService()

  const fetchNews = async () => {
    setLoading((prev) => ({ ...prev, news: true }))
    try {
      const newsData = await dataFetcher.newsAPI.fetchAllNews()
      await dataStorage.storeNews(newsData)
      toast({
        title: "News Updated",
        description: `Fetched ${newsData.length} news articles`,
      })
    } catch (error) {
      toast({
        title: "News Fetch Failed",
        description: "Failed to fetch latest news",
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
      toast({
        title: "Jobs Updated",
        description: `Fetched ${jobsData.length} job listings`,
      })
    } catch (error) {
      toast({
        title: "Jobs Fetch Failed",
        description: "Failed to fetch latest jobs",
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
        toast({
          title: "Weather Updated",
          description: "Fetched latest weather data",
        })
      }
    } catch (error) {
      toast({
        title: "Weather Fetch Failed",
        description: "Failed to fetch weather data",
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
      toast({
        title: "All Data Updated",
        description: `Fetched ${data.news.length} news, ${data.jobs.length} jobs, and weather data`,
      })
    } catch (error) {
      toast({
        title: "Data Fetch Failed",
        description: "Failed to fetch all data",
        variant: "destructive",
      })
    } finally {
      setLoading((prev) => ({ ...prev, all: false }))
    }
  }

  return (
    <div className="bg-black/80 backdrop-blur-sm text-white p-3 rounded-lg border border-white/20">
      <div className="text-xs text-gray-300 mb-3">Data Controls</div>
      <div className="space-y-2">
        <Button
          size="sm"
          variant="outline"
          onClick={fetchNews}
          disabled={loading.news || loading.all}
          className="w-full bg-blue-600/20 border-blue-400/30 text-white hover:bg-blue-600/40"
        >
          {loading.news ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Newspaper className="w-3 h-3 mr-1" />}
          News
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={fetchJobs}
          disabled={loading.jobs || loading.all}
          className="w-full bg-green-600/20 border-green-400/30 text-white hover:bg-green-600/40"
        >
          {loading.jobs ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Briefcase className="w-3 h-3 mr-1" />}
          Jobs
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={fetchWeather}
          disabled={loading.weather || loading.all}
          className="w-full bg-purple-600/20 border-purple-400/30 text-white hover:bg-purple-600/40"
        >
          {loading.weather ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Cloud className="w-3 h-3 mr-1" />}
          Weather
        </Button>

        <Button
          size="sm"
          onClick={fetchAll}
          disabled={Object.values(loading).some(Boolean)}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
        >
          {loading.all ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Download className="w-3 h-3 mr-1" />}
          Fetch All
        </Button>
      </div>
    </div>
  )
}
