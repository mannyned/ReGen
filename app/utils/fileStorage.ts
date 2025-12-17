// IndexedDB utility for storing large file data
// This solves the localStorage quota limitation

const DB_NAME = 'ReGenrFileStorage'
const DB_VERSION = 1
const STORE_NAME = 'uploadedFiles'

interface StoredFile {
  id: string
  name: string
  type: string
  size: number
  base64Data: string
  timestamp: number
}

class FileStorageDB {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }
    })
  }

  async storeFiles(files: StoredFile[]): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      // Clear existing files first
      const clearRequest = store.clear()

      clearRequest.onsuccess = () => {
        // Add new files
        let addedCount = 0
        files.forEach(file => {
          const addRequest = store.add(file)
          addRequest.onsuccess = () => {
            addedCount++
            if (addedCount === files.length) {
              resolve()
            }
          }
          addRequest.onerror = () => reject(new Error(`Failed to store file: ${file.name}`))
        })

        if (files.length === 0) resolve()
      }

      clearRequest.onerror = () => reject(new Error('Failed to clear storage'))
    })
  }

  async getFiles(): Promise<StoredFile[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result || [])
      }

      request.onerror = () => {
        reject(new Error('Failed to retrieve files'))
      }
    })
  }

  async clearFiles(): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to clear files'))
    })
  }
}

// Export singleton instance
export const fileStorage = new FileStorageDB()

// Helper function to convert File to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Helper function to generate unique file ID
export const generateFileId = (): string => {
  return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}