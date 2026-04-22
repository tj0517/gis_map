import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/router"
import { useEffect, useRef, useState } from "react"
import Head from "next/head"
import type { GeoJSON, UXOFeature } from "./api/data"
import { getMarkerStyle, LEGEND_ITEMS } from "../lib/symbology"
import { analyzeWeather } from "../lib/weatherAssessment"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from "recharts"

let L: any = null

const WEATHER_LOCATIONS = [
  { id: "geo3",       label: "GEO3",              lat: 54.84,    lng: 17.79    },
  { id: "leba",       label: "Port Łeba",         lat: 54.78525, lng: 17.56319 },
  { id: "wladysl",    label: "Port Władysławowo", lat: 54.79791, lng: 18.44210 },
  { id: "assessment", label: "⚡ Assessment",     lat: 54.84,    lng: 17.79    },
]

const GEO3_TEST_DATA = [
  { time: "2026-03-29T17:00:00Z", waveHeight: 0.43, swellPeriod: null, windSpeed: 6.38, windDirection: 269, gust: 7.94, airTemp: 2.9 },
  { time: "2026-03-29T18:00:00Z", waveHeight: 0.43, swellPeriod: null, windSpeed: 6.02, windDirection: 267, gust: 7.94, airTemp: 3.0 },
  { time: "2026-03-29T19:00:00Z", waveHeight: 0.43, swellPeriod: null, windSpeed: 5.92, windDirection: 266, gust: 7.51, airTemp: 2.9 },
  { time: "2026-03-29T20:00:00Z", waveHeight: 0.45, swellPeriod: null, windSpeed: 5.30, windDirection: 246, gust: 7.51, airTemp: 3.1 },
  { time: "2026-03-29T21:00:00Z", waveHeight: 0.47, swellPeriod: null, windSpeed: 6.28, windDirection: 233, gust: 7.72, airTemp: 2.9 },
  { time: "2026-03-29T22:00:00Z", waveHeight: 0.47, swellPeriod: null, windSpeed: 6.90, windDirection: 231, gust: 8.57, airTemp: 2.2 },
  { time: "2026-03-29T23:00:00Z", waveHeight: 0.47, swellPeriod: null, windSpeed: 6.79, windDirection: 230, gust: 8.89, airTemp: 2.3 },
  { time: "2026-03-30T00:00:00Z", waveHeight: 0.47, swellPeriod: null, windSpeed: 6.28, windDirection: 227, gust: 8.49, airTemp: 2.4 },
  { time: "2026-03-30T01:00:00Z", waveHeight: 0.45, swellPeriod: null, windSpeed: 5.30, windDirection: 213, gust: 7.94, airTemp: 2.1 },
  { time: "2026-03-30T02:00:00Z", waveHeight: 0.45, swellPeriod: null, windSpeed: 5.51, windDirection: 206, gust: 7.20, airTemp: 1.6 },
  { time: "2026-03-30T03:00:00Z", waveHeight: 0.47, swellPeriod: null, windSpeed: 5.71, windDirection: 199, gust: 7.10, airTemp: 1.4 },
  { time: "2026-03-30T04:00:00Z", waveHeight: 0.51, swellPeriod: null, windSpeed: 6.38, windDirection: 185, gust: 7.82, airTemp: 2.4 },
  { time: "2026-03-30T05:00:00Z", waveHeight: 0.55, swellPeriod: null, windSpeed: 7.20, windDirection: 183, gust: 8.80, airTemp: 2.7 },
  { time: "2026-03-30T06:00:00Z", waveHeight: 0.54, swellPeriod: null, windSpeed: 7.72, windDirection: 186, gust: 9.42, airTemp: 2.7 },
  { time: "2026-03-30T07:00:00Z", waveHeight: 0.53, swellPeriod: null, windSpeed: 7.61, windDirection: 178, gust: 9.32, airTemp: 2.8 },
  { time: "2026-03-30T08:00:00Z", waveHeight: 0.51, swellPeriod: null, windSpeed: 7.61, windDirection: 173, gust: 9.32, airTemp: 2.8 },
  { time: "2026-03-30T09:00:00Z", waveHeight: 0.49, swellPeriod: null, windSpeed: 7.41, windDirection: 172, gust: 9.22, airTemp: 3.1 },
  { time: "2026-03-30T10:00:00Z", waveHeight: 0.46, swellPeriod: null, windSpeed: 7.51, windDirection: 168, gust: 9.12, airTemp: 4.1 },
  { time: "2026-03-30T11:00:00Z", waveHeight: 0.44, swellPeriod: null, windSpeed: 6.69, windDirection: 165, gust: 9.01, airTemp: 4.9 },
  { time: "2026-03-30T12:00:00Z", waveHeight: 0.40, swellPeriod: null, windSpeed: 5.30, windDirection: 159, gust: 7.94, airTemp: 5.4 },
  { time: "2026-03-30T13:00:00Z", waveHeight: 0.41, swellPeriod: null, windSpeed: 0.72, windDirection: 170, gust: 3.13, airTemp: 5.7 },
  { time: "2026-03-30T14:00:00Z", waveHeight: 0.49, swellPeriod: null, windSpeed: 0.51, windDirection: 226, gust: 3.54, airTemp: 5.7 },
  { time: "2026-03-30T15:00:00Z", waveHeight: 0.56, swellPeriod: null, windSpeed: 1.29, windDirection: 248, gust: 1.49, airTemp: 5.0 },
  { time: "2026-03-30T16:00:00Z", waveHeight: 0.58, swellPeriod: null, windSpeed: 5.51, windDirection: 275, gust: 8.19, airTemp: 4.1 },
  { time: "2026-03-30T17:00:00Z", waveHeight: 0.57, swellPeriod: null, windSpeed: 6.79, windDirection: 263, gust: 8.19, airTemp: 3.8 },
  { time: "2026-03-30T18:00:00Z", waveHeight: 0.60, swellPeriod: null, windSpeed: 6.02, windDirection: 254, gust: 8.60, airTemp: 4.0 },
  { time: "2026-03-30T19:00:00Z", waveHeight: 0.66, swellPeriod: null, windSpeed: 6.28, windDirection: 254, gust: 7.61, airTemp: 4.0 },
  { time: "2026-03-30T20:00:00Z", waveHeight: 0.75, swellPeriod: null, windSpeed: 6.59, windDirection: 246, gust: 8.19, airTemp: 3.9 },
  { time: "2026-03-30T21:00:00Z", waveHeight: 0.79, swellPeriod: null, windSpeed: 5.30, windDirection: 228, gust: 8.03, airTemp: 3.8 },
  { time: "2026-03-30T22:00:00Z", waveHeight: 0.75, swellPeriod: null, windSpeed: 6.59, windDirection: 239, gust: 8.09, airTemp: 3.7 },
  { time: "2026-03-30T23:00:00Z", waveHeight: 0.69, swellPeriod: null, windSpeed: 6.38, windDirection: 251, gust: 8.03, airTemp: 3.7 },
  { time: "2026-03-31T00:00:00Z", waveHeight: 0.65, swellPeriod: null, windSpeed: 5.10, windDirection: 237, gust: 7.72, airTemp: 3.8 },
  { time: "2026-03-31T01:00:00Z", waveHeight: 0.64, swellPeriod: null, windSpeed: 4.68, windDirection: 239, gust: 6.59, airTemp: 3.6 },
  { time: "2026-03-31T02:00:00Z", waveHeight: 0.61, swellPeriod: null, windSpeed: 5.61, windDirection: 265, gust: 6.90, airTemp: 3.5 },
  { time: "2026-03-31T03:00:00Z", waveHeight: 0.57, swellPeriod: null, windSpeed: 5.10, windDirection: 265, gust: 6.79, airTemp: 3.5 },
  { time: "2026-03-31T04:00:00Z", waveHeight: 0.60, swellPeriod: null, windSpeed: 5.71, windDirection: 243, gust: 6.90, airTemp: 3.4 },
  { time: "2026-03-31T05:00:00Z", waveHeight: 0.60, swellPeriod: null, windSpeed: 6.12, windDirection: 244, gust: 7.41, airTemp: 3.4 },
  { time: "2026-03-31T06:00:00Z", waveHeight: 0.52, swellPeriod: null, windSpeed: 5.30, windDirection: 253, gust: 8.03, airTemp: 3.4 },
  { time: "2026-03-31T07:00:00Z", waveHeight: 0.47, swellPeriod: null, windSpeed: 4.42, windDirection: 265, gust: 6.38, airTemp: 3.4 },
  { time: "2026-03-31T08:00:00Z", waveHeight: 0.45, swellPeriod: null, windSpeed: 4.32, windDirection: 261, gust: 5.51, airTemp: 3.4 },
  { time: "2026-03-31T09:00:00Z", waveHeight: 0.43, swellPeriod: null, windSpeed: 6.02, windDirection: 271, gust: 7.31, airTemp: 3.3 },
  { time: "2026-03-31T10:00:00Z", waveHeight: 0.43, swellPeriod: null, windSpeed: 5.00, windDirection: 271, gust: 7.31, airTemp: 3.4 },
  { time: "2026-03-31T11:00:00Z", waveHeight: 0.43, swellPeriod: null, windSpeed: 5.30, windDirection: 265, gust: 6.28, airTemp: 3.5 },
  { time: "2026-03-31T12:00:00Z", waveHeight: 0.45, swellPeriod: null, windSpeed: 5.61, windDirection: 270, gust: 6.90, airTemp: 3.6 },
  { time: "2026-03-31T13:00:00Z", waveHeight: 0.48, swellPeriod: null, windSpeed: 5.00, windDirection: 267, gust: 6.69, airTemp: 3.7 },
  { time: "2026-03-31T14:00:00Z", waveHeight: 0.50, swellPeriod: null, windSpeed: 4.42, windDirection: 260, gust: 6.02, airTemp: 3.8 },
  { time: "2026-03-31T15:00:00Z", waveHeight: 0.50, swellPeriod: null, windSpeed: 4.42, windDirection: 260, gust: 6.02, airTemp: 3.8 },
  { time: "2026-03-31T16:00:00Z", waveHeight: 0.49, swellPeriod: null, windSpeed: 4.42, windDirection: 260, gust: 6.02, airTemp: 3.8 },
  { time: "2026-03-31T17:00:00Z", waveHeight: 0.47, swellPeriod: null, windSpeed: 4.42, windDirection: 260, gust: 6.02, airTemp: 3.8 },
]

