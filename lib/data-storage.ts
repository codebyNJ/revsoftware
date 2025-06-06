import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { NewsItem, JobItem, WeatherData } from "@/lib/api-services"

export class DataStorageService {
  // Store news data
  async storeNews(newsItems: NewsItem[]) {
    try {
      // Clear old news (keep only latest 50)
      await this.clearOldData("news", 50)

      // Store new news
      const batch = newsItems.map((item) =>
        addDoc(collection(db, "news"), {
          ...item,
          createdAt: new Date(),
          isActive: true,
        }),
      )

      await Promise.all(batch)
      console.log(`Stored ${newsItems.length} news items`)
    } catch (error) {
      console.error("Error storing news:", error)
    }
  }

  // Store jobs data
  async storeJobs(jobItems: JobItem[]) {
    try {
      // Clear old jobs (keep only latest 50)
      await this.clearOldData("jobs", 50)

      // Store new jobs
      const batch = jobItems.map((item) =>
        addDoc(collection(db, "jobs"), {
          ...item,
          createdAt: new Date(),
          isActive: true,
        }),
      )

      await Promise.all(batch)
      console.log(`Stored ${jobItems.length} job items`)
    } catch (error) {
      console.error("Error storing jobs:", error)
    }
  }

  // Store weather data
  async storeWeather(weatherData: WeatherData) {
    try {
      // Clear old weather data (keep only latest 10)
      await this.clearOldData("weather", 10)

      // Store new weather
      await addDoc(collection(db, "weather"), {
        ...weatherData,
        createdAt: new Date(),
      })

      console.log("Stored weather data for Bangalore")
    } catch (error) {
      console.error("Error storing weather:", error)
    }
  }

  // Clear old data to maintain limits
  private async clearOldData(collectionName: string, keepCount: number) {
    try {
      const q = query(
        collection(db, collectionName),
        orderBy("createdAt", "desc"),
        limit(100), // Get more than we need to identify old ones
      )

      const snapshot = await getDocs(q)
      const docs = snapshot.docs

      // Delete documents beyond the keep count
      if (docs.length > keepCount) {
        const docsToDelete = docs.slice(keepCount)
        const deleteBatch = docsToDelete.map((docSnapshot) => deleteDoc(doc(db, collectionName, docSnapshot.id)))

        await Promise.all(deleteBatch)
        console.log(`Cleaned up ${docsToDelete.length} old ${collectionName} items`)
      }
    } catch (error) {
      console.error(`Error cleaning up ${collectionName}:`, error)
    }
  }

  // Fetch stored data
  async getNews(activeOnly = true) {
    try {
      const q = activeOnly
        ? query(collection(db, "news"), where("isActive", "==", true), orderBy("createdAt", "desc"), limit(50))
        : query(collection(db, "news"), orderBy("createdAt", "desc"), limit(50))

      const snapshot = await getDocs(q)
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        publishedAt: doc.data().publishedAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as (NewsItem & { createdAt: Date; isActive: boolean })[]
    } catch (error) {
      console.error("Error fetching news:", error)
      return []
    }
  }

  async getJobs(activeOnly = true) {
    try {
      const q = activeOnly
        ? query(collection(db, "jobs"), where("isActive", "==", true), orderBy("createdAt", "desc"), limit(50))
        : query(collection(db, "jobs"), orderBy("createdAt", "desc"), limit(50))

      const snapshot = await getDocs(q)
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        postedAt: doc.data().postedAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as (JobItem & { createdAt: Date; isActive: boolean })[]
    } catch (error) {
      console.error("Error fetching jobs:", error)
      return []
    }
  }

  async getLatestWeather() {
    try {
      const q = query(collection(db, "weather"), orderBy("createdAt", "desc"), limit(1))
      const snapshot = await getDocs(q)

      if (snapshot.empty) return null

      const doc = snapshot.docs[0]
      return {
        id: doc.id,
        ...doc.data(),
        updatedAt: doc.data().updatedAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      } as WeatherData & { createdAt: Date }
    } catch (error) {
      console.error("Error fetching weather:", error)
      return null
    }
  }

  // Toggle news/job item active status
  async toggleItemStatus(collectionName: string, itemId: string, isActive: boolean) {
    try {
      await updateDoc(doc(db, collectionName, itemId), { isActive })
      console.log(`Updated ${collectionName} item ${itemId} status to ${isActive}`)
    } catch (error) {
      console.error(`Error updating ${collectionName} item status:`, error)
    }
  }

  // Delete news item completely
  async deleteNews(newsId: string) {
    try {
      await deleteDoc(doc(db, "news", newsId))
      console.log(`Deleted news item: ${newsId}`)
    } catch (error) {
      console.error("Error deleting news:", error)
      throw error
    }
  }

  // Delete job item completely
  async deleteJob(jobId: string) {
    try {
      await deleteDoc(doc(db, "jobs", jobId))
      console.log(`Deleted job item: ${jobId}`)
    } catch (error) {
      console.error("Error deleting job:", error)
      throw error
    }
  }

  // Bulk delete news items
  async bulkDeleteNews(newsIds: string[]) {
    try {
      const deleteBatch = newsIds.map((id) => deleteDoc(doc(db, "news", id)))
      await Promise.all(deleteBatch)
      console.log(`Bulk deleted ${newsIds.length} news items`)
    } catch (error) {
      console.error("Error bulk deleting news:", error)
      throw error
    }
  }

  // Bulk delete job items
  async bulkDeleteJobs(jobIds: string[]) {
    try {
      const deleteBatch = jobIds.map((id) => deleteDoc(doc(db, "jobs", id)))
      await Promise.all(deleteBatch)
      console.log(`Bulk deleted ${jobIds.length} job items`)
    } catch (error) {
      console.error("Error bulk deleting jobs:", error)
      throw error
    }
  }
}
