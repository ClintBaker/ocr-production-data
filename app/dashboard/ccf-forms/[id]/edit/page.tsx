'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, Loader2, ExternalLink, Trash2 } from 'lucide-react'

type CCFRecord = {
  id: string
  specimenId: string | null
  collectionDate: Date | string | null
  typeOfTest: string | null
  projectJobNumber: string | null
  employerName: string | null
  donorFirstName: string | null
  donorLastName: string | null
  donorLastFourSsn: string | null
  donorDob: Date | string | null
  donorPhone: string | null
  collectorFirstName: string | null
  collectorLastName: string | null
  instantOralTox: string | null
  humanReviewed: boolean
  createdAt: Date | string
  updatedAt: Date | string
  formUrl: string | null
}

export default function EditCCFFormPage() {
  const router = useRouter()
  const params = useParams()
  const formId = params.id as string

  const [formData, setFormData] = useState<Partial<CCFRecord>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const fetchRecord = async () => {
      if (!formId) return

      setLoading(true)
      try {
        const response = await fetch(`/api/ccf-forms/${formId}`)
        if (!response.ok) throw new Error('Failed to fetch record')

        const data = await response.json()
        const record = data.form

        // Format dates for input fields
        const formatDateForInput = (date: Date | string | null) => {
          if (!date) return ''
          const d = typeof date === 'string' ? new Date(date) : date
          if (isNaN(d.getTime())) return ''
          return d.toISOString().split('T')[0]
        }

        setFormData({
          ...record,
          collectionDate: record.collectionDate
            ? formatDateForInput(record.collectionDate)
            : null,
          donorDob: record.donorDob
            ? formatDateForInput(record.donorDob)
            : null,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load record')
      } finally {
        setLoading(false)
      }
    }

    fetchRecord()
  }, [formId])

  const handleChange = (
    field: keyof CCFRecord,
    value: string | boolean | string[] | null
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Convert date strings back to Date objects
      const submitData = {
        ...formData,
        collectionDate: formData.collectionDate
          ? new Date(formData.collectionDate as string)
          : null,
        donorDob: formData.donorDob
          ? new Date(formData.donorDob as string)
          : null,
      }

      const response = await fetch(`/api/ccf-forms/${formId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update record')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An error occurred while saving'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    setDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/ccf-forms/${formId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete record')
      }

      // Redirect to dashboard after successful deletion
      router.push('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An error occurred while deleting'
      )
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Edit CCF Record
              </h1>
              <p className="text-sm text-muted-foreground">
                {formData.specimenId || 'Loading...'}
              </p>
            </div>
          </div>
          {formData.formUrl && (
            <a
              href={formData.formUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              View PDF
            </a>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-md bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-600 dark:text-green-400">
            Record updated successfully! Redirecting...
          </div>
        )}


        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form - 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              {/* Core Fields - Most Important */}
              <div className="rounded-lg border border-border bg-card p-3">
                <h3 className="text-xs font-semibold text-foreground mb-3">
                  Core Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-0.5">
                      Specimen ID
                    </label>
                    <input
                      type="text"
                      value={formData.specimenId || ''}
                      onChange={(e) =>
                        handleChange('specimenId', e.target.value || null)
                      }
                      className="w-full px-2 py-1 text-xs border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-0.5">
                      Collection Date
                    </label>
                    <input
                      type="date"
                      value={
                        formData.collectionDate
                          ? (formData.collectionDate as string)
                          : ''
                      }
                      onChange={(e) =>
                        handleChange(
                          'collectionDate',
                          e.target.value || null
                        )
                      }
                      className="w-full px-2 py-1 text-xs border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-0.5">
                      Type of Test
                    </label>
                    <input
                      type="text"
                      value={formData.typeOfTest || ''}
                      onChange={(e) =>
                        handleChange('typeOfTest', e.target.value || null)
                      }
                      className="w-full px-2 py-1 text-xs border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-0.5">
                      Project Job Number
                    </label>
                    <input
                      type="text"
                      value={formData.projectJobNumber || ''}
                      onChange={(e) =>
                        handleChange('projectJobNumber', e.target.value || null)
                      }
                      className="w-full px-2 py-1 text-xs border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-0.5">
                      Employer Name
                    </label>
                    <input
                      type="text"
                      value={formData.employerName || ''}
                      onChange={(e) =>
                        handleChange('employerName', e.target.value || null)
                      }
                      className="w-full px-2 py-1 text-xs border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-0.5">
                      Instant Oral Tox
                    </label>
                    <input
                      type="text"
                      value={formData.instantOralTox || ''}
                      onChange={(e) =>
                        handleChange('instantOralTox', e.target.value || null)
                      }
                      className="w-full px-2 py-1 text-xs border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              {/* Donor */}
              <div className="rounded-lg border border-border bg-card p-3">
                <h3 className="text-xs font-semibold text-foreground mb-3">
                  Donor
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-0.5">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={formData.donorFirstName || ''}
                      onChange={(e) =>
                        handleChange('donorFirstName', e.target.value || null)
                      }
                      className="w-full px-2 py-1 text-xs border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-0.5">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.donorLastName || ''}
                      onChange={(e) =>
                        handleChange('donorLastName', e.target.value || null)
                      }
                      className="w-full px-2 py-1 text-xs border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-0.5">
                      Last Four SSN
                    </label>
                    <input
                      type="text"
                      value={formData.donorLastFourSsn || ''}
                      onChange={(e) =>
                        handleChange('donorLastFourSsn', e.target.value || null)
                      }
                      className="w-full px-2 py-1 text-xs border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-0.5">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={
                        formData.donorDob
                          ? (formData.donorDob as string)
                          : ''
                      }
                      onChange={(e) =>
                        handleChange(
                          'donorDob',
                          e.target.value || null
                        )
                      }
                      className="w-full px-2 py-1 text-xs border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-0.5">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.donorPhone || ''}
                      onChange={(e) =>
                        handleChange('donorPhone', e.target.value || null)
                      }
                      className="w-full px-2 py-1 text-xs border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              {/* Collector */}
              <div className="rounded-lg border border-border bg-card p-3">
                <h3 className="text-xs font-semibold text-foreground mb-3">
                  Collector
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-0.5">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={formData.collectorFirstName || ''}
                      onChange={(e) =>
                        handleChange('collectorFirstName', e.target.value || null)
                      }
                      className="w-full px-2 py-1 text-xs border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-0.5">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.collectorLastName || ''}
                      onChange={(e) =>
                        handleChange('collectorLastName', e.target.value || null)
                      }
                      className="w-full px-2 py-1 text-xs border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              {/* Review Status */}
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="humanReviewed"
                    checked={formData.humanReviewed || false}
                    onChange={(e) =>
                      handleChange('humanReviewed', e.target.checked)
                    }
                    className="w-4 h-4 rounded border-border text-primary focus:ring-1 focus:ring-ring"
                  />
                  <label
                    htmlFor="humanReviewed"
                    className="text-xs font-medium text-foreground"
                  >
                    Human Reviewed
                  </label>
                </div>
              </div>
            </div>

            {/* PDF Viewer Sidebar */}
            {formData.formUrl && (
              <div className="lg:col-span-1">
                <div className="sticky top-6 rounded-lg border border-border bg-card p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Original PDF
                  </h3>
                  <div className="aspect-[8.5/11] border border-border rounded-md overflow-hidden bg-muted">
                    <iframe
                      src={formData.formUrl}
                      className="w-full h-full"
                      title="CCF Form PDF"
                    />
                  </div>
                  <a
                    href={formData.formUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open in New Tab
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-6 flex items-center justify-between border-t border-border pt-6">
            {!showDeleteConfirm ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting || saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-md border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Record
                </button>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    className="px-4 py-2 rounded-md border border-border bg-background text-foreground hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || deleting}
                    className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? (
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
              </>
            ) : (
              <>
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">
                    Confirm deletion of this record?
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This action cannot be undone.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="px-4 py-2 rounded-md border border-border bg-background text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-2 px-4 py-2 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Delete Record
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

