import * as XLSX from "xlsx"
import proj4 from "proj4"

// App-only token cache (shared pattern with fetchPuxoData.ts)
let cachedToken: { token: string; expiresAt: number } | null = null

async function getAppToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token
  }

  const tenantId     = process.env.AZURE_AD_TENANT_ID!
  const clientId     = process.env.AZURE_AD_CLIENT_ID!
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

// EPSG:2177 = PL-2000 zone 6 (CM 18°E)
proj4.defs("EPSG:2177", "+proj=tmerc +lat_0=0 +lon_0=18 +k=0.999923 +x_0=6500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs")
const toWgs84 = (east: number, north: number): [number, number] => {
  const [lng, lat] = proj4("EPSG:2177", "EPSG:4326", [east, north])
  return [lng, lat]
}

export interface BoreholeFeature {
  type: "Feature"
  geometry: {
    type: "Point"
    coordinates: [number, number]
  }
  properties: {
    no: number
    locationId: string
    scopeMethod: string
    locationType: string
    priority: number
    east: number     // WGS84 lng (planned)
    north: number    // WGS84 lat (planned)
    eastFinal: number | null  // WGS84 lng (final, if completed)
    northFinal: number | null
    groundElev: string | number | null
    plannedDepth: number | null
    plannedRemarks: string | null
    vessel: string | null
    dateStarted: string | null
    dateCompleted: string | null
    achievedDepth: number | null
    depthProgress: number | null
    status: string
    samples: string | null
    refusal: number | null
    seabedDepth: number | null
    hseqFlag: number | null
    duration: number | null
    observations: string | null
    deliverableRef: string | null
  }
}

export interface VesselInfo {
  name: string
  mobStart: string | null
  mobEnd: string | null
  mobStatus: string
  opsStart: string | null
  opsEnd: string | null
  opsStatus: string
  demobStart: string | null
  demobEnd: string | null
  demobStatus: string
  currentLocation: string | null  // borehole ID (e.g. "B0-721-01")
}

export interface SummaryData {
  totalLocations: number
  completed: number
  inProgress: number
  pending: number
  overallCompletion: number  // 0-1
  priority1Sites: number
  perScope: {
    scope: string
    total: number
    completed: number
    inProgress: number
    pending: number
    completionPct: number
    priority1: number
    ncrStopWork: number
  }[]
  vessels: VesselInfo[]
}

