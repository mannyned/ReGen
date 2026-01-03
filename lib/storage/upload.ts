/**
 * Direct Client-Side Upload to Supabase Storage
 *
 * This bypasses the API route and uploads directly from the browser,
 * allowing for much larger files (up to Supabase's 50MB default or bucket limit).
 */

import { createClient } from '@/lib/supabase/client'

export interface UploadResult {
  success: boolean
  publicUrl?: string
  path?: string
  error?: string
}

/**
 * Upload a file directly to Supabase Storage from the browser
 *
 * @param file - The File object to upload
 * @param userId - User ID for organizing uploads
 * @returns Upload result with public URL
 */
export async function uploadToStorage(file: File, userId: string): Promise<UploadResult> {
  try {
    const supabase = createClient()

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split('.').pop() || 'bin'
    const storagePath = `${userId}/${timestamp}-${randomId}.${extension}`

    // Upload directly to Supabase Storage
    const { data, error } = await supabase.storage
      .from('Media')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('[Storage Upload Error]', error)
      return {
        success: false,
        error: error.message,
      }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('Media')
      .getPublicUrl(storagePath)

    return {
      success: true,
      publicUrl,
      path: data.path,
    }
  } catch (error) {
    console.error('[Storage Upload Error]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    }
  }
}

/**
 * Upload multiple files to storage
 */
export async function uploadMultipleToStorage(
  files: File[],
  userId: string,
  onProgress?: (completed: number, total: number) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = []

  for (let i = 0; i < files.length; i++) {
    const result = await uploadToStorage(files[i], userId)
    results.push(result)
    onProgress?.(i + 1, files.length)
  }

  return results
}
