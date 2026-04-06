import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "./auth/[...nextauth]"

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
  const tirRev = r.puxo > 0 ? getRevision(r.tir) : null
  const puxoStatus = getPuxoStatus(r.puxo, r.removed)

  const docsRequired = ["alarp_1", ...(r.alarp_2 !== null ? ["alarp_2"] : []), ...(r.puxo > 0 ? ["tir"] : [])]
  const docsFinal = [
    alarp1Rev === "Final",
    ...(r.alarp_2 !== null ? [alarp2Rev === "Final"] : []),
    ...(r.puxo > 0 ? [tirRev === "Final"] : []),
  ]
  const docsIFR = [
    alarp1Rev === "IFR",
    ...(r.alarp_2 !== null ? [alarp2Rev === "IFR"] : []),
    ...(r.puxo > 0 ? [tirRev === "IFR"] : []),
  ]

  const allFinal = docsFinal.every(Boolean)
  const anyIFR = docsIFR.some(Boolean)
  const anyMissing = [alarp1Rev, ...(r.alarp_2 !== null ? [alarp2Rev] : []), ...(r.puxo > 0 && tirRev ? [tirRev] : [])].some(v => v === "Missing")

  let docStatus: "Final" | "IFR" | "Incomplete" | "Missing"
  if (allFinal) docStatus = "Final"
  else if (anyIFR && !anyMissing) docStatus = "IFR"
  else docStatus = anyMissing ? "Missing" : "Incomplete"

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
    const enriched = data.map(enrichRecord)
    res.status(200).json(enriched)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
}
