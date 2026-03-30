import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "./auth/[...nextauth]"
import * as XLSX from "xlsx"
import proj4 from "proj4"

// App-only token cache
let cachedToken: { token: string; expiresAt: number } | null = null

async function getAppToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token
  }

  const tenantId    = process.env.AZURE_AD_TENANT_ID!
  const clientId    = process.env.AZURE_AD_CLIENT_ID!
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET!

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "client_credentials",
        client_id:     clientId,
        client_secret: clientSecret,
        scope:         "https://graph.microsoft.com/.default",
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token request failed: ${res.status} ${err}`)
  }

  const json = await res.json()
  cachedToken = {
    token:     json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  }
  return cachedToken.token
}

// EPSG:2180 (Poland CS2000 zone 6) → WGS84 (EPSG:4326)
proj4.defs("EPSG:2180", "+proj=tmerc +lat_0=0 +lon_0=19 +k=0.9993 +x_0=500000 +y_0=-5300000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs")
const toWgs84 = (east: number, north: number): [number, number] => {
  const [lng, lat] = proj4("EPSG:2180", "EPSG:4326", [east, north])
  return [lng, lat]
}

// Typy danych
export interface UXOFeature {
  type: "Feature"
  geometry: {
    type: "Point"
    coordinates: [number, number] // [EAST, NORTH]
  }
  properties: {
    no: number
    id: string
    sector: string
    priority: number
    risk: string
    ferrMass: number
    dob: number
    amplitude: number
    altitude: number
    depth: number
    east: number
    north: number
    idMag: string
    dateInspected: string | null
    type: string
    status: string
    comment: string | null
  }
}

export interface GeoJSON {
  type: "FeatureCollection"
  features: UXOFeature[]
  meta: {
    total: number
    inspected: number
    removed: number
    pending: number
    lastFetched: string
  }
}

async function fetchExcelFromOneDrive(accessToken: string): Promise<Buffer> {
  const siteId    = process.env.SHAREPOINT_SITE_ID!
  const driveId   = process.env.SHAREPOINT_DRIVE_ID!
  const fileId    = process.env.ONEDRIVE_FILE_ID!

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${fileId}/content`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Graph API error: ${response.status} ${response.statusText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

function parseExcelToGeoJSON(buffer: Buffer): GeoJSON {
  const workbook = XLSX.read(buffer, { type: "buffer" })
  const sheet = workbook.Sheets["DETAIL"]

  if (!sheet) throw new Error("Arkusz DETAIL nie został znaleziony")

  // Debug: print exact column headers
  const headers = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })[0]
  console.log("[DEBUG] DETAIL sheet headers:", JSON.stringify(headers))

  // header: 0 — wiersz tytułowy usunięty, nagłówki w wierszu 1
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 0, defval: null })

  const features: UXOFeature[] = []

  for (const row of rows) {
    const eastRaw  = parseFloat(row["EAST"])
    const northRaw = parseFloat(row["NORTH"])

    // Pomiń wiersze bez współrzędnych
    if (isNaN(eastRaw) || isNaN(northRaw)) continue

    // Konwersja UTM Zone 33N → WGS84 (lat/lng)
    const [lng, lat] = toWgs84(eastRaw, northRaw)

    const status = row["STATUS"] || null
    const type   = row["TYPE"]   || "pUXO"

    // Normalizacja statusu
    const statusLower = status?.toLowerCase() ?? ""
    let normalizedStatus = "pUXO"
    if (statusLower === "inspected")   normalizedStatus = "Inspected"
    if (statusLower === "removed")     normalizedStatus = "Removed"
    if (statusLower === "in progress") normalizedStatus = "In progress"
    if (statusLower === "not found")   normalizedStatus = "Not found"
    if (statusLower === "planned")     normalizedStatus = "Planned"

    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [lng, lat],
      },
      properties: {
        no:            row["No."]        ?? 0,
        id:            row["ID"]         ?? "",
        sector:        String(row["SECTOR"] ?? ""),
        priority:      row["PRIORITY"]   ?? 0,
        risk:          row["RISK"]       ?? "",
        ferrMass:      row["FERR MASS\n(kg)"] ?? row["FERR MASS (kg)"] ?? row["FERR MASS"] ?? 0,
        dob:           row["DOB"]        ?? 0,
        amplitude:     row["AMPLITUDE"]  ?? 0,
        altitude:      row["ALTITUDE\n(m)"] ?? row["ALTITUDE (m)"] ?? row["ALTITUDE"] ?? 0,
        depth:         row["DEPTH\n(m)"]    ?? row["DEPTH (m)"] ?? row["DEPTH"]    ?? 0,
        east:          lng,
        north:         lat,
        idMag:         String(row["ID_MAG"] ?? ""),
        dateInspected: (() => {
          const raw = row["DATE\nINSPECTED"] ?? row["DATE INSPECTED"] ?? null
          if (!raw) return null
          const serial = typeof raw === "number" ? raw : parseFloat(raw)
          if (!isNaN(serial) && serial > 1000) {
            return new Date((serial - 25569) * 86400 * 1000)
              .toLocaleDateString("pl-PL", { day: "2-digit", month: "short", year: "numeric" })
          }
          return String(raw)
        })(),
        type,
        status:        normalizedStatus,
        comment:       row["COMMENT"]    ?? null,
      },
    })
  }

  const inspected = features.filter(f => f.properties.status === "Inspected").length
  const removed   = features.filter(f => f.properties.status === "Removed").length
  const pending   = features.filter(f => f.properties.status === "pUXO").length

  return {
    type: "FeatureCollection",
    features,
    meta: {
      total:       features.length,
      inspected,
      removed,
      pending,
      lastFetched: new Date().toISOString(),
    },
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Sprawdź sesję — użytkownik musi być zalogowany
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  try {
    const appToken = await getAppToken()
    const buffer   = await fetchExcelFromOneDrive(appToken)
    const geojson = parseExcelToGeoJSON(buffer)

    // Cache 5 minut po stronie przeglądarki
    res.setHeader("Cache-Control", "private, max-age=300")
    res.status(200).json(geojson)
  } catch (error: any) {
    console.error("API /data error:", error)
    res.status(500).json({ error: error.message })
  }
}
