import type { NextApiRequest, NextApiResponse } from "next"
import { fetchGeoDrillingData } from "../../lib/fetchGeoDrillingData"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { features, summary } = await fetchGeoDrillingData()

    const statusCounts: Record<string, number> = {
      Planned: 0,
      "In Progress": 0,
      Completed: 0,
      "On Hold": 0,
      Aborted: 0,
    }
    for (const f of features) {
      const s = f.properties.status
      if (statusCounts[s] !== undefined) statusCounts[s]++
    }

    res.status(200).json({
      type: "FeatureCollection",
      features,
      meta: {
        total: features.length,
        ...statusCounts,
        priority1: summary.priority1Sites,
        overallCompletion: summary.overallCompletion,
        perScope: summary.perScope,
        vessels: summary.vessels,
      },
    })
  } catch (err: any) {
    console.error("[/api/geo-drilling] error:", err)
    res.status(500).json({ error: err?.message ?? String(err) })
  }
}
