'use client'

import { useState, useEffect } from 'react'
import { X, Save, Loader2, ExternalLink, Copy, Check } from 'lucide-react'

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

interface CCFEditModalProps {
  record: CCFRecord | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

export function CCFEditModal({
  record,
  isOpen,
  onClose,
  onSave,
}: CCFEditModalProps) {
  const [formData, setFormData] = useState<Partial<CCFRecord>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  useEffect(() => {
    if (record) {
      // Format dates for input fields (handle both Date objects and strings from API)
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
      setError(null)
      setSuccess(false)
    }
  }, [record])

  if (!isOpen || !record) return null

  const handleChange = (
    field: keyof CCFRecord,
    value: string | boolean | string[] | null
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleCopy = async (text: string, fieldName: string) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
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

      const response = await fetch(`/api/ccf-forms/${record.id}`, {
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
        onSave()
        onClose()
      }, 1000)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An error occurred while saving'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative z-50 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg border border-border bg-background shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
            <h2 className="text-2xl font-semibold text-foreground">
              Edit CCF Record
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit}>
            <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
              {error && (
                <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 rounded-md bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-600 dark:text-green-400">
                  Record updated successfully!
                </div>
              )}

              <div className="space-y-6">
                {/* PDF Link */}
                {record.formUrl && (
                  <div className="mb-4 p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-1">
                          Original PDF Form
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          View the original uploaded PDF document
                        </p>
                      </div>
                      <a
                        href={record.formUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open PDF
                      </a>
                    </div>
                  </div>
                )}

                {/* Priority Fields */}
                <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
                  <h3 className="text-lg font-semibold text-primary mb-4 pb-2 border-b border-primary/20">
                    Priority Fields
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Specimen ID
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.specimenId || ''}
                          onChange={(e) =>
                            handleChange('specimenId', e.target.value)
                          }
                          className="w-full px-3 py-2 pr-10 border-2 border-primary/30 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(formData.specimenId || '', 'specimenId')
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-primary/10 text-primary transition-colors"
                          aria-label="Copy Specimen ID"
                        >
                          {copiedField === 'specimenId' ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
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
                        className="w-full px-3 py-2 border-2 border-primary/30 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Donor First Name
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.donorFirstName || ''}
                          onChange={(e) =>
                            handleChange('donorFirstName', e.target.value || null)
                          }
                          className="w-full px-3 py-2 pr-10 border-2 border-primary/30 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(formData.donorFirstName || '', 'donorFirstName')
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-primary/10 text-primary transition-colors"
                          aria-label="Copy Donor First Name"
                        >
                          {copiedField === 'donorFirstName' ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Donor Last Name
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.donorLastName || ''}
                          onChange={(e) =>
                            handleChange('donorLastName', e.target.value || null)
                          }
                          className="w-full px-3 py-2 pr-10 border-2 border-primary/30 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(formData.donorLastName || '', 'donorLastName')
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-primary/10 text-primary transition-colors"
                          aria-label="Copy Donor Last Name"
                        >
                          {copiedField === 'donorLastName' ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4 pb-2 border-b border-border">
                    Form Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Type of Test
                      </label>
                      <input
                        type="text"
                        value={formData.typeOfTest || ''}
                        onChange={(e) =>
                          handleChange('typeOfTest', e.target.value || null)
                        }
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Project Job Number
                      </label>
                      <input
                        type="text"
                        value={formData.projectJobNumber || ''}
                        onChange={(e) =>
                          handleChange('projectJobNumber', e.target.value || null)
                        }
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Employer Name
                      </label>
                      <input
                        type="text"
                        value={formData.employerName || ''}
                        onChange={(e) =>
                          handleChange('employerName', e.target.value || null)
                        }
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Donor Last Four SSN
                      </label>
                      <input
                        type="text"
                        value={formData.donorLastFourSsn || ''}
                        onChange={(e) =>
                          handleChange('donorLastFourSsn', e.target.value || null)
                        }
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Donor Date of Birth
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
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Donor Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.donorPhone || ''}
                        onChange={(e) =>
                          handleChange('donorPhone', e.target.value || null)
                        }
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Collector First Name
                      </label>
                      <input
                        type="text"
                        value={formData.collectorFirstName || ''}
                        onChange={(e) =>
                          handleChange('collectorFirstName', e.target.value || null)
                        }
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Collector Last Name
                      </label>
                      <input
                        type="text"
                        value={formData.collectorLastName || ''}
                        onChange={(e) =>
                          handleChange('collectorLastName', e.target.value || null)
                        }
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Instant Oral Tox
                      </label>
                      <input
                        type="text"
                        value={formData.instantOralTox || ''}
                        onChange={(e) =>
                          handleChange('instantOralTox', e.target.value || null)
                        }
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                </div>

                {/* Review Status */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4 pb-2 border-b border-border">
                    Review Status
                  </h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="humanReviewed"
                      checked={formData.humanReviewed || false}
                      onChange={(e) =>
                        handleChange('humanReviewed', e.target.checked)
                      }
                      className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
                    />
                    <label
                      htmlFor="humanReviewed"
                      className="text-sm font-medium text-foreground"
                    >
                      Human Reviewed
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-4 border-t border-border bg-card px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md border border-border bg-background text-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
    </div>
  )
}
