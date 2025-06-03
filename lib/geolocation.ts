export interface GeolocationData {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: Date
  address?: string
}

export const getCurrentLocation = (): Promise<GeolocationData> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"))
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords

        try {
          // Reverse geocoding to get address
          const address = await reverseGeocode(latitude, longitude)

          resolve({
            latitude,
            longitude,
            accuracy,
            timestamp: new Date(),
            address,
          })
        } catch (error) {
          // Return location without address if geocoding fails
          resolve({
            latitude,
            longitude,
            accuracy,
            timestamp: new Date(),
          })
        }
      },
      (error) => {
        console.error("Geolocation error:", error)
        reject(error)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      },
    )
  })
}

export const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
  try {
    // Using a free geocoding service (you might want to use Google Maps API or similar)
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
    )

    if (!response.ok) {
      throw new Error("Geocoding failed")
    }

    const data = await response.json()
    return `${data.locality}, ${data.principalSubdivision}, ${data.countryName}`
  } catch (error) {
    console.error("Reverse geocoding error:", error)
    return "Unknown location"
  }
}

export const watchLocation = (callback: (location: GeolocationData) => void): number => {
  if (!navigator.geolocation) {
    throw new Error("Geolocation is not supported by this browser")
  }

  return navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude, accuracy } = position.coords

      try {
        const address = await reverseGeocode(latitude, longitude)
        callback({
          latitude,
          longitude,
          accuracy,
          timestamp: new Date(),
          address,
        })
      } catch (error) {
        callback({
          latitude,
          longitude,
          accuracy,
          timestamp: new Date(),
        })
      }
    },
    (error) => {
      console.error("Location watch error:", error)
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // 1 minute
    },
  )
}
