// API service configurations and functions

export interface NewsItem {
  id: string
  title: string
  description: string
  url: string
  imageUrl?: string
  source: string
  publishedAt: Date
  category: string
  country: string
}

export interface JobItem {
  id: string
  title: string
  company: string
  location: string
  description: string
  url: string
  salary?: string
  type: string
  experience: string
  skills: string[]
  postedAt: Date
  country: string
}

export interface WeatherData {
  id: string
  city: string
  country: string
  temperature: number
  description: string
  humidity: number
  windSpeed: number
  icon: string
  updatedAt: Date
  forecast: {
    date: string
    high: number
    low: number
    description: string
    icon: string
  }[]
}

// News API Service - Using actual URLs from the API
export class NewsAPIService {
  private apiKey = "aa573d1b17494946bed19107872e8776"
  private baseUrl = "https://newsapi.org/v2"

  async fetchIndianNews(): Promise<NewsItem[]> {
    try {
      const url = `${this.baseUrl}/top-headlines?country=in&category=business&apiKey=${this.apiKey}&pageSize=15`

      console.log("Fetching Indian business news...")

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "REV-Ad-Management/1.0",
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        if (response.status === 426) {
          console.warn("NewsAPI rate limit reached, using fallback data")
          return this.getFallbackNews()
        }
        throw new Error(`News API error: ${response.status} - ${response.statusText}`)
      }

      const data = await response.json()

      if (data.status === "error") {
        console.warn("NewsAPI returned error:", data.message)
        return this.getFallbackNews()
      }

      // Use actual URLs from the API response
      return data.articles
        .filter(
          (article: any) =>
            article.title && article.title !== "[Removed]" && article.url && !article.url.includes("removed.com"),
        )
        .map((article: any, index: number) => ({
          id: `news_${Date.now()}_${index}`,
          title: article.title,
          description: article.description || article.content || "Read full article for more details",
          url: article.url, // Use actual URL from API
          imageUrl: article.urlToImage,
          source: article.source?.name || article.author || "Unknown Source",
          publishedAt: new Date(article.publishedAt || Date.now()),
          category: "business",
          country: "india",
        }))
    } catch (error) {
      console.error("Error fetching news:", error)
      return this.getFallbackNews()
    }
  }

  async fetchWorldNews(): Promise<NewsItem[]> {
    try {
      const url = `${this.baseUrl}/top-headlines?category=general&apiKey=${this.apiKey}&pageSize=10`

      console.log("Fetching world news...")

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "REV-Ad-Management/1.0",
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        console.warn(`World News API error: ${response.status}, using fallback data`)
        return this.getFallbackWorldNews()
      }

      const data = await response.json()

      if (data.status === "error") {
        console.warn("World NewsAPI returned error:", data.message)
        return this.getFallbackWorldNews()
      }

      return data.articles
        .filter(
          (article: any) =>
            article.title && article.title !== "[Removed]" && article.url && !article.url.includes("removed.com"),
        )
        .map((article: any, index: number) => ({
          id: `world_news_${Date.now()}_${index}`,
          title: article.title,
          description: article.description || article.content || "Read full article for more details",
          url: article.url, // Use actual URL from API
          imageUrl: article.urlToImage,
          source: article.source?.name || article.author || "Unknown Source",
          publishedAt: new Date(article.publishedAt || Date.now()),
          category: "general",
          country: "world",
        }))
    } catch (error) {
      console.error("Error fetching world news:", error)
      return this.getFallbackWorldNews()
    }
  }

  async fetchAllNews(): Promise<NewsItem[]> {
    try {
      const [indiaNews, worldNews] = await Promise.all([this.fetchIndianNews(), this.fetchWorldNews()])
      const allNews = [...indiaNews, ...worldNews].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      return allNews.slice(0, 20)
    } catch (error) {
      console.error("Error fetching all news:", error)
      return this.getFallbackNews()
    }
  }

  private getFallbackNews(): NewsItem[] {
    return [
      {
        id: `fallback_news_1_${Date.now()}`,
        title: "India's Business Sector Shows Remarkable Growth in Q4",
        description:
          "The Indian business landscape continues to demonstrate robust growth with new investments in technology, manufacturing, and services sectors driving economic expansion.",
        url: "https://www.business-standard.com/economy/news",
        imageUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=400&fit=crop",
        source: "Business Standard",
        publishedAt: new Date(),
        category: "business",
        country: "india",
      },
    ]
  }

  private getFallbackWorldNews(): NewsItem[] {
    return [
      {
        id: `fallback_world_news_1_${Date.now()}`,
        title: "Global Technology Trends Shape Future Markets",
        description:
          "Worldwide technology adoption continues to accelerate with artificial intelligence, blockchain, and renewable energy leading innovation.",
        url: "https://www.reuters.com/technology/",
        imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=400&fit=crop",
        source: "Reuters",
        publishedAt: new Date(),
        category: "technology",
        country: "world",
      },
    ]
  }
}

// Jobs API Service - Using actual URLs from Adzuna
export class JobsAPIService {
  private appId = "3a54f386e79cda88ba5fd7d8b107c435"
  private apiKey = "3a54f386e79cda88ba5fd7d8b107c435"
  private baseUrl = "https://api.adzuna.com/v1/api/jobs"

