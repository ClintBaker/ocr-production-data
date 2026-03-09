'use client'

import { useState, useRef } from 'react'
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'

export default function UploadFormsPage() {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle')
  const [error, setError] = useState<string | null>(null)
  const [uploadResult, setUploadResult] = useState<{
    message: string
    summary?: {
      total: number
      saved: number
      skipped: number
      failed: number
    }
    files?: Array<{
      fileName: string
      success: boolean
      skipped?: boolean
      existingFormId?: string
      error?: string
    }>
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const pdfFiles = Array.from(selectedFiles).filter((file) => {
      if (file.type !== 'application/pdf') {
        setError(`${file.name} is not a PDF file. Only PDF files are allowed.`)
        return false
      }
      return true
    })

    setFiles((prev) => [...prev, ...pdfFiles])
    setError(null)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    handleFileSelect(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one PDF file to upload')
      return
    }

    setUploading(true)
    setError(null)
    setUploadStatus('idle')
    setUploadResult(null)

    try {
      console.log('Starting upload process...', { fileCount: files.length })

      // Create FormData to send files
      const formData = new FormData()
      files.forEach((file, index) => {
        console.log(
          `Adding file ${index + 1}: ${file.name} (${file.size} bytes)`
        )
        formData.append('files', file)
      })

      console.log('Sending request to /api/upload...')
      // Send files to API route
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      console.log('Response received:', {
        status: response.status,
        statusText: response.statusText,
      })

      let data
      try {
        const text = await response.text()
        console.log('Response text:', text.substring(0, 500)) // First 500 chars
        data = JSON.parse(text)
        console.log('Response data:', data)
      } catch (parseError: unknown) {
        console.error('Error parsing response:', parseError)
        const message =
          parseError instanceof Error ? parseError.message : 'Unknown error'
        throw new Error(`Failed to parse server response: ${message}`)
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload files')
      }

      console.log('Upload response:', data)

      setUploadStatus('success')
      setUploadResult(data)
      setFiles([])

      // Clear success message after 10 seconds (longer to read details)
      setTimeout(() => {
        setUploadStatus('idle')
        setUploadResult(null)
      }, 10000)
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'An error occurred while uploading files'
      setError(message)
      setUploadStatus('error')
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Upload CCF Forms
          </h1>
          <p className="text-muted-foreground">
            Upload PDF files containing CCF forms for processing
          </p>
        </div>

        {/* Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-border rounded-lg p-12 text-center bg-card hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Drag and drop PDF files here
          </h3>
          <p className="text-muted-foreground mb-4">or click to browse files</p>
          <p className="text-sm text-muted-foreground">
            Only PDF files are accepted
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 rounded-md bg-destructive/10 border border-destructive/20 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Success Message with Details */}
        {uploadStatus === 'success' && uploadResult && (
          <div className="mt-4 space-y-3">
            <div className="p-4 rounded-md bg-primary/10 border border-primary/20 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm font-medium text-foreground">
                {uploadResult.message}
              </p>
            </div>

            {/* Summary Details */}
            {uploadResult.summary && (
              <div className="p-4 rounded-md bg-card border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Upload Summary
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-lg font-semibold text-foreground">
                      {uploadResult.summary.total}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Saved</p>
                    <p className="text-lg font-semibold text-green-600">
                      {uploadResult.summary.saved}
                    </p>
                  </div>
                  {uploadResult.summary.skipped > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">Skipped</p>
                      <p className="text-lg font-semibold text-yellow-600">
                        {uploadResult.summary.skipped}
                      </p>
                    </div>
                  )}
                  {uploadResult.summary.failed > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">Failed</p>
                      <p className="text-lg font-semibold text-destructive">
                        {uploadResult.summary.failed}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Skipped Files Details */}
            {uploadResult.files &&
              uploadResult.files.some((f) => f.skipped) && (
                <div className="p-4 rounded-md bg-yellow-500/10 border border-yellow-500/20">
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    Skipped Files (Duplicates Found)
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    These files were skipped because records with the same Donor
                    Name, Date, and Client already exist in the database.
                  </p>
                  <ul className="space-y-2">
                    {uploadResult.files
                      .filter((f) => f.skipped)
                      .map((file, idx) => (
                        <li
                          key={idx}
                          className="text-sm text-foreground flex items-center gap-2"
                        >
                          <span className="text-yellow-600">•</span>
                          <span className="truncate">{file.fileName}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

            {/* Failed Files Details */}
            {uploadResult.files &&
              uploadResult.files.some((f) => !f.success) && (
                <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20">
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    Failed Files
                  </h3>
                  <ul className="space-y-2">
                    {uploadResult.files
                      .filter((f) => !f.success)
                      .map((file, idx) => (
                        <li
                          key={idx}
                          className="text-sm text-foreground flex flex-col gap-1"
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-destructive">•</span>
                            <span className="truncate">{file.fileName}</span>
                          </span>
                          {file.error && (
                            <span className="text-xs text-destructive ml-4">
                              {file.error}
                            </span>
                          )}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              Selected Files ({files.length})
            </h2>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(index)
                    }}
                    className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Upload Button */}
            <div className="pt-4">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    Upload {files.length}{' '}
                    {files.length === 1 ? 'File' : 'Files'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-6 rounded-lg border border-border bg-card">
          <h3 className="text-lg font-semibold text-foreground mb-3">
            Upload Instructions
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Only PDF files are accepted</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>You can upload multiple files at once</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Files will be processed automatically after upload</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Ensure your PDF files contain valid CCF form data</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
