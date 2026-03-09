# Troubleshooting Server-Side Errors on Vercel

## Common Issues and Solutions

### 1. Prisma Client Not Generated

**Error**: `Cannot find module '../app/generated/prisma/client'` or similar

**Solution**: 
- Ensure `postinstall` script runs `prisma generate` in `package.json`
- Check Vercel build logs to verify `prisma generate` ran
- If it didn't run, the `postinstall` script should handle it

### 2. Database Connection Issues

**Error**: `Database connection failed` or `P1001: Can't reach database server`

**Solution**:
- Verify `DATABASE_URL` is set correctly in Vercel environment variables
- For Supabase, use the connection pooling URL (port 6543) for better performance
- Check that your database allows connections from Vercel's IP ranges
- Ensure the database is running and accessible

### 3. Prisma Binary Targets

**Error**: Prisma engine binary not found for platform

**Solution**:
- Verify `prisma/schema.prisma` has correct `binaryTargets`:
  ```prisma
  generator client {
    provider = "prisma-client"
    output   = "../app/generated/prisma"
    binaryTargets = ["native", "debian-openssl-3.0.x"]
  }
  ```

### 4. Environment Variables Not Set

**Error**: `NEXT_PUBLIC_SUPABASE_URL is not defined` or similar

**Solution**:
- Go to Vercel Project Settings → Environment Variables
- Ensure all required variables are set for Production, Preview, and Development
- Redeploy after adding new environment variables

### 5. Server-Side Exception After Auth

**Error**: `Application error: a server-side exception has occurred`

**Common Causes**:
1. Prisma client not generated during build
2. Database connection failing
3. Missing environment variables
4. Prisma query failing (check model names - Prisma uses camelCase)

**Debugging Steps**:
1. Check Vercel build logs for errors during `prisma generate`
2. Check Vercel function logs for the specific error
3. Verify `DATABASE_URL` is correct
4. Test database connection locally with the same `DATABASE_URL`
5. Check if Prisma models are being accessed correctly (e.g., `cCFForm` not `CCFForm`)

### 6. Checking Vercel Logs

1. Go to your Vercel project dashboard
2. Click on "Deployments"
3. Click on the failed deployment
4. Check "Build Logs" for build-time errors
5. Check "Function Logs" for runtime errors
6. Look for the specific error message and stack trace

### 7. Testing Database Connection

You can test your database connection by creating a simple API route:

```typescript
// app/api/test-db/route.ts
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await prisma.$connect()
    const count = await prisma.cCFForm.count()
    return NextResponse.json({ 
      success: true, 
      count,
      message: 'Database connection successful' 
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
```

Visit `/api/test-db` to test the connection.

### 8. Prisma Model Name Casing

**Important**: Prisma converts model names to camelCase in the client:
- Model: `CCFForm` → Client: `prisma.cCFForm`
- Model: `Job` → Client: `prisma.job`

Make sure you're using the correct casing in your code.

