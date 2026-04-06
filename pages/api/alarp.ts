import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "./auth/[...nextauth]"
import proj4 from "proj4"
proj4.defs("EPSG:2180", "+proj=tmerc +lat_0=0 +lon_0=19 +k=0.9993 +x_0=500000 +y_0=-5300000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs")

export interface FugroRecord {
  id: string
  type: string
  xcoord: number
  ycoord: number
  alarp_1: string | null
  alarp_2: string | null
  tir: string | null
  puxo: number
  removed: number
  risk_puxo: string | null
  boulders: number | null
  slope: number | null
  assets: number | null
  sector: string
}

function getRevision(filename: string | null): "IFR" | "Final" | "Missing" {
  if (!filename) return "Missing"
  const match = filename.match(/_(\d{2})_EN/)
  if (!match) return "Missing"
  if (match[1] === "00") return "IFR"
  if (match[1] === "01") return "Final"
  return "Missing"
}

function getPuxoStatus(puxo: number, removed: number): "clear" | "partial" | "hazard" | "none" {
  if (puxo === 0) return "none"
  if (removed === 0) return "hazard"
  if (removed >= puxo) return "clear"
  return "partial"
}

export function enrichRecord(r: FugroRecord) {
  const alarp1Rev = getRevision(r.alarp_1)
  const alarp2Rev = getRevision(r.alarp_2)
  // TIR liczy się tylko gdy puxo > 0
  const tirRev = r.puxo > 0 ? getRevision(r.tir) : null
  const puxoStatus = getPuxoStatus(r.puxo, r.removed)

  const isOnshore = r.sector?.toLowerCase() === "onshore"
  const alarp2Required = !isOnshore

  let docStatus: "Final" | "IFR" | "Incomplete" | "Missing"

  if (isOnshore) {
    // Onshore: tylko alarp_1 wymagane
    if (alarp1Rev === "Final") {
      const tirOk = r.puxo === 0 || tirRev === "Final" || tirRev === "IFR"
      docStatus = !tirOk ? "Incomplete" : "Final"
    } else if (alarp1Rev === "IFR") {
      docStatus = "IFR"
    } else {
      docStatus = "Missing"
    }
  } else {
    // Offshore: alarp_1 + alarp_2 wymagane
    if (r.alarp_2 === null || alarp2Rev === "Missing") {
      docStatus = "Missing"
    } else if (alarp2Rev === "IFR") {
      docStatus = "IFR"
    } else if (alarp2Rev === "Final" && alarp1Rev === "Final") {
      const tirOk = r.puxo === 0 || tirRev === "Final" || tirRev === "IFR"
      if (!tirOk) {
        docStatus = "Incomplete"
      } else {
        docStatus = "Final"
      }
    } else {
      docStatus = "Incomplete"
    }
  }

  return {
    ...r,
    alarp1Rev,
    alarp2Rev,
    tirRev,
    puxoStatus,
    docStatus,
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: "Unauthorized" })

  try {
    const r = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/FUGRO_GEO_Dashboard_rev1?select=id,type,xcoord,ycoord,alarp_1,alarp_2,tir,puxo,removed,risk_puxo,boulders,slope,assets,sector&order=id`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
      }
    )
    if (!r.ok) throw new Error(`Supabase error ${r.status}`)
    const data: FugroRecord[] = await r.json()
    const enriched = data.map(r => {
      const [lng, lat] = proj4("EPSG:2180", "EPSG:4326", [r.xcoord, r.ycoord])
      return { ...enrichRecord(r), lat, lng }
    })
    res.status(200).json(enriched)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
}
