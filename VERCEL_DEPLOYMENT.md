# Vercel Deployment Guide

This guide covers everything you need to deploy your CCF Automation app to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub/GitLab/Bitbucket Repository**: Your code should be in a Git repository
3. **Supabase Project**: Already set up (you're using it for auth and storage)
4. **PostgreSQL Database**: Your Supabase database is ready

## Step 1: Prepare Your Repository

### 1.1 Ensure Prisma Client Generation

Add a `postinstall` script to automatically generate Prisma Client after dependencies are installed:

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

### 1.2 Update Prisma Schema for Production

Your Prisma schema should work, but ensure the binary targets include the Vercel runtime environment. Update `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../app/generated/prisma"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}
```

The `debian-openssl-3.0.x` target is for Vercel's serverless functions.

### 1.3 Create `.vercelignore` (Optional)

Create a `.vercelignore` file to exclude unnecessary files:

```
node_modules
.env
.env.local
*.log
.DS_Store
tsconfig.tsbuildinfo
```

## Step 2: Set Up Environment Variables in Vercel

Go to your Vercel project settings → Environment Variables and add:

### Required Environment Variables

```
DATABASE_URL=postgresql://user:password@host:5432/database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_AI_STUDIO_KEY=your-google-ai-key
```

**Important Notes:**

- `DATABASE_URL`: Use your Supabase connection string (found in Supabase Dashboard → Settings → Database)
- For production, use the connection pooling URL if available
- Set these for **Production**, **Preview**, and **Development** environments as needed

## Step 3: Configure Build Settings

### 3.1 Build Command

Vercel will auto-detect Next.js, but ensure:

- **Build Command**: `pnpm build` (or `npm run build`)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `pnpm install` (or `npm install`)

### 3.2 Node.js Version

Vercel uses Node.js 18.x by default. If you need a specific version, create a `.nvmrc` file:

```
18
```

or specify in `package.json`:

```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## Step 4: Database Migrations

### Option A: Run Migrations Manually (Recommended for First Deploy)

Before deploying, run migrations on your production database:

```bash
# Set your production DATABASE_URL
export DATABASE_URL="your-production-database-url"

# Run migrations
pnpm prisma migrate deploy
```

### Option B: Use Vercel Build Command

Add migration to build command (not recommended for production, but works):

Update `package.json`:

```json
{
  "scripts": {
    "build": "prisma migrate deploy && next build"
  }
}
```

**Note**: This runs migrations on every build, which can cause issues. Better to run migrations manually or use a CI/CD pipeline.

## Step 5: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Vercel will auto-detect Next.js
4. Add environment variables (Step 2)
5. Click "Deploy"

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# For production
vercel --prod
```

## Step 6: Post-Deployment Checklist

### 6.1 Verify Environment Variables

- Check that all environment variables are set correctly
- Ensure `NEXT_PUBLIC_*` variables are available (they're exposed to the browser)

### 6.2 Test Database Connection

- Visit your deployed app
- Try logging in
- Check if database queries work

### 6.3 Verify Supabase Storage

- Ensure the `pdf-forms` bucket exists in Supabase
- Test file upload functionality
- Verify CORS settings if needed

### 6.4 Check Prisma Client

- If you see Prisma errors, ensure `prisma generate` ran during build
- Check build logs in Vercel dashboard

## Step 7: Configure Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

## Troubleshooting

### Issue: Prisma Client Not Found

**Solution**: Ensure `postinstall` script runs `prisma generate`

### Issue: Database Connection Errors

**Solution**:

- Check `DATABASE_URL` is correct
- Ensure database allows connections from Vercel IPs
- For Supabase, use connection pooling URL

### Issue: Environment Variables Not Working

**Solution**:

- `NEXT_PUBLIC_*` variables are exposed to browser
- Regular variables are server-only
- Redeploy after adding new environment variables

### Issue: Build Fails

**Solution**:

- Check build logs in Vercel dashboard
- Ensure all dependencies are in `dependencies` (not `devDependencies`)
- Verify Node.js version compatibility

### Issue: Migrations Not Applied

**Solution**:

- Run migrations manually: `prisma migrate deploy`
- Or add to build command (not recommended)

## Additional Considerations

### Performance

- Vercel automatically optimizes Next.js apps
- Consider enabling Edge Runtime for API routes if applicable
- Use Vercel's Analytics to monitor performance

### Security

- Never commit `.env` files
- Use Vercel's environment variables (encrypted)
- Rotate API keys regularly

### Monitoring

- Set up Vercel Analytics
- Configure error tracking (Sentry, etc.)
- Monitor database connection pool usage

## Next Steps

1. Set up CI/CD pipeline (optional)
2. Configure preview deployments for branches
3. Set up monitoring and alerts
4. Configure backup strategies for database
