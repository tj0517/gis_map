import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "./auth/[...nextauth]"
import * as XLSX from "xlsx"

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

  // header: 0 — wiersz tytułowy usunięty, nagłówki w wierszu 1
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 0, defval: null })

  const features: UXOFeature[] = []

  for (const row of rows) {
    const east  = parseFloat(row["EAST"])
    const north = parseFloat(row["NORTH"])

    // Pomiń wiersze bez współrzędnych
    if (isNaN(east) || isNaN(north)) continue

    const status = row["STATUS"] || null
    const type   = row["TYPE"]   || "pUXO"

    // Normalizacja statusu
    let normalizedStatus = "pUXO"
    if (status === "Inspected") normalizedStatus = "Inspected"
    if (status === "Removed")   normalizedStatus = "Removed"

    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [east, north],
      },
      properties: {
        no:            row["No."]        ?? 0,
        id:            row["ID"]         ?? "",
        sector:        String(row["SECTOR"] ?? ""),
        priority:      row["PRIORITY"]   ?? 0,
        risk:          row["RISK"]       ?? "",
        ferrMass:      row["FERR MASS\n(kg)"] ?? row["FERR MASS"] ?? 0,
        dob:           row["DOB"]        ?? 0,
        amplitude:     row["AMPLITUDE"]  ?? 0,
        altitude:      row["ALTITUDE\n(m)"] ?? row["ALTITUDE"] ?? 0,
        depth:         row["DEPTH\n(m)"]    ?? row["DEPTH"]    ?? 0,
        east,
        north,
        idMag:         String(row["ID_MAG"] ?? ""),
        dateInspected: row["DATE\nINSPECTED"] ?? row["DATE INSPECTED"] ?? null,
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
  // Sprawdź sesję
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.accessToken) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  try {
    const buffer  = await fetchExcelFromOneDrive(session.accessToken)
    const geojson = parseExcelToGeoJSON(buffer)

    // Cache 5 minut po stronie przeglądarki
    res.setHeader("Cache-Control", "private, max-age=300")
    res.status(200).json(geojson)
  } catch (error: any) {
    console.error("API /data error:", error)
    res.status(500).json({ error: error.message })
  }
}
