"use client"

import { useState, useEffect } from "react"
import { DataStorageService } from "@/lib/data-storage"
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets, ChevronDown, ChevronUp } from "lucide-react"
import type { WeatherData } from "@/lib/api-services"

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const dataStorage = new DataStorageService()

  useEffect(() => {
    loadWeather()

    // Update weather every 10 minutes
    const interval = setInterval(loadWeather, 10 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  const loadWeather = async () => {
    try {
      const weatherData = await dataStorage.getLatestWeather()
      setWeather(weatherData)
    } catch (error) {
      console.error("Error loading weather:", error)
    } finally {
      setLoading(false)
    }
  }

  const getWeatherIcon = (iconCode: string) => {
    const code = iconCode.substring(0, 2)
    switch (code) {
      case "01":
        return <Sun className="w-6 h-6 text-yellow-400" />
      case "02":
      case "03":
      case "04":
        return <Cloud className="w-6 h-6 text-gray-300" />
      case "09":
      case "10":
        return <CloudRain className="w-6 h-6 text-blue-400" />
      case "13":
        return <CloudSnow className="w-6 h-6 text-blue-200" />
      default:
        return <Sun className="w-6 h-6 text-yellow-400" />
    }
  }

  if (loading) {
    return (
      <div className="fixed top-4 left-4 z-50 bg-black bg-opacity-80 text-white p-3 rounded-lg backdrop-blur-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-20 mb-2"></div>
          <div className="h-6 bg-gray-300 rounded w-16"></div>
        </div>
      </div>
    )
  }

  if (!weather) {
    return (
      <div className="fixed top-4 left-4 z-50 bg-black bg-opacity-80 text-white p-3 rounded-lg backdrop-blur-sm">
        <div className="text-sm">Weather unavailable</div>
      </div>
    )
  }

  return (
    <div className="fixed top-4 left-4 z-50">
      <div className="bg-black bg-opacity-90 text-white rounded-lg backdrop-blur-sm shadow-2xl border border-white border-opacity-20 overflow-hidden">
        {/* Compact View */}
        <div
          className="p-4 cursor-pointer hover:bg-white hover:bg-opacity-10 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-medium">{weather.city}</div>
              <div className="text-xs text-gray-300">
                {weather.updatedAt ? new Date(weather.updatedAt).toLocaleTimeString() : "Unknown time"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getWeatherIcon(weather.icon)}
              <button className="text-gray-300 hover:text-white">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold">{weather.temperature}°C</div>
            <div className="text-sm text-gray-300 capitalize">{weather.description}</div>
          </div>
        </div>

        {/* Expanded View */}
        {expanded && (
          <div className="border-t border-white border-opacity-20 p-4">
            <div className="grid grid-cols-2 gap-3 text-xs mb-4">
              <div className="flex items-center gap-1">
                <Droplets className="w-3 h-3" />
                <span>Humidity: {weather.humidity}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Wind className="w-3 h-3" />
                <span>Wind: {weather.windSpeed} m/s</span>
              </div>
            </div>

            {weather.forecast && weather.forecast.length > 0 && (
              <div>
                <div className="text-xs text-gray-300 mb-3">5-Day Forecast</div>
                <div className="grid grid-cols-5 gap-1 text-xs">
                  {weather.forecast.slice(0, 5).map((day, index) => (
                    <div key={index} className="text-center">
                      <div className="text-gray-400 mb-1">
                        {new Date(day.date).toLocaleDateString("en", { weekday: "short" })}
                      </div>
                      <div className="mb-1 flex justify-center">{getWeatherIcon(day.icon)}</div>
                      <div className="text-xs">
                        <div className="font-medium">{day.high}°</div>
                        <div className="text-gray-400">{day.low}°</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
