import { prisma } from '../lib/prisma'

async function deleteEmptyJobs() {
  try {
    console.log('Connecting to database...')
    await prisma.$connect()
    console.log('Connected successfully\n')

    // Find all jobs with their form counts
    const allJobs = await prisma.job.findMany({
      include: {
        _count: {
          select: { forms: true },
        },
      },
    })

    console.log(`Found ${allJobs.length} total jobs`)

    // Filter jobs with no forms
    const emptyJobs = allJobs.filter((job) => job._count.forms === 0)
    const jobsWithForms = allJobs.filter((job) => job._count.forms > 0)

    console.log(`Jobs with forms: ${jobsWithForms.length}`)
    console.log(`Empty jobs (no forms): ${emptyJobs.length}\n`)

    if (emptyJobs.length === 0) {
      console.log('No empty jobs to delete.')
      return
    }

    // Show which jobs will be deleted
    console.log('Empty jobs to be deleted:')
    emptyJobs.forEach((job, index) => {
      const dateStr = job.collectionDate.toISOString().split('T')[0]
      console.log(
        `  ${index + 1}. ${dateStr} - ${job.collectorName} - ${job.clientName} (ID: ${job.id})`
      )
    })

    // Delete empty jobs
    const emptyJobIds = emptyJobs.map((job) => job.id)
    const deleteResult = await prisma.job.deleteMany({
      where: {
        id: {
          in: emptyJobIds,
        },
      },
    })

    console.log(`\n✅ Successfully deleted ${deleteResult.count} empty job(s)`)

    // Show remaining jobs
    const remainingJobs = await prisma.job.findMany({
      include: {
        _count: {
          select: { forms: true },
        },
      },
    })

    console.log(`\nRemaining jobs: ${remainingJobs.length}`)
    remainingJobs.forEach((job, index) => {
      const dateStr = job.collectionDate.toISOString().split('T')[0]
      console.log(
        `  ${index + 1}. ${dateStr} - ${job.collectorName} - ${job.clientName} (${job._count.forms} form${job._count.forms !== 1 ? 's' : ''})`
      )
    })
  } catch (error) {
    console.error('Error deleting empty jobs:', error)
    throw error
  } finally {
    await prisma.$disconnect()
    console.log('\nDatabase connection closed')
  }
}

// Run the script
deleteEmptyJobs()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
