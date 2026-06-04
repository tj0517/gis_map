/**
 * Helper script: znajduje SharePoint Site ID, Drive ID i File ID
 * dla pliku GEO3_Drilling_Dashboard_v1.xlsx w projekcie SC2602.
 *
 * Użycie:
 *   npx tsx scripts/find-sharepoint-ids.ts
 *
 * Wymaga .env.local z:
 *   AZURE_AD_TENANT_ID
 *   AZURE_AD_CLIENT_ID
 *   AZURE_AD_CLIENT_SECRET
 */

import { config } from "dotenv"
import path from "path"

// Załaduj .env.local z katalogu głównego
config({ path: path.resolve(__dirname, "..", ".env.local") })

const TENANT_ID = process.env.AZURE_AD_TENANT_ID!
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID!
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET!

if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌ Brak zmiennych Azure AD w .env.local")
  process.exit(1)
}

const TARGET_FILE = "GEO3_Drilling_Dashboard_v1.xlsx"
const SEARCH_QUERY = "SC2602"

async function getAccessToken(): Promise<string> {
  const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  })

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token fetch failed: ${res.status} ${text}`)
  }
  const json = await res.json()
  return json.access_token
}

async function graphGet(token: string, url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Graph GET failed: ${res.status} ${text}`)
  }
  return res.json()
}

async function main() {
  console.log("🔑 Getting Azure AD token...")
  const token = await getAccessToken()
  console.log("✅ Token OK\n")

  // 1. Wyszukaj sites z "SC2602" w nazwie
  console.log(`🔍 Searching SharePoint sites matching "${SEARCH_QUERY}"...`)
  const sitesUrl = `https://graph.microsoft.com/v1.0/sites?search=${encodeURIComponent(SEARCH_QUERY)}`
  const sitesRes = await graphGet(token, sitesUrl)

  if (!sitesRes.value || sitesRes.value.length === 0) {
    console.error(`❌ Nie znaleziono żadnego site z "${SEARCH_QUERY}" w nazwie`)
    console.error(`Sprawdź czy app ma uprawnienia Sites.Read.All`)
    return
  }

  console.log(`Found ${sitesRes.value.length} site(s):`)
  for (let i = 0; i < sitesRes.value.length; i++) {
    const s = sitesRes.value[i]
    console.log(`  [${i}] ${s.displayName ?? s.name}`)
    console.log(`      ID: ${s.id}`)
    console.log(`      URL: ${s.webUrl}`)
  }

  // 2. Dla każdego site sprawdź drives i poszukaj pliku
  for (const site of sitesRes.value) {
    console.log(`\n📂 Sprawdzam drives w site: ${site.displayName ?? site.name}`)
    let drives: any
    try {
      drives = await graphGet(token, `https://graph.microsoft.com/v1.0/sites/${site.id}/drives`)
    } catch (err: any) {
      console.log(`   ⚠ Brak dostępu lub błąd: ${err.message}`)
      continue
    }

    if (!drives.value || drives.value.length === 0) {
      console.log(`   (brak drives)`)
      continue
    }

    for (const drive of drives.value) {
      console.log(`\n  🗂  Drive: ${drive.name} (id: ${drive.id})`)

      // Szukaj pliku w tym drive
      let searchRes: any
      try {
        searchRes = await graphGet(
          token,
          `https://graph.microsoft.com/v1.0/drives/${drive.id}/root/search(q='${encodeURIComponent(TARGET_FILE)}')`
        )
      } catch (err: any) {
        console.log(`     ⚠ Search error: ${err.message}`)
        continue
      }

      if (!searchRes.value || searchRes.value.length === 0) {
        console.log(`     (plik nie znaleziony)`)
        continue
      }

      console.log(`     ✅ Znaleziono ${searchRes.value.length} plik(i):`)
      for (const file of searchRes.value) {
        if (file.name !== TARGET_FILE) continue
        console.log(`\n     🎯 MATCH: ${file.name}`)
        console.log(`        File ID:    ${file.id}`)
        console.log(`        Path:       ${file.parentReference?.path ?? "—"}`)
        console.log(`        Web URL:    ${file.webUrl}`)
        console.log(`\n     📋 Add to .env.local:`)
        console.log(`        SHAREPOINT_SITE_ID_SC2602=${site.id}`)
        console.log(`        SHAREPOINT_DRIVE_ID_SC2602=${drive.id}`)
        console.log(`        ONEDRIVE_FILE_ID_SC2602=${file.id}`)
      }
    }
  }
}

main().catch(err => {
  console.error("❌ Error:", err)
  process.exit(1)
})
