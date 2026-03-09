import { prisma } from './prisma'
import { Prisma } from '@prisma/client'

// Helper to check if Prisma is connected with retry logic
async function ensurePrismaConnection(retries = 3) {
  const maxRetries = retries
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Log connection attempt (both dev and prod for debugging)
      if (attempt === 1) {
        console.log('[Prisma] Attempting database connection...')
        console.log('[Prisma] Environment check:', {
          nodeEnv: process.env.NODE_ENV,
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          hasDirectUrl: !!process.env.DIRECT_URL,
          databaseUrlPreview: process.env.DATABASE_URL 
            ? `${process.env.DATABASE_URL.substring(0, 60)}...` 
            : 'NOT SET - Check Vercel environment variables!',
        })
      } else {
        console.log(`[Prisma] Retry attempt ${attempt}/${maxRetries}...`)
      }
      
      await prisma.$connect()
      console.log('[Prisma] Successfully connected to database')
      return // Success, exit the function
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      const errorMessage = lastError.message
      
      // Log error for debugging
      console.error(`[Prisma] Connection attempt ${attempt} failed:`, errorMessage)
      
      // If it's the last attempt, throw the error
      if (attempt === maxRetries) {
        // Log environment info for debugging
        console.error('Environment check:', {
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          hasDirectUrl: !!process.env.DIRECT_URL,
          nodeEnv: process.env.NODE_ENV,
          databaseUrlPreview: process.env.DATABASE_URL?.substring(0, 60) + '...',
        })
        
        // Provide more helpful error messages
        if (errorMessage.includes('Can\'t reach database server') || errorMessage.includes('Connection')) {
          throw new Error(
            'Cannot connect to database after ' + maxRetries + ' attempts. ' +
            'Check that DATABASE_URL is set in .env (e.g. your Neon connection string) and the database is reachable.'
          )
        }
        
        throw new Error(
          `Database connection failed after ${maxRetries} attempts: ${errorMessage}\n` +
          'Please check your DATABASE_URL environment variable in Vercel.'
        )
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000) // Max 5 seconds
      console.log(`[Prisma] Waiting ${delay}ms before retry...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

/**
 * Normalize a date to YYYY-MM-DD format (sets time to 00:00:00 UTC)
 */
function normalizeCollectionDate(date: Date | null | undefined): Date | null {
  if (!date) return null
  const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
  return new Date(dateStr + 'T00:00:00.000Z')
}

/**
 * Find or create a job based on collection date, collector name, and client name
 * Returns the job ID
 * For new schema: combines collectorFirstName and collectorLastName, uses employerName as clientName
 */
export async function findOrCreateJob(
  collectionDate: Date | null | undefined,
  collectorFirstName: string | null | undefined,
  collectorLastName: string | null | undefined,
  employerName: string | null | undefined
): Promise<string | null> {
  await ensurePrismaConnection()

  // Build collector name from first and last name
  const collectorName = [collectorFirstName, collectorLastName]
    .filter(Boolean)
    .join(' ')
    .trim() || null

  // Use employerName as clientName
  const clientName = employerName || null

  // If any required field is missing, return null (no job association)
  if (!collectionDate || !collectorName || !clientName) {
    return null
  }

  // Normalize the collection date to YYYY-MM-DD
  const normalizedDate = normalizeCollectionDate(collectionDate)
  if (!normalizedDate) {
    return null
  }

  // Try to find existing job
  const existingJob = await prisma.job.findUnique({
    where: {
      collectionDate_collectorName_clientName: {
        collectionDate: normalizedDate,
        collectorName: collectorName,
        clientName: clientName,
      },
    },
  })

  if (existingJob) {
    return existingJob.id
  }

  // Create new job if it doesn't exist
  const newJob = await prisma.job.create({
    data: {
      collectionDate: normalizedDate,
      collectorName: collectorName,
      clientName: clientName,
    },
  })

  return newJob.id
}

/**
 * Update job association for a CCF form when date/collector/employer changes
 * This handles reassigning forms to the correct job
 */
export async function updateJobAssociation(
  formId: string,
  collectionDate: Date | null | undefined,
  collectorFirstName: string | null | undefined,
  collectorLastName: string | null | undefined,
  employerName: string | null | undefined
): Promise<string | null> {
  await ensurePrismaConnection()

  // Find or create the appropriate job
  const jobId = await findOrCreateJob(collectionDate, collectorFirstName, collectorLastName, employerName)

  // Update the form's job association
  await prisma.cCFForm.update({
    where: { id: formId },
    data: { jobId },
  })

  return jobId
}

/**
 * Check if a CCF form already exists with the same donor name, collection date, and employer name
 * Returns the existing form ID if found, null otherwise
 * Uses donorFirstName + donorLastName and employerName for comparison
 */
export async function checkForDuplicateCCFForm(
  donorFirstName: string | null | undefined,
  donorLastName: string | null | undefined,
  dateOfCollection: Date | null | undefined,
  employerName: string | null | undefined
): Promise<string | null> {
  await ensurePrismaConnection()

  // Build donor name from first and last name
  const donorFullName = [donorFirstName, donorLastName]
    .filter(Boolean)
    .join(' ')
    .trim()

  // If donor name is missing, we can't check for duplicates
  if (!donorFullName) {
    return null
  }

  // Normalize the collection date to YYYY-MM-DD for comparison
  const normalizedDate = normalizeCollectionDate(dateOfCollection)

  // Build the where clause with case-insensitive matching (PostgreSQL)
  const andConditions: Prisma.CCFFormWhereInput[] = [
    {
      OR: [
        { donorFirstName: { equals: donorFirstName || '', mode: 'insensitive' } },
        { donorLastName: { equals: donorLastName || '', mode: 'insensitive' } },
      ],
    },
  ]

  // Add date condition if we have a date
  if (normalizedDate) {
    const startOfDay = normalizedDate
    const endOfDay = new Date(startOfDay)
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1)

    andConditions.push({
      collectionDate: {
        gte: startOfDay,
        lt: endOfDay,
      },
    })
  } else {
    andConditions.push({ collectionDate: null })
  }

  // Add employer name condition with case-insensitive matching
  if (employerName && employerName.trim() !== '') {
    andConditions.push({
      employerName: {
        equals: employerName.trim(),
        mode: 'insensitive',
      },
    })
  } else {
    andConditions.push({ employerName: null })
  }

  const where: Prisma.CCFFormWhereInput = {
    AND: andConditions,
  }

  // Find the first matching record
  const existingForm = await prisma.cCFForm.findFirst({
    where,
    select: {
      id: true,
    },
  })

  return existingForm?.id || null
}

/**
 * Save extracted CCF form data to the database
 * Uses new simplified field structure
 */
export async function saveCCFFormToDatabase(
  extractedData: Record<string, unknown>,
  formUrl?: string | null
): Promise<string> {
  // Ensure database connection
  await ensurePrismaConnection()

  // Parse date fields
  const parseDate = (dateValue: unknown): Date | null => {
    if (!dateValue) return null
    if (dateValue instanceof Date) return dateValue
    if (typeof dateValue === 'string') {
      const parsed = new Date(dateValue)
      return isNaN(parsed.getTime()) ? null : parsed
    }
    return null
  }

  // Extract job-related fields
  const collectionDate = parseDate(extractedData.collectionDate)
  const collectorFirstName = (extractedData.collectorFirstName as string) || null
  const collectorLastName = (extractedData.collectorLastName as string) || null
  const employerName = (extractedData.employerName as string) || null

  // Find or create job association
  const jobId = await findOrCreateJob(
    collectionDate,
    collectorFirstName,
    collectorLastName,
    employerName
  )

  // Create the CCF form with new fields
  const ccfForm = await prisma.cCFForm.create({
    data: {
      // New fields (all optional)
      specimenId: (extractedData.specimenId as string) || null,
      collectionDate: collectionDate,
      typeOfTest: (extractedData.typeOfTest as string) || null,
      projectJobNumber: (extractedData.projectJobNumber as string) || null,
      employerName: employerName,
      donorFirstName: (extractedData.donorFirstName as string) || null,
      donorLastName: (extractedData.donorLastName as string) || null,
      donorLastFourSsn: (extractedData.donorLastFourSsn as string) || null,
      donorDob: parseDate(extractedData.donorDob),
      donorPhone: (extractedData.donorPhone as string) || null,
      collectorFirstName: collectorFirstName,
      collectorLastName: collectorLastName,
      instantOralTox: (extractedData.instantOralTox as string) || null,

      // PDF storage URL
      formUrl: formUrl || null,
      
      // Job association
      jobId: jobId || null,
    },
  })

  return ccfForm.id
}

/**
 * Get all CCF forms (simplified - no relations needed)
 */
export async function getAllCCFForms() {
  await ensurePrismaConnection()

  const forms = await prisma.cCFForm.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  })

  return forms
}

/**
 * Get unique jobs from the Job table with form counts
 */
export async function getUniqueJobs() {
  await ensurePrismaConnection()

  // Get all jobs with their form counts
  const jobs = await prisma.job.findMany({
    include: {
      _count: {
        select: { forms: true },
      },
    },
    orderBy: {
      collectionDate: 'desc',
    },
  })

  // Convert to the expected format with jobKey
  return jobs.map((job) => {
    const dateStr = job.collectionDate.toISOString().split('T')[0] // YYYY-MM-DD
    const jobKey = `${dateStr}|${job.collectorName}|${job.clientName}`
    return {
      key: jobKey,
      id: job.id,
      date: job.collectionDate,
      collector: job.collectorName,
      client: job.clientName,
      count: job._count.forms,
      startTime: job.startTime,
      endTime: job.endTime,
      miles: job.miles ? job.miles.toNumber() : null,
    }
  })
}

/**
 * Get jobs with pagination and filters
 */
export async function getJobsWithPagination(options: {
  page: number
  limit: number
  search?: string
  dateFrom?: string // YYYY-MM-DD
  dateTo?: string // YYYY-MM-DD
}) {
  await ensurePrismaConnection()

  const { page, limit, search, dateFrom, dateTo } = options
  const skip = (page - 1) * limit

  // Build where clause
  const where: Record<string, unknown> = {}
  const andConditions: unknown[] = []

  // Search filter - search in collector name, client name (case-insensitive)
  if (search) {
    andConditions.push({
      OR: [
        { collectorName: { contains: search, mode: 'insensitive' } },
        { clientName: { contains: search, mode: 'insensitive' } },
      ],
    })
  }

  // Date range filter
  if (dateFrom || dateTo) {
    const dateFilter: Record<string, unknown> = {}
    if (dateFrom) {
      const fromDate = normalizeCollectionDate(new Date(dateFrom + 'T00:00:00.000Z'))
      if (fromDate) {
        dateFilter.gte = fromDate
      }
    }
    if (dateTo) {
      const toDate = normalizeCollectionDate(new Date(dateTo + 'T23:59:59.999Z'))
      if (toDate) {
        dateFilter.lte = toDate
      }
    }
    if (Object.keys(dateFilter).length > 0) {
      andConditions.push({ collectionDate: dateFilter })
    }
  }

  // Add AND conditions if any
  if (andConditions.length > 0) {
    where.AND = andConditions
  }

  // Get total count with filters
  const total = await prisma.job.count({ where })

  // Get paginated jobs with their form counts
  const jobs = await prisma.job.findMany({
    where,
    include: {
      _count: {
        select: { forms: true },
      },
    },
    orderBy: {
      collectionDate: 'desc',
    },
    skip,
    take: limit,
  })

  // Convert to the expected format with jobKey
  const formattedJobs = jobs.map((job) => {
    const dateStr = job.collectionDate.toISOString().split('T')[0] // YYYY-MM-DD
    const jobKey = `${dateStr}|${job.collectorName}|${job.clientName}`
    return {
      key: jobKey,
      id: job.id,
      date: job.collectionDate,
      collector: job.collectorName,
      client: job.clientName,
      count: job._count.forms,
      startTime: job.startTime,
      endTime: job.endTime,
      miles: job.miles ? job.miles.toNumber() : null,
    }
  })

  const totalPages = Math.ceil(total / limit)

  return {
    jobs: formattedJobs,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  }
}

/**
 * Get all CCF forms for a specific job (no pagination)
 * Can accept either a jobKey (string) or jobId (string)
 */
export async function getAllCCFFormsForJob(jobKey: string) {
  await ensurePrismaConnection()

  // Try to find job by ID first (if jobKey is a UUID)
  let job = null
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(jobKey)) {
    job = await prisma.job.findUnique({
      where: { id: jobKey },
    })
  }

  // If not found by ID, try to parse as jobKey format
  if (!job) {
    const [dateStr, collectorName, clientName] = jobKey.split('|')
    if (!dateStr || !collectorName || !clientName) {
      throw new Error('Invalid job key format')
    }

    // Parse the date string (YYYY-MM-DD) to a Date (normalized)
    const normalizedDate = normalizeCollectionDate(new Date(dateStr + 'T00:00:00.000Z'))

    // Find job by unique constraint
    job = await prisma.job.findUnique({
      where: {
        collectionDate_collectorName_clientName: {
          collectionDate: normalizedDate!,
          collectorName: collectorName,
          clientName: clientName,
        },
      },
    })
  }

  if (!job) {
    throw new Error('Job not found')
  }

  // Fetch all forms for this job using jobId
  const forms = await prisma.cCFForm.findMany({
    where: {
      jobId: job.id,
    },
    orderBy: {
      collectionDate: 'asc',
    },
  })

  return forms
}

/**
 * Get CCF forms with pagination, filtering, and sorting
 */
export async function getCCFFormsWithFilters(options: {
  page: number
  limit: number
  sortBy: string
  sortOrder: 'asc' | 'desc'
  search?: string
  filterReviewed?: boolean
  jobKey?: string // Format: "YYYY-MM-DD|collectorName|clientName"
}) {
  await ensurePrismaConnection()

  const { page, limit, sortBy, sortOrder, search, filterReviewed, jobKey } =
    options
  const skip = (page - 1) * limit

  // Build where clause
  const where: Record<string, unknown> = {}
  const andConditions: unknown[] = []

  // Job filter - find job by jobKey and filter by jobId
  if (jobKey) {
    // Try to find job by ID first (if jobKey is a UUID)
    let job = null
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(jobKey)) {
      job = await prisma.job.findUnique({
        where: { id: jobKey },
      })
    }

    // If not found by ID, try to parse as jobKey format
    if (!job) {
      const [dateStr, collectorName, clientName] = jobKey.split('|')
      if (dateStr && collectorName && clientName) {
        // Parse the date string (YYYY-MM-DD) to a Date (normalized)
        const normalizedDate = normalizeCollectionDate(new Date(dateStr + 'T00:00:00.000Z'))

        // Find job by unique constraint
        job = await prisma.job.findUnique({
          where: {
            collectionDate_collectorName_clientName: {
              collectionDate: normalizedDate!,
              collectorName: collectorName,
              clientName: clientName,
            },
          },
        })
      }
    }

    if (job) {
      // Filter by jobId
      andConditions.push({ jobId: job.id })
    } else {
      // Job not found, return empty results
      andConditions.push({ jobId: null })
    }
  }

  // Search filter (case-insensitive)
  if (search) {
    const searchCondition = {
      OR: [
        { specimenId: { contains: search, mode: 'insensitive' } },
        { typeOfTest: { contains: search, mode: 'insensitive' } },
        { projectJobNumber: { contains: search, mode: 'insensitive' } },
        { employerName: { contains: search, mode: 'insensitive' } },
        { donorFirstName: { contains: search, mode: 'insensitive' } },
        { donorLastName: { contains: search, mode: 'insensitive' } },
        { donorLastFourSsn: { contains: search, mode: 'insensitive' } },
        { donorPhone: { contains: search, mode: 'insensitive' } },
        { collectorFirstName: { contains: search, mode: 'insensitive' } },
        { collectorLastName: { contains: search, mode: 'insensitive' } },
        { instantOralTox: { contains: search, mode: 'insensitive' } },
      ],
    }

    // If we have job filter, combine with AND
    if (andConditions.length > 0) {
      andConditions.push(searchCondition)
    } else {
      where.OR = searchCondition.OR
    }
  }

  // Reviewed filter
  if (filterReviewed !== undefined) {
    const reviewedCondition = { humanReviewed: filterReviewed }

    // If we have job filter, combine with AND
    if (andConditions.length > 0) {
      andConditions.push(reviewedCondition)
    } else {
      where.humanReviewed = filterReviewed
    }
  }

  // Add AND conditions if any
  if (andConditions.length > 0) {
    where.AND = andConditions
  }

  // Build orderBy clause - map UI field names to database field names
  const orderBy: Record<string, 'asc' | 'desc'> = {}
  const fieldMap: Record<string, string> = {
    specimenId: 'specimenId',
    donorFirstName: 'donorFirstName',
    donorLastName: 'donorLastName',
    employerName: 'employerName',
    collectionDate: 'collectionDate',
    createdAt: 'createdAt',
    humanReviewed: 'humanReviewed',
  }
  const dbField = fieldMap[sortBy] || 'createdAt'
  orderBy[dbField] = sortOrder

  // Get total count for pagination
  const total = await prisma.cCFForm.count({ where })

  // Fetch paginated results
  const forms = await prisma.cCFForm.findMany({
    where,
    orderBy,
    skip,
    take: limit,
  })

  return {
    forms,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Update a CCF form
 */
export async function updateCCFForm(
  id: string,
  data: Partial<Record<string, unknown>>
): Promise<unknown> {
  await ensurePrismaConnection()

  // Parse date fields
  const parseDate = (dateValue: unknown): Date | null => {
    if (!dateValue) return null
    if (dateValue instanceof Date) return dateValue
    if (typeof dateValue === 'string') {
      const parsed = new Date(dateValue)
      return isNaN(parsed.getTime()) ? null : parsed
    }
    return null
  }

  // Get current form to check if job-related fields are changing
  const currentForm = await prisma.cCFForm.findUnique({
    where: { id },
    select: {
      collectionDate: true,
      collectorFirstName: true,
      collectorLastName: true,
      employerName: true,
    },
  })

  if (!currentForm) {
    throw new Error('CCF form not found')
  }

  // Check if any job-related fields are being updated
  const collectionDate = data.collectionDate !== undefined
    ? parseDate(data.collectionDate)
    : currentForm.collectionDate
  const collectorFirstName = data.collectorFirstName !== undefined
    ? (data.collectorFirstName as string) || null
    : currentForm.collectorFirstName
  const collectorLastName = data.collectorLastName !== undefined
    ? (data.collectorLastName as string) || null
    : currentForm.collectorLastName
  const employerName = data.employerName !== undefined
    ? (data.employerName as string) || null
    : currentForm.employerName

  // Check if job association needs to be updated
  const jobFieldsChanged =
    data.collectionDate !== undefined ||
    data.collectorFirstName !== undefined ||
    data.collectorLastName !== undefined ||
    data.employerName !== undefined

  // Build update data object
  const updateData: Record<string, unknown> = {}

  // New fields (all optional)
  if (data.specimenId !== undefined) updateData.specimenId = data.specimenId || null
  if (data.collectionDate !== undefined)
    updateData.collectionDate = parseDate(data.collectionDate)
  if (data.typeOfTest !== undefined)
    updateData.typeOfTest = data.typeOfTest || null
  if (data.projectJobNumber !== undefined)
    updateData.projectJobNumber = data.projectJobNumber || null
  if (data.employerName !== undefined)
    updateData.employerName = data.employerName || null
  if (data.donorFirstName !== undefined)
    updateData.donorFirstName = data.donorFirstName || null
  if (data.donorLastName !== undefined)
    updateData.donorLastName = data.donorLastName || null
  if (data.donorLastFourSsn !== undefined)
    updateData.donorLastFourSsn = data.donorLastFourSsn || null
  if (data.donorDob !== undefined)
    updateData.donorDob = parseDate(data.donorDob)
  if (data.donorPhone !== undefined)
    updateData.donorPhone = data.donorPhone || null
  if (data.collectorFirstName !== undefined)
    updateData.collectorFirstName = data.collectorFirstName || null
  if (data.collectorLastName !== undefined)
    updateData.collectorLastName = data.collectorLastName || null
  if (data.instantOralTox !== undefined)
    updateData.instantOralTox = data.instantOralTox || null

  // Review fields
  if (data.humanReviewed !== undefined)
    updateData.humanReviewed = data.humanReviewed ?? false

  // PDF storage URL (read-only, but included for completeness)
  if (data.formUrl !== undefined) updateData.formUrl = data.formUrl || null

  // Update job association if job-related fields changed
  if (jobFieldsChanged) {
    const jobId = await findOrCreateJob(
      collectionDate,
      collectorFirstName,
      collectorLastName,
      employerName
    )
    updateData.jobId = jobId
  }

  // Update the form
  const updatedForm = await prisma.cCFForm.update({
    where: { id },
    data: updateData,
  })

  return updatedForm
}

/**
 * Get a single CCF form by ID
 */
export async function getCCFFormById(id: string) {
  await ensurePrismaConnection()

  const form = await prisma.cCFForm.findUnique({
    where: { id },
  })

  return form
}

/**
 * Get a single job by ID
 */
export async function getJobById(id: string) {
  await ensurePrismaConnection()

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      _count: {
        select: { forms: true },
      },
    },
  })

  return job
}

/**
 * Delete a CCF form by ID
 */
export async function deleteCCFForm(id: string) {
  await ensurePrismaConnection()

  // Check if form exists
  const form = await prisma.cCFForm.findUnique({
    where: { id },
  })

  if (!form) {
    throw new Error('CCF form not found')
  }

  // Delete the form (job association will be handled by onDelete: SetNull)
  await prisma.cCFForm.delete({
    where: { id },
  })

  return { success: true }
}

/**
 * Update job metadata (startTime, endTime, miles)
 */
export async function updateJob(
  id: string,
  data: {
    startTime?: Date | null
    endTime?: Date | null
    miles?: number | null
  }
) {
  await ensurePrismaConnection()

  const updateData: {
    startTime?: Date | null
    endTime?: Date | null
    miles?: number | null
  } = {}

  if (data.startTime !== undefined) {
    updateData.startTime = data.startTime
  }
  if (data.endTime !== undefined) {
    updateData.endTime = data.endTime
  }
  if (data.miles !== undefined) {
    updateData.miles = data.miles
  }

  const updatedJob = await prisma.job.update({
    where: { id },
    data: updateData,
    include: {
      _count: {
        select: { forms: true },
      },
    },
  })

  return updatedJob
}
