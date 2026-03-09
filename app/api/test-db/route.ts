import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  console.log('[Test DB] Starting database connection test...')
  console.log('[Test DB] Environment check:', {
    nodeEnv: process.env.NODE_ENV,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasDirectUrl: !!process.env.DIRECT_URL,
    databaseUrlPreview: process.env.DATABASE_URL 
      ? `${process.env.DATABASE_URL.substring(0, 60)}...` 
      : 'NOT SET',
  })
  
  try {
    // Test Prisma client connection
    console.log('[Test DB] Attempting to connect...')
    await prisma.$connect()
    console.log('[Test DB] Connection successful, running queries...')
    
    // Test a simple query
    const count = await prisma.cCFForm.count()
    const jobCount = await prisma.job.count()
    
    console.log('[Test DB] Queries successful')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful',
      counts: {
        forms: count,
        jobs: jobCount
      },
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasDirectUrl: !!process.env.DIRECT_URL,
        nodeEnv: process.env.NODE_ENV,
        databaseUrlPreview: process.env.DATABASE_URL 
          ? `${process.env.DATABASE_URL.substring(0, 60)}...` 
          : 'NOT SET'
      }
    })
  } catch (error) {
    console.error('[Test DB] Database test error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      stack: errorStack,
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasDirectUrl: !!process.env.DIRECT_URL,
        nodeEnv: process.env.NODE_ENV,
        databaseUrlPreview: process.env.DATABASE_URL 
          ? `${process.env.DATABASE_URL.substring(0, 60)}...` 
          : 'NOT SET'
      }
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

