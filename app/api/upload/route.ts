import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { put } from '@vercel/blob'
import { extractCCFDataFromPDF } from '@/lib/google-ai'
import { saveCCFFormToDatabase, checkForDuplicateCCFForm } from '@/lib/db-helpers'

const UPLOADS_DIR = 'public/uploads'

export async function POST(request: NextRequest) {
  console.log('=== API Route Called: /api/upload ===')

  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    console.log(`Number of files: ${files.length}`)
    files.forEach((file, index) => {
      console.log(`  [${index + 1}] ${file.name} (${(file.size / 1024).toFixed(2)} KB)`)
    })

    const useVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN

    const processedFiles = await Promise.all(
      files.map(async (file) => {
        try {
          if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            throw new Error(`File ${file.name} is not a PDF file`)
          }

          const maxSize = 20 * 1024 * 1024 // 20MB
          if (file.size > maxSize) {
            throw new Error(`File ${file.name} is too large (max 20MB)`)
          }

          console.log(`Processing ${file.name} with Google AI...`)
          const extractedData = await extractCCFDataFromPDF(file)
          console.log(`✓ Extracted data from ${file.name}`)

          const donorFirstName = (extractedData.donorFirstName as string) || null
          const donorLastName = (extractedData.donorLastName as string) || null
          const dateOfCollection = extractedData.collectionDate
            ? new Date(extractedData.collectionDate as string)
            : null
          const employerName = (extractedData.employerName as string) || null

          const existingFormId = await checkForDuplicateCCFForm(
            donorFirstName,
            donorLastName,
            dateOfCollection,
            employerName
          )

          let formId: string | null = null
          let skipped = false
          let formUrl: string | null = null

          if (existingFormId) {
            console.log(`⚠️ Duplicate found for ${file.name}, skipping`)
            skipped = true
          } else {
            const fileExt = file.name.split('.').pop() || 'pdf'
            const fileName = `ccf-forms/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

            if (useVercelBlob) {
              const arrayBuffer = await file.arrayBuffer()
              const blob = await put(fileName, arrayBuffer, {
                access: 'public',
                contentType: 'application/pdf',
              })
              formUrl = blob.url
              console.log(`✓ Saved PDF to Vercel Blob: ${formUrl}`)
            } else {
              const uploadsPath = path.join(process.cwd(), UPLOADS_DIR)
              await mkdir(uploadsPath, { recursive: true })
              const filePath = path.join(uploadsPath, path.basename(fileName))
              const arrayBuffer = await file.arrayBuffer()
              const buffer = Buffer.from(arrayBuffer)
              await writeFile(filePath, buffer)
              formUrl = `/uploads/${path.basename(fileName)}`
              console.log(`✓ Saved PDF locally: ${formUrl}`)
            }

            try {
              formId = await saveCCFFormToDatabase(extractedData, formUrl)
              console.log(`✓ Saved form to database: ${formId}`)
            } catch (dbError: unknown) {
              const msg = dbError instanceof Error ? dbError.message : String(dbError)
              throw new Error(`Failed to save to database: ${msg}`)
            }
          }

          return {
            fileName: file.name,
            size: file.size,
            type: file.type,
            extractedData: extractedData,
            formId: formId,
            skipped: skipped,
            existingFormId: skipped ? existingFormId : undefined,
            success: true,
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.error(`✗ Error processing ${file.name}:`, errorMessage)
          return {
            fileName: file.name,
            size: file.size,
            type: file.type,
            error: errorMessage,
            success: false,
          }
        }
      })
    )

    const successful = processedFiles.filter((f) => f.success && !f.skipped).length
    const skipped = processedFiles.filter((f) => f.success && f.skipped).length
    const failed = processedFiles.filter((f) => !f.success).length

    let message = `Processed ${files.length} file(s): ${successful} saved`
    if (skipped > 0) message += `, ${skipped} skipped (duplicates)`
    if (failed > 0) message += `, ${failed} failed`

    return NextResponse.json({
      success: true,
      message,
      files: processedFiles,
      summary: {
        total: files.length,
        saved: successful,
        skipped,
        failed,
      },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Upload error:', errorMessage)
    return NextResponse.json(
      { error: errorMessage || 'An error occurred while processing the upload' },
      { status: 500 }
    )
  }
}
