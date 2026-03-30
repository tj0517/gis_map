import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "./auth/[...nextauth]"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: "Unauthorized" })

  const apiKey = process.env.STORMGLASS_KEY
  if (!apiKey) return res.status(500).json({ error: "No API key" })

  const lat = parseFloat(req.query.lat as string) || 54.84
  const lng = parseFloat(req.query.lng as string) || 17.79
  const locationId = req.query.locationId as string || "geo3"

  const now = new Date()
  const end = new Date(now.getTime() + 48 * 60 * 60 * 1000)
  // StormGlass wymaga unix timestamp zamiast ISO string
  const startTs = Math.floor(now.getTime() / 1000)
  const endTs = Math.floor(end.getTime() / 1000)

  try {
    const r = await fetch(
      `https://api.stormglass.io/v2/weather/point?lat=${lat}&lng=${lng}&params=waveHeight,swellPeriod,windSpeed,windDirection,gust,airTemperature&source=fmi,smhi,fcoo&start=${startTs}&end=${endTs}`,
      { headers: { Authorization: apiKey } }
    )

    if (r.status === 402) return res.status(402).json({ error: "Przekroczono dzienny limit StormGlass (10 req/dzień). Dane dostępne po północy UTC." })
    if (!r.ok) return res.status(r.status).json({ error: `StormGlass error ${r.status}` })

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

    // Zapisz do Supabase tylko GEO3
    if (locationId === "geo3") {
      const rows = hours.map((h: any) => ({
        location_id: "geo3",
        fetched_at: now.toISOString(),
        forecast_time: h.time,
        wave_height: h.waveHeight,
        swell_period: h.swellPeriod,
        wind_speed: h.windSpeed,
        wind_direction: h.windDirection,
        gust: h.gust,
        air_temp: h.airTemp,
      }))

      const { error: dbError } = await supabase
        .from("weather_forecasts")
        .insert(rows)

      if (dbError) console.error("Supabase insert error:", dbError.message)
      else console.log(`Saved ${rows.length} rows to Supabase for GEO3`)
    }

    res.status(200).json({ hours })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
}
