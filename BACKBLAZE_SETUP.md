# Backblaze B2 Setup Guide

## Problem: "Backblaze credentials not configured"

Hvis du får denne fejl, betyder det at environment variables ikke er sat op korrekt i Vercel.

## Løsning: Konfigurer Environment Variables i Vercel

### Trin 1: Få dine Backblaze credentials

1. Log ind på [Backblaze B2](https://www.backblaze.com/b2/sign-up.html)
2. Gå til **App Keys** i din B2 account
3. Opret en ny Application Key eller brug en eksisterende
4. Noter ned:
   - **Key ID** (f.eks. `002a1b2c3d4e5f6g7h8i9j0k1l2m`)
   - **Application Key** (f.eks. `K002a1b2c3d4e5f6g7h8i9j0k1l2m`)
   - **Bucket Name** (f.eks. `MaalovBK`)

### Trin 2: Tilføj Environment Variables i Vercel

1. Gå til dit Vercel projekt: [vercel.com/dashboard](https://vercel.com/dashboard)
2. Vælg dit projekt (`mb-adminside` eller lignende)
3. Gå til **Settings** → **Environment Variables**
4. Tilføj følgende tre environment variables:

   | Name | Value | Environment |
   |------|-------|-------------|
   | `BACKBLAZE_KEY_ID` | Din Key ID fra Backblaze | Production, Preview, Development |
   | `BACKBLAZE_APPLICATION_KEY` | Din Application Key fra Backblaze | Production, Preview, Development |
   | `BACKBLAZE_BUCKET_NAME` | Dit bucket navn (f.eks. `MaalovBK`) | Production, Preview, Development |

5. **VIGTIGT:** Sørg for at vælge alle tre environments (Production, Preview, Development) for hver variabel
6. Klik **Save** for hver variabel

### Trin 3: Redeploy

Efter at have tilføjet environment variables skal du redeploye:

1. Gå til **Deployments** i Vercel dashboard
2. Find den seneste deployment
3. Klik på de tre prikker (⋯) → **Redeploy**
4. Eller push en ny commit til din repository

### Trin 4: Verificer

Efter redeploy, tjek om det virker:

1. Åbn din app i browseren
2. Gå til Cloud Files sektionen
3. Du skulle nu kunne se filer fra Backblaze (eller en tom liste hvis der ikke er nogen filer)

## Debugging

Hvis det stadig ikke virker, kan du tjekke logs:

1. Gå til Vercel dashboard → **Deployments**
2. Klik på den seneste deployment
3. Gå til **Functions** tab
4. Klik på `api/list-backblaze-files`
5. Se **Logs** for at se hvilke environment variables der faktisk læses

Du skulle se noget lignende:
```
Environment check: {
  hasKeyId: true,
  hasApplicationKey: true,
  hasBucketName: true,
  keyIdLength: 24,
  applicationKeyLength: 32,
  bucketName: 'MaalovBK'
}
```

Hvis nogle af værdierne er `false` eller `0`, betyder det at environment variables ikke er sat op korrekt.

## Almindelige fejl

### Fejl 1: "Missing environment variables: BACKBLAZE_KEY_ID"
- **Løsning:** Sørg for at `BACKBLAZE_KEY_ID` er sat op i Vercel dashboard

### Fejl 2: "Missing environment variables: BACKBLAZE_APPLICATION_KEY"
- **Løsning:** Sørg for at `BACKBLAZE_APPLICATION_KEY` er sat op i Vercel dashboard

### Fejl 3: "Missing environment variables: BACKBLAZE_BUCKET_NAME"
- **Løsning:** Sørg for at `BACKBLAZE_BUCKET_NAME` er sat op i Vercel dashboard

### Fejl 4: Variabler er sat op, men virker stadig ikke
- **Løsning:** 
  1. Tjek at du har valgt alle tre environments (Production, Preview, Development)
  2. Redeploy projektet efter at have tilføjet variablerne
  3. Tjek at variabelnavnene er præcist som vist (case-sensitive)

## Lokal udvikling

For lokal udvikling, opret en `.env` fil i projektets rod:

```env
BACKBLAZE_KEY_ID=din_key_id
BACKBLAZE_APPLICATION_KEY=din_application_key
BACKBLAZE_BUCKET_NAME=dit_bucket_navn
```

**VIGTIGT:** Tilføj `.env` til `.gitignore` så du ikke committer dine credentials!
