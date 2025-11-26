# Fix Backblaze Application Key Permissions

## Current Issue
Your Application Key is missing the "List Buckets" permission, which is required for the Cloud Files feature.

## Solution: Create a New Application Key with Full Permissions

### Step 1: Log into Backblaze
1. Go to [secure.backblaze.com/user_signin.htm](https://secure.backblaze.com/user_signin.htm)
2. Sign in to your account

### Step 2: Navigate to App Keys
1. Click **"B2 Cloud Storage"** in the left sidebar
2. Click **"App Keys"** (should be visible in the sidebar)

### Step 3: Create New Application Key
1. Click **"Add a New Application Key"** button
2. Fill in the form:
   - **Name**: `maalov-cloud-files` (or any descriptive name)
   - **Allow List All Bucket Names**: ✅ **CHECK THIS**
   - **Allow List Buckets**: ✅ **CHECK THIS**
   - **Allow Read Buckets**: ✅ **CHECK THIS**
   - **Allow Write Buckets**: ✅ **CHECK THIS**
   - **Allow Delete Files**: ✅ **CHECK THIS**
   - **Allow Read Files**: ✅ **CHECK THIS**
   - **File name prefix**: Leave **EMPTY** (allows access to all files)
   - **Duration**: Leave **EMPTY** (no expiration)
3. Click **"Create New Key"**

### Step 4: Copy Your Credentials
**IMPORTANT**: Copy both values immediately - the Application Key is only shown once!

- **keyID**: Copy this value (e.g., `003fcf60303e5640000000003`)
- **applicationKey**: Copy this value (starts with `K003...`)

### Step 5: Update Configuration
Once you have the new credentials, update your `.env` file:
```
BACKBLAZE_KEY_ID=your_new_key_id
BACKBLAZE_APPLICATION_KEY=your_new_application_key
BACKBLAZE_BUCKET_NAME=MaalovBK
```

### Step 6: Test Again
Run the test to verify:
```bash
npm run test:backblaze
```

## Alternative: Check Existing Key Permissions

If you want to check your current key's permissions:

1. Go to **App Keys** in Backblaze
2. Find the key with Key ID: `003fcf60303e5640000000002`
3. Check the **"Capabilities"** column
4. If permissions are missing, you'll need to create a new key (Backblaze doesn't allow editing existing keys)

## Required Permissions Checklist

Your Application Key MUST have:
- ✅ Allow List All Bucket Names (or Allow List Buckets)
- ✅ Allow Read Buckets
- ✅ Allow Write Buckets
- ✅ Allow Read Files
- ✅ Allow Delete Files

## After Updating

Once you update the credentials in `.env`, run:
```bash
npm run test:backblaze
```

All tests should pass! ✅