  async fetchIndianJobs(): Promise<JobItem[]> {
    try {
      const url = `${this.baseUrl}/in/search/1?app_id=${this.appId}&app_key=${this.apiKey}&results_per_page=15&what=&where=india&content-type=application/json`

      console.log("Fetching jobs from Adzuna API...")

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "REV-Ad-Management/1.0",
        },
      })

      if (!response.ok) {
        console.warn(`Jobs API error: ${response.status}, using fallback data`)
        return this.getFallbackJobs()
      }

      const data = await response.json()

      if (!data.results || !Array.isArray(data.results)) {
        console.warn("Invalid jobs API response, using fallback data")
        return this.getFallbackJobs()
      }

      return data.results
        .filter((job: any) => job.title && job.description && job.redirect_url)
        .map((job: any, index: number) => ({
          id: `job_${Date.now()}_${index}`,
          title: job.title,
          company: job.company?.display_name || "Company Name Not Available",
          location: job.location?.display_name || "India",
          description: this.cleanJobDescription(job.description),
          url: job.redirect_url, // Use actual job URL from API
          salary: job.salary_min && job.salary_max ? `₹${job.salary_min} - ₹${job.salary_max}` : "Salary not specified",
          type: job.contract_type || "full_time",
          experience: job.category?.label || "Not specified",
          skills: [],
          postedAt: new Date(job.created || Date.now()),
          country: "india",
        }))
    } catch (error) {
      console.error("Error fetching jobs:", error)
      return this.getFallbackJobs()
    }
  }

  private cleanJobDescription(description: string): string {
    if (!description) return ""
    return (
      description
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim()
        .substring(0, 200) + (description.length > 200 ? "..." : "")
    )
  }

  private getFallbackJobs(): JobItem[] {
    return [
      {
        id: `fallback_job_1_${Date.now()}`,
        title: "Senior Software Developer - Full Stack",
        company: "Tech Solutions India Pvt Ltd",
        location: "Bangalore, Karnataka",
        description:
          "We are looking for a skilled full-stack software developer to join our dynamic team. Experience with React, Node.js, cloud technologies preferred.",
        url: "https://www.naukri.com/software-developer-jobs",
        salary: "₹8,00,000 - ₹15,00,000",
        type: "full_time",
        experience: "2-5 years",
        skills: ["React", "Node.js", "JavaScript", "AWS"],
        postedAt: new Date(),
        country: "india",
      },
    ]
  }
}

// Weather API Service remains the same
export class WeatherAPIService {
  private apiKey = "d87cd0fa92402abfc02e490aaa64a495"
  private baseUrl = "https://api.openweathermap.org/data/2.5"

  async fetchBangaloreWeather(): Promise<WeatherData | null> {
    try {
      const currentUrl = `${this.baseUrl}/weather?q=Bangalore,IN&appid=${this.apiKey}&units=metric`
      const forecastUrl = `${this.baseUrl}/forecast?q=Bangalore,IN&appid=${this.apiKey}&units=metric`

      console.log("Fetching weather from OpenWeatherMap...")

      const [currentResponse, forecastResponse] = await Promise.all([fetch(currentUrl), fetch(forecastUrl)])

      if (!currentResponse.ok || !forecastResponse.ok) {
        console.warn("Weather API error, using fallback data")
        return this.getFallbackWeather()
      }

      const currentData = await currentResponse.json()
      const forecastData = await forecastResponse.json()

      const dailyForecasts = forecastData.list
        .filter((_: any, index: number) => index % 8 === 0)
        .slice(0, 5)
        .map((item: any) => ({
          date: new Date(item.dt * 1000).toLocaleDateString(),
          high: Math.round(item.main.temp_max),
          low: Math.round(item.main.temp_min),
          description: item.weather[0].description,
          icon: item.weather[0].icon,
        }))

      return {
        id: `weather_${Date.now()}`,
        city: "Bangalore",
        country: "India",
        temperature: Math.round(currentData.main.temp),
        description: currentData.weather[0].description,
        humidity: currentData.main.humidity,
        windSpeed: currentData.wind.speed,
        icon: currentData.weather[0].icon,
        updatedAt: new Date(),
        forecast: dailyForecasts,
      }
    } catch (error) {
      console.error("Error fetching weather:", error)
      return this.getFallbackWeather()
    }
  }

  private getFallbackWeather(): WeatherData {
    return {
      id: `fallback_weather_${Date.now()}`,
      city: "Bangalore",
      country: "India",
      temperature: 24,
      description: "partly cloudy",
      humidity: 65,
      windSpeed: 3.2,
      icon: "02d",
      updatedAt: new Date(),
      forecast: [
        { date: new Date().toLocaleDateString(), high: 26, low: 18, description: "partly cloudy", icon: "02d" },
        {
          date: new Date(Date.now() + 86400000).toLocaleDateString(),
          high: 28,
          low: 20,
          description: "sunny",
          icon: "01d",
        },
        {
          date: new Date(Date.now() + 172800000).toLocaleDateString(),
          high: 25,
          low: 17,
          description: "light rain",
          icon: "10d",
        },
        {
          date: new Date(Date.now() + 259200000).toLocaleDateString(),
          high: 27,
          low: 19,
          description: "cloudy",
          icon: "04d",
        },
        {
          date: new Date(Date.now() + 345600000).toLocaleDateString(),
          high: 29,
          low: 21,
          description: "sunny",
          icon: "01d",
        },
      ],
    }
  }
}

export class DataFetchService {
  private newsAPI = new NewsAPIService()
  private jobsAPI = new JobsAPIService()
  private weatherAPI = new WeatherAPIService()

  async fetchAllData() {
    console.log("Starting daily data fetch...")

    const [news, jobs, weather] = await Promise.all([
      this.newsAPI.fetchAllNews(),
      this.jobsAPI.fetchIndianJobs(),
      this.weatherAPI.fetchBangaloreWeather(),
    ])

    console.log(`Fetched ${news.length} news items, ${jobs.length} jobs, and weather data`)

    return {
      news,
      jobs,
      weather,
      fetchedAt: new Date(),
    }
  }
}
