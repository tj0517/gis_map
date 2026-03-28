import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "./auth/[...nextauth]"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: "Unauthorized" })

  const apiKey = process.env.STORMGLASS_KEY
  if (!apiKey) return res.status(500).json({ error: "No API key" })

  const lat = parseFloat(req.query.lat as string) || 54.84
  const lng = parseFloat(req.query.lng as string) || 17.79

  const now = new Date()
  const end = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  try {
    const r = await fetch(
      `https://api.stormglass.io/v2/weather/point?lat=${lat}&lng=${lng}&params=waveHeight,swellPeriod,windSpeed,windDirection,gust,airTemperature&source=fmi,smhi,fcoo&start=${now.toISOString()}&end=${end.toISOString()}`,
      { headers: { Authorization: apiKey } }
    )
    if (!r.ok) return res.status(r.status).json({ error: "StormGlass error" })
    const data = await r.json()

    const hours = data.hours.map((h: any) => ({
      time: h.time,
      waveHeight: h.waveHeight?.smhi ?? h.waveHeight?.fmi ?? h.waveHeight?.fcoo ?? null,
      swellPeriod: h.swellPeriod?.smhi ?? h.swellPeriod?.fmi ?? h.swellPeriod?.fcoo ?? null,
      windSpeed: h.windSpeed?.smhi ?? h.windSpeed?.fmi ?? null,
      windDirection: h.windDirection?.smhi ?? h.windDirection?.fmi ?? null,
      gust: h.gust?.smhi ?? h.gust?.fmi ?? null,
      airTemp: h.airTemperature?.smhi ?? h.airTemperature?.fmi ?? null,
    }))

    res.status(200).json({ hours })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
}
