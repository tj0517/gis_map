import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "./auth/[...nextauth]"
import { fetchPuxoFeatures, UXOFeature } from "../../lib/fetchPuxoData"
export type { UXOFeature }

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  try {
    const features = await fetchPuxoFeatures()

    const inspected = features.filter(f => f.properties.status === "Inspected").length
    const removed   = features.filter(f => f.properties.status === "Removed").length
    const pending   = features.filter(f => f.properties.status === "pUXO").length

    const geojson: GeoJSON = {
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

    res.setHeader("Cache-Control", "private, max-age=300")
    res.status(200).json(geojson)
  } catch (error: any) {
    console.error("API /data error:", error)
    res.status(500).json({ error: error.message })
  }
}
