import { NextRequest, NextResponse } from 'next/server'
import { getCCFFormsWithFilters, getUniqueJobs } from '@/lib/db-helpers'

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const search = searchParams.get('search') || ''
    const filterReviewed = searchParams.get('filterReviewed')
    const jobKey = searchParams.get('jobKey') || undefined

    // If requesting jobs list, return unique jobs
    if (searchParams.get('jobs') === 'true') {
      const jobs = await getUniqueJobs()
      return NextResponse.json({ jobs })
    }

    // Fetch forms with filters
    const result = await getCCFFormsWithFilters({
      page,
      limit,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc',
      search,
      filterReviewed: filterReviewed ? filterReviewed === 'true' : undefined,
      jobKey,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Error fetching CCF forms:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
