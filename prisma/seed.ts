import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

// Load .env so DATABASE_URL (Neon) is available when running: npm run db:seed
config()

const prisma = new PrismaClient()

// Helper function to generate random data
function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function randomPhone(): string {
  return `(555) ${Math.floor(Math.random() * 900) + 100}-${
    Math.floor(Math.random() * 9000) + 1000
  }`
}

function randomSSNLastFour(): string {
  return `${Math.floor(Math.random() * 9000) + 1000}`
}

async function main() {
  console.log('🌱 Starting database seed...')

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log('🗑️  Clearing existing data...')
  await prisma.cCFForm.deleteMany({})
  await prisma.job.deleteMany({})
  console.log('✅ Cleared existing data')

  // Data pools for generating varied records
  const firstNames = [
    'John',
    'Jane',
    'Robert',
    'Sarah',
    'Michael',
    'Emily',
    'David',
    'Jessica',
    'James',
    'Amanda',
    'William',
    'Lisa',
    'Richard',
    'Jennifer',
    'Joseph',
    'Michelle',
    'Thomas',
    'Patricia',
    'Christopher',
    'Linda',
  ]
  const lastNames = [
    'Smith',
    'Johnson',
    'Williams',
    'Brown',
    'Jones',
    'Garcia',
    'Miller',
    'Davis',
    'Rodriguez',
    'Martinez',
    'Hernandez',
    'Lopez',
    'Wilson',
    'Anderson',
    'Thomas',
    'Taylor',
    'Moore',
    'Jackson',
    'Martin',
    'Lee',
  ]
  const employerNames = [
    'ABC Corporation',
    'XYZ Industries',
    'Global Enterprises',
    'Tech Solutions Inc',
    'Manufacturing Co',
    'Industrial Services',
    'Corporate Solutions',
    'Enterprise Group',
    'Premier Industries',
    'Advanced Systems',
  ]
  const typeOfTests = [
    'Pre-employment',
    'Random',
    'Post-accident',
    'Reasonable suspicion',
    'Return to duty',
    'Follow-up',
    'Periodic',
    'Post-treatment',
  ]
  const instantOralToxOptions = [
    'Negative',
    'Positive',
    'Not Performed',
    null,
  ]

  // Record count: default 50, or set SEED_RECORD_COUNT in .env for more/fewer
  const recordCount = Math.max(1, parseInt(process.env.SEED_RECORD_COUNT ?? '50', 10) || 50)
  console.log(`📝 Generating ${recordCount} CCF forms with job groupings...`)

  // Helper function to create UTC dates (ensures consistent job grouping)
  // Job grouping uses YYYY-MM-DD format from toISOString(), so we need UTC dates
  const createUTCDate = (year: number, month: number, day: number): Date => {
    return new Date(Date.UTC(year, month, day, 12, 0, 0, 0)) // Noon UTC to avoid timezone issues
  }

  // Define some jobs (date, collector, client combinations)
  // Using UTC dates ensures consistent job grouping regardless of server timezone
  const jobDefinitions = [
    {
      date: createUTCDate(2024, 0, 15), // Jan 15, 2024
      collector: 'Sarah Johnson',
      client: 'ABC Corporation',
      count: 8, // 8 forms in this job
    },
    {
      date: createUTCDate(2024, 0, 20), // Jan 20, 2024
      collector: 'Emily Davis',
      client: 'XYZ Industries',
      count: 5, // 5 forms in this job
    },
    {
      date: createUTCDate(2024, 1, 1), // Feb 1, 2024
      collector: 'Jennifer White',
      client: 'Global Enterprises',
      count: 6, // 6 forms in this job
    },
    {
      date: createUTCDate(2024, 1, 10), // Feb 10, 2024
      collector: 'Sarah Johnson',
      client: 'ABC Corporation',
      count: 4, // 4 forms in this job (same collector/client, different date)
    },
    {
      date: createUTCDate(2023, 11, 10), // Dec 10, 2023
      collector: 'Christopher Martinez',
      client: 'Manufacturing Co',
      count: 7, // 7 forms in this job
    },
    {
      date: createUTCDate(2024, 2, 5), // Mar 5, 2024
      collector: 'Patricia Taylor',
      client: 'Tech Solutions Inc',
      count: 5, // 5 forms in this job
    },
  ]

  // Helper function to normalize date to YYYY-MM-DD (sets time to 00:00:00 UTC)
  const normalizeCollectionDate = (date: Date): Date => {
    const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
    return new Date(dateStr + 'T00:00:00.000Z')
  }

  // Helper function to split name into first and last
  const splitName = (fullName: string): { firstName: string; lastName: string } => {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' }
    }
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
    }
  }

  // Create Job records first
  console.log('📦 Creating Job records...')
  const createdJobs = new Map<string, { id: string; job: typeof jobDefinitions[0] }>()
  
  for (const job of jobDefinitions) {
    const normalizedDate = normalizeCollectionDate(job.date)
    const createdJob = await prisma.job.create({
      data: {
        collectionDate: normalizedDate,
        collectorName: job.collector,
        clientName: job.client,
        // Add some sample metadata for some jobs
        startTime: job.count > 5 ? new Date(normalizedDate.getTime() + 8 * 60 * 60 * 1000) : null, // 8 AM
        endTime: job.count > 5 ? new Date(normalizedDate.getTime() + 17 * 60 * 60 * 1000) : null, // 5 PM
        miles: job.count > 5 ? Math.floor(Math.random() * 200) + 50 : null, // 50-250 miles
      },
    })
    const jobKey = `${normalizedDate.toISOString().split('T')[0]}|${job.collector}|${job.client}`
    createdJobs.set(jobKey, { id: createdJob.id, job })
  }
  console.log(`✅ Created ${createdJobs.size} Job records`)

  const dummyForms = []
  let formIndex = 1

  // First, create forms for defined jobs
  for (const job of jobDefinitions) {
    const normalizedDate = normalizeCollectionDate(job.date)
    const jobKey = `${normalizedDate.toISOString().split('T')[0]}|${job.collector}|${job.client}`
    const jobRecord = createdJobs.get(jobKey)
    if (!jobRecord) {
      throw new Error(`Job record not found for key: ${jobKey}`)
    }

    const collectorNameParts = splitName(job.collector)

    for (let j = 0; j < job.count; j++) {
      const donorFirstName = randomElement(firstNames)
      const donorLastName = randomElement(lastNames)

      // Vary the time within the same day
      // Important: Keep the same UTC date to ensure proper job grouping
      const hour = 9 + (j % 8)
      const minute = (j * 7) % 60
      const collectionDate = new Date(job.date)
      // Set UTC hours to avoid timezone shifts that could change the date
      collectionDate.setUTCHours(hour, minute, 0, 0)

      const isReviewed = formIndex % 3 !== 0 // 2/3 reviewed, 1/3 pending
      const year = collectionDate.getFullYear()
      const specimenId = `SP-${year}-${String(formIndex).padStart(3, '0')}`
      const projectJobNumber = `PJ-${year}-${String(formIndex).padStart(3, '0')}`

      dummyForms.push({
        specimenId,
        collectionDate,
        typeOfTest: randomElement(typeOfTests),
        projectJobNumber,
        employerName: job.client,
        donorFirstName,
        donorLastName,
        donorLastFourSsn: formIndex % 5 === 0 ? null : randomSSNLastFour(), // 80% have SSN
        donorDob: new Date(
          1970 + (formIndex % 40),
          formIndex % 12,
          (formIndex % 28) + 1
        ), // Ages 24-64
        donorPhone: formIndex % 4 === 0 ? null : randomPhone(), // 75% have phone
        collectorFirstName: collectorNameParts.firstName,
        collectorLastName: collectorNameParts.lastName,
        instantOralTox: randomElement(instantOralToxOptions),
        humanReviewed: isReviewed,
        humanReviewedAt: isReviewed
          ? new Date(
              collectionDate.getTime() +
                (2 + (formIndex % 3)) * 24 * 60 * 60 * 1000
            )
          : null,
        humanReviewedBy: isReviewed ? 'system' : null,
        formUrl: null,
        // Associate form with job
        jobId: jobRecord.id,
      })

      formIndex++
    }
  }

  // Then create remaining standalone forms (some will get jobs, some won't)
  const remainingCount = recordCount - dummyForms.length
  console.log(
    `   Creating ${jobDefinitions.length} jobs with ${dummyForms.length} forms, plus ${remainingCount} standalone forms...`
  )

  for (let i = 0; i < remainingCount; i++) {
    // Some standalone forms will have all job fields (and get a job), some won't
    const hasAllJobFields = i % 3 !== 0 // 2/3 will have all fields
    const donorFirstName = randomElement(firstNames)
    const donorLastName = randomElement(lastNames)
    const year = 2023 + (formIndex % 2) // Mix of 2023 and 2024
    const month = (formIndex % 12) + 1
    const day = (formIndex % 28) + 1
    // Use UTC dates for standalone forms too, to ensure consistency
    const collectionDate = createUTCDate(year, month - 1, day)
    collectionDate.setUTCHours(9 + (formIndex % 8), (formIndex * 5) % 60, 0, 0)
    const isReviewed = formIndex % 3 !== 0 // 2/3 reviewed, 1/3 pending
    const specimenId = `SP-${year}-${String(formIndex).padStart(3, '0')}`
    const projectJobNumber = `PJ-${year}-${String(formIndex).padStart(3, '0')}`

    const employerName = hasAllJobFields
      ? randomElement(employerNames)
      : i % 8 === 0
      ? null
      : randomElement(employerNames)

    const collectorFirstName = hasAllJobFields
      ? randomElement(firstNames)
      : i % 6 === 0
      ? null
      : randomElement(firstNames)
    const collectorLastName = hasAllJobFields
      ? randomElement(lastNames)
      : i % 6 === 0
      ? null
      : randomElement(lastNames)

    dummyForms.push({
      specimenId,
      collectionDate: i % 10 === 0 ? null : collectionDate, // 90% have collection date
      typeOfTest: i % 5 === 0 ? null : randomElement(typeOfTests), // 80% have test type
      projectJobNumber: i % 6 === 0 ? null : projectJobNumber, // 83% have job number
      employerName,
      donorFirstName: i % 7 === 0 ? null : donorFirstName, // 86% have first name
      donorLastName: i % 7 === 0 ? null : donorLastName, // 86% have last name
      donorLastFourSsn: i % 5 === 0 ? null : randomSSNLastFour(), // 80% have SSN
      donorDob: i % 6 === 0 ? null : new Date(1970 + (i % 40), i % 12, (i % 28) + 1), // 83% have DOB
      donorPhone: i % 4 === 0 ? null : randomPhone(), // 75% have phone
      collectorFirstName,
      collectorLastName,
      instantOralTox: randomElement(instantOralToxOptions),
      humanReviewed: isReviewed,
      humanReviewedAt: isReviewed
        ? new Date(
            collectionDate.getTime() + (2 + (i % 3)) * 24 * 60 * 60 * 1000
          )
        : null,
      humanReviewedBy: isReviewed ? 'system' : null,
      formUrl: null,
      // Associate with job if all job fields are present
      jobId: null, // Will be set after creating jobs for standalone forms
    })
  }

  // Create jobs for standalone forms that have all required fields
  console.log('📦 Creating additional Job records for standalone forms...')
  const standaloneFormsWithJobFields = dummyForms
    .slice(jobDefinitions.reduce((sum, j) => sum + j.count, 0))
    .filter(
      (form) =>
        form.collectionDate &&
        form.collectorFirstName &&
        form.collectorLastName &&
        form.employerName
    )

  // Group standalone forms by job key and create jobs
  const standaloneJobMap = new Map<string, Array<typeof dummyForms[0]>>()
  for (const form of standaloneFormsWithJobFields) {
    const normalizedDate = normalizeCollectionDate(form.collectionDate!)
    const collectorFullName = `${form.collectorFirstName} ${form.collectorLastName}`
    const jobKey = `${normalizedDate.toISOString().split('T')[0]}|${collectorFullName}|${form.employerName}`
    
    if (!standaloneJobMap.has(jobKey)) {
      standaloneJobMap.set(jobKey, [])
    }
    standaloneJobMap.get(jobKey)!.push(form)
  }

  // Create jobs for standalone forms
  for (const [jobKey, forms] of standaloneJobMap.entries()) {
    const [dateStr, collectorName, clientName] = jobKey.split('|')
    const normalizedDate = normalizeCollectionDate(new Date(dateStr + 'T00:00:00.000Z'))
    
    const createdJob = await prisma.job.create({
      data: {
        collectionDate: normalizedDate,
        collectorName: collectorName,
        clientName: clientName,
      },
    })
    
    // Update forms with jobId
    for (const form of forms) {
      const formIndex = dummyForms.indexOf(form)
      if (formIndex !== -1) {
        dummyForms[formIndex].jobId = createdJob.id
      }
    }
  }
  console.log(`✅ Created ${standaloneJobMap.size} additional Job records`)

  // Batch create for better performance
  const batchSize = 10
  let created = 0

  console.log(`📝 Creating ${dummyForms.length} CCF forms...`)
  for (let i = 0; i < dummyForms.length; i += batchSize) {
    const batch = dummyForms.slice(i, i + batchSize)
    await prisma.cCFForm.createMany({
      data: batch,
    })
    created += batch.length
    process.stdout.write(
      `\r📝 Created ${created}/${dummyForms.length} forms...`
    )
  }

  console.log('\n') // New line after progress

  const reviewedCount = dummyForms.filter((f) => f.humanReviewed).length
  const pendingCount = dummyForms.filter((f) => !f.humanReviewed).length

  // Get final job count
  const totalJobs = await prisma.job.count()
  const formsWithJobs = dummyForms.filter((f) => f.jobId !== null).length
  const formsWithoutJobs = dummyForms.filter((f) => f.jobId === null).length

  console.log(`\n✨ Successfully seeded ${dummyForms.length} CCF forms!`)
  console.log('📊 Summary:')
  console.log(`   - Reviewed: ${reviewedCount}`)
  console.log(`   - Pending: ${pendingCount}`)
  console.log(`   - Total Jobs: ${totalJobs}`)
  console.log(`   - Forms with jobs: ${formsWithJobs}`)
  console.log(`   - Forms without jobs: ${formsWithoutJobs}`)
  console.log(`   - Date range: 2023-2024`)
  console.log(`\n💡 Test pagination with:`)
  console.log(`   - Page size 10: ${Math.ceil(dummyForms.length / 10)} pages`)
  console.log(`   - Page size 20: ${Math.ceil(dummyForms.length / 20)} pages`)
  console.log(`   - Page size 25: ${Math.ceil(dummyForms.length / 25)} pages`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
