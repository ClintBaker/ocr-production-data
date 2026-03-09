import { NextRequest, NextResponse } from 'next/server'
import { getJobsWithPagination } from '@/lib/db-helpers'

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || undefined
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined

    // Validate pagination parameters
    if (page < 1) {
      return NextResponse.json(
        { error: 'Page must be greater than 0' },
        { status: 400 }
      )
    }
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      )
    }

    // Fetch jobs with pagination and filters
    const result = await getJobsWithPagination({
      page,
      limit,
      search,
      dateFrom,
      dateTo,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Error fetching jobs:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
