import { getAllCCFForms } from '@/lib/db-helpers'
import { prisma } from '@/lib/prisma'
import { CCFRecordsTable } from '@/components/ccf-records-table'
import { Suspense } from 'react'

export default async function DashboardPage() {
  // Fetch total count for the stats card
  let totalCount = 0
  let recordsToReviewCount = 0
  
  try {
    const allForms = await getAllCCFForms()
    totalCount = allForms.length

    // Count records that need review (humanReviewed === false)
    recordsToReviewCount = await prisma.cCFForm.count({
      where: {
        humanReviewed: false,
      },
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    // Continue with default values if database query fails
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage CCF forms
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="p-6 rounded-lg border border-border bg-card">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Quick Actions
            </h2>
            <p className="text-muted-foreground text-sm mb-4">
              Get started with common tasks
            </p>
            <div className="space-y-2">
              <a
                href="/upload-forms"
                className="block text-primary hover:text-primary/80 transition-colors font-medium text-sm"
              >
                Upload Forms →
              </a>
            </div>
          </div>

          <div className="p-6 rounded-lg border border-border bg-card">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Records to Review
            </h2>
            <p className="text-2xl font-bold text-foreground mb-1">
              {recordsToReviewCount}
            </p>
            <p className="text-muted-foreground text-sm">
              CCF forms pending review
            </p>
          </div>

          <div className="p-6 rounded-lg border border-border bg-card">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Support
            </h2>
            <p className="text-muted-foreground text-sm mb-4">
              Need help? Visit our support center
            </p>
            <a
              href="/support"
              className="text-primary hover:text-primary/80 transition-colors font-medium text-sm"
            >
              Get Support →
            </a>
          </div>
        </div>

        {/* CCF Records Table */}
        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            All CCF Records
          </h2>
          <Suspense fallback={
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Loading records...</p>
            </div>
          }>
            <CCFRecordsTable initialTotal={totalCount} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

