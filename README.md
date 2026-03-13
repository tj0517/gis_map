# UXO WebGIS · SC2503 · SeaClouds

Aplikacja webowa wyświetlająca obiekty UXO z pliku Excel na OneDrive.
Logowanie przez Microsoft 365 (Azure AD). Hosting na Vercel.

---

## Stack

- **Next.js 14** — framework React + API Routes
- **NextAuth.js** — logowanie przez Azure AD (Microsoft 365)
- **Microsoft Graph API** — pobieranie pliku Excel z OneDrive
- **Leaflet.js** — interaktywna mapa
- **Vercel** — hosting + subdomena geo3.seaclouds.eu

---

## Wdrożenie — krok po kroku

### 1. Rejestracja aplikacji w Azure AD

1. Wejdź na https://portal.azure.com
2. **Azure Active Directory → App registrations → New registration**
3. Nazwa: `UXO WebGIS`
4. Supported account types: **Accounts in this organizational directory only**
5. Redirect URI: `https://geo3.seaclouds.eu/api/auth/callback/azure-ad`
6. Kliknij Register

7. Skopiuj **Application (client) ID** → `AZURE_AD_CLIENT_ID`
8. Skopiuj **Directory (tenant) ID** → `AZURE_AD_TENANT_ID`

9. **Certificates & secrets → New client secret**
   - Description: `geo3-webgis`
   - Expires: 24 months
   - Skopiuj wartość → `AZURE_AD_CLIENT_SECRET`

10. **API permissions → Add permission → Microsoft Graph → Delegated**
    - Dodaj: `Files.Read`, `User.Read`
    - Kliknij **Grant admin consent**

---

### 2. Znajdź ID pliku Excel na OneDrive

Zaloguj się na https://graph.microsoft.com/v1.0/me/drive/root/children (Graph Explorer)
lub uruchom w przeglądarce po zalogowaniu:

```
https://graph.microsoft.com/v1.0/me/drive/root/search(q='UXO_Phase2_Dashboard')
```

Skopiuj wartość `id` z wyniku → `ONEDRIVE_FILE_ID`

---

### 3. Deploy na Vercel

```bash
# Zainstaluj Vercel CLI
npm install -g vercel

# Sklonuj / przejdź do projektu
cd geo3-webgis

# Deploy
vercel

# Ustaw zmienne środowiskowe
vercel env add AZURE_AD_CLIENT_ID
vercel env add AZURE_AD_CLIENT_SECRET
vercel env add AZURE_AD_TENANT_ID
vercel env add NEXTAUTH_SECRET        # openssl rand -base64 32
vercel env add NEXTAUTH_URL           # https://geo3.seaclouds.eu
vercel env add ONEDRIVE_FILE_ID

# Production deploy
vercel --prod
```

---

### 4. Subdomena geo3.seaclouds.eu

W panelu Vercel: **Settings → Domains → Add domain**
Wpisz: `geo3.seaclouds.eu`

Vercel pokaże rekord CNAME do dodania w DNS domeny seaclouds.eu:
```
CNAME   uxo   cname.vercel-dns.com
```

Dodaj rekord w panelu DNS domeny (gdzie zarządzasz seaclouds.eu).
Propagacja DNS: 5–60 minut.

---

### 5. Zmienne środowiskowe (.env.local do lokalnego developmentu)

Skopiuj `.env.local.example` → `.env.local` i uzupełnij wartości:

```
AZURE_AD_CLIENT_ID=...
AZURE_AD_CLIENT_SECRET=...
AZURE_AD_TENANT_ID=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000   # lokalnie
ONEDRIVE_FILE_ID=...
```

Dla lokalnego testowania dodaj też Redirect URI w Azure AD:
`http://localhost:3000/api/auth/callback/azure-ad`

---

## Lokalne uruchomienie

```bash
npm install
npm run dev
# Otwórz http://localhost:3000
```

---

## Struktura projektu

```
geo3-webgis/
├── pages/
│   ├── _app.tsx              # SessionProvider, style globalne
│   ├── index.tsx             # Główna strona z mapą Leaflet
│   ├── login.tsx             # Strona logowania
│   └── api/
│       ├── auth/
│       │   └── [...nextauth].ts  # Azure AD OAuth
│       └── data.ts           # Pobiera Excel z OneDrive → GeoJSON
├── lib/
│   └── symbology.ts          # Kolory i kształty symboli (STATUS + TYPE)
├── types/
│   └── next-auth.d.ts        # Typy TypeScript dla sesji
├── .env.local.example
├── next.config.js
├── package.json
└── tsconfig.json
```

---

## Przepływ danych

```
Excel na OneDrive
      ↓ Microsoft Graph API (token Azure AD)
/api/data (Vercel API Route)
      ↓ GeoJSON
Leaflet.js (przeglądarka klienta)
```

Każde otwarcie mapy = świeże dane z OneDrive. Brak synchronizacji, brak CSV.
Auto-refresh co 5 minut po stronie przeglądarki.

---

## Symbologia

| Status     | Type        | Kształt   | Kolor       |
|------------|-------------|-----------|-------------|
| pUXO       | —           | Koło      | #E24B4A     |
| Inspected  | pUXO        | Trójkąt   | #EF9F27     |
| Inspected  | cUXO        | Trójkąt   | #D85A30     |
| Inspected  | Cable/wire  | Trójkąt   | #378ADD     |
| Inspected  | Debris      | Trójkąt   | #888780     |
| Inspected  | Wreck       | Trójkąt   | #7F77DD     |
| Inspected  | Boulder     | Trójkąt   | #1D9E75     |
| Inspected  | Other       | Trójkąt   | #D4537E     |
| Removed    | —           | Kwadrat   | #639922     |
# gis_map