async function fetchExcelFromOneDrive(accessToken: string): Promise<Buffer> {
  const siteId  = process.env.SHAREPOINT_SITE_ID_SC2602!
  const driveId = process.env.SHAREPOINT_DRIVE_ID_SC2602!
  const fileId  = process.env.ONEDRIVE_FILE_ID_SC2602!

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${fileId}/content`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!response.ok) {
    throw new Error(`Graph API error: ${response.status} ${response.statusText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

function excelDateToISO(raw: any): string | null {
  if (raw == null || raw === "") return null
  const serial = typeof raw === "number" ? raw : parseFloat(raw)
  if (!isNaN(serial) && serial > 1000) {
    const d = new Date((serial - 25569) * 86400 * 1000)
    return d.toISOString().slice(0, 10)  // YYYY-MM-DD
  }
  return String(raw)
}

const SCOPE_CANONICAL: Record<string, string> = {
  "spt boring": "SPT Boring",
  "cpt sounding": "CPT Sounding",
  "continuous core": "Continuous Core",
  "marine masw": "Marine MASW",
  "optional spt": "Optional SPT",
  "optional cc": "Optional CC",
  "fish-return spt": "Fish-Return SPT",
  "fish-return cpt": "Fish-Return CPT",
}

function normalizeScope(raw: string | null | undefined): string {
  if (!raw) return "Unknown"
  const key = String(raw).toLowerCase().trim()
  return SCOPE_CANONICAL[key] || raw  // fallback to original if not in map
}

function parseDetail(workbook: XLSX.WorkBook): BoreholeFeature[] {
  const sheet = workbook.Sheets["DETAIL"]
  if (!sheet) throw new Error("Arkusz DETAIL nie został znaleziony")

  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 0, defval: null })
  const features: BoreholeFeature[] = []

  for (const row of rows) {
    const eastRaw  = parseFloat(row["EAST (Planned)"])
    const northRaw = parseFloat(row["NORTH (Planned)"])
    if (isNaN(eastRaw) || isNaN(northRaw)) continue

    const [lng, lat] = toWgs84(eastRaw, northRaw)

    // Final coordinates (only set if completed)
    let lngFinal: number | null = null
    let latFinal: number | null = null
    const eastFinalRaw = parseFloat(row["EAST (Final)"])
    const northFinalRaw = parseFloat(row["NORTH (Final)"])
    if (!isNaN(eastFinalRaw) && !isNaN(northFinalRaw)) {
      const [lf, latF] = toWgs84(eastFinalRaw, northFinalRaw)
      lngFinal = lf
      latFinal = latF
    }

    // Normalize status
    const statusRaw = String(row["STATUS"] ?? "").trim()
    const statusLower = statusRaw.toLowerCase()
    let status = "Planned"
    if (statusLower === "completed")   status = "Completed"
    if (statusLower === "in progress") status = "In Progress"
    if (statusLower === "on hold")     status = "On Hold"
    if (statusLower === "aborted")     status = "Aborted"
    if (statusLower === "planned")     status = "Planned"

    // Filter out ONSHORE features — offshore campaign only.
    // Excel column H (PLANNED REMARKS) marks these as "...ONSHORE..." (e.g. CC-721-33/34/35).
    // Detection: any occurrence of "onshore" (case-insensitive) in plannedRemarks skips the row.
    const plannedRemarks = row["PLANNED REMARKS"] ?? null
    if (plannedRemarks && /onshore/i.test(String(plannedRemarks))) {
      continue
    }

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {
        no:             row["No."]                       ?? 0,
        locationId:     String(row["LOCATION ID"]        ?? ""),
        scopeMethod:    normalizeScope(row["SCOPE / METHOD"]),
        locationType:   "borehole",
        priority:       row["PRIORITY"]                  ?? 0,
        east:           lng,
        north:          lat,
        eastFinal:      lngFinal,
        northFinal:     latFinal,
        groundElev:     row["GROUND ELEV. (m)"]          ?? null,
        plannedDepth:   row["PLANNED DEPTH (m)"]         ?? null,
        plannedRemarks: row["PLANNED REMARKS"]           ?? null,
        vessel:         row["VESSEL"]                    ?? null,
        dateStarted:    excelDateToISO(row["DATE STARTED"]),
        dateCompleted:  excelDateToISO(row["DATE COMPLETED"]),
        achievedDepth:  row["ACHIEVED DEPTH (m)"]        ?? null,
        depthProgress:  row["DEPTH PROGRESS %"]          ?? null,
        status,
        samples:        row["SAMPLES / SPT N°"]          ?? null,
        refusal:        row["REFUSAL / OBSTRUCTION"]     ?? null,
        seabedDepth:    row["SEABED / WATER DEPTH (m)"]  ?? null,
        hseqFlag:       row["HSEQ / NCR FLAG"]           ?? null,
        duration:       row["Duration (day)"]            ?? null,
        observations:   row["INSPECTOR OBSERVATIONS / REMARKS"] ?? null,
        deliverableRef: row["DELIVERABLE REF."]          ?? null,
      },
    })
  }

  return features
}

