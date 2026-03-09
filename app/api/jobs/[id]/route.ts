import { NextRequest, NextResponse } from 'next/server'
import { getJobById, updateJob, getAllCCFFormsForJob } from '@/lib/db-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const decodedId = decodeURIComponent(id)
    
    // Check if this is a request for forms (jobKey format) or job metadata (UUID)
    // If it contains a pipe, it's a jobKey; if it's a UUID, it's an ID
    const isJobKey = decodedId.includes('|')
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedId)
    
    // If it's a jobKey format, return forms (backward compatibility)
    if (isJobKey) {
      console.log('=== Fetching all CCF records for job ===')
      console.log('Job Key:', decodedId)

      // Get all forms for this job
      const forms = await getAllCCFFormsForJob(decodedId)

      console.log(`Found ${forms.length} records for job: ${decodedId}`)
      console.log('Records:')
      forms.forEach((form, index) => {
        const donorName = [form.donorFirstName, form.donorLastName].filter(Boolean).join(' ') || 'N/A'
        const collectorName = [form.collectorFirstName, form.collectorLastName].filter(Boolean).join(' ') || 'N/A'
        console.log(`\n[${index + 1}] Record ID: ${form.id}`)
        console.log(`    Specimen ID: ${form.specimenId || 'N/A'}`)
        console.log(`    Donor: ${donorName}`)
        console.log(`    Collection Date: ${form.collectionDate || 'N/A'}`)
        console.log(`    Employer: ${form.employerName || 'N/A'}`)
        console.log(`    Collector: ${collectorName}`)
        console.log(`    Reviewed: ${form.humanReviewed}`)
      })
      console.log('=======================================')

      return NextResponse.json({
        success: true,
        jobKey: decodedId,
        count: forms.length,
        forms,
      })
    }
    
    // Otherwise, treat as job ID and return job metadata
    // Try to find by ID first (UUID)
    let job = null
    if (isUUID) {
      job = await getJobById(decodedId)
    } else {
      // If not a UUID, try to parse as jobKey format and find the job
      const [dateStr, collectorName, clientName] = decodedId.split('|')
      if (dateStr && collectorName && clientName) {
        // Use getAllCCFFormsForJob which will find the job, then get job details
        try {
          const forms = await getAllCCFFormsForJob(decodedId)
          if (forms.length > 0 && forms[0].jobId) {
            job = await getJobById(forms[0].jobId)
          }
        } catch (error) {
          // If that fails, job will remain null
        }
      }
    }

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Format the response
    const dateStr = job.collectionDate.toISOString().split('T')[0] // YYYY-MM-DD
    const jobKey = `${dateStr}|${job.collectorName}|${job.clientName}`

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        key: jobKey,
        collectionDate: job.collectionDate,
        collectorName: job.collectorName,
        clientName: job.clientName,
        startTime: job.startTime,
        endTime: job.endTime,
        miles: job.miles ? job.miles.toNumber() : null,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        formCount: job._count.forms,
      },
    })
  } catch (error: unknown) {
    console.error('Error fetching job:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Parse date fields if provided
    const parseDate = (dateValue: unknown): Date | null => {
      if (dateValue === null || dateValue === undefined) return null
      if (dateValue instanceof Date) return dateValue
      if (typeof dateValue === 'string') {
        if (dateValue === '') return null
        const parsed = new Date(dateValue)
        return isNaN(parsed.getTime()) ? null : parsed
      }
      return null
    }

    // Parse miles if provided
    const parseMiles = (milesValue: unknown): number | null => {
      if (milesValue === null || milesValue === undefined) return null
      if (typeof milesValue === 'number') return milesValue
      if (typeof milesValue === 'string') {
        if (milesValue === '') return null
        const parsed = parseFloat(milesValue)
        return isNaN(parsed) ? null : parsed
      }
      return null
    }

    // Build update data
    const updateData: {
      startTime?: Date | null
      endTime?: Date | null
      miles?: number | null
    } = {}

    if (body.startTime !== undefined) {
      updateData.startTime = parseDate(body.startTime)
    }
    if (body.endTime !== undefined) {
      updateData.endTime = parseDate(body.endTime)
    }
    if (body.miles !== undefined) {
      updateData.miles = parseMiles(body.miles)
    }

    // Update the job
    const updatedJob = await updateJob(id, updateData)

    // Format the response
    const dateStr = updatedJob.collectionDate.toISOString().split('T')[0] // YYYY-MM-DD
    const jobKey = `${dateStr}|${updatedJob.collectorName}|${updatedJob.clientName}`

    return NextResponse.json({
      success: true,
      job: {
        id: updatedJob.id,
        key: jobKey,
        collectionDate: updatedJob.collectionDate,
        collectorName: updatedJob.collectorName,
        clientName: updatedJob.clientName,
        startTime: updatedJob.startTime,
        endTime: updatedJob.endTime,
        miles: updatedJob.miles ? updatedJob.miles.toNumber() : null,
        createdAt: updatedJob.createdAt,
        updatedAt: updatedJob.updatedAt,
        formCount: updatedJob._count.forms,
      },
    })
  } catch (error: unknown) {
    console.error('Error updating job:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

