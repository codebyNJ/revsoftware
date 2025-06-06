"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataStorageService } from "@/lib/data-storage"
import { useToast } from "@/hooks/use-toast"
import { Trash2, TestTube } from "lucide-react"

export function DeleteTest() {
  const [testing, setTesting] = useState(false)
  const { toast } = useToast()
  const dataStorage = new DataStorageService()

  const testDeleteFunctionality = async () => {
    setTesting(true)
    try {
      // Test creating a dummy news item first
      const testNews = {
        title: "Test News Item - DELETE ME",
        description: "This is a test news item that should be deleted",
        url: "https://example.com",
        imageUrl: "",
        source: "Test Source",
        publishedAt: new Date(),
        category: "test",
      }

      // Store the test news
      await dataStorage.storeNews([testNews])

      // Get all news to find our test item
      const allNews = await dataStorage.getNews(false)
      const testItem = allNews.find((item) => item.title.includes("Test News Item - DELETE ME"))

      if (testItem) {
        // Try to delete it
        await dataStorage.deleteNews(testItem.id)

        // Verify it's deleted
        const updatedNews = await dataStorage.getNews(false)
        const stillExists = updatedNews.find((item) => item.id === testItem.id)

        if (!stillExists) {
          toast({
            title: "Delete Test Successful",
            description: "Delete functionality is working correctly!",
          })
        } else {
          toast({
            title: "Delete Test Failed",
            description: "Item still exists after deletion attempt",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Test Setup Failed",
          description: "Could not create test item",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Delete test error:", error)
      toast({
        title: "Delete Test Error",
        description: `Error: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="w-5 h-5" />
          Delete Function Test
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          This will create a test news item and then delete it to verify the delete functionality is working.
        </p>
        <Button onClick={testDeleteFunctionality} disabled={testing} className="w-full">
          {testing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Testing...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 mr-2" />
              Test Delete Function
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