function parseMasw(workbook: any): any[] {
  // Find MASW sheet by name regex (case-insensitive)
  const sheetName = workbook.SheetNames.find((n: string) => /masw/i.test(n))
  if (!sheetName) {
    console.log("[MASW] No MASW sheet found in workbook")
    return []
  }

  const sheet = workbook.Sheets[sheetName]
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][]
  if (rows.length < 2) return []

  // Header-based column mapping — find column index by header name
  const headers = (rows[0] || []).map((h: any) => String(h || "").trim())
  const findCol = (patterns: RegExp[]): number => {
    for (const pattern of patterns) {
      const idx = headers.findIndex((h: string) => pattern.test(h))
      if (idx !== -1) return idx
    }
    return -1
  }

  const colMap = {
    no:              findCol([/^no\.?$/i, /^number$/i]),
    locationId:      findCol([/location\s*id/i]),
    scopeMethod:     findCol([/scope\s*\/\s*method/i, /scope/i]),
    priority:        findCol([/priority/i]),
    eastPlanned:     findCol([/east.*planned/i, /^east/i]),
    northPlanned:    findCol([/north.*planned/i, /^north/i]),
    lineLength:      findCol([/line\s*length/i]),
    targetDepth:     findCol([/target.*depth.*penetration/i, /target.*depth/i]),
    plannedRemarks:  findCol([/planned\s*remarks/i]),
    vessel:          findCol([/vessel/i]),
    dateStarted:     findCol([/date\s*started/i]),
    dateCompleted:   findCol([/date\s*completed/i]),
    achievedDepth:   findCol([/achieved\s*depth/i]),
    depthProgress:   findCol([/depth\s*progress/i]),
    status:          findCol([/^status$/i]),
    samples:         findCol([/samples/i]),
    refusal:         findCol([/refusal/i]),
    seabedDepth:     findCol([/seabed.*water\s*depth/i, /seabed/i]),
    hseqFlag:        findCol([/hseq.*ncr/i, /hseq/i]),
    eastFinal:       findCol([/east.*final/i]),
    northFinal:      findCol([/north.*final/i]),
    duration:        findCol([/duration/i]),
    observations:    findCol([/inspector\s*observations/i, /observations/i]),
    deliverableRef:  findCol([/deliverable/i]),
  }

  console.log("[MASW] Sheet:", sheetName, "rows:", rows.length, "columns mapped:", JSON.stringify(colMap))

  const features: any[] = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length === 0) continue

    const locationId = row[colMap.locationId]
    if (!locationId) continue // skip empty rows

    const eastRaw = row[colMap.eastPlanned]
    const northRaw = row[colMap.northPlanned]
    if (eastRaw == null || northRaw == null) continue

    const east2177 = Number(eastRaw)
    const north2177 = Number(northRaw)
    if (!isFinite(east2177) || !isFinite(north2177)) continue

    // Project from EPSG:2177 to WGS84
    const [lng, lat] = toWgs84(east2177, north2177)

    // Status normalization — strip emoji prefix
    const statusRaw = row[colMap.status]
    const status = statusRaw ? String(statusRaw).replace(/^[^\w]+/, "").trim() : "Planned"

    // Final coords (optional)
    let eastFinal: number | null = null, northFinal: number | null = null
    if (colMap.eastFinal !== -1 && colMap.northFinal !== -1) {
      const efRaw = row[colMap.eastFinal], nfRaw = row[colMap.northFinal]
      if (efRaw != null && nfRaw != null && isFinite(Number(efRaw)) && isFinite(Number(nfRaw))) {
        const [lngF, latF] = toWgs84(Number(efRaw), Number(nfRaw))
        eastFinal = lngF; northFinal = latF
      }
    }

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {
        no: row[colMap.no],
        locationId: String(locationId),
        scopeMethod: normalizeScope(row[colMap.scopeMethod] || "Marine MASW"),
        locationType: "masw_line",
        priority: row[colMap.priority] ?? 0,
        east: lng,
        north: lat,
        eastFinal,
        northFinal,
        lineLength: row[colMap.lineLength] ?? null,
        targetDepth: row[colMap.targetDepth] ?? null,
        plannedRemarks: row[colMap.plannedRemarks] ?? null,
        vessel: row[colMap.vessel] ?? null,
        dateStarted: excelDateToISO(row[colMap.dateStarted]),
        dateCompleted: excelDateToISO(row[colMap.dateCompleted]),
        achievedDepth: row[colMap.achievedDepth] ?? null,
        depthProgress: row[colMap.depthProgress] ?? "",
        status,
        samples: row[colMap.samples] ?? null,
        refusal: row[colMap.refusal] ?? null,
        seabedDepth: row[colMap.seabedDepth] ?? null,
        hseqFlag: row[colMap.hseqFlag] ?? null,
        duration: row[colMap.duration] ?? 0,
        observations: row[colMap.observations] ?? null,
        deliverableRef: row[colMap.deliverableRef] ?? null,
      }
    })
  }

  console.log("[MASW] Parsed", features.length, "features")
  return features
}

