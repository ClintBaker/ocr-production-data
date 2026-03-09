'use client'

import { useState, useEffect } from 'react'
import { X, Save, Loader2 } from 'lucide-react'

type Job = {
  id: string
  key: string
  collectionDate: Date | string
  collectorName: string
  clientName: string
  startTime: Date | string | null
  endTime: Date | string | null
  miles: number | null
  formCount: number
}

interface JobEditModalProps {
  job: Job | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

export function JobEditModal({
  job,
  isOpen,
  onClose,
  onSave,
}: JobEditModalProps) {
  const [formData, setFormData] = useState<{
    startTime: string
    endTime: string
    miles: string
  }>({
    startTime: '',
    endTime: '',
    miles: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (job) {
      // Format dates for datetime-local input (handle both Date objects and strings from API)
      const formatDateTimeForInput = (date: Date | string | null) => {
        if (!date) return ''
        const d = typeof date === 'string' ? new Date(date) : date
        if (isNaN(d.getTime())) return ''
        // Convert to local datetime string for datetime-local input
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        const hours = String(d.getHours()).padStart(2, '0')
        const minutes = String(d.getMinutes()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}`
      }

      setFormData({
        startTime: formatDateTimeForInput(job.startTime),
        endTime: formatDateTimeForInput(job.endTime),
        miles: job.miles !== null ? job.miles.toString() : '',
      })
      setError(null)
      setSuccess(false)
    }
  }, [job])

  if (!isOpen || !job) return null

  const handleChange = (field: 'startTime' | 'endTime' | 'miles', value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Parse the form data
      const updateData: {
        startTime?: string | null
        endTime?: string | null
        miles?: number | null
      } = {}

      if (formData.startTime) {
        updateData.startTime = new Date(formData.startTime).toISOString()
      } else {
        updateData.startTime = null
      }

      if (formData.endTime) {
        updateData.endTime = new Date(formData.endTime).toISOString()
      } else {
        updateData.endTime = null
      }

      if (formData.miles.trim()) {
        const milesValue = parseFloat(formData.miles)
        if (isNaN(milesValue) || milesValue < 0) {
          throw new Error('Miles must be a valid positive number')
        }
        updateData.miles = milesValue
      } else {
        updateData.miles = null
      }

      // Validate that endTime is after startTime if both are provided
      if (updateData.startTime && updateData.endTime) {
        const start = new Date(updateData.startTime)
        const end = new Date(updateData.endTime)
        if (end <= start) {
          throw new Error('End time must be after start time')
        }
      }

      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update job')
      }

      setSuccess(true)
      setTimeout(() => {
        onSave()
        onClose()
      }, 1000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const formatJobLabel = () => {
    const date = typeof job.collectionDate === 'string' 
      ? new Date(job.collectionDate) 
      : job.collectionDate
    const dateStr = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    return `${dateStr} - ${job.collectorName} - ${job.clientName}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Edit Job Metadata</h2>
            <p className="text-sm text-muted-foreground mt-1">{formatJobLabel()}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {job.formCount} form{job.formCount !== 1 ? 's' : ''} in this job
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-md transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md">
              <p className="text-sm text-green-600 dark:text-green-400">
                Job updated successfully!
              </p>
            </div>
          )}

          {/* Start Time */}
          <div>
            <label
              htmlFor="startTime"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Start Time
            </label>
            <input
              type="datetime-local"
              id="startTime"
              value={formData.startTime}
              onChange={(e) => handleChange('startTime', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">
              When the job started
            </p>
          </div>

          {/* End Time */}
          <div>
            <label
              htmlFor="endTime"
              className="block text-sm font-medium text-foreground mb-2"
            >
              End Time
            </label>
            <input
              type="datetime-local"
              id="endTime"
              value={formData.endTime}
              onChange={(e) => handleChange('endTime', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">
              When the job ended (must be after start time)
            </p>
          </div>

          {/* Miles */}
          <div>
            <label
              htmlFor="miles"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Miles
            </label>
            <input
              type="number"
              id="miles"
              step="0.01"
              min="0"
              value={formData.miles}
              onChange={(e) => handleChange('miles', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Total miles traveled for this job
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

