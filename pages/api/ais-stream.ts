import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "./auth/[...nextauth]"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).end()

  const apiKey = process.env.DATADOCKED_KEY
  if (!apiKey) return res.status(500).end()

  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.flushHeaders()

  const mmsi = "261007303"

  const fetchAndSend = async () => {
    try {
      const r = await fetch(
        `https://datadocked.com/api/vessels_operations/get-vessel-location?imo_or_mmsi=${mmsi}`,
        { headers: { "accept": "application/json", "x-api-key": apiKey } }
      )
      if (!r.ok) return
      const data = await r.json()
      const d = data.detail
      if (!d?.latitude || !d?.longitude) return

      const msg = JSON.stringify({
        mmsi,
        name: d.name,
        lat: parseFloat(d.latitude),
        lng: parseFloat(d.longitude),
        heading: parseFloat(d.heading) || 0,
        speed: parseFloat(d.speed) || 0,
        status: d.navigationalStatus,
        destination: d.destination,
        positionReceived: d.positionReceived,
      })
      res.write(`data: ${msg}\n\n`)
    } catch {}
  }

  await fetchAndSend()
  const interval = setInterval(fetchAndSend, 60000)

  req.on("close", () => {
    clearInterval(interval)
    res.end()
  })
}