function parseSummary(workbook: XLSX.WorkBook, boreholes: BoreholeFeature[]): SummaryData {
  const sheet = workbook.Sheets["SUMMARY"]
  if (!sheet) throw new Error("Arkusz SUMMARY nie został znaleziony")

  // Read as raw rows (no header inference) — SUMMARY has non-standard layout
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][]

  // Strip leading status emoji (e.g. "🟡 In Progress" -> "In Progress")
  const cleanStatus = (s: any): string =>
    String(s ?? "").replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]+\s*/u, "").trim()

  // Vessels are in rows 3-21 (0-indexed array).
  // Each vessel takes 3 rows: Mobilization, Operations, Demobilization
  // Column 0 = vessel name (only on first row of triplet)
  // Column 1 = activity, Col 2 = start, Col 3 = end, Col 4 = days, Col 5 = status, Col 8 = current location
  const vessels: VesselInfo[] = []
  let currentVessel: VesselInfo | null = null

  for (let i = 3; i <= 21; i++) {
    const r = rows[i]
    if (!r) continue
    const vesselName = r[0]
    const activity   = r[1]
    const start      = r[2]
    const end        = r[3]
    const status     = r[5]
    const currentLoc = r[8]

    if (vesselName && typeof vesselName === "string" && vesselName.trim() !== "") {
      // New vessel block — push previous if exists
      if (currentVessel) vessels.push(currentVessel)
      currentVessel = {
        name: vesselName.trim(),
        mobStart: null, mobEnd: null, mobStatus: "",
        opsStart: null, opsEnd: null, opsStatus: "",
        demobStart: null, demobEnd: null, demobStatus: "",
        currentLocation: null,
      }
    }
    if (!currentVessel) continue

    const activityLower = String(activity ?? "").toLowerCase()
    const startISO = excelDateToISO(start)
    const endISO   = excelDateToISO(end)
    const statusStr = cleanStatus(status)

    if (activityLower.includes("mob") && !activityLower.includes("demob")) {
      currentVessel.mobStart = startISO
      currentVessel.mobEnd = endISO
      currentVessel.mobStatus = statusStr
    } else if (activityLower.includes("demob")) {
      currentVessel.demobStart = startISO
      currentVessel.demobEnd = endISO
      currentVessel.demobStatus = statusStr
    } else if (activityLower.includes("operation") || activityLower.includes("drilling") || activityLower.includes("survey")) {
      currentVessel.opsStart = startISO
      currentVessel.opsEnd = endISO
      currentVessel.opsStatus = statusStr
    }

    if (currentLoc && typeof currentLoc === "string" && currentLoc.trim() !== "") {
      currentVessel.currentLocation = currentLoc.trim()
    }
  }
  if (currentVessel) vessels.push(currentVessel)

  // Total stats — row 24 (0-indexed)
  // Layout: [TOTAL_LOCATIONS, _, "completed / inProgress", _, PENDING, _, OVERALL_COMPLETION, _, _]
  const totalRow = rows[24] ?? []
  const totalLocations = Number(totalRow[0]) || 0
  const compStr = String(totalRow[2] ?? "")
  const compMatch = compStr.match(/(\d+)\s*\/\s*(\d+)/)
  const completed = compMatch ? Number(compMatch[1]) : 0
  const inProgress = compMatch ? Number(compMatch[2]) : 0
  const pending = Number(totalRow[4]) || 0
  const overallCompletion = Number(totalRow[6]) || 0

  // Per-scope breakdown — rows 29-36 (0-indexed); row 28 is "TOTAL (ALL SCOPES)", skip it
  const perScope: SummaryData["perScope"] = []
  for (let i = 29; i <= 36; i++) {
    const r = rows[i]
    if (!r || !r[0]) continue
    perScope.push({
      scope:         normalizeScope(String(r[0])),
      total:         Number(r[1]) || 0,
      completed:     Number(r[2]) || 0,
      inProgress:    Number(r[3]) || 0,
      pending:       Number(r[4]) || 0,
      completionPct: Number(r[5]) || 0,
      priority1:     Number(r[6]) || 0,
      ncrStopWork:   Number(r[7]) || 0,
    })
  }

  // Compute Priority 1 sites count from boreholes (cross-reference)
  const priority1Sites = boreholes.filter(b => b.properties.priority === 1).length

  return {
    totalLocations,
    completed,
    inProgress,
    pending,
    overallCompletion,
    priority1Sites,
    perScope,
    vessels,
  }
}

export async function fetchGeoDrillingData(): Promise<{ features: BoreholeFeature[]; summary: SummaryData }> {
  const appToken = await getAppToken()
  const buffer = await fetchExcelFromOneDrive(appToken)
  const workbook = XLSX.read(buffer, { type: "buffer" })

  const detailFeatures = parseDetail(workbook)
  const maswFeatures   = parseMasw(workbook)
  const features = [...detailFeatures, ...maswFeatures]
  const summary  = parseSummary(workbook, features)

  // Enrich vessels with current location coordinates
  for (const v of summary.vessels) {
    if (!v.currentLocation) continue
    const bh = features.find(b => b.properties.locationId === v.currentLocation)
    if (bh) {
      (v as any).currentLng = bh.properties.east
      ;(v as any).currentLat = bh.properties.north
    }
  }

  return { features, summary }
}
