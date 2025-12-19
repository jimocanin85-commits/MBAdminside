# Video Upload Configuration Analysis

## Current Configuration Status

### ✅ What Works
1. **File Type Acceptance**: The upload component accepts all file types (`accept="*/*"`), including videos
2. **Content-Type Detection**: The upload endpoint dynamically detects MIME types from data URLs, so video types (video/mp4, video/mov, etc.) would be handled correctly
3. **Backblaze B2 Storage**: No file type restrictions - can store videos of any format
4. **Upload Endpoint**: `/api/upload-to-backblaze` handles file uploads generically

### ❌ Critical Limitation

**Vercel Serverless Function Size Limit: 4.5MB**

The current implementation uses base64 encoding and sends files through Vercel serverless functions, which have a **4.5MB request body limit** on the free tier. This means:

- **Videos typically exceed this limit** (even short videos are often 10-50MB+)
- Base64 encoding increases file size by ~33%, making the effective limit even smaller (~3.4MB for actual file size)
- Uploads will fail with HTTP 413 (Payload Too Large) for most video files

## Current Upload Flow

```
Browser → Base64 Encode → JSON POST → Vercel Function → Backblaze B2
         (increases size)   (4.5MB limit)
```

## Solutions for Video Upload

### Option 1: Direct Upload to Backblaze (Recommended)
Upload videos directly to Backblaze B2 from the browser, bypassing Vercel:

**Pros:**
- No size limits (Backblaze supports files up to 10GB)
- Faster uploads (direct to storage)
- No serverless function costs
- Better for large files

**Cons:**
- Requires exposing Backblaze upload URL/credentials to client (use signed URLs)
- More complex implementation

**Implementation:**
1. Create a Vercel endpoint that generates signed upload URLs
2. Client uploads directly to Backblaze using signed URL
3. No file data passes through Vercel

### Option 2: Chunked Upload
Split large files into chunks and upload sequentially:

**Pros:**
- Works with current architecture
- Can handle large files

**Cons:**
- More complex client-side code
- Multiple API calls
- Slower uploads

### Option 3: Upgrade Vercel Plan
Vercel Pro plan has higher limits (up to 50MB), but still may not be enough for videos.

## Current Code Analysis

### File Upload Component
**Location:** `src/components/admin/ReferaterViewer.tsx`
- Line 559: `accept="*/*"` - Accepts all file types ✅
- Line 66-120: `uploadSingleFile` - Converts to base64 and uploads
- **Issue:** Base64 encoding + Vercel 4.5MB limit prevents large video uploads

### Upload Endpoint
**Location:** `api/upload-to-backblaze.ts`
- Line 175-188: Content-type detection from data URL ✅
- Line 199-209: Base64 to buffer conversion ✅
- **Issue:** Entire file must fit in request body (4.5MB limit)

## Recommendations

1. **For small videos (<3MB)**: Current setup will work
2. **For typical videos**: Implement direct Backblaze upload with signed URLs
3. **For large videos**: Use chunked upload or direct Backblaze upload

## Testing Video Upload

To test if video upload works with current setup:

1. Try uploading a small video file (<3MB)
2. Check browser console for errors
3. Check Vercel function logs for "413 Payload Too Large" errors
4. Monitor network tab for request size

## Next Steps

If you need to support video uploads:

1. **Immediate**: Test with small video files to confirm current limitations
2. **Short-term**: Implement direct Backblaze upload for files >3MB
3. **Long-term**: Add chunked upload support for very large files
