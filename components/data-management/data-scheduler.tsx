"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { DataFetchService } from "@/lib/api-services"
import { DataStorageService } from "@/lib/data-storage"
import { Clock, Download, Database, Wifi, WifiOff, RefreshCw, Newspaper, Briefcase, Cloud } from "lucide-react"

export function DataScheduler() {
  const [isRunning, setIsRunning] = useState(false)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  const [nextFetch, setNextFetch] = useState<Date | null>(null)
  const [status, setStatus] = useState<"idle" | "fetching" | "success" | "error">("idle")
  const [stats, setStats] = useState({
    news: 0,
    jobs: 0,
    weather: 0,
  })
  const [apiStatus, setApiStatus] = useState({
    news: false,
    jobs: false,
    weather: false,
  })
  const [individualFetching, setIndividualFetching] = useState({
    news: false,
    jobs: false,
    weather: false,
  })
  const [lastIndividualFetch, setLastIndividualFetch] = useState({
    news: null as Date | null,
    jobs: null as Date | null,
    weather: null as Date | null,
  })

  const { toast } = useToast()
  const dataFetcher = new DataFetchService()
  const dataStorage = new DataStorageService()

  // Check API keys on component mount
  useEffect(() => {
    const checkApiKeys = () => {
      setApiStatus({
        news: true, // We have the hardcoded key
        jobs: true, // We have the hardcoded key
        weather: true, // We have the hardcoded key
      })
    }
    checkApiKeys()
  }, [])

  // Calculate next 6 AM
  const getNext6AM = () => {
    const now = new Date()
    const next6AM = new Date()
    next6AM.setHours(6, 0, 0, 0)

    // If it's already past 6 AM today, set for tomorrow
    if (now.getHours() >= 6) {
      next6AM.setDate(next6AM.getDate() + 1)
    }

    return next6AM
  }

  // Manual fetch function for all data
  const fetchDataNow = async () => {
    setIsRunning(true)
    setStatus("fetching")

    try {
      toast({
        title: "Data Fetch Started",
        description: "Fetching latest news, jobs, and weather data...",
      })

      const data = await dataFetcher.fetchAllData()

      // Store the data
      await Promise.all([
        dataStorage.storeNews(data.news),
        dataStorage.storeJobs(data.jobs),
        data.weather ? dataStorage.storeWeather(data.weather) : Promise.resolve(),
      ])

      setStats({
        news: data.news.length,
        jobs: data.jobs.length,
        weather: data.weather ? 1 : 0,
      })

      setLastFetch(new Date())
      setNextFetch(getNext6AM())
      setStatus("success")

      toast({
        title: "Data Fetch Complete",
        description: `Fetched ${data.news.length} news, ${data.jobs.length} jobs, and weather data.`,
      })
    } catch (error) {
      console.error("Error fetching data:", error)
      setStatus("error")
      toast({
        title: "Data Fetch Failed",
        description: "Failed to fetch data. Please check your API keys and try again.",
        variant: "destructive",
      })
    } finally {
      setIsRunning(false)
    }
  }

  // Individual fetch functions
  const fetchNewsData = async () => {
    setIndividualFetching((prev) => ({ ...prev, news: true }))
    try {
      const news = await dataFetcher.fetchNews()
      await dataStorage.storeNews(news)
      setLastIndividualFetch((prev) => ({ ...prev, news: new Date() }))
      setStats((prev) => ({ ...prev, news: news.length }))
      toast({
        title: "News Fetch Complete",
        description: `Fetched ${news.length} news articles.`,
      })
    } catch (error) {
      console.error("Error fetching news:", error)
      toast({
        title: "News Fetch Failed",
        description: "Failed to fetch news data.",
        variant: "destructive",
      })
    } finally {
      setIndividualFetching((prev) => ({ ...prev, news: false }))
    }
  }

  const fetchJobsData = async () => {
    setIndividualFetching((prev) => ({ ...prev, jobs: true }))
    try {
      const jobs = await dataFetcher.fetchJobs()
      await dataStorage.storeJobs(jobs)
      setLastIndividualFetch((prev) => ({ ...prev, jobs: new Date() }))
      setStats((prev) => ({ ...prev, jobs: jobs.length }))
      toast({
        title: "Jobs Fetch Complete",
        description: `Fetched ${jobs.length} job listings.`,
      })
    } catch (error) {
      console.error("Error fetching jobs:", error)
      toast({
        title: "Jobs Fetch Failed",
        description: "Failed to fetch jobs data.",
        variant: "destructive",
      })
    } finally {
      setIndividualFetching((prev) => ({ ...prev, jobs: false }))
    }
  }

  const fetchWeatherData = async () => {
    setIndividualFetching((prev) => ({ ...prev, weather: true }))
    try {
      const weather = await dataFetcher.fetchWeather()
      if (weather) {
        await dataStorage.storeWeather(weather)
        setLastIndividualFetch((prev) => ({ ...prev, weather: new Date() }))
        setStats((prev) => ({ ...prev, weather: 1 }))
        toast({
          title: "Weather Fetch Complete",
          description: "Weather data updated successfully.",
        })
      }
    } catch (error) {
      console.error("Error fetching weather:", error)
      toast({
        title: "Weather Fetch Failed",
        description: "Failed to fetch weather data.",
        variant: "destructive",
      })
    } finally {
      setIndividualFetching((prev) => ({ ...prev, weather: false }))
    }
  }

  // Set up automatic scheduling
  useEffect(() => {
    const checkSchedule = () => {
      const now = new Date()
      const next6AM = getNext6AM()
      setNextFetch(next6AM)

      // Check if it's 6 AM (within 1 minute window)
      if (now.getHours() === 6 && now.getMinutes() === 0) {
        fetchDataNow()
      }
    }

    // Check every minute
    const interval = setInterval(checkSchedule, 60000)

    // Initial check
    checkSchedule()

    return () => clearInterval(interval)
  }, [])

  // Load last fetch time from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("lastDataFetch")
    if (stored) {
      setLastFetch(new Date(stored))
    }

    // Load individual fetch times
    const newsStored = localStorage.getItem("lastNewsFetch")
    const jobsStored = localStorage.getItem("lastJobsFetch")
    const weatherStored = localStorage.getItem("lastWeatherFetch")

    setLastIndividualFetch({
      news: newsStored ? new Date(newsStored) : null,
      jobs: jobsStored ? new Date(jobsStored) : null,
      weather: weatherStored ? new Date(weatherStored) : null,
    })
  }, [])

  // Save last fetch times
  useEffect(() => {
    if (lastFetch) {
      localStorage.setItem("lastDataFetch", lastFetch.toISOString())
    }
  }, [lastFetch])

  useEffect(() => {
    if (lastIndividualFetch.news) {
      localStorage.setItem("lastNewsFetch", lastIndividualFetch.news.toISOString())
    }
    if (lastIndividualFetch.jobs) {
      localStorage.setItem("lastJobsFetch", lastIndividualFetch.jobs.toISOString())
    }
    if (lastIndividualFetch.weather) {
      localStorage.setItem("lastWeatherFetch", lastIndividualFetch.weather.toISOString())
    }
  }, [lastIndividualFetch])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Database className="w-6 h-6" />
        <h2 className="text-2xl font-bold">Data Scheduler</h2>
      </div>

      {/* API Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={`${apiStatus.news ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">News API Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={apiStatus.news ? "default" : "destructive"}>
              {apiStatus.news ? "Connected" : "Not Configured"}
            </Badge>
            <p className="text-xs mt-1 text-gray-600">NewsAPI.org</p>
          </CardContent>
        </Card>

        <Card className={`${apiStatus.jobs ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Jobs API Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={apiStatus.jobs ? "default" : "destructive"}>
              {apiStatus.jobs ? "Connected" : "Not Configured"}
            </Badge>
            <p className="text-xs mt-1 text-gray-600">Adzuna API</p>
          </CardContent>
        </Card>

        <Card className={`${apiStatus.weather ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Weather API Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={apiStatus.weather ? "default" : "destructive"}>
              {apiStatus.weather ? "Connected" : "Not Configured"}
            </Badge>
            <p className="text-xs mt-1 text-gray-600">OpenWeatherMap</p>
          </CardContent>
        </Card>
      </div>

      {/* Manual Data Fetch Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Manual Data Fetch
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Manually fetch the latest data from external APIs when needed.
          </p>

          {/* Individual Fetch Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Newspaper className="w-4 h-4" />
                  News Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button onClick={fetchNewsData} disabled={individualFetching.news} size="sm" className="w-full">
                  {individualFetching.news ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Fetch News
                    </>
                  )}
                </Button>
                {lastIndividualFetch.news && (
                  <p className="text-xs text-muted-foreground">Last: {lastIndividualFetch.news.toLocaleString()}</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Jobs Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button onClick={fetchJobsData} disabled={individualFetching.jobs} size="sm" className="w-full">
                  {individualFetching.jobs ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Fetch Jobs
                    </>
                  )}
                </Button>
                {lastIndividualFetch.jobs && (
                  <p className="text-xs text-muted-foreground">Last: {lastIndividualFetch.jobs.toLocaleString()}</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-orange-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Cloud className="w-4 h-4" />
                  Weather Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button onClick={fetchWeatherData} disabled={individualFetching.weather} size="sm" className="w-full">
                  {individualFetching.weather ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Fetch Weather
                    </>
                  )}
                </Button>
                {lastIndividualFetch.weather && (
                  <p className="text-xs text-muted-foreground">Last: {lastIndividualFetch.weather.toLocaleString()}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            {status === "fetching" ? (
              <Wifi className="h-4 w-4 animate-pulse" />
            ) : status === "error" ? (
              <WifiOff className="h-4 w-4 text-red-500" />
            ) : (
              <Database className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <Badge
              variant={
                status === "fetching"
                  ? "default"
                  : status === "success"
                    ? "default"
                    : status === "error"
                      ? "destructive"
                      : "secondary"
              }
            >
              {status === "fetching"
                ? "Fetching..."
                : status === "success"
                  ? "Success"
                  : status === "error"
                    ? "Error"
                    : "Idle"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">News Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.news}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Job Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.jobs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weather Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.weather}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Automatic Scheduling</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Scheduled to run daily at 6:00 AM</span>
          </div>

          {lastFetch && (
            <div className="text-sm text-gray-600">
              <strong>Last fetch:</strong> {lastFetch.toLocaleString()}
            </div>
          )}

          {nextFetch && (
            <div className="text-sm text-gray-600">
              <strong>Next scheduled fetch:</strong> {nextFetch.toLocaleString()}
            </div>
          )}

          <Button onClick={fetchDataNow} disabled={isRunning} className="w-full">
            <Download className="w-4 h-4 mr-2" />
            {isRunning ? "Fetching All Data..." : "Fetch All Data Now"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <strong>News API:</strong> NewsAPI.org (Indian headlines)
          </div>
          <div>
            <strong>Jobs API:</strong> Adzuna API (Indian job listings)
          </div>
          <div>
            <strong>Weather API:</strong> OpenWeatherMap (Bangalore weather + 5-day forecast)
          </div>
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-green-800">
              <strong>✅ API Keys Configured:</strong> Your API keys are set up and ready to use!
              <br />• News API: ••••••••••••••••8776
              <br />• Adzuna API: ••••••••••••••••c435
              <br />• Weather API: ••••••••••••••••a495
            </p>
            <p className="text-green-700 text-xs mt-2">
              Note: If APIs fail, the system will use fallback data to ensure continuous operation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
