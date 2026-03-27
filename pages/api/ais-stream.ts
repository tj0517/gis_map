import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "./auth/[...nextauth]"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).end()

  const apiKey = process.env.MYSHIPTRACKING_KEY
  if (!apiKey) return res.status(500).end()

  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.flushHeaders()

  const fetchAndSend = async () => {
    try {
      const r = await fetch(
        "https://api.myshiptracking.com/api/v2/vessel/status?mmsi=261007303",
        { headers: { "Authorization": `Bearer ${apiKey}` } }
      )
      if (!r.ok) return
      const data = await r.json()
      const d = data.data
      if (!d?.lat || !d?.lng) return
      const msg = JSON.stringify({
        mmsi: "261007303",
        name: d.name,
        lat: parseFloat(d.lat),
        lng: parseFloat(d.lng),
        heading: parseFloat(d.heading) || 0,
        speed: parseFloat(d.speed) || 0,
        status: d.navigational_status,
        destination: d.destination,
        positionReceived: d.timestamp,
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
