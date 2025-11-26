# Backblaze B2 Configuration Guide

This guide will help you configure Backblaze B2 for Cloud Files functionality.

## Prerequisites

1. A Backblaze B2 account ([sign up here](https://www.backblaze.com/b2/sign-up.html))
2. A B2 bucket created in your Backblaze account
3. Application Key with read/write permissions

## Step 1: Create a Backblaze B2 Account

1. Go to [backblaze.com](https://www.backblaze.com/b2/sign-up.html)
2. Sign up for a free account (includes 10GB free storage)
3. Verify your email address

## Step 2: Create a B2 Bucket

1. Log into your Backblaze account
2. Navigate to **B2 Cloud Storage** → **Buckets**
3. Click **Create a Bucket**
4. Configure your bucket:
   - **Bucket Name**: Choose a unique name (e.g., `maalov-trainers`)
   - **Files in Bucket are**: Select **Private** (recommended) or **Public**
   - **Default Encryption**: Optional, but recommended
   - **Object Lock**: Leave disabled unless needed
5. Click **Create a Bucket**
6. **Note your bucket name** - you'll need it for configuration

## Step 3: Create an Application Key

1. In Backblaze, go to **App Keys** (in the left sidebar)
2. Click **Add a New Application Key**
3. Configure the key:
   - **Name**: Give it a descriptive name (e.g., `maalov-app-key`)
   - **Allow List All Bucket Names**: Check this if you want to list buckets
   - **Allow List Buckets**: Check this
   - **Allow Read Buckets**: Check this
   - **Allow Write Buckets**: Check this
   - **Allow Delete Files**: Check this
   - **Allow Read Files**: Check this
   - **File name prefix**: Leave empty (allows access to all files)
   - **Duration**: Leave empty (no expiration)
4. Click **Create New Key**
5. **IMPORTANT**: Copy both values immediately:
   - **keyID**: This is your `BACKBLAZE_KEY_ID`
   - **applicationKey**: This is your `BACKBLAZE_APPLICATION_KEY`
   - ⚠️ The applicationKey will only be shown once!

## Step 4: Configure Environment Variables

### For Local Development

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Backblaze credentials:
   ```env
   BACKBLAZE_KEY_ID=your_key_id_here
   BACKBLAZE_APPLICATION_KEY=your_application_key_here
   BACKBLAZE_BUCKET_NAME=your_bucket_name_here
   ```

3. **Never commit `.env` to git** - it's already in `.gitignore`

### For Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables for **Production**, **Preview**, and **Development**:

   | Name | Value |
   |------|-------|
   | `BACKBLAZE_KEY_ID` | Your Backblaze Key ID |
   | `BACKBLAZE_APPLICATION_KEY` | Your Backblaze Application Key |
   | `BACKBLAZE_BUCKET_NAME` | Your bucket name |

4. Click **Save** for each environment

## Step 5: Test the Configuration

Run the test script to verify your configuration:

```bash
npm run test:backblaze
```

Or manually test using the API endpoints:
- List files: `GET /api/list-backblaze-files`
- Upload file: `POST /api/upload-to-backblaze`
- Download file: `POST /api/download-backblaze-file`
- Delete file: `POST /api/delete-backblaze-file`

## Troubleshooting

### Error: "Backblaze credentials not configured"
- Make sure all three environment variables are set
- For local development, ensure `.env` file exists and is in the project root
- For Vercel, ensure environment variables are set in the dashboard

### Error: "Backblaze authorization failed"
- Verify your `BACKBLAZE_KEY_ID` and `BACKBLAZE_APPLICATION_KEY` are correct
- Check that you copied the full application key (it's long)
- Ensure there are no extra spaces or quotes in your environment variables

### Error: "Bucket 'xxx' not found"
- Verify your `BACKBLAZE_BUCKET_NAME` matches exactly (case-sensitive)
- Check that the application key has access to this bucket
- Ensure the bucket exists in your Backblaze account

### Error: "Failed to list files" or "Failed to upload"
- Check that your application key has the required permissions:
  - Allow List Buckets
  - Allow Read Buckets
  - Allow Write Buckets
  - Allow Read Files
  - Allow Delete Files

### Files not showing up in Cloud Files
- Check browser console for errors
- Verify the API endpoint is working: `GET /api/list-backblaze-files`
- Ensure files are `.xlsx` format (other formats are filtered out)
- Check that files aren't hidden (files starting with `.` are filtered)

## Security Best Practices

1. **Never commit credentials** to git
2. **Use different keys** for development and production
3. **Restrict application key permissions** to only what's needed
4. **Use bucket-level encryption** for sensitive data
5. **Rotate keys periodically** for better security
6. **Monitor usage** in Backblaze dashboard

## API Endpoints

The following API endpoints are available:

- **List Files**: `GET /api/list-backblaze-files`
  - Returns list of all `.xlsx` files in the bucket
  
- **Upload File**: `POST /api/upload-to-backblaze`
  - Body: `{ fileName: string, fileData: string (base64) }`
  - Returns: `{ success: boolean, fileId: string, fileName: string }`
  
- **Download File**: `POST /api/download-backblaze-file`
  - Body: `{ fileName: string, fileId: string }`
  - Returns: `{ success: boolean, data: string (base64), fileName: string }`
  
- **Delete File**: `POST /api/delete-backblaze-file`
  - Body: `{ fileName: string, fileId: string }`
  - Returns: `{ success: boolean, message: string }`

## Cost Information

Backblaze B2 pricing (as of 2024):
- **Storage**: $0.005/GB/month (first 10GB free)
- **Download**: $0.01/GB (first 1GB free per day)
- **Upload**: Free
- **Class C Transactions**: $0.004 per 10,000 (free tier includes some)

For typical usage with trainer files (~100KB each), costs are minimal.

## Support

If you encounter issues:
1. Check the Backblaze [documentation](https://www.backblaze.com/b2/docs/)
2. Review the API endpoint logs in Vercel
3. Check browser console for client-side errors
4. Verify environment variables are set correctly