const SIMOPS_VESSELS = [
  { mmsi: "261007303", name: "Baltic Constructor", role: "UXO Survey",      color: "#E24B4A" },
  { mmsi: "261011330", name: "Baltic Jet",         role: "UXO Support",     color: "#F0A500" },
  { mmsi: "261098090", name: "Baltic Messenger",   role: "UXO Support",     color: "#EF9F27" },
  { mmsi: "261005510", name: "WŁA-184 HELOT",      role: "Environmental",   color: "#378ADD" },
  { mmsi: "261029790", name: "Hektor AG",          role: "Environmental",   color: "#60A5FA" },
  { mmsi: "261005193", name: "PM Explorer",        role: "Environmental",   color: "#5BA4CF" },
  { mmsi: "261001480", name: "Geo Scanner",        role: "Magnetometers",   color: "#A78BFA" },
]

const ZONE_OPTIONS = [0, 50, 100, 250, 500, 1000]

export default function MapPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const mapRef    = useRef<any>(null)
  const mapDivRef = useRef<HTMLDivElement>(null)

  const [geojson, setGeojson]           = useState<GeoJSON | null>(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [selected, setSelected]         = useState<UXOFeature | null>(null)
  const [filterStatus, setFilterStatus] = useState("ALL")
  const [filterSector, setFilterSector] = useState("ALL")
  const [showLegend, setShowLegend]     = useState(true)
  const [lastRefresh, setLastRefresh]   = useState<Date | null>(null)
  const [showGeo3, setShowGeo3]         = useState(true)
  const [showSectors, setShowSectors]   = useState(true)
  const [showCorridor, setShowCorridor] = useState(true)
  const layerGeo3Ref     = useRef<any>(null)
  const layerSectorsRef  = useRef<any>(null)
  const layerCorridorRef = useRef<any>(null)
  const [mapReady, setMapReady]         = useState(false)
  const [showVessels, setShowVessels]   = useState(false)
  const [activeTab, setActiveTab] = useState<"uxo" | "weather" | "alarp">("uxo")
  const [alarpData, setAlarpData] = useState<any[]>([])
  const [alarpLoading, setAlarpLoading] = useState(false)
  const [alarpError, setAlarpError] = useState<string | null>(null)
  const [alarpSelected, setAlarpSelected] = useState<any | null>(null)
  const alarpMapRef = useRef<any>(null)
  const alarpMapDivRef = useRef<HTMLDivElement>(null)
  const alarpMarkersRef = useRef<Map<string, any>>(new Map())
  const [weatherTab, setWeatherTab] = useState<string>("geo3")
  const [weatherData, setWeatherData] = useState<Record<string, any[]>>({})
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const [weatherFetched, setWeatherFetched] = useState(false)
  const [weatherLastFetch, setWeatherLastFetch] = useState<Date | null>(null)
  const [vesselZones, setVesselZones]   = useState<Record<string, number>>(() =>
    Object.fromEntries(SIMOPS_VESSELS.map(v => [v.mmsi, v.mmsi === "261007303" ? 500 : 0]))
  )
  const vesselsRef   = useRef<Map<string, any>>(new Map())
  const [measureActive, setMeasureActive] = useState(false)
  const [cursorCoords, setCursorCoords]   = useState<{lat: number, lng: number} | null>(null)
  const [searchId, setSearchId]           = useState("")
  const measurePointsRef     = useRef<any[]>([])
  const measureLayerRef      = useRef<any>(null)
  const markersRef           = useRef<Map<string, any>>(new Map())
  const activeTooltipMarkerRef = useRef<any>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/data")
      if (!res.ok) throw new Error(`Błąd ${res.status}`)
      const data: GeoJSON = await res.json()
      setGeojson(data)
      setLastRefresh(new Date())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      fetchData()
      const interval = setInterval(fetchData, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [status])

  useEffect(() => {
    if (status !== "authenticated") return
    if (!mapDivRef.current) return
    if ((mapDivRef.current as any)._leaflet_id) {
      mapRef.current?.remove()
      mapRef.current = null
    }
    import("leaflet").then((leaflet) => {
      L = leaflet.default
      if (!mapDivRef.current) return
      if ((mapDivRef.current as any)._leaflet_id) return
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({ iconUrl: "", shadowUrl: "" })
      const map = L.map(mapDivRef.current!, { center: [54.84, 17.79], zoom: 13, zoomControl: true })
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors", maxZoom: 19,
      }).addTo(map)
      L.tileLayer("https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png", {
        attribution: "© OpenSeaMap contributors", maxZoom: 18, opacity: 0.7,
      }).addTo(map)
      mapRef.current = map
      setMapReady(true)
    })
    return () => { mapRef.current?.remove(); mapRef.current = null }
  }, [status])

  useEffect(() => {
    if (status !== "authenticated") return
    const init = () => {
      if (!mapRef.current || !L) { setTimeout(init, 200); return }
      fetch("/layers/GEO3_Area.geojson").then(r => r.json()).then(data => {
        if (!mapRef.current) return
        const layer = L.geoJSON(data, {
          filter: (f: any) => f.properties?.Layer === "zakres obszaru GEO3 - część morska",
          style: { fill: false, color: "#666", weight: 1, opacity: 0.6 },
        })
        layerGeo3Ref.current = layer
        if (showGeo3) layer.addTo(mapRef.current)
      }).catch(() => {})
      fetch("/layers/UXO_Sectors.geojson").then(r => r.json()).then(data => {
        if (!mapRef.current) return
        const layer = L.geoJSON(data, {
          style: { fillColor: "#4A90D9", fillOpacity: 0.15, color: "#2E6FA3", weight: 1.5 },
          onEachFeature: (feature: any, lyr: any) => {
            const label = feature.properties?.nazwa
            if (label) lyr.bindTooltip(String(label), { permanent: true, direction: "center", className: "geojson-label" })
          },
        })
        layerSectorsRef.current = layer
        if (showSectors) layer.addTo(mapRef.current)
      }).catch(() => {})
      fetch("/layers/Clearance_Corridor.geojson").then(r => r.json()).then(data => {
        if (!mapRef.current) return
        const layer = L.geoJSON(data, {
          style: { fill: false, color: "#E8871E", weight: 2, dashArray: "6,4" },
          onEachFeature: (feature: any, lyr: any) => {
            const label = feature.properties?.Location
            if (label) lyr.bindTooltip(String(label), { permanent: true, direction: "center", className: "geojson-label" })
          },
        })
        layerCorridorRef.current = layer
        if (showCorridor) layer.addTo(mapRef.current)
      }).catch(() => {})
    }
    init()
  }, [status])

  useEffect(() => {
    if (!mapRef.current || !layerGeo3Ref.current) return
    if (showGeo3) layerGeo3Ref.current.addTo(mapRef.current)
    else mapRef.current.removeLayer(layerGeo3Ref.current)
  }, [showGeo3])

  useEffect(() => {
    if (!mapRef.current || !layerSectorsRef.current) return
    if (showSectors) layerSectorsRef.current.addTo(mapRef.current)
    else mapRef.current.removeLayer(layerSectorsRef.current)
  }, [showSectors])

  useEffect(() => {
    if (!mapRef.current || !layerCorridorRef.current) return
    if (showCorridor) layerCorridorRef.current.addTo(mapRef.current)
    else mapRef.current.removeLayer(layerCorridorRef.current)
  }, [showCorridor])

  useEffect(() => {
    if (!mapRef.current || !L) return
    const map = mapRef.current
    if (!measureActive) {
      if (measureLayerRef.current) measureLayerRef.current.clearLayers()
      measurePointsRef.current = []
      map.getContainer().style.cursor = ""
      return
    }
    map.getContainer().style.cursor = "crosshair"
    const layer = L.layerGroup().addTo(map)
    measureLayerRef.current = layer
    const onClick = (e: any) => {
      const { lat, lng } = e.latlng
      measurePointsRef.current.push([lat, lng])
      const pts = measurePointsRef.current
      layer.clearLayers()
      pts.forEach((pt, i) => {
        L.circleMarker(pt, { radius: 5, color: "#333", weight: 2, fillColor: "#378ADD", fillOpacity: 1 }).addTo(layer)
        if (i > 0) {
          const prev = pts[i - 1]
          const dist = map.distance(prev, pt)
          const mid = [(prev[0] + pt[0]) / 2, (prev[1] + pt[1]) / 2]
          const dLat = pt[0] - prev[0]
          const dLng = pt[1] - prev[1]
          const bearing = (Math.atan2(dLng, dLat) * 180 / Math.PI + 360) % 360
          L.polyline([prev, pt], { color: "#378ADD", weight: 2, dashArray: "6,4" }).addTo(layer)
          const distLabel = dist >= 1000 ? (dist / 1000).toFixed(2) + " km" : dist.toFixed(0) + " m"
          L.marker(mid, {
            icon: L.divIcon({
              className: "", iconSize: [0, 0],
              html: `<div style="background:rgba(255,255,255,0.92);color:#111;font-size:11px;padding:2px 6px;border-radius:4px;border:1px solid #378ADD;white-space:nowrap;line-height:1.6;display:inline-block">
                <span style="font-weight:600">${distLabel}</span><br/>
                <span style="color:#444"><span style="display:inline-block;transform:rotate(${bearing.toFixed(0)}deg)">↑</span> ${bearing.toFixed(1)}°</span>
              </div>`,
              iconAnchor: [40, 10]
            })
          }).addTo(layer)
        }
      })
      if (pts.length > 1) {
        let total = 0
        for (let i = 1; i < pts.length; i++) total += map.distance(pts[i - 1], pts[i])
        const last = pts[pts.length - 1]
        const totalLabel = total >= 1000 ? (total / 1000).toFixed(2) + " km" : total.toFixed(0) + " m"
        L.marker(last, {
          icon: L.divIcon({
            className: "", iconSize: [0, 0],
            html: `<div style="background:#1F4E79;color:#fff;font-size:12px;font-weight:600;padding:3px 8px;border-radius:4px;border:1px solid #378ADD;white-space:nowrap">∑ ${totalLabel}</div>`,
            iconAnchor: [-5, 10]
          })
        }).addTo(layer)
      }
    }
    map.on("click", onClick)
    return () => { map.off("click", onClick); map.getContainer().style.cursor = "" }
  }, [measureActive, mapReady])

  useEffect(() => {
    if (!mapRef.current || !mapReady) return
    const map = mapRef.current
    const onMove = (e: any) => setCursorCoords({ lat: e.latlng.lat, lng: e.latlng.lng })
    const onOut = () => setCursorCoords(null)
    map.on("mousemove", onMove)
    map.on("mouseout", onOut)
    return () => { map.off("mousemove", onMove); map.off("mouseout", onOut) }
  }, [mapReady])

  useEffect(() => {
    const shouldFetch = activeTab === "weather" && (
      !weatherFetched ||
      (weatherLastFetch && Date.now() - weatherLastFetch.getTime() > 8 * 60 * 60 * 1000)
    )
    if (!shouldFetch) return

    const scheduleNextFetch = () => {
      const n = new Date()
      const next = new Date(n)
      next.setDate(next.getDate() + 1)
      next.setHours(0, 0, 0, 0)
      const ms = next.getTime() - n.getTime()
      return setTimeout(() => {
        setWeatherFetched(false)
        setWeatherLastFetch(null)
      }, ms)
    }
    const timer = scheduleNextFetch()

    setWeatherLoading(true)
    setWeatherError(null)

    Promise.all(
      WEATHER_LOCATIONS.filter(loc => loc.id !== "assessment" && loc.id !== "geo3_test").map(loc =>
        fetch(`/api/weather?lat=${loc.lat}&lng=${loc.lng}&locationId=${loc.id}`)
          .then(r => r.json())
          .then(data => {
            if (data.error) throw new Error(data.error)
            return { id: loc.id, hours: data.hours ?? [] }
          })
          .catch(e => ({ id: loc.id, hours: [], error: e.message }))
      )
    ).then(results => {
      const newData: Record<string, any[]> = {}
      let firstError: string | null = null
      results.forEach(r => {
        newData[r.id] = r.hours
        if ((r as any).error && !firstError) firstError = (r as any).error
      })
      newData["geo3_test"] = GEO3_TEST_DATA
      setWeatherData(newData)
      if (firstError) setWeatherError(firstError)
      setWeatherFetched(true)
      setWeatherLastFetch(new Date())
    }).catch(e => setWeatherError(e.message))
      .finally(() => setWeatherLoading(false))

    return () => clearTimeout(timer)
  }, [activeTab, weatherFetched])

  useEffect(() => {
    if (activeTab !== "alarp" || alarpData.length > 0) return
    setAlarpLoading(true)
    setAlarpError(null)
    fetch("/api/alarp")
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setAlarpData(data)
      })
      .catch(e => setAlarpError(e.message))
      .finally(() => setAlarpLoading(false))
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== "alarp") return
    if (!L) return
    setTimeout(() => {
      const container = document.getElementById("alarp-map")
      if (!container) return
      if ((container as any)._leaflet_id) return

      const map = L.map(container, { center: [54.84, 17.79], zoom: 13, zoomControl: true })
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors", maxZoom: 19,
      }).addTo(map)
      L.tileLayer("https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png", {
        attribution: "© OpenSeaMap contributors", maxZoom: 18, opacity: 0.7,
      }).addTo(map)

      // Dodaj warstwy GeoJSON
      if (layerGeo3Ref.current) layerGeo3Ref.current.addTo(map)
      if (layerSectorsRef.current) layerSectorsRef.current.addTo(map)
      if (layerCorridorRef.current) layerCorridorRef.current.addTo(map)

      alarpMapRef.current = map
    }, 100)
  }, [activeTab, L])

  useEffect(() => {
    if (!alarpMapRef.current || !L || alarpData.length === 0) return
    alarpMarkersRef.current.forEach(m => alarpMapRef.current.removeLayer(m))
    alarpMarkersRef.current.clear()

    alarpData.forEach(d => {
      if (!d.xcoord || !d.ycoord) return
      const lat = d.lat
      const lng = d.lng
      if (!lat || !lng) return
      const riskColor = d.overallRisk === "white" ? "#ffffff" : d.overallRisk === "red" ? "#E24B4A" : d.overallRisk === "orange" ? "#FB923C" : "#639922"
      const borderColor = "#000000"
      const markerHtml = `<div style="width:14px;height:14px;border-radius:50%;background:${riskColor};border:1px solid ${borderColor};box-shadow:0 1px 3px rgba(0,0,0,0.5)"></div>`
      const icon = L.divIcon({
        className: "",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        html: markerHtml
      })
      const marker = L.marker([lat, lng], { icon })
      marker.bindTooltip(d.id, { permanent: false, direction: "top", offset: [0, -8] })
      marker.on("click", () => setAlarpSelected(d))
      marker.addTo(alarpMapRef.current)
      alarpMarkersRef.current.set(d.id, marker)
    })
  }, [alarpData, alarpMapRef.current])

  // AIS useEffect
  useEffect(() => {
    if (!mapReady || !mapRef.current || !L) return
    if (!showVessels) {
      vesselsRef.current.forEach(m => mapRef.current?.removeLayer(m))
      vesselsRef.current.clear()
      return
    }

    const source = new EventSource("/api/ais-stream")
    source.onopen = () => console.log("SSE connected!")

    source.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        const { mmsi, name, lat, lng, heading, speed } = msg
        if (!lat || !lng) return

        const vesselDef = SIMOPS_VESSELS.find(v => v.mmsi === mmsi)
        const color = vesselDef?.color ?? "#94A3B8"

        const icon = L.divIcon({
          className: "",
          iconSize: [0, 0],
          html: `<div style="transform:rotate(${heading || 0}deg);display:inline-block;line-height:0">
            <svg width="18" height="28" viewBox="0 0 18 28" xmlns="http://www.w3.org/2000/svg">
              <polygon points="9,0 18,10 14,28 4,28 0,10" fill="${color}" stroke="white" stroke-width="1.5"/>
            </svg>
          </div>`,
          iconAnchor: [9, 14],
        })

        const tooltipContent = `<b>${name}</b><br/>${speed?.toFixed(1) ?? "?"} kn`

        if (vesselsRef.current.has(mmsi)) {
          const existing = vesselsRef.current.get(mmsi)
          existing.setLatLng([lat, lng])
          existing.setIcon(icon)
          existing.getTooltip()?.setContent(tooltipContent)
        } else {
          const marker = L.marker([lat, lng], { icon, zIndexOffset: 500 })
          marker.bindTooltip(tooltipContent, { permanent: false, direction: "top", offset: [0, -12], className: "vessel-tooltip" })
          marker.addTo(mapRef.current)
          vesselsRef.current.set(mmsi, marker)
        }

        // Strefa buforowa
        const zoneKey = "zone_" + mmsi
        const radius = vesselZones[mmsi] ?? 0
        const existingZone = vesselsRef.current.get(zoneKey)
        if (existingZone) {
          mapRef.current.removeLayer(existingZone)
          vesselsRef.current.delete(zoneKey)
        }
        if (radius > 0) {
          const zone = L.circle([lat, lng], {
            radius,
            color,
            weight: 1.5,
            opacity: 0.8,
            fillColor: color,
            fillOpacity: 0.4,
          })
          zone.bindTooltip(`${name} · Safety zone ${radius}m`, { permanent: false, direction: "top" })
          zone.addTo(mapRef.current)
          vesselsRef.current.set(zoneKey, zone)
        }
      } catch {}
    }

    source.onerror = () => source.close()

    return () => {
      source.close()
      vesselsRef.current.forEach(m => mapRef.current?.removeLayer(m))
      vesselsRef.current.clear()
    }
  }, [mapReady, showVessels])

  // Aktualizuj strefy gdy zmienia się vesselZones
  useEffect(() => {
    if (!mapRef.current || !L) return
    SIMOPS_VESSELS.forEach(({ mmsi, color }) => {
      const zoneKey = "zone_" + mmsi
      const markerKey = mmsi
      const existingZone = vesselsRef.current.get(zoneKey)
      if (existingZone) {
        mapRef.current.removeLayer(existingZone)
        vesselsRef.current.delete(zoneKey)
      }
      const marker = vesselsRef.current.get(markerKey)
      if (!marker) return
      const radius = vesselZones[mmsi] ?? 0
      if (radius > 0) {
        const latlng = marker.getLatLng()
        const zone = L.circle([latlng.lat, latlng.lng], {
          radius,
          color,
          weight: 1.5,
          opacity: 0.8,
          fillColor: color,
          fillOpacity: 0.4,
        })
        zone.addTo(mapRef.current)
        vesselsRef.current.set(zoneKey, zone)
      }
    })
  }, [vesselZones])

  const handleSearch = (id: string) => {
    if (!geojson || !mapRef.current || !id) return
    const found = geojson.features.find(f => f.properties.id === id)
    if (found) {
      mapRef.current.setView([found.properties.north, found.properties.east], 17, { animate: true })
      setSelected(found)
      setSearchId("")
      setTimeout(() => {
        if (activeTooltipMarkerRef.current) activeTooltipMarkerRef.current.closeTooltip()
        const marker = markersRef.current.get(id)
        if (marker) { marker.openTooltip(); activeTooltipMarkerRef.current = marker }
      }, 600)
    }
  }

  useEffect(() => {
    if (!mapRef.current || !geojson || !L || !mapReady) return
    mapRef.current.eachLayer((layer: any) => {
      if (layer._uxoMarker) mapRef.current.removeLayer(layer)
    })
    markersRef.current.clear()

    const features = geojson.features.filter(f => {
      if (filterStatus !== "ALL" && f.properties.status !== filterStatus) return false
      if (filterSector !== "ALL" && f.properties.sector !== filterSector) return false
      return true
    })

    const addMarker = (feature: UXOFeature) => {
      const { east, north, status, type, id } = feature.properties
      const markerStyle = getMarkerStyle(status, type)
      const { iconUrl, size } = markerStyle
      const iconSize: [number, number] = [size, size]
      const iconAnchor: [number, number] = [size / 2, size / 2]
      const icon = L.icon({ iconUrl, iconSize, iconAnchor, popupAnchor: [0, -size / 2 - 2] })
      const marker = L.marker([north, east], { icon, zIndexOffset: status === "In progress" ? 1000 : 0 })
      marker._uxoMarker = true
      marker.on("click", (e: any) => {
        if (measureActive) {
          L.DomEvent.stopPropagation(e)
          measurePointsRef.current.push([e.latlng.lat, e.latlng.lng])
          mapRef.current.fire("click", { latlng: e.latlng })
        } else {
          setSelected(feature)
        }
      })
      marker.bindTooltip(id, { permanent: false, direction: "top", offset: [0, -12] })
      markersRef.current.set(id, marker)
      marker.addTo(mapRef.current)

      if (status === "In progress") {
        const circle = L.circle([north, east], { radius: 500, color: "#378ADD", weight: 1.5, opacity: 0.8, fillColor: "#378ADD", fillOpacity: 0 })
        circle._uxoMarker = true
        circle.addTo(mapRef.current)
        const hatch = L.circle([north, east], { radius: 500, color: "transparent", weight: 0, fillOpacity: 0.4, fillColor: "#378ADD", className: "hatch-circle-" + id })
        hatch._uxoMarker = true
        hatch.addTo(mapRef.current)
        hatch.on("add", () => {
          const el = hatch.getElement()
          if (!el) return
          const svgRoot = el.closest("svg") || document.querySelector(".leaflet-overlay-pane svg")
          if (!svgRoot) return
          const defs = svgRoot.querySelector("defs") || svgRoot.insertBefore(document.createElementNS("http://www.w3.org/2000/svg", "defs"), svgRoot.firstChild)
          const patId = "hatch-" + id
          if (!svgRoot.querySelector("#" + patId)) {
            const pat = document.createElementNS("http://www.w3.org/2000/svg", "pattern")
            pat.setAttribute("id", patId); pat.setAttribute("patternUnits", "userSpaceOnUse")
            pat.setAttribute("width", "10"); pat.setAttribute("height", "10"); pat.setAttribute("patternTransform", "rotate(45)")
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line")
            line.setAttribute("x1", "0"); line.setAttribute("y1", "0"); line.setAttribute("x2", "0"); line.setAttribute("y2", "10")
            line.setAttribute("stroke", "#378ADD"); line.setAttribute("stroke-width", "1.5"); line.setAttribute("stroke-opacity", "0.6")
            pat.appendChild(line); defs.appendChild(pat)
          }
          el.setAttribute("fill", "url(#" + patId + ")"); el.setAttribute("fill-opacity", "0.4")
        })
      }
    }

    features.filter(f => f.properties.status !== "In progress").forEach(addMarker)
    features.filter(f => f.properties.status === "In progress").forEach(addMarker)
    if (features.length > 0 && !selected) {
      const coords = features.map(f => [f.properties.north, f.properties.east] as [number, number])
      mapRef.current.fitBounds(coords, { padding: [40, 40] })
    }
  }, [geojson, filterStatus, filterSector, mapReady, measureActive])

  const handleExportPNG = async () => {
    if (!mapDivRef.current) return
    const domtoimage = (await import("dom-to-image-more")).default
    const dataUrl = await domtoimage.toPng(mapDivRef.current, {
      width: mapDivRef.current.offsetWidth * 2,
      height: mapDivRef.current.offsetHeight * 2,
      style: { transform: "scale(2)", transformOrigin: "top left" },
    })
    const a = document.createElement("a")
    a.href = dataUrl
    a.download = `UXO_map_${new Date().toISOString().slice(0, 10)}.png`
    a.click()
  }

  if (status === "loading" || status === "unauthenticated") {
    return <div style={styles.fullscreen}><div style={styles.spinner}/></div>
  }

  const sectors = geojson
    ? ["ALL", ...Array.from(new Set(geojson.features.map(f => f.properties.sector))).sort()]
    : ["ALL"]

  return (
    <>
      <Head>
        <title>UXO WebGIS · SC2503 · SeaClouds</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
        <style>{`
          .geojson-label { background: rgba(15,25,35,0.75); border: none; box-shadow: none; color: #a0b4c4; font-size: 11px; padding: 2px 5px; white-space: nowrap; }
          .leaflet-div-icon { background: transparent !important; border: none !important; box-shadow: none !important; width: auto !important; height: auto !important; }
          .vessel-tooltip { background: rgba(15,25,35,0.9) !important; border: 1px solid #378ADD !important; color: #c8dae8 !important; font-size: 11px !important; }
        `}</style>
      </Head>

      <div style={styles.layout}>
        {/* TOPBAR */}
        <div style={styles.topbar}>
          <div style={styles.topbarLeft}>
            <img src="/SeaClouds_kolo.png" style={{ width: 28, height: 28, marginRight: 10, borderRadius: 4 }} />
            <div>
              <div style={styles.topTitle}>UXO Phase 2 · WebGIS</div>
              <div style={styles.topSub}>SC2503 · SeaClouds sp. z o.o.</div>
            </div>
          </div>
          <div style={styles.topbarRight}>
            {geojson && (
              <div style={styles.statRow}>
                <StatBadge label="Total"     value={geojson.meta.total}     color="#378ADD"/>
                <StatBadge label="Inspected" value={geojson.meta.inspected} color="#EF9F27"/>
                <StatBadge label="Removed"   value={geojson.meta.removed}   color="#639922"/>
                <StatBadge label="Pending"   value={geojson.meta.pending}   color="#E24B4A"/>
              </div>
            )}
            <button onClick={fetchData} style={styles.refreshBtn} title="Odśwież dane">↻</button>
            <div style={styles.userInfo}>
              <span style={styles.userEmail}>{session?.user?.email}</span>
              <button onClick={() => signOut({ callbackUrl: "/login" })} style={styles.signoutBtn}>Wyloguj</button>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: "flex", borderBottom: "1px solid #1e2f3e", background: "#0f1923", flexShrink: 0 }}>
          {(["uxo", "weather", "alarp"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: "none", border: "none", borderBottom: activeTab === tab ? "2px solid #378ADD" : "2px solid transparent",
              color: activeTab === tab ? "#fff" : "#4a6070", cursor: "pointer", fontSize: 12, fontWeight: 500,
              padding: "8px 20px", letterSpacing: "0.05em", textTransform: "uppercase" as const,
            }}>
              {tab === "uxo" ? "🗺 UXO Mapa" : tab === "weather" ? "🌊 Prognoza" : "⚠️ ALARP Map"}
            </button>
          ))}
        </div>

        {/* MAIN */}
        <div style={{ ...styles.main, display: activeTab === "uxo" ? "flex" : "none" }}>
          {/* SIDEBAR */}
          <div style={styles.sidebar}>

            <div style={styles.sideSection}>
              <div style={styles.sideLabel}>Status</div>
              {["ALL", "pUXO", "In progress", "Inspected", "Removed"].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  style={{ ...styles.filterBtn, ...(filterStatus === s ? styles.filterBtnActive : {}) }}>
                  {s === "ALL" ? "Wszystkie" : s}
                </button>
              ))}
            </div>

            <div style={styles.sideSection}>
              <div style={styles.sideLabel}>Sektor</div>
              <select value={filterSector} onChange={e => setFilterSector(e.target.value)} style={styles.select}>
                {sectors.map(s => (
                  <option key={s} value={s}>{s === "ALL" ? "Wszystkie sektory" : `Sektor ${s}`}</option>
                ))}
              </select>
            </div>

            <div style={styles.sideSection}>
              <div style={{ ...styles.sideLabel, cursor: "pointer", userSelect: "none" }} onClick={() => setShowLegend(v => !v)}>
                Legenda {showLegend ? "▾" : "▸"}
              </div>
              {showLegend && LEGEND_ITEMS.map(item => {
                const { iconUrl } = getMarkerStyle(item.status, item.type)
                return (
                  <div key={item.label} style={styles.legendItem}>
                    <div style={{ width: 24, height: 24, background: "#d0e8f5", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <img src={iconUrl} width={18} height={18} alt=""/>
                    </div>
                    <span style={styles.legendLabel}>{item.label}</span>
                  </div>
                )
              })}
            </div>

            <div style={styles.sideSection}>
              <div style={styles.sideLabel}>Postęp per sektor</div>
              {geojson ? (() => {
                const sectorList = Array.from(new Set(geojson.features.map(f => f.properties.sector))).sort()
                return sectorList.map(sector => {
                  const total = geojson.features.filter(f => f.properties.sector === sector).length
                  const done  = geojson.features.filter(f => f.properties.sector === sector && (f.properties.status === "Inspected" || f.properties.status === "Removed")).length
                  const pct   = total === 0 ? 0 : Math.round((done / total) * 100)
                  const color = pct === 100 ? "#639922" : pct > 0 ? "#EF9F27" : "#4a6070"
                  return (
                    <div key={sector} style={{ marginBottom: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 10, color: "#c8dae8" }}>
                          {(() => { const s = String(sector); return s.length === 3 ? `GEO3_${s[1]}_${s[2]}` : `S${sector}` })()}
                        </span>
                        <span style={{ fontSize: 10, color, fontWeight: 500 }}>{done}/{total} · {pct}%</span>
                      </div>
                      <div style={{ height: 5, background: "#1a2f42", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.4s ease" }}/>
                      </div>
                    </div>
                  )
                })
              })() : <div style={{ fontSize: 10, color: "#4a6070" }}>Ładowanie danych…</div>}
            </div>

            <div style={styles.sideSection}>
              <div style={styles.sideLabel}>Warstwy</div>
              {([
                { label: "GEO3 Area",          checked: showGeo3,     set: setShowGeo3,     color: "#666" },
                { label: "UXO Sectors",        checked: showSectors,  set: setShowSectors,  color: "#2E6FA3" },
                { label: "Clearance Corridor", checked: showCorridor, set: setShowCorridor, color: "#E8871E" },
              ] as const).map(({ label, checked, set, color }) => (
                <label key={label} style={styles.layerToggle}>
                  <input type="checkbox" checked={checked} onChange={e => set(e.target.checked)} style={{ accentColor: color, marginRight: 6 }}/>
                  <span style={{ ...styles.legendLabel, color: checked ? "#a0b4c4" : "#4a6070" }}>{label}</span>
                </label>
              ))}
              <label style={{ ...styles.layerToggle, opacity: 0.4, cursor: "not-allowed" }} title="Brak kredytów AIS — funkcja tymczasowo niedostępna">
                <input type="checkbox" checked={false} disabled style={{ accentColor: "#EF9F27", marginRight: 6 }}/>
                <span style={{ ...styles.legendLabel, color: "#4a6070" }}>AIS Vessels <span style={{ fontSize: 9, color: "#E24B4A" }}>(niedostępne)</span></span>
              </label>
            </div>

            {/* Tabela statków SIMOPS */}
            {showVessels && (
              <div style={styles.sideSection}>
                <div style={styles.sideLabel}>SIMOPS Vessels</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {SIMOPS_VESSELS.map(({ mmsi, name, color }) => (
                    <div key={mmsi} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: "1px solid #1a2f42" }}>
                      <div style={{ flexShrink: 0 }}>
                        <svg width="12" height="18" viewBox="0 0 18 28">
                          <polygon points="9,0 18,10 14,28 4,28 0,10" fill={color} stroke="white" strokeWidth="1.5"/>
                        </svg>
                      </div>
                      <span
                        onClick={() => {
                          const marker = vesselsRef.current.get(mmsi)
                          if (marker && mapRef.current) {
                            const latlng = marker.getLatLng()
                            mapRef.current.setView([latlng.lat, latlng.lng], 15, { animate: true })
                            marker.openTooltip()
                          }
                        }}
                        style={{ fontSize: 10, color: "#c8dae8", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: "pointer" }}
                        title="Kliknij aby przejść do statku"
                      >{name}</span>
                      <select
                        value={vesselZones[mmsi] ?? 0}
                        onChange={e => setVesselZones(prev => ({ ...prev, [mmsi]: Number(e.target.value) }))}
                        style={{ background: "#1a2632", border: "1px solid #2a3a4a", borderRadius: 3, color: "#a0b4c4", fontSize: 10, padding: "2px 3px", width: 58, flexShrink: 0 }}
                      >
                        {ZONE_OPTIONS.map(z => (
                          <option key={z} value={z}>{z === 0 ? "— m" : `${z} m`}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={styles.sideSection}>
              <div style={styles.sideLabel}>Szukaj punktu</div>
              <select value={searchId} onChange={e => { setSearchId(e.target.value); handleSearch(e.target.value) }} style={{ ...styles.select, width: "100%" }}>
                <option value="">— wybierz obiekt —</option>
                {geojson ? [...geojson.features].sort((a, b) => a.properties.id.localeCompare(b.properties.id)).map(f => (
                  <option key={f.properties.id} value={f.properties.id}>{f.properties.id} · {f.properties.status} · S{f.properties.sector}</option>
                )) : null}
              </select>
            </div>

            <div style={styles.sideSection}>
              <div style={styles.sideLabel}>Narzędzia</div>
              <button onClick={() => setMeasureActive(v => !v)}
                style={{ ...styles.filterBtn, ...(measureActive ? styles.filterBtnActive : {}), display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14 }}>📏</span>
                {measureActive ? "Zakończ pomiar" : "Miara odległości"}
              </button>
              {measureActive && (
                <div style={{ fontSize: 10, color: "#6b9ab8", lineHeight: 1.4, padding: "4px 2px" }}>
                  Klikaj punkty na mapie. Kliknij przycisk ponownie aby zakończyć.
                </div>
              )}
              <button onClick={handleExportPNG} style={{ ...styles.filterBtn, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14 }}>🖨️</span>
                Eksport PNG
              </button>
            </div>

            {lastRefresh && <div style={styles.refreshInfo}>Dane z: {lastRefresh.toLocaleTimeString("pl-PL")}</div>}
          </div>

          {/* MAPA */}
          <div style={styles.mapArea}>
            <div ref={mapDivRef} style={styles.map}/>
            {cursorCoords && (
              <div style={{ position: "absolute", bottom: 8, left: 8, zIndex: 1000, background: "rgba(13,31,45,0.85)", border: "1px solid #1e3448", borderRadius: 4, padding: "3px 8px", fontSize: 11, color: "#c8dae8", fontFamily: "monospace", pointerEvents: "none" }}>
                {cursorCoords.lat.toFixed(5)}° N &nbsp; {cursorCoords.lng.toFixed(5)}° E
              </div>
            )}
            {loading && (
              <div style={styles.mapOverlay}>
                <div style={styles.spinner}/>
                <div style={styles.loadingText}>Ładowanie danych z OneDrive…</div>
              </div>
            )}
            {error && (
              <div style={styles.errorBanner}>
                Błąd pobierania danych: {error}
                <button onClick={fetchData} style={styles.retryBtn}>Spróbuj ponownie</button>
              </div>
            )}
          </div>

          {/* PANEL SZCZEGÓŁÓW */}
          {selected && (
            <div style={styles.detailPanel}>
              <div style={styles.detailHeader}>
                <div>
                  <div style={styles.detailId}>{selected.properties.id}</div>
                  <div style={styles.detailSub}>Sektor {selected.properties.sector} · Priorytet {selected.properties.priority}</div>
                </div>
                <button onClick={() => setSelected(null)} style={styles.closeBtn}>✕</button>
              </div>
              <div style={styles.detailStatus(selected.properties.status)}>
                {selected.properties.status}
                {selected.properties.type !== "pUXO" || selected.properties.status !== "pUXO" ? ` · ${selected.properties.type}` : ""}
              </div>
              <div style={styles.detailGrid}>
                <DetailRow label="Risk"       value={selected.properties.risk}/>
                <DetailRow label="Depth"      value={`${selected.properties.depth} m`}/>
                <DetailRow label="Ferr. Mass" value={`${selected.properties.ferrMass} kg`}/>
                <DetailRow label="Amplitude"  value={String(selected.properties.amplitude)}/>
                <DetailRow label="Altitude"   value={`${selected.properties.altitude} m`}/>
                <DetailRow label="ID Mag"     value={selected.properties.idMag}/>
                <DetailRow label="Inspected"  value={selected.properties.dateInspected ?? "—"}/>
                <DetailRow label="East"       value={selected.properties.east.toFixed(2)}/>
                <DetailRow label="North"      value={selected.properties.north.toFixed(2)}/>
              </div>
              {selected.properties.comment && (
                <div style={styles.comment}>
                  <div style={styles.sideLabel}>Komentarz</div>
                  <div style={styles.commentText}>{selected.properties.comment}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ALARP MAP PANEL */}
        {activeTab === "alarp" && (
          <div style={{ flex: 1, display: "flex", overflow: "hidden", background: "#0f1923" }}>
            {/* MAPA */}
            <div style={{ flex: 1, position: "relative" as const }}>
              {alarpLoading && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(15,25,35,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, color: "#6b9ab8", fontSize: 14 }}>
                  Synchronizing pUXO removal status…
                </div>
              )}
              {alarpError && (
                <div style={{ position: "absolute", top: 16, left: 16, zIndex: 1000, background: "#2f1a1a", border: "1px solid #E24B4A", borderRadius: 6, padding: "10px 16px", color: "#E24B4A", fontSize: 13 }}>
                  {alarpError}
                </div>
              )}
              <div id="alarp-map" style={{ width: "100%", height: "100%" }}/>
            </div>

            {/* PANEL SZCZEGÓŁÓW */}
            <div style={{ width: 320, background: "#0d1f2d", borderLeft: "1px solid #1e3448", overflowY: "auto", flexShrink: 0 }}>
              {/* STATYSTYKI */}
              <div style={{ padding: "16px", borderBottom: "1px solid #1e3448" }}>
                <div style={{ color: "#6b9ab8", fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 12 }}>
                  ALARP Documentation Status
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Final", color: "#639922", count: alarpData.filter(d => d.docStatus === "Final").length },
                    { label: "IFR", color: "#378ADD", count: alarpData.filter(d => d.docStatus === "IFR").length },
                    { label: "Incomplete", color: "#EF9F27", count: alarpData.filter(d => d.docStatus === "Incomplete").length },
                    { label: "Missing", color: "#E24B4A", count: alarpData.filter(d => d.docStatus === "Missing").length },
                  ].map(s => (
                    <div key={s.label} style={{ background: "#0f1923", borderRadius: 6, padding: "8px 10px", borderLeft: `3px solid ${s.color}` }}>
                      <div style={{ color: s.color, fontSize: 18, fontWeight: 500 }}>{s.count}</div>
                      <div style={{ color: "#4a6070", fontSize: 10 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* LEGENDA GEOHAZARD */}
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #1e3448" }}>
                <div style={{ color: "#6b9ab8", fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8 }}>Geohazard Risk Legend</div>
                {[
                  { color: "#ffffff", label: "ALARP_1 not issued — assessment pending" },
                  { color: "#E24B4A", label: "pUXO present — not cleared" },
                  { color: "#FB923C", label: "Assets present" },
                  { color: "#639922", label: "No significant geohazards" },
                ].map(l => (
                  <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: l.color, flexShrink: 0 }}/>
                    <span style={{ fontSize: 10, color: "#6b9ab8" }}>{l.label}</span>
                  </div>
                ))}
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #1a2f42" }}>
                  <div style={{ color: "#6b9ab8", fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 6 }}>Documentation Status</div>
                  {[
                    { color: "#639922", label: "Final — all docs rev 01" },
                    { color: "#378ADD", label: "IFR — client review (rev 00)" },
                    { color: "#EF9F27", label: "Incomplete — docs missing revision" },
                    { color: "#E24B4A", label: "Missing — docs not submitted" },
                  ].map(l => (
                    <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                      <div style={{ width: 12, height: 3, background: l.color, flexShrink: 0 }}/>
                      <span style={{ fontSize: 10, color: "#6b9ab8" }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SZCZEGÓŁY WYBRANEGO PUNKTU */}
              {alarpSelected ? (
                <div style={{ padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ color: "#fff", fontSize: 15, fontWeight: 500 }}>{alarpSelected.id}</div>
                      <div style={{ color: "#4a6070", fontSize: 11, marginTop: 2 }}>{alarpSelected.type} · Sektor {alarpSelected.sector}</div>
                    </div>
                    <button onClick={() => setAlarpSelected(null)} style={{ background: "none", border: "none", color: "#4a6070", fontSize: 16, cursor: "pointer" }}>✕</button>
                  </div>

                  {/* Doc Status */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ color: "#6b9ab8", fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8 }}>Dokumentacja</div>
                    {[
                      { label: "ALARP 1", value: alarpSelected.alarp_1, rev: alarpSelected.alarp1Rev },
                      { label: "ALARP 2", value: alarpSelected.alarp_2, rev: alarpSelected.alarp2Rev },
                      ...(alarpSelected.puxo > 0 ? [{ label: "TIR", value: alarpSelected.tir, rev: alarpSelected.tirRev }] : []),
                    ].map(doc => {
                      const color = doc.rev === "Final" ? "#639922" : doc.rev === "IFR" ? "#378ADD" : "#E24B4A"
                      return (
                        <div key={doc.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1a2f42" }}>
                          <span style={{ fontSize: 11, color: "#6b9ab8" }}>{doc.label}</span>
                          <span style={{ fontSize: 11, color, fontWeight: 500 }}>{doc.rev ?? "N/A"}</span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Geohazardy */}
                  <div>
                    <div style={{ color: "#6b9ab8", fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8 }}>Geohazardy</div>
                    {[
                      { label: "pUXO", value: alarpSelected.puxo, removed: alarpSelected.removed, status: alarpSelected.puxoStatus },
                      { label: "Boulders", value: alarpSelected.boulders, risk: alarpSelected.boulders > 0 ? 50 : 100 },
                      { label: "Slope", value: alarpSelected.slope, risk: alarpSelected.slopeRisk },
                      { label: "Assets", value: alarpSelected.assets, risk: (alarpSelected.assets ?? 0) > 0 ? 50 : 100 },
                    ].map(h => {
                      // When alarp_1 is missing, all bars show TBC
                      if (!alarpSelected.alarp_1 || String(alarpSelected.alarp_1).trim() === "") {
                        return (
                          <div key={h.label} style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 11, color: "#a0b4c4" }}>{h.label}</span>
                              <span style={{ fontSize: 11, color: "#6b9ab8", fontWeight: 500 }}>TBC</span>
                            </div>
                            <div style={{ height: 8, background: "#1a2f42", borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: "0%", background: "#4a6070", borderRadius: 4 }}/>
                            </div>
                          </div>
                        )
                      }
                      if (h.label === "Slope") {
                        // Slope zależy od alarp_2 — jeśli brak, TBC
                        const hasAlarp2 = !!alarpSelected.alarp_2
                        if (!hasAlarp2) {
                          return (
                            <div key={h.label} style={{ marginBottom: 10 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <span style={{ fontSize: 11, color: "#a0b4c4" }}>Slope</span>
                                <span style={{ fontSize: 11, color: "#4a6070", fontWeight: 500 }}>TBC</span>
                              </div>
                              <div style={{ height: 8, background: "transparent", borderRadius: 4, border: "1px solid #fff", overflow: "hidden" }}/>
                            </div>
                          )
                        }
                        const pct = h.risk ?? 100
                        const color = pct >= 70 ? "#639922" : pct >= 40 ? "#EF9F27" : pct >= 20 ? "#FB923C" : "#E24B4A"
                        const criterion = h.value === null || h.value <= 1 ? "≤1°" : h.value <= 2 ? "≤2°" : h.value <= 3 ? "≤3°" : h.value <= 4 ? "≤4°" : h.value <= 5 ? "≤5°" : ">5°"
                        return (
                          <div key={h.label} style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 11, color: "#a0b4c4" }}>Slope</span>
                              <span style={{ fontSize: 11, color, fontWeight: 500 }}>{criterion}</span>
                            </div>
                            <div style={{ height: 8, background: "#1a2f42", borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.3s ease" }}/>
                            </div>
                          </div>
                        )
                      }
                      const hasHazard = (h.value ?? 0) > 0
                      // Jeśli ma risk score (Boulders/Assets) — użyj go
                      if (h.risk !== undefined && h.label !== "pUXO") {
                        const pct = h.risk
                        const color = pct >= 70 ? "#639922" : "#EF9F27"
                        return (
                          <div key={h.label} style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 11, color: "#a0b4c4" }}>{h.label}</span>
                              <span style={{ fontSize: 11, color, fontWeight: 500 }}>
                                {!hasHazard ? "Clear" : `Present (${h.value})`}
                              </span>
                            </div>
                            <div style={{ height: 8, background: "#1a2f42", borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.3s ease" }}/>
                            </div>
                          </div>
                        )
                      }
                      const color = !hasHazard ? "#639922" : h.status === "clear" ? "#639922" : h.status === "partial" ? "#EF9F27" : "#E24B4A"
                      const pct = !hasHazard ? 100 : h.status === "clear" ? 100 : h.status === "partial" ? 50 : 0
                      return (
                        <div key={h.label} style={{ marginBottom: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: "#a0b4c4" }}>{h.label}</span>
                            <span style={{ fontSize: 11, color, fontWeight: 500 }}>
                              {!hasHazard ? "Clear" : h.status === "clear" ? "Removed" : h.status === "partial" ? `Partial (${h.removed}/${h.value})` : `Hazard (${h.value})`}
                            </span>
                          </div>
                          <div style={{ height: 8, background: "#1a2f42", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.3s ease" }}/>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ padding: 16 }}>
                  <div style={{ color: "#6b9ab8", fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 12 }}>Geotechnical Sites</div>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
                    {alarpData.map(d => {
                      const riskColor = d.overallRisk === "white" ? "#ffffff" : d.overallRisk === "red" ? "#E24B4A" : d.overallRisk === "orange" ? "#FB923C" : "#639922"
                      const docColor = d.docStatus === "Final" ? "#639922" : d.docStatus === "IFR" ? "#378ADD" : d.docStatus === "Incomplete" ? "#EF9F27" : "#E24B4A"
                      return (
                        <div key={d.id} onClick={() => {
                          setAlarpSelected(d)
                          const marker = alarpMarkersRef.current.get(d.id)
                          if (marker && alarpMapRef.current) {
                            alarpMarkersRef.current.forEach(m => m.closeTooltip())
                            alarpMapRef.current.setView([d.lat, d.lng], 16, { animate: true })
                            setTimeout(() => marker.openTooltip(), 400)
                          }
                        }}
                          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", borderRadius: 4, background: "#0f1923", cursor: "pointer", borderLeft: `3px solid ${riskColor}` }}>
                          <div>
                            <div style={{ fontSize: 11, color: "#c8dae8", fontWeight: 500 }}>{d.id}</div>
                            <div style={{ fontSize: 10, color: "#4a6070" }}>{d.type} · S{d.sector}</div>
                          </div>
                          <span style={{ fontSize: 10, color: docColor, fontWeight: 500 }}>{d.docStatus}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* WEATHER PANEL */}
        {activeTab === "weather" && (
          <div style={{ flex: 1, overflowY: "auto", background: "#0f1923", padding: 24 }}>
            <div style={{ maxWidth: 800, margin: "0 auto" }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ color: "#fff", fontSize: 16, fontWeight: 500, marginBottom: 4 }}>
                  Prognoza pogody morskiej · GEO3
                </div>
                <div style={{ color: "#6b9ab8", fontSize: 12 }}>
                  54.84°N · 17.79°E · Źródła: SMHI, FMI, FCOO · Prognoza 48h
                  {weatherLastFetch && (() => {
                    const next = new Date(weatherLastFetch)
                    next.setDate(next.getDate() + 1)
                    next.setHours(0, 0, 0, 0)
                    return (
                      <>
                        <span style={{ color: "#6b9ab8", marginLeft: 12 }}>
                          · Aktualizacja: {weatherLastFetch.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" })} {weatherLastFetch.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span style={{ color: "#6b9ab8", marginLeft: 12 }}>
                          · Następna aktualizacja: {next.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })} 00:00
                        </span>
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* Pod-zakładki lokalizacji */}
              <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid #1e3448", paddingBottom: 8 }}>
                {WEATHER_LOCATIONS.map(loc => (
                  <button key={loc.id} onClick={() => setWeatherTab(loc.id)}
                    style={{ ...styles.filterBtn, fontSize: 11, padding: "5px 12px",
                      ...(weatherTab === loc.id ? styles.filterBtnActive : {}) }}>
                    {loc.label}
                  </button>
                ))}
              </div>

              {/* ASSESSMENT TAB */}
              {weatherTab === "assessment" && (() => {
                const geo3Data = weatherData["geo3"] ?? []
                if (weatherLoading) return <div style={{ color: "#6b9ab8", fontSize: 14, padding: 20 }}>Ładowanie danych…</div>
                if (!weatherFetched || geo3Data.length === 0) return (
                  <div style={{ color: "#4a6070", fontSize: 13, padding: 20 }}>
                    Najpierw załaduj dane pogodowe — przejdź na zakładkę GEO3 aby pobrać prognozę.
                  </div>
                )
                const result = analyzeWeather(geo3Data)
                const alertColors: Record<string, string> = {
                  green: "#639922", yellow: "#EF9F27", orange: "#FB923C", red: "#E24B4A"
                }
                const alertBg: Record<string, string> = {
                  green: "#1a2f1a", yellow: "#2f2a1a", orange: "#2f221a", red: "#2f1a1a"
                }
                return (
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
                    {/* Summary */}
                    <div style={{ padding: "12px 16px", background: "#0d1f2d", borderRadius: 8, borderLeft: "4px solid #378ADD" }}>
                      <div style={{ color: "#6b9ab8", fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 6 }}>Podsumowanie operacyjne · GEO3 · 48h</div>
                      <div style={{ color: "#c8dae8", fontSize: 13, lineHeight: 1.5 }}>{result.summary}</div>
                    </div>

                    {/* Alerty */}
                    <div>
                      <div style={{ color: "#6b9ab8", fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8 }}>Alerty operacyjne</div>
                      {result.alerts.length === 0 ? (
                        <div style={{ color: "#4a6070", fontSize: 12 }}>Brak alertów — warunki stabilne.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                          {result.alerts.map((alert, i) => (
                            <div key={i} style={{ padding: "10px 14px", background: alertBg[alert.type], borderRadius: 6, borderLeft: `3px solid ${alertColors[alert.type]}` }}>
                              <div style={{ color: alertColors[alert.type], fontSize: 10, fontWeight: 500, marginBottom: 3 }}>
                                {alert.type === "green" ? "✅ OPERACJE" : alert.type === "yellow" ? "🟡 CREW CHANGE" : alert.type === "orange" ? "⚠️ OSTRZEŻENIE" : "🔴 KRYTYCZNY"}
                              </div>
                              <div style={{ color: "#c8dae8", fontSize: 12, lineHeight: 1.5 }}>{alert.message}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Okna operacyjne */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div style={{ background: "#0d1f2d", borderRadius: 8, padding: 12 }}>
                        <div style={{ color: "#639922", fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8 }}>⚓ Okna Anchoring (Hs ≤ 0.4m)</div>
                        {result.anchorWindows.length === 0 ? (
                          <div style={{ color: "#4a6070", fontSize: 11 }}>Brak okien w 48h</div>
                        ) : result.anchorWindows.map((w, i) => (
                          <div key={i} style={{ fontSize: 11, color: "#c8dae8", marginBottom: 4 }}>
                            <span style={{ color: "#639922" }}>▶</span> {new Date(w.start).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} → {new Date(w.end).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC
                          </div>
                        ))}
                      </div>
                      <div style={{ background: "#0d1f2d", borderRadius: 8, padding: 12 }}>
                        <div style={{ color: "#EF9F27", fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8 }}>🚤 Okna Crew Change (Hs ≤ 0.5m)</div>
                        {result.crewChangeWindows.length === 0 ? (
                          <div style={{ color: "#4a6070", fontSize: 11 }}>Brak okien w 48h</div>
                        ) : result.crewChangeWindows.map((w, i) => (
                          <div key={i} style={{ fontSize: 11, color: "#c8dae8", marginBottom: 6 }}>
                            <div><span style={{ color: "#EF9F27" }}>▶</span> Okno: {new Date(w.start).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} → {new Date(w.end).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC</div>
                            <div style={{ color: "#6b9ab8", marginLeft: 12 }}>Jet wypływa: {new Date(w.jetDepart).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Przekroczenia Keep Station */}
                    {result.keepStationBreaches.length > 0 && (
                      <div style={{ background: "#0d1f2d", borderRadius: 8, padding: 12 }}>
                        <div style={{ color: "#E24B4A", fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8 }}>🔴 Przekroczenia Keep Station (Hs &gt; 1.0m przez ≥6h)</div>
                        {result.keepStationBreaches.map((b, i) => (
                          <div key={i} style={{ fontSize: 11, color: "#c8dae8", marginBottom: 4 }}>
                            <span style={{ color: "#E24B4A" }}>▶</span> {new Date(b.start).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} → {new Date(b.end).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC · <span style={{ color: "#E24B4A" }}>{b.duration}h</span>
                          </div>
                        ))}
                        {result.bcDepartureDeadline && (
                          <div style={{ marginTop: 8, padding: "8px 10px", background: "#2f1a1a", borderRadius: 4, fontSize: 11, color: "#F09595" }}>
                            ⚓ BC musi podnieść kotwice i wypłynąć najpóźniej: <strong>{new Date(result.bcDepartureDeadline).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC</strong>
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ fontSize: 10, color: "#2a3a4a", marginTop: 4 }}>
                      Analiza bazuje na prognozie GEO3 · Tranzyty: BC→Władysławowo 6h · Baltic Jet→BC z Łeby 2h
                    </div>
                  </div>
                )
              })()}

              {/* WYKRES — tylko dla lokalizacji innych niż assessment */}
              {weatherTab !== "assessment" && (weatherData[weatherTab] ?? []).length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ color: "#6b9ab8", fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 12 }}>
                    Wykres Hs (m) · {WEATHER_LOCATIONS.find(l => l.id === weatherTab)?.label}
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart
                      data={(weatherData[weatherTab] ?? []).map(h => ({
                        time: new Date(h.time).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }),
                        hs: h.waveHeight != null ? parseFloat(h.waveHeight.toFixed(2)) : null,
                      }))}
                      margin={{ top: 8, right: 16, left: 0, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e3448" />
                      <XAxis
                        dataKey="time"
                        tick={{ fill: "#4a6070", fontSize: 10 }}
                        interval={5}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tick={{ fill: "#4a6070", fontSize: 10 }}
                        domain={[0, 1.2]}
                        label={{ value: "Hs (m)", angle: -90, position: "insideLeft", fill: "#4a6070", fontSize: 10 }}
                      />
                      <Tooltip
                        contentStyle={{ background: "#0d1f2d", border: "1px solid #1e3448", fontSize: 11, color: "#c8dae8" }}
                        formatter={(value: any) => [`${value} m`, "Hs"]}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11, color: "#6b9ab8", paddingTop: 8 }}
                        formatter={(value) => {
                          if (value === "hs") return "Hs (m)"
                          return value
                        }}
                      />
                      <ReferenceLine y={0.4} stroke="#639922" strokeDasharray="4 2" />
                      <ReferenceLine y={0.5} stroke="#EF9F27" strokeDasharray="4 2" />
                      <ReferenceLine y={1.0} stroke="#E24B4A" strokeDasharray="4 2" />
                      <Line
                        type="monotone"
                        dataKey="hs"
                        stroke="#378ADD"
                        strokeWidth={2}
                        dot={{ r: 2, fill: "#378ADD" }}
                        activeDot={{ r: 4 }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* KRYTERIA */}
              {weatherTab !== "assessment" && (weatherData[weatherTab] ?? []).length > 0 && (
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" as const, fontSize: 11, marginBottom: 16, padding: "10px 14px", background: "#0d1f2d", borderRadius: 6 }}>
                  <span style={{ color: "#6b9ab8" }}><span style={{ color: "#639922", fontWeight: 600 }}>🟢 Hs ≤ 0.4m</span> — Anchoring/Lifting OK</span>
                  <span style={{ color: "#6b9ab8" }}><span style={{ color: "#EF9F27", fontWeight: 600 }}>🟡 Hs 0.4–0.5m</span> — Diving/Crew change OK</span>
                  <span style={{ color: "#6b9ab8" }}><span style={{ color: "#FB923C", fontWeight: 600 }}>🟠 Hs 0.5–1.0m</span> — Keep station only</span>
                  <span style={{ color: "#6b9ab8" }}><span style={{ color: "#E24B4A", fontWeight: 600 }}>🔴 Hs &gt; 1.0m</span> — WOW Standby</span>
                </div>
              )}

              {/* TABELA — tylko dla lokalizacji innych niż assessment */}
              {weatherTab !== "assessment" && (<>
              {weatherLoading && (
                <div style={{ color: "#6b9ab8", fontSize: 14, padding: 20 }}>Ładowanie danych pogodowych…</div>
              )}

              {!weatherLoading && weatherError && (
                <div style={{ color: "#EF9F27", fontSize: 13, padding: "12px 16px", background: "#2f2a1a", borderRadius: 6, borderLeft: "3px solid #EF9F27", marginBottom: 12 }}>
                  ⏳ {weatherError}
                </div>
              )}

              {!weatherLoading && !weatherError && (weatherData[weatherTab] ?? []).length > 0 && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #1e3448" }}>
                        {["Czas (UTC)", "Hs (m)", "Tp (s)", "Wiatr (kn)", "Porywy (kn)", "Kier. (°)", "Kier.", "T. pow. (°C)"].map(h => (
                          <th key={h} style={{ padding: "8px 12px", color: "#6b9ab8", fontWeight: 500, textAlign: "left" as const, whiteSpace: "nowrap" as const }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(weatherData[weatherTab] ?? []).map((row, i) => {
                        const dt = new Date(row.time)
                        const dateStr = dt.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })
                        const timeStr = dt.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })
                        const isNight = dt.getHours() < 6 || dt.getHours() >= 20
                        const windKn = row.windSpeed != null ? (row.windSpeed * 1.944).toFixed(1) : "—"
                        const gustKn = row.gust != null ? (row.gust * 1.944).toFixed(1) : "—"
                        const hs = row.waveHeight != null ? row.waveHeight.toFixed(2) : "—"
                        const tp = row.swellPeriod != null ? row.swellPeriod.toFixed(1) : "—"
                        const dir = row.windDirection != null ? Math.round(row.windDirection) : null
                        const dirLabel = dir != null ? ["N","NE","E","SE","S","SW","W","NW"][Math.round(dir / 45) % 8] : "—"
                        const temp = row.airTemp != null ? row.airTemp.toFixed(1) : "—"
                        const hsNum = row.waveHeight ?? 0
                        const hsColor = hsNum > 1.0 ? "#E24B4A" : hsNum > 0.5 ? "#FB923C" : hsNum > 0.4 ? "#EF9F27" : "#639922"
                        const windNum = row.windSpeed ?? 0
                        const windColor = windNum > 10 ? "#E24B4A" : windNum > 6 ? "#EF9F27" : "#c8dae8"
                        const isMidnight = dt.getHours() === 0
                        return (
                          <>
                            {isMidnight && i > 0 && (
                              <tr key={"sep-" + i}>
                                <td colSpan={8} style={{ padding: "4px 12px", background: "#0d1f2d", color: "#378ADD", fontSize: 11, fontWeight: 500 }}>
                                  {dt.toLocaleDateString("pl-PL", { weekday: "long", day: "2-digit", month: "2-digit" })}
                                </td>
                              </tr>
                            )}
                            <tr key={row.time} style={{ background: i % 2 === 0 ? "#0f1923" : "#0d1f2d", borderBottom: "1px solid #1a2f42" }}>
                              <td style={{ padding: "7px 12px", color: isNight ? "#4a6070" : "#c8dae8", whiteSpace: "nowrap" as const }}>{dateStr} {timeStr}</td>
                              <td style={{ padding: "7px 12px", color: hsColor, fontWeight: 500 }}>{hs}</td>
                              <td style={{ padding: "7px 12px", color: "#a0b4c4" }}>{tp}</td>
                              <td style={{ padding: "7px 12px", color: windColor, fontWeight: 500 }}>{windKn}</td>
                              <td style={{ padding: "7px 12px", color: "#a0b4c4" }}>{gustKn}</td>
                              <td style={{ padding: "7px 12px", color: "#a0b4c4" }}>{dir ?? "—"}</td>
                              <td style={{ padding: "7px 12px", color: "#6b9ab8" }}>
                                {dir != null ? <span style={{ display: "inline-block", transform: `rotate(${dir}deg)` }}>↑</span> : ""} {dirLabel}
                              </td>
                              <td style={{ padding: "7px 12px", color: "#a0b4c4" }}>{temp}</td>
                            </tr>
                          </>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {!weatherLoading && weatherFetched && (
                <div style={{ marginTop: 12, fontSize: 11, color: "#2a3a4a" }}>
                  <button onClick={() => { setWeatherFetched(false) }} style={{ background: "none", border: "1px solid #2a3a4a", borderRadius: 4, color: "#4a6070", cursor: "pointer", fontSize: 11, padding: "4px 10px" }}>
                    ↻ Odśwież dane
                  </button>
                </div>
              )}
              </>)}
            </div>
          </div>
        )}

      </div>
    </>
  )
}

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 500, color }}>{value}</div>
      <div style={{ fontSize: 10, color: "#6b8099", letterSpacing: "0.04em" }}>{label}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailRowLabel}>{label}</span>
      <span style={styles.detailRowValue}>{value}</span>
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  pUXO:      "#E24B4A",
  Inspected: "#EF9F27",
  Removed:   "#639922",
}

const styles: Record<string, any> = {
  fullscreen:      { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f1923" },
  layout:          { display: "flex", flexDirection: "column", height: "100vh", background: "#0f1923", fontFamily: "system-ui, sans-serif" },
  topbar:          { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 56, background: "#0f1923", borderBottom: "1px solid #1e2f3e", flexShrink: 0 },
  topbarLeft:      { display: "flex", alignItems: "center", gap: 12 },
  topTitle:        { color: "#fff", fontSize: 14, fontWeight: 500 },
  topSub:          { color: "#4a6070", fontSize: 11 },
  topbarRight:     { display: "flex", alignItems: "center", gap: 20 },
  statRow:         { display: "flex", gap: 20 },
  refreshBtn:      { background: "none", border: "1px solid #2a3a4a", borderRadius: 6, color: "#6b8099", fontSize: 18, cursor: "pointer", padding: "4px 10px", lineHeight: 1 },
  userInfo:        { display: "flex", alignItems: "center", gap: 10 },
  userEmail:       { color: "#4a6070", fontSize: 12 },
  signoutBtn:      { background: "none", border: "1px solid #2a3a4a", borderRadius: 6, color: "#6b8099", fontSize: 12, cursor: "pointer", padding: "4px 10px" },
  main:            { display: "flex", flex: 1, overflow: "hidden" },
  sidebar:         { width: 220, background: "#0d1f2d", borderRight: "1px solid #1e3448", padding: 16, overflowY: "auto", flexShrink: 0, display: "flex", flexDirection: "column", gap: 20 },
  sideSection:     { display: "flex", flexDirection: "column", gap: 6 },
  sideLabel:       { fontSize: 10, fontWeight: 500, color: "#6b9ab8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 },
  filterBtn:       { background: "none", border: "1px solid #2a3a4a", borderRadius: 6, color: "#6b8099", fontSize: 12, cursor: "pointer", padding: "6px 10px", textAlign: "left" as const },
  filterBtnActive: { background: "#1F4E79", border: "1px solid #378ADD", color: "#fff" },
  select:          { background: "#1a2632", border: "1px solid #2a3a4a", borderRadius: 6, color: "#a0b4c4", fontSize: 12, padding: "6px 8px" },
  legendItem:      { display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", borderRadius: 4, background: "#0f2740" },
  legendLabel:     { fontSize: 11, color: "#c8dae8" },
  refreshInfo:     { fontSize: 11, color: "#2a3a4a", marginTop: "auto" },
  mapArea:         { flex: 1, position: "relative" as const },
  map:             { width: "100%", height: "100%" },
  mapOverlay:      { position: "absolute" as const, inset: 0, background: "rgba(15,25,35,0.7)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, zIndex: 1000 },
  loadingText:     { color: "#6b8099", fontSize: 14 },
  spinner:         { width: 32, height: 32, border: "3px solid #1e2f3e", borderTop: "3px solid #378ADD", borderRadius: "50%", animation: "spin 1s linear infinite" },
  errorBanner:     { position: "absolute" as const, bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#3a1a1a", border: "1px solid #A32D2D", borderRadius: 8, padding: "10px 16px", color: "#F09595", fontSize: 13, display: "flex", gap: 12, alignItems: "center", zIndex: 1000 },
  retryBtn:        { background: "#A32D2D", border: "none", borderRadius: 4, color: "#fff", fontSize: 12, cursor: "pointer", padding: "4px 10px" },
  detailPanel:     { width: 280, background: "#0f1923", borderLeft: "1px solid #1e2f3e", padding: 16, overflowY: "auto", flexShrink: 0 },
  detailHeader:    { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  detailId:        { color: "#fff", fontSize: 16, fontWeight: 500 },
  detailSub:       { color: "#4a6070", fontSize: 12, marginTop: 2 },
  closeBtn:        { background: "none", border: "none", color: "#4a6070", fontSize: 16, cursor: "pointer", padding: 4 },
  detailStatus:    (s: string) => ({ display: "inline-block", fontSize: 12, fontWeight: 500, color: STATUS_COLORS[s] ?? "#6b8099", background: `${STATUS_COLORS[s] ?? "#6b8099"}22`, padding: "3px 10px", borderRadius: 4, marginBottom: 16 }),
  detailGrid:      { display: "flex", flexDirection: "column", gap: 0 },
  detailRow:       { display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #1e2f3e" },
  detailRowLabel:  { fontSize: 12, color: "#4a6070" },
  detailRowValue:  { fontSize: 12, color: "#a0b4c4", fontWeight: 500 },
  comment:         { marginTop: 16 },
  commentText:     { fontSize: 12, color: "#6b8099", lineHeight: 1.5, marginTop: 4 },
  layerToggle:     { display: "flex", alignItems: "center", cursor: "pointer", padding: "4px 6px", borderRadius: 4, background: "#0f2740" },
}
