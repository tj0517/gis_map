import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "./auth/[...nextauth]"

const MMSI_LIST = [
  "261007303", // Baltic Constructor
  "261011330", // Baltic Jet
  "261098090", // Baltic Messenger
  "261005510", // WŁA-184 HELOT
  "261029790", // Hektor AG
  "261005193", // PM Explorer
  "261001480", // Geo Scanner
]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).end()

  const apiKey = process.env.MYSHIPTRACKING_KEY
  if (!apiKey) return res.status(500).end()

  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.setHeader("X-Accel-Buffering", "no")
  res.flushHeaders()

  const fetchAndSend = async () => {
    await Promise.all(MMSI_LIST.map(async (mmsi) => {
      try {
        const r = await fetch(
          `https://api.myshiptracking.com/api/v2/vessel?mmsi=${mmsi}`,
          { headers: { "x-api-key": apiKey } }
        )
        if (!r.ok) return
        const data = await r.json()
        const d = data.data
        if (!d?.lat || !d?.lng) return
        const msg = JSON.stringify({
          mmsi,
          name: d.vessel_name,
          lat: parseFloat(d.lat),
          lng: parseFloat(d.lng),
          heading: parseFloat(d.course) || 0,
          speed: parseFloat(d.speed) || 0,
          status: String(d.nav_status),
          positionReceived: d.received,
        })
        res.write(`data: ${msg}\n\n`)
        if (typeof (res as any).flush === "function") (res as any).flush()
      } catch {}
    }))
  }

  await fetchAndSend()
  const interval = setInterval(fetchAndSend, 60000)

  req.on("close", () => {
    clearInterval(interval)
    res.end()
  })
}
