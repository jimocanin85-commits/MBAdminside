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
   - **Bucket Name** (f.eks. `mb-adminside-files`)

### Trin 2: Tilføj Environment Variables i Vercel

1. Gå til dit Vercel projekt: [vercel.com/dashboard](https://vercel.com/dashboard)
2. Vælg dit projekt (`mb-adminside` eller lignende)
3. Gå til **Settings** → **Environment Variables**
4. Tilføj følgende tre environment variables:

   | Name | Value | Environment |
   |------|-------|-------------|
   | `BACKBLAZE_KEY_ID` | Din Key ID fra Backblaze | Production, Preview, Development |
   | `BACKBLAZE_APPLICATION_KEY` | Din Application Key fra Backblaze | Production, Preview, Development |
   | `BACKBLAZE_BUCKET_NAME` | Dit bucket navn (f.eks. `mb-adminside-files`) | Production, Preview, Development |

5. **VIGTIGT:** Sørg for at vælge alle tre environments (Production, Preview, Development) for hver variabel
6. Klik **Save** for hver variabel

### Trin 3: Redeploy

Efter at have tilføjet environment variables skal du redeploye:

1. Gå til **Deployments** i Vercel dashboard
2. Find den seneste deployment
3. Klik på de tre prikker (⋯) → **Redeploy**
4. Eller push en ny commit til din repository

### Trin 4: Tjek at det virker

1. Log ind i portalen, og slå **admin-tilstand** til (brugermenuen nederst i venstre side).
2. Vælg **Fillager** i menuen under "Admin", og tryk på **Kør tjek**.
3. Tjekket gemmer en lille testfil i mappen `Systemtjek/`, henter den igen, sammenligner indholdet og
   sletter den. Det tæller også de frivillig-filer og referater, der ligger der i forvejen (de ændres ikke).
4. Når alle trin er grønne, virker fillageret. Er et trin rødt, står årsagen ved trinnet.

Tjekket bruger præcis den kode, portalen selv gemmer og henter filer med (`api/_lib/backblaze.ts`).
Kør det hver gang en nøgle eller en indstilling er ændret.

## Hvilken nøgle skal bruges?

- Opret nøglen under **Application Keys** hos Backblaze med **Read and Write** til klubbens bucket.
- Lad **File name prefix** stå tomt. Portalen bruger både `Frivillige/` og `Referater/`.
- En nøgle, der kun gælder én bucket, er den anbefalede slags, og den virker.
- En nøgle må aldrig skrives i en fil i dette repository, i en mail eller i en besked. Den hører kun
  hjemme i Vercel.

## Hvis tjekket er rødt

| Trin | Typisk årsag |
|------|--------------|
| Nøgler er sat i Vercel | En af de tre værdier mangler - navnet står ved trinnet. Husk Redeploy bagefter. |
| Backblaze accepterer nøglen | Forkert Key ID eller Application Key, nøglen er slettet, eller den gælder en anden bucket end `BACKBLAZE_BUCKET_NAME`. |
| Nøglen må læse, gemme og slette | Nøglen er oprettet som "Read Only" eller "Write Only". Opret en ny med "Read and Write". |
| Nøglen når alle mapper | Nøglen har et "File name prefix". Opret en ny uden. |
| En testfil kan gemmes / hentes / slettes | Se Backblazes egen besked ved trinnet. Tjek også "Caps & Alerts" hos Backblaze - et nået forbrugsloft stopper alt. |

Fejl skrives også i Vercels log (Deployments → den seneste → Functions) som `Storage error [...]`.

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
