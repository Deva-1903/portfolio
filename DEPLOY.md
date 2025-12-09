# Deployment Guide

## Quick Deploy to Vercel

### Option A: Using Vercel CLI (Recommended)

1. Install Vercel CLI globally (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. For production deployment:
   ```bash
   vercel --prod
   ```

### Option B: Using GitHub Integration

1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. Go to https://vercel.com
3. Click "New Project"
4. Import your GitHub repository
5. Click "Deploy"

## Custom Domain Setup

1. In Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed by Vercel
4. Wait for DNS propagation (usually 5-10 minutes)

## Environment Variables (if needed)

If your contact form API needs any environment variables:
1. Go to Project Settings → Environment Variables
2. Add your variables
3. Redeploy

## Notes

- Your `vercel.json` is already configured for the contact API
- The site will automatically redeploy on every push to main branch
- Vercel provides free SSL certificates automatically

