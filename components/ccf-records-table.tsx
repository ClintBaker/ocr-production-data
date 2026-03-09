'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  FileText,
  Calendar,
  User,
  Building2,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  ExternalLink,
  FileDown,
} from 'lucide-react'
import { JobEditModal } from './job-edit-modal'

type CCFRecord = {
  id: string
  specimenId: string | null
  collectionDate: Date | null
  typeOfTest: string | null
  projectJobNumber: string | null
  employerName: string | null
  donorFirstName: string | null
  donorLastName: string | null
  donorLastFourSsn: string | null
  donorDob: Date | null
  donorPhone: string | null
  collectorFirstName: string | null
  collectorLastName: string | null
  instantOralTox: string | null
  createdAt: Date
  humanReviewed: boolean
  formUrl: string | null
}

interface CCFRecordsTableProps {
  initialTotal?: number
  initialJobKey?: string
}

type SortField = 'specimenId' | 'donorFirstName' | 'donorLastName' | 'employerName' | 'collectionDate' | 'createdAt' | 'humanReviewed'
type SortOrder = 'asc' | 'desc'

export function CCFRecordsTable({ initialTotal = 0, initialJobKey }: CCFRecordsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [forms, setForms] = useState<CCFRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'))
  const [limit] = useState(10)
  const [sortBy, setSortBy] = useState<SortField>(
    (searchParams.get('sortBy') as SortField) || 'createdAt'
  )
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    (searchParams.get('sortOrder') as SortOrder) || 'desc'
  )
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [filterReviewed, setFilterReviewed] = useState<string | undefined>(
    searchParams.get('filterReviewed') || undefined
  )
  const [jobKey, setJobKey] = useState<string | undefined>(
    initialJobKey || searchParams.get('jobKey') || undefined
  )
  const [jobs, setJobs] = useState<Array<{ 
    key: string
    id: string
    date: Date | string
    collector: string
    client: string
    count: number
    startTime: Date | string | null
    endTime: Date | string | null
    miles: number | null
  }>>([])
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [total, setTotal] = useState(initialTotal)
  const [totalPages, setTotalPages] = useState(0)
  const [selectedJob, setSelectedJob] = useState<{
    id: string
    key: string
    collectionDate: Date | string
    collectorName: string
    clientName: string
    startTime: Date | string | null
    endTime: Date | string | null
    miles: number | null
    formCount: number
  } | null>(null)
  const [isJobEditModalOpen, setIsJobEditModalOpen] = useState(false)
  const [exportingCSV, setExportingCSV] = useState(false)

  // Fetch jobs list
  const fetchJobs = useCallback(async () => {
    setLoadingJobs(true)
    try {
      const response = await fetch('/api/ccf-forms?jobs=true')
      if (!response.ok) throw new Error('Failed to fetch jobs')
      const data = await response.json()
      setJobs(data.jobs || [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoadingJobs(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const fetchForms = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', limit.toString())
      params.set('sortBy', sortBy)
      params.set('sortOrder', sortOrder)
      if (search) params.set('search', search)
      if (filterReviewed !== undefined) params.set('filterReviewed', filterReviewed)
      if (jobKey) params.set('jobKey', jobKey)

      const response = await fetch(`/api/ccf-forms?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch forms')

      const data = await response.json()
      setForms(data.forms || [])
      setTotal(data.pagination?.total || 0)
      setTotalPages(data.pagination?.totalPages || 0)

      // Update URL without reloading - only if not on a job detail page
      // If initialJobKey is provided, we're on a job detail page, so don't update URL
      if (!initialJobKey) {
        router.replace(`/dashboard?${params.toString()}`, { scroll: false })
      }
    } catch (error) {
      console.error('Error fetching forms:', error)
    } finally {
      setLoading(false)
    }
  }, [page, limit, sortBy, sortOrder, search, filterReviewed, jobKey, router, initialJobKey])

  useEffect(() => {
    fetchForms()
  }, [fetchForms])

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setPage(1) // Reset to first page on sort
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1) // Reset to first page on search
  }

  const handleFilterReviewed = (value: string) => {
    setFilterReviewed(value || undefined)
    setPage(1) // Reset to first page on filter
  }

  const handleJobFilter = (value: string) => {
    setJobKey(value || undefined)
    setPage(1) // Reset to first page on filter
  }

  const formatJobLabel = (job: { date: Date | string; collector: string; client: string; count: number }) => {
    const date = typeof job.date === 'string' ? new Date(job.date) : job.date
    const dateStr = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    return `${dateStr} - ${job.collector} - ${job.client} (${job.count} form${job.count !== 1 ? 's' : ''})`
  }

  const handleEditJob = async () => {
    if (!jobKey) return
    
    try {
      // Find the job by jobKey to get its ID
      const job = jobs.find(j => j.key === jobKey)
      
      if (job) {
        // Use job from list - we have all the data we need
        const date = typeof job.date === 'string' ? new Date(job.date) : job.date
        setSelectedJob({
          id: job.id,
          key: job.key,
          collectionDate: date,
          collectorName: job.collector,
          clientName: job.client,
          startTime: job.startTime,
          endTime: job.endTime,
          miles: job.miles,
          formCount: job.count,
        })
        setIsJobEditModalOpen(true)
      } else {
        // Job not in list, fetch it by jobKey (could be UUID or jobKey format)
        const encodedJobKey = encodeURIComponent(jobKey)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        let jobId = jobKey
        
        // If not a UUID, try to find by jobKey format using the old API endpoint
        if (!uuidRegex.test(jobKey)) {
          // Try to get job from old API endpoint first (for backward compatibility)
          const response = await fetch(`/api/jobs/${encodedJobKey}`)
          if (response.ok) {
            // This endpoint returns forms, not job details, so we need to find the job differently
            // We'll need to parse the jobKey to find the job
            const [dateStr, collectorName, clientName] = jobKey.split('|')
            if (dateStr && collectorName && clientName) {
              // Find job in our list by matching the components
              const foundJob = jobs.find(j => {
                const jDate = typeof j.date === 'string' ? new Date(j.date) : j.date
                const jDateStr = jDate.toISOString().split('T')[0]
                return jDateStr === dateStr && j.collector === collectorName && j.client === clientName
              })
              if (foundJob) {
                jobId = foundJob.id
              } else {
                throw new Error('Job not found in list')
              }
            } else {
              throw new Error('Invalid job key format')
            }
          } else {
            throw new Error('Failed to fetch job')
          }
        }
        
        // Fetch full job details using the job ID
        const response = await fetch(`/api/jobs/${jobId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch job details')
        }
        const data = await response.json()
        setSelectedJob(data.job)
        setIsJobEditModalOpen(true)
      }
    } catch (error) {
      console.error('Error opening job edit modal:', error)
      alert('Failed to load job details. Please try again.')
    }
  }

  const handleJobSave = () => {
    // Refresh jobs list and forms
    fetchJobs()
    fetchForms()
  }

  const exportToCSV = async () => {
    if (!jobKey) return

    setExportingCSV(true)
    try {
      // Fetch all CCF records for this job
      const encodedJobKey = encodeURIComponent(jobKey)
      const response = await fetch(`/api/jobs/${encodedJobKey}`)
      if (!response.ok) {
        throw new Error('Failed to fetch job records')
      }
      const data = await response.json()
      
      // Handle both jobKey format (returns forms) and UUID format (returns job metadata)
      let forms: CCFRecord[] = []
      if (data.forms) {
        // Direct forms response (jobKey format)
        forms = data.forms
      } else if (data.job) {
        // Job metadata response (UUID format) - fetch forms using the jobKey from metadata
        const jobKeyFromMetadata = data.job.key
        const encodedJobKeyFromMetadata = encodeURIComponent(jobKeyFromMetadata)
        const formsResponse = await fetch(`/api/jobs/${encodedJobKeyFromMetadata}`)
        if (!formsResponse.ok) {
          throw new Error('Failed to fetch forms for job')
        }
        const formsData = await formsResponse.json()
        forms = formsData.forms || []
      }

      if (forms.length === 0) {
        alert('No records found for this job to export.')
        return
      }

      // Define CSV headers
      const headers = [
        'CCF',
        'Donor',
        'Date',
        'Type of Test',
        'Project/Job Number',
        'Employer Name',
        'Donor DOB',
        'Donor Phone',
        'Collector First Name',
        'Collector Last Name',
        'Instant Oral Tox',
        'Created At',
        'Human Reviewed',
        'Form URL',
      ]

      // Convert forms to CSV rows
      const csvRows = forms.map((form: CCFRecord) => {
        const formatDate = (date: Date | string | null) => {
          if (!date) return ''
          const d = typeof date === 'string' ? new Date(date) : date
          return d.toISOString().split('T')[0] // YYYY-MM-DD format
        }

        const formatDateTime = (date: Date | string | null) => {
          if (!date) return ''
          const d = typeof date === 'string' ? new Date(date) : date
          return d.toISOString()
        }

        // Format donor name: "{FirstName} {LastName} ({LastFourSSN})"
        const donorName = [
          form.donorFirstName,
          form.donorLastName
        ].filter(Boolean).join(' ') || ''
        const donorSSN = form.donorLastFourSsn ? `(${form.donorLastFourSsn})` : ''
        const donorField = donorName && donorSSN 
          ? `${donorName} ${donorSSN}`
          : donorName || donorSSN || ''

        return [
          form.specimenId || '', // CCF
          donorField, // Donor
          formatDate(form.collectionDate), // Date
          form.typeOfTest || '',
          form.projectJobNumber || '',
          form.employerName || '',
          formatDate(form.donorDob),
          form.donorPhone || '',
          form.collectorFirstName || '',
          form.collectorLastName || '',
          form.instantOralTox || '',
          formatDateTime(form.createdAt),
          form.humanReviewed ? 'Yes' : 'No',
          form.formUrl || '',
        ]
      })

      // Escape CSV values (handle commas, quotes, newlines)
      const escapeCSV = (value: string) => {
        if (value === null || value === undefined) return ''
        const stringValue = String(value)
        // If value contains comma, quote, or newline, wrap in quotes and escape quotes
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }

      // Build CSV content
      const csvContent = [
        headers.map(escapeCSV).join(','),
        ...csvRows.map(row => row.map(escapeCSV).join(',')),
      ].join('\n')

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      // Generate filename: {Collection Date}-{Employer Name}-{Collector}
      const sanitizeForFilename = (str: string | null | undefined): string => {
        if (!str) return 'Unknown'
        return str.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      }

      let filename = 'ccf-export.csv'
      
      // Get collection date from job or first form
      const job = jobs.find(j => j.key === jobKey)
      let collectionDateStr = ''
      if (job) {
        const date = typeof job.date === 'string' ? new Date(job.date) : job.date
        collectionDateStr = date.toISOString().split('T')[0]
      } else if (forms.length > 0 && forms[0].collectionDate) {
        const date = typeof forms[0].collectionDate === 'string' 
          ? new Date(forms[0].collectionDate) 
          : forms[0].collectionDate
        collectionDateStr = date.toISOString().split('T')[0]
      }

      // Get employer name from first form
      const employerName = forms.length > 0 
        ? sanitizeForFilename(forms[0].employerName) 
        : 'Unknown'

      // Get collector name from job or first form
      let collectorName = 'Unknown'
      if (job) {
        collectorName = sanitizeForFilename(job.collector)
      } else if (forms.length > 0) {
        const collector = [forms[0].collectorFirstName, forms[0].collectorLastName]
          .filter(Boolean)
          .join(' ')
        collectorName = sanitizeForFilename(collector || 'Unknown')
      }

      if (collectionDateStr) {
        filename = `${collectionDateStr}-${employerName}-${collectorName}.csv`
      }

      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Failed to export CSV. Please try again.')
    } finally {
      setExportingCSV(false)
    }
  }

  const handleRowClick = (form: CCFRecord) => {
    // Navigate to edit page instead of opening modal
    router.push(`/dashboard/ccf-forms/${form.id}/edit`)
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A'
    // Use UTC methods to avoid timezone conversion issues
    const d = new Date(date)
    const year = d.getUTCFullYear()
    const month = d.getUTCMonth()
    const day = d.getUTCDate()
    // Create a date string using UTC values to avoid timezone shifts
    const dateStr = new Date(Date.UTC(year, month, day)).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
    return dateStr
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground" />
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3 w-3 ml-1 text-primary" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1 text-primary" />
    )
  }

  if (loading && forms.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-4">Loading records...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by specimen ID, donor, employer, collector..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filterReviewed || ''}
              onChange={(e) => handleFilterReviewed(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Status</option>
              <option value="false">Pending</option>
              <option value="true">Reviewed</option>
            </select>
            {filterReviewed && (
              <button
                onClick={() => handleFilterReviewed('')}
                className="p-1 text-muted-foreground hover:text-foreground"
                aria-label="Clear filter"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        {!initialJobKey && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground whitespace-nowrap">
              Filter by Job:
            </label>
            <select
              value={jobKey || ''}
              onChange={(e) => handleJobFilter(e.target.value)}
              disabled={loadingJobs}
              className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">All Jobs</option>
              {loadingJobs ? (
                <option value="" disabled>Loading jobs...</option>
              ) : (
                jobs.map((job) => (
                  <option key={job.key} value={job.key}>
                    {formatJobLabel(job)}
                  </option>
                ))
              )}
            </select>
            {jobKey && (
              <>
                <button
                  onClick={() => handleJobFilter('')}
                  className="p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Clear job filter"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  onClick={handleEditJob}
                  className="px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  title="Edit job metadata (start time, end time, miles)"
                >
                  <Calendar className="h-4 w-4" />
                  Edit Job
                </button>
                <button
                  onClick={exportToCSV}
                  disabled={exportingCSV}
                  className="px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  title="Export all CCF records for this job to CSV"
                >
                  <FileDown className="h-4 w-4" />
                  {exportingCSV ? 'Exporting...' : 'Export to CSV'}
                </button>
              </>
            )}
          </div>
        )}
        {initialJobKey && jobKey && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleEditJob}
              className="px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              title="Edit job metadata (start time, end time, miles)"
            >
              <Calendar className="h-4 w-4" />
              Edit Job
            </button>
            <button
              onClick={exportToCSV}
              disabled={exportingCSV}
              className="px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              title="Export all CCF records for this job to CSV"
            >
              <FileDown className="h-4 w-4" />
              {exportingCSV ? 'Exporting...' : 'Export to CSV'}
            </button>
          </div>
        )}
        {(search || filterReviewed || (jobKey && !initialJobKey)) && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSearch('')
                setFilterReviewed(undefined)
                if (!initialJobKey) {
                  setJobKey(undefined)
                }
                setPage(1)
              }}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('specimenId')}
                    className="flex items-center hover:text-foreground transition-colors"
                  >
                    Specimen ID
                    <SortIcon field="specimenId" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('donorFirstName')}
                    className="flex items-center hover:text-foreground transition-colors"
                  >
                    Donor
                    <SortIcon field="donorFirstName" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('employerName')}
                    className="flex items-center hover:text-foreground transition-colors"
                  >
                    Employer
                    <SortIcon field="employerName" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('collectionDate')}
                    className="flex items-center hover:text-foreground transition-colors"
                  >
                    Collection Date
                    <SortIcon field="collectionDate" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('createdAt')}
                    className="flex items-center hover:text-foreground transition-colors"
                  >
                    Created
                    <SortIcon field="createdAt" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('humanReviewed')}
                    className="flex items-center hover:text-foreground transition-colors"
                  >
                    Status
                    <SortIcon field="humanReviewed" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  PDF
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {forms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No CCF Records Found
                    </h3>
                    <p className="text-muted-foreground">
                      {search || filterReviewed || jobKey
                        ? 'Try adjusting your filters'
                        : 'Upload your first CCF form to get started.'}
                    </p>
                  </td>
                </tr>
              ) : (
                forms.map((form) => (
                  <tr
                    key={form.id}
                    onClick={() => handleRowClick(form)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 text-muted-foreground mr-2" />
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {form.specimenId || 'N/A'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {form.typeOfTest || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-muted-foreground mr-2" />
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {[form.donorFirstName, form.donorLastName].filter(Boolean).join(' ') || 'N/A'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            SSN: {form.donorLastFourSsn || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 text-muted-foreground mr-2" />
                        <div>
                          <div className="text-sm text-foreground">
                            {form.employerName || 'N/A'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Collector: {[form.collectorFirstName, form.collectorLastName].filter(Boolean).join(' ') || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                        <span className="text-sm text-foreground">
                          {formatDate(form.collectionDate)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(form.createdAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          form.humanReviewed
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                            : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                        }`}
                      >
                        {form.humanReviewed ? 'Reviewed' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {form.formUrl ? (
                        <a
                          href={form.formUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          View PDF
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">N/A</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card">
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to{' '}
            {Math.min(page * limit, total)} of {total} records
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="p-2 rounded-md border border-border bg-background text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="p-2 rounded-md border border-border bg-background text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Job Edit Modal */}
      <JobEditModal
        job={selectedJob}
        isOpen={isJobEditModalOpen}
        onClose={() => {
          setIsJobEditModalOpen(false)
          setSelectedJob(null)
        }}
        onSave={handleJobSave}
      />
    </div>
  )
}
