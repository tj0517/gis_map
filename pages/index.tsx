import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/router"
import { useEffect, useRef, useState } from "react"
import Head from "next/head"
import type { GeoJSON, UXOFeature } from "./api/data"
import { getMarkerStyle, LEGEND_ITEMS } from "../lib/symbology"
import { analyzeWeather } from "../lib/weatherAssessment"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from "recharts"

let L: any = null

function normalizeBoreholeType(type: string | null | undefined): string {
  if (!type) return ""
  if (type === "CPT_FISH") return "CPT"
  if (type === "SPT_FISH") return "SPT"
  return type
}

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

type GeoDrillingResponse = {
  type: "FeatureCollection"
  features: any[]
  meta: {
    total: number
    Planned: number
    "In Progress": number
    Completed: number
    "On Hold": number
    Aborted: number
    priority1: number
    overallCompletion: number
    perScope: Array<{ scope: string; total: number; completed: number; inProgress: number; pending: number; completionPct: number; priority1: number; ncrStopWork: number }>
    vessels: Array<{ name: string; mobStart: string | null; mobEnd: string | null; mobStatus: string; opsStart: string | null; opsEnd: string | null; opsStatus: string; demobStart: string | null; demobEnd: string | null; demobStatus: string; currentLocation: string | null; currentLng?: number; currentLat?: number }>
  }
}

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
  const [uxoVesselSettings, setUxoVesselSettings] = useState<Record<string, { visible: boolean, safetyZone: number, color: string }>>({
    "Baltic Constructor": { visible: true, safetyZone: 500, color: "#378ADD" },
    "WaveWalker 1":       { visible: true, safetyZone: 500, color: "#E24B4A" },
    "Excalibur":          { visible: true, safetyZone: 500, color: "#639922" },
  })
  const uxoVesselMarkersRef = useRef<Record<string, any>>({})
  const uxoVesselBuffersRef = useRef<Record<string, any>>({})
  const [activeTab, setActiveTab] = useState<"uxo" | "weather" | "alarp" | "geo">("uxo")
  const [geoData, setGeoData] = useState<GeoDrillingResponse | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geoScopeFilters, setGeoScopeFilters] = useState<Set<string>>(new Set([
    "SPT Boring", "CPT Sounding", "Continuous Core", "Marine MASW"
  ]))
  const [geoStatusFilters, setGeoStatusFilters] = useState<Set<string>>(new Set([
    "Planned", "Completed", "In Progress", "On Hold", "Aborted"
  ]))
  const [geoVesselSettings, setGeoVesselSettings] = useState<Record<string, { visible: boolean, safetyZone: number, color: string }>>({
    "Baltic Constructor": { visible: true, safetyZone: 500, color: "#378ADD" },
    "WaveWalker 1":       { visible: true, safetyZone: 500, color: "#E24B4A" },
    "Excalibur":          { visible: true, safetyZone: 500, color: "#639922" },
  })
  const [selectedGeoFeature, setSelectedGeoFeature] = useState<any>(null)
  const [showAllGeoProps, setShowAllGeoProps] = useState(false)
  const [alarpData, setAlarpData] = useState<any[]>([])
  const [alarpLoading, setAlarpLoading] = useState(false)
  const [alarpError, setAlarpError] = useState<string | null>(null)
  const [alarpSelected, setAlarpSelected] = useState<any | null>(null)
  const [alarpTypeFilter, setAlarpTypeFilter] = useState<Set<string>>(
    new Set(["CPT", "CCD", "CCD_OPT", "SPT", "SPT_OPT"])
  )
  const alarpMapRef = useRef<any>(null)
  const alarpMapDivRef = useRef<HTMLDivElement>(null)
  const alarpMarkersRef = useRef<Map<string, any>>(new Map())
  const alarpPuxoBufferRef = useRef<any>(null)
  const alarpCablesBufferRef = useRef<any>(null)
  const geoMapRef = useRef<any>(null)
  const geoMarkersRef = useRef<any[]>([])
  const geoVesselMarkersRef = useRef<Record<string, any>>({})
  const geoVesselBuffersRef = useRef<Record<string, any>>({})
  const geoLayerSectorsRef = useRef<any>(null)
  const geoLayerCorridorRef = useRef<any>(null)
  const geoLayerPuxoBufferRef = useRef<any>(null)
  const geoLayerCablesBufferRef = useRef<any>(null)
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
    setGeoLoading(true)
    setGeoError(null)
    fetch("/api/geo-drilling")
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: GeoDrillingResponse) => {
        console.log("[GEO MAP] Fetched data:", { features: data.features.length, vessels: data.meta.vessels.length, perScope: data.meta.perScope.length })
        setGeoData(data)
        setGeoLoading(false)
      })
      .catch(err => {
        console.error("[GEO MAP] Fetch error:", err)
        setGeoError(err.message || "Failed to load GEO drilling data")
        setGeoLoading(false)
      })
  }, [])

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

      // pUXO 25m safety buffers — added before site markers so markers render on top
      fetch("/layers/pUXO_25m_buffer.geojson").then(r => r.json()).then(data => {
        const bufferLayer = L.geoJSON(data, {
          style: { fillColor: "#FB923C", fillOpacity: 0.25, color: "#FB923C", weight: 1, opacity: 0.6 },
          interactive: false,
        })
        alarpPuxoBufferRef.current = bufferLayer
        bufferLayer.addTo(map)
      }).catch(() => {})

      // Cables 25m safety buffers
      fetch("/layers/Cables_25m_buffer_ply.geojson").then(r => r.json()).then(data => {
        const cablesLayer = L.geoJSON(data, {
          style: { fillColor: "#FB923C", fillOpacity: 0.25, color: "#FB923C", weight: 1, opacity: 0.6 },
          interactive: false,
        })
        alarpCablesBufferRef.current = cablesLayer
        cablesLayer.addTo(map)
      }).catch(() => {})

      alarpMapRef.current = map
    }, 100)
  }, [activeTab, L])

  // GEO Map init
  useEffect(() => {
    if (activeTab !== "geo") return
    if (!L) return

    setTimeout(() => {
      const container = document.getElementById("geo-map")
      if (!container) return
      if ((container as any)._leaflet_id) return

      const map = L.map(container, { center: [54.84, 17.79], zoom: 13, zoomControl: true })
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors", maxZoom: 19,
      }).addTo(map)
      L.tileLayer("https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png", {
        attribution: "© OpenSeaMap contributors", maxZoom: 18, opacity: 0.7,
      }).addTo(map)

      // Layer: UXO Sectors (re-use UXO geojson source independently)
      fetch("/layers/UXO_Sectors.geojson").then(r => r.json()).then(data => {
        const layer = L.geoJSON(data, {
          style: { color: "#7a8a9b", weight: 1, fillColor: "#1a2530", fillOpacity: 0.15 },
          interactive: false,
        })
        geoLayerSectorsRef.current = layer
        layer.addTo(map)
      }).catch(() => {})

      // Layer: Clearance Corridor
      fetch("/layers/Clearance_Corridor.geojson").then(r => r.json()).then(data => {
        const layer = L.geoJSON(data, {
          style: { color: "#F0A500", weight: 2, dashArray: "6,4", fillOpacity: 0, fillColor: "transparent" },
          interactive: false,
        })
        geoLayerCorridorRef.current = layer
        layer.addTo(map)
      }).catch(() => {})

      // Layer: pUXO 25m exclusion buffers
      fetch("/layers/pUXO_25m_buffer.geojson").then(r => r.json()).then(data => {
        const layer = L.geoJSON(data, {
          style: { color: "#F0A500", weight: 1.5, dashArray: "4,3", fillColor: "#F0A500", fillOpacity: 0.12, opacity: 0.9 },
          interactive: false,
        })
        geoLayerPuxoBufferRef.current = layer
        layer.addTo(map)
      }).catch(() => {})

      // Layer: Cables 25m exclusion buffers (longitudinal cable corridors)
      fetch("/layers/Cables_25m_buffer_ply.geojson").then(r => r.json()).then(data => {
        const layer = L.geoJSON(data, {
          style: { color: "#F0A500", weight: 1.5, dashArray: "4,3", fillColor: "#F0A500", fillOpacity: 0.12, opacity: 0.9 },
          interactive: false,
        })
        geoLayerCablesBufferRef.current = layer
        layer.addTo(map)
      }).catch(() => {})

      geoMapRef.current = map
    }, 100)
  }, [activeTab, L])

  // GEO Map markers (re-render whenever geoData changes or map is ready)
  useEffect(() => {
    if (activeTab !== "geo") return
    if (!geoMapRef.current) return
    if (!geoData) return
    if (!L) return

    // Clear old markers
    geoMarkersRef.current.forEach(m => geoMapRef.current.removeLayer(m))
    geoMarkersRef.current = []

    const createBoreholeIcon = (scope: string, status: string) => {
      const statusColor = GEO_STATUS_COLORS[status] || "#fff"
      const stroke = status === "Completed" ? "#444" : "#000"
      let svgInner = ""
      if (scope === "SPT Boring") {
        svgInner = `<circle cx="8" cy="8" r="6" fill="${statusColor}" stroke="${stroke}" stroke-width="1.2"/>`
      } else if (scope === "CPT Sounding") {
        svgInner = `<polygon points="8,2 14,13 2,13" fill="${statusColor}" stroke="${stroke}" stroke-width="1.2" stroke-linejoin="round"/>`
      } else if (scope === "Continuous Core") {
        svgInner = `<polygon points="8,2 14,8 8,14 2,8" fill="${statusColor}" stroke="${stroke}" stroke-width="1.2" stroke-linejoin="round"/>`
      } else {
        svgInner = `<circle cx="8" cy="8" r="6" fill="${statusColor}" stroke="${stroke}" stroke-width="1.2"/>`
      }
      return L.divIcon({
        className: "geo-shape-marker",
        html: `<svg width="16" height="16" viewBox="0 0 16 16" style="display:block;">${svgInner}</svg>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      })
    }

    // Add new markers
    geoData.features.forEach((f: any) => {
      const [lng, lat] = f.geometry.coordinates
      const status = f.properties.status || "Planned"
      const scope = f.properties.scopeMethod || "Unknown"

      // Apply filters
      if (!geoScopeFilters.has(scope)) return
      if (!geoStatusFilters.has(status)) return

      const color = GEO_STATUS_COLORS[status] || "#888"
      const isPlanned = status === "Planned"
      const locationType = f.properties.locationType || "borehole"

      let marker: any
      if (locationType === "masw_line") {
        // Square marker for MASW lines
        const icon = L.divIcon({
          className: "geo-masw-marker",
          html: `<div style="width:12px;height:12px;background:${color};border:${isPlanned ? "1.5px solid #000" : `1px solid ${color}`};box-sizing:border-box;"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        })
        marker = L.marker([lat, lng], { icon })
        marker.on("click", () => setSelectedGeoFeature(f))
      } else {
        // Per-scope shape marker for boreholes
        const icon = createBoreholeIcon(scope, status)
        marker = L.marker([lat, lng], { icon })
        marker.on("click", () => setSelectedGeoFeature(f))
      }

      marker.bindTooltip(`${f.properties.locationId} · ${f.properties.scopeMethod} · ${status}`, { direction: "top" })
      marker.addTo(geoMapRef.current)
      geoMarkersRef.current.push(marker)
    })
  }, [activeTab, geoData, L, geoScopeFilters, geoStatusFilters])

  // GEO Map — Vessel markers and safety zones (multi-vessel, settings-driven)
  useEffect(() => {
    if (activeTab !== "geo") return
    if (!geoMapRef.current || !L) return

    // Clear all existing vessel markers and buffers
    Object.values(geoVesselMarkersRef.current).forEach((m: any) => {
      if (m) geoMapRef.current.removeLayer(m)
    })
    Object.values(geoVesselBuffersRef.current).forEach((b: any) => {
      if (b) geoMapRef.current.removeLayer(b)
    })
    geoVesselMarkersRef.current = {}
    geoVesselBuffersRef.current = {}

    // Helper to render a vessel
    const renderVessel = (name: string, lat: number, lng: number, settings: { color: string, safetyZone: number }, tooltipText: string) => {
      const label = name === "Baltic Constructor" ? "BC" : name === "WaveWalker 1" ? "WW1" : name === "Excalibur" ? "EXC" : name.substring(0, 3).toUpperCase()

      // Safety zone buffer
      const buffer = L.circle([lat, lng], {
        radius: settings.safetyZone,
        color: settings.color,
        weight: 1,
        fillColor: settings.color,
        fillOpacity: 0.12,
        opacity: 0.5,
        interactive: false,
      })
      buffer.addTo(geoMapRef.current)
      geoVesselBuffersRef.current[name] = buffer

      // Vessel marker
      const icon = L.divIcon({
        className: "geo-vessel-marker",
        html: `<div style="
          width:32px;height:32px;
          background:${settings.color};
          border:2px solid #fff;
          border-radius:50%;
          box-shadow:0 0 0 1px #000, 0 2px 4px rgba(0,0,0,0.4);
          display:flex;align-items:center;justify-content:center;
          font-size:10px;font-weight:700;color:#fff;
          font-family:system-ui,-apple-system,sans-serif;
        ">${label}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })
      const marker = L.marker([lat, lng], { icon, zIndexOffset: 1000 })
      marker.bindTooltip(tooltipText, { direction: "top" })

      // Click on WaveWalker 1 / Excalibur selects their underlying GEO site
      // (these vessels operate from boreholes tracked in geoData)
      if (name === "WaveWalker 1" || name === "Excalibur") {
        marker.on("click", () => {
          if (!geoData) return
          const vessel = geoData.meta.vessels.find((v: any) => v.name === name)
          if (vessel?.currentLocation) {
            const f = geoData.features.find((f: any) => f.properties.locationId === vessel.currentLocation)
            if (f) setSelectedGeoFeature(f)
          }
        })
      }
      // Baltic Constructor click: it operates from a UXO pUXO, not a GEO feature,
      // so for now we leave it without a click handler (tooltip still works).

      marker.addTo(geoMapRef.current)
      geoVesselMarkersRef.current[name] = marker
    }

    // WaveWalker 1 — from geoData.meta.vessels
    if (geoData) {
      const ww1Settings = geoVesselSettings["WaveWalker 1"]
      if (ww1Settings?.visible) {
        const ww1 = geoData.meta.vessels.find((v: any) => v.name === "WaveWalker 1")
        if (ww1?.currentLng != null && ww1?.currentLat != null) {
          renderVessel("WaveWalker 1", ww1.currentLat, ww1.currentLng, ww1Settings, `WaveWalker 1 · Current: ${ww1.currentLocation || "—"} · Ops: ${ww1.opsStatus}`)
        }
      }

      // Excalibur — from geoData.meta.vessels
      const excSettings = geoVesselSettings["Excalibur"]
      if (excSettings?.visible) {
        const exc = geoData.meta.vessels.find((v: any) => v.name === "Excalibur")
        if (exc?.currentLng != null && exc?.currentLat != null) {
          renderVessel("Excalibur", exc.currentLat, exc.currentLng, excSettings, `Excalibur · Current: ${exc.currentLocation || "—"} · Ops: ${exc.opsStatus}`)
        }
      }
    }

    // Baltic Constructor — from UXO geojson state. UXO features have no `vessel` field;
    // the "In progress" status uniquely identifies where BC is operating (UXO Map already
    // treats In progress as the survey location and draws a 500m blue ring on it).
    // Coordinates come from properties.north (latitude) and properties.east (longitude),
    // not geometry.coordinates, to match how UXO Map reads positions.
    const bcSettings = geoVesselSettings["Baltic Constructor"]
    if (bcSettings?.visible && geojson) {
      const inProgress: any = geojson.features.find((f: any) => f.properties.status === "In progress")
      if (inProgress) {
        const lat = inProgress.properties.north
        const lng = inProgress.properties.east
        renderVessel("Baltic Constructor", lat, lng, bcSettings, `Baltic Constructor · At: ${inProgress.properties.id || "—"}`)
      }
    }
  }, [activeTab, geoData, geojson, L, geoVesselSettings])

  // UXO Map — Vessel markers and safety zones
  useEffect(() => {
    if (activeTab !== "uxo") return
    if (!mapRef.current || !L) return

    // Clear existing UXO vessel markers and buffers
    Object.values(uxoVesselMarkersRef.current).forEach((m: any) => {
      if (m) mapRef.current.removeLayer(m)
    })
    Object.values(uxoVesselBuffersRef.current).forEach((b: any) => {
      if (b) mapRef.current.removeLayer(b)
    })
    uxoVesselMarkersRef.current = {}
    uxoVesselBuffersRef.current = {}

    const renderUxoVessel = (name: string, lat: number, lng: number, settings: { color: string, safetyZone: number }, tooltipText: string) => {
      const label = name === "Baltic Constructor" ? "BC" : name === "WaveWalker 1" ? "WW1" : name === "Excalibur" ? "EXC" : name.substring(0, 3).toUpperCase()

      const buffer = L.circle([lat, lng], {
        radius: settings.safetyZone,
        color: settings.color,
        weight: 1,
        fillColor: settings.color,
        fillOpacity: 0.12,
        opacity: 0.5,
        interactive: false,
      })
      buffer.addTo(mapRef.current)
      uxoVesselBuffersRef.current[name] = buffer

      const icon = L.divIcon({
        className: "uxo-vessel-marker",
        html: `<div style="
          width:32px;height:32px;
          background:${settings.color};
          border:2px solid #fff;
          border-radius:50%;
          box-shadow:0 0 0 1px #000, 0 2px 4px rgba(0,0,0,0.4);
          display:flex;align-items:center;justify-content:center;
          font-size:10px;font-weight:700;color:#fff;
          font-family:system-ui,-apple-system,sans-serif;
        ">${label}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })
      const marker = L.marker([lat, lng], { icon, zIndexOffset: 1000 })
      marker.bindTooltip(tooltipText, { direction: "top" })
      marker.addTo(mapRef.current)
      uxoVesselMarkersRef.current[name] = marker
    }

    // Baltic Constructor — from UXO geojson (In progress = current survey location)
    const bcSettings = uxoVesselSettings["Baltic Constructor"]
    if (bcSettings?.visible && geojson) {
      const inProgress: any = geojson.features.find((f: any) => f.properties.status === "In progress")
      if (inProgress) {
        const lat = inProgress.properties.north
        const lng = inProgress.properties.east
        renderUxoVessel("Baltic Constructor", lat, lng, bcSettings, `Baltic Constructor · At: ${inProgress.properties.id || "—"}`)
      }
    }

    // WaveWalker 1 — cross-tab from geoData.meta.vessels (SC2602 project but position is real geographic)
    const ww1Settings = uxoVesselSettings["WaveWalker 1"]
    if (ww1Settings?.visible && geoData) {
      const ww1 = geoData.meta.vessels.find((v: any) => v.name === "WaveWalker 1")
      if (ww1?.currentLng != null && ww1?.currentLat != null) {
        renderUxoVessel("WaveWalker 1", ww1.currentLat, ww1.currentLng, ww1Settings, `WaveWalker 1 · Current: ${ww1.currentLocation || "—"} · Ops: ${ww1.opsStatus}`)
      }
    }

    // Excalibur — cross-tab from geoData.meta.vessels (currently no coordinates assigned)
    const excSettings = uxoVesselSettings["Excalibur"]
    if (excSettings?.visible && geoData) {
      const exc = geoData.meta.vessels.find((v: any) => v.name === "Excalibur")
      if (exc?.currentLng != null && exc?.currentLat != null) {
        renderUxoVessel("Excalibur", exc.currentLat, exc.currentLng, excSettings, `Excalibur · Current: ${exc.currentLocation || "—"} · Ops: ${exc.opsStatus}`)
      }
    }
  }, [activeTab, geojson, geoData, L, uxoVesselSettings])

  // Clear selected site when leaving GEO tab
  useEffect(() => {
    if (activeTab !== "geo") setSelectedGeoFeature(null)
  }, [activeTab])

  useEffect(() => {
    if (!alarpMapRef.current || !L || alarpData.length === 0) return
    alarpMarkersRef.current.forEach(m => alarpMapRef.current.removeLayer(m))
    alarpMarkersRef.current.clear()

    alarpData
      .filter(d => alarpTypeFilter.has(normalizeBoreholeType(d.type)))
      .forEach(d => {
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
  }, [alarpData, alarpTypeFilter, alarpMapRef.current])

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
      // NB: the "In progress" 500m safety buffer is now drawn by the UXO vessel
      // renderer useEffect (editable radius via uxoVesselSettings), not here.
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

  const zoomToSector = (sectorName: string) => {
    if (!alarpMapRef.current || !L) return
    const sitesInSector = alarpData.filter(d => String(d.sector) === sectorName)
    if (sitesInSector.length === 0) return
    const lats = sitesInSector.map((d: any) => d.lat).filter((v: any) => typeof v === "number" && !isNaN(v))
    const lngs = sitesInSector.map((d: any) => d.lng).filter((v: any) => typeof v === "number" && !isNaN(v))
    if (lats.length === 0 || lngs.length === 0) return
    const bounds = L.latLngBounds(
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    )
    alarpMapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
  }

  const visibleAlarpData = alarpData.filter(d => alarpTypeFilter.has(normalizeBoreholeType(d.type)))

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
            {activeTab === "uxo" && geojson && (
              <div style={styles.statRow}>
                <StatBadge label="Total"     value={geojson.meta.total}     color="#378ADD"/>
                <StatBadge label="Inspected" value={geojson.meta.inspected} color="#EF9F27"/>
                <StatBadge label="Removed"   value={geojson.meta.removed}   color="#639922"/>
                <StatBadge label="Pending"   value={geojson.meta.pending}   color="#E24B4A"/>
              </div>
            )}
            {activeTab === "geo" && geoData && (
              <div style={styles.statRow}>
                <StatBadge label="Total"      value={geoData.meta.total}                                              color="#378ADD"/>
                <StatBadge label="Completed"  value={geoData.meta.Completed}                                          color="#639922"/>
                <StatBadge label="Planned"    value={geoData.meta.Planned}                                            color="#EF9F27"/>
                <StatBadge label="Completion" value={`${(geoData.meta.overallCompletion * 100).toFixed(2)}%`}         color="#E24B4A"/>
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
          {(["uxo", "weather", "alarp", "geo"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: "none", border: "none", borderBottom: activeTab === tab ? "2px solid #378ADD" : "2px solid transparent",
              color: activeTab === tab ? "#fff" : "#4a6070", cursor: "pointer", fontSize: 12, fontWeight: 500,
              padding: "8px 20px", letterSpacing: "0.05em", textTransform: "uppercase" as const,
            }}>
              {tab === "uxo" ? "🗺 UXO Mapa" : tab === "weather" ? "🌊 Prognoza" : tab === "alarp" ? "⚠️ ALARP Map" : "🛢 GEO Map"}
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
                  const tirsCount = geojson.features.filter(f => f.properties.sector === sector && (f.properties as any).tir).length
                  const pct   = total === 0 ? 0 : Math.round((done / total) * 100)
                  const color = pct === 100 ? "#639922" : pct > 0 ? "#EF9F27" : "#4a6070"
                  const tirsColor = tirsCount === 0 ? "#6b9ab8" : tirsCount === total ? "#639922" : "#EF9F27"
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
                      <div style={{ fontSize: 9, color: tirsColor, marginTop: 2, textAlign: "right" as const, fontWeight: 500 }}>
                        {tirsCount}/{total} TIRs
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

            {/* VESSELS section — Safety Zone editor */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: "#7a8a9b", marginBottom: 10, textTransform: "uppercase" as const }}>Vessels (Safety Zone)</div>
              {(["Baltic Constructor", "WaveWalker 1", "Excalibur"] as const).map(vesselName => {
                const settings = uxoVesselSettings[vesselName]
                if (!settings) return null
                return (
                  <div key={vesselName} style={{ padding: "6px 0", opacity: settings.visible ? 1 : 0.5, borderBottom: "1px solid #1a2530" }}>
                    {/* Row 1: checkbox + color dot + vessel name */}
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginBottom: 4 }}>
                      <input
                        type="checkbox"
                        checked={settings.visible}
                        onChange={() => {
                          setUxoVesselSettings(prev => ({
                            ...prev,
                            [vesselName]: { ...prev[vesselName], visible: !prev[vesselName].visible }
                          }))
                        }}
                        style={{ accentColor: settings.color }}
                      />
                      <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: settings.color, flexShrink: 0 }}/>
                      <span style={{ fontSize: 11, fontWeight: 500, color: "#cdd6df" }}>{vesselName}</span>
                    </label>
                    {/* Row 2: safety zone input */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 22 }}>
                      <span style={{ fontSize: 10, color: "#7a8a9b" }}>Safety Zone:</span>
                      <input
                        type="number"
                        value={settings.safetyZone}
                        min={0}
                        max={5000}
                        step={50}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10) || 0
                          setUxoVesselSettings(prev => ({
                            ...prev,
                            [vesselName]: { ...prev[vesselName], safetyZone: value }
                          }))
                        }}
                        style={{
                          width: 60,
                          padding: "2px 5px",
                          background: "#0a0e14",
                          border: "1px solid #1e2f3e",
                          color: "#cdd6df",
                          fontSize: 11,
                          textAlign: "right" as const,
                          borderRadius: 3,
                        }}
                      />
                      <span style={{ fontSize: 10, color: "#7a8a9b" }}>m</span>
                    </div>
                  </div>
                )
              })}
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
                <DetailRow label="UXO ALARP (TIR)" value={(selected.properties as any).tir ?? "—"}/>
                <DetailRow label="Longitude"  value={`${selected.properties.east.toFixed(5)}°`}/>
                <DetailRow label="Latitude"   value={`${selected.properties.north.toFixed(5)}°`}/>
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
            {/* LEFT TOOLS PANEL */}
            <div style={{ width: 280, background: "#0d1f2d", borderRight: "1px solid #1e3448", overflowY: "auto" as const, flexShrink: 0 }}>
              {/* SECTORS */}
              <div style={{ padding: "16px", borderBottom: "1px solid #1e3448" }}>
                <div style={{ color: "#6b9ab8", fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 12 }}>
                  Sectors
                </div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
                  {["313","314","315","323","341","342","343","344","Fish_tunnel"].map(sectorName => (
                    <button
                      key={sectorName}
                      onClick={() => zoomToSector(sectorName)}
                      style={{ background: "#0f1923", border: "1px solid #1e3448", borderRadius: 6, padding: "7px 12px", color: "#a0b4c4", fontSize: 12, cursor: "pointer", textAlign: "left" as const, transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#162838")}
                      onMouseLeave={e => (e.currentTarget.style.background = "#0f1923")}
                    >
                      {sectorName}
                    </button>
                  ))}
                </div>
              </div>
              {/* BOREHOLE TYPES */}
              <div style={{ padding: "16px" }}>
                <div style={{ color: "#6b9ab8", fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 12 }}>
                  Borehole Types
                </div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {[
                    { key: "CPT",     label: "CPT — Cone Penetration Test" },
                    { key: "CCD",     label: "CCD — Continuous Core Drilling" },
                    { key: "CCD_OPT", label: "CCD Optional" },
                    { key: "SPT",     label: "SPT — Standard Penetration Test" },
                    { key: "SPT_OPT", label: "SPT Optional" },
                  ].map(({ key, label }) => (
                    <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, color: "#a0b4c4", fontSize: 12, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={alarpTypeFilter.has(key)}
                        onChange={e => {
                          const next = new Set(alarpTypeFilter)
                          if (e.target.checked) next.add(key)
                          else next.delete(key)
                          setAlarpTypeFilter(next)
                        }}
                        style={{ accentColor: "#378ADD" }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

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
                  Documentation Status
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    {
                      label: "Geophysical ALARP issued",
                      color: "#639922",
                      count: alarpData.filter(d => d.alarp1Issued).length,
                      total: alarpData.length,
                    },
                    {
                      label: "UXO ALARP (TIR) issued",
                      color: "#378ADD",
                      count: geojson?.features?.filter(f => f.properties.tir && String(f.properties.tir).trim() !== "").length ?? 0,
                      total: geojson?.features?.length ?? 0,
                    },
                  ].map(s => (
                    <div key={s.label} style={{ background: "#0f1923", borderRadius: 6, padding: "8px 10px", borderLeft: `3px solid ${s.color}` }}>
                      <div style={{ color: s.color, fontSize: 18, fontWeight: 500 }}>{s.count}/{s.total}</div>
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
                  { color: "#FB923C", opacity: 0.25, label: "pUXO exclusion zone" },
                ].map(l => (
                  <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: l.color, opacity: (l as any).opacity ?? 1, flexShrink: 0 }}/>
                    <span style={{ fontSize: 10, color: "#6b9ab8" }}>{l.label}</span>
                  </div>
                ))}
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
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1a2f42" }}>
                      <span style={{ fontSize: 11, color: "#6b9ab8" }}>Geophysical ALARP</span>
                      <span style={{ fontSize: 11, color: alarpSelected.alarp1Issued ? "#a0b4c4" : "#4a6070", fontFamily: "monospace", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {alarpSelected.alarp_1 || "—"}
                      </span>
                    </div>
                    {alarpSelected.puxoInBox && alarpSelected.puxoInBox.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ color: "#6b9ab8", fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8 }}>
                          UXO ALARP / TIR ({alarpSelected.tirsIssued}/{alarpSelected.tirsExpected})
                        </div>
                        {alarpSelected.puxoInBox.map((p: any) => (
                          <div key={p.ID_pUXO} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #1a2f42", gap: 8 }}>
                            <span style={{ fontSize: 11, color: "#a0b4c4", fontFamily: "monospace", flexShrink: 0 }}>{p.ID_pUXO}</span>
                            <span style={{ fontSize: 11, color: p.tir ? "#a0b4c4" : "#4a6070", fontFamily: "monospace", textAlign: "right" as const, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {p.tir || "(brak)"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
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
                        return (
                          <div key={h.label} style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 11, color: "#a0b4c4" }}>Slope</span>
                              <span style={{ fontSize: 11, color: "#639922", fontWeight: 500 }}>≤1°</span>
                            </div>
                            <div style={{ height: 8, background: "#1a2f42", borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: "100%", background: "#639922", borderRadius: 4 }}/>
                            </div>
                          </div>
                        )
                      }
                      const hasHazard = (h.value ?? 0) > 0
                      if (h.label === "Boulders" && (h.value === null || h.value === undefined || alarpSelected.sector === "Fish_tunnel")) {
                        return (
                          <div key={h.label} style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 11, color: "#a0b4c4" }}>Boulders</span>
                              <span style={{ fontSize: 11, color: "#4a6070", fontWeight: 500 }}>no data</span>
                            </div>
                            <div style={{ height: 8, background: "transparent", borderRadius: 4, border: "1px solid #fff", overflow: "hidden" }}/>
                          </div>
                        )
                      }
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
                    {visibleAlarpData.map(d => {
                      const riskColor = d.overallRisk === "white" ? "#ffffff" : d.overallRisk === "red" ? "#E24B4A" : d.overallRisk === "orange" ? "#FB923C" : "#639922"
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
                          <span style={{ fontSize: 10, color: (d.tirsExpected === 0) ? "#639922" : (d.tirsIssued === d.tirsExpected) ? "#639922" : (d.tirsIssued === 0) ? "#E24B4A" : "#EF9F27", fontWeight: 500 }}>
                            {d.tirsExpected === 0 ? "UXO ALARP ✓" : `UXO ALARP ${d.tirsIssued}/${d.tirsExpected}`}
                          </span>
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

        {activeTab === "geo" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "row" as const, height: "100%", background: "#0a0e14" }}>
            {/* LEFT PANEL — Filters and Vessels */}
            <div style={{ width: 280, minWidth: 280, background: "#0f1923", borderRight: "1px solid #1e2f3e", overflowY: "auto" as const, padding: 16, color: "#cdd6df", fontSize: 12 }}>

              {/* SCOPE / METHOD section */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: "#7a8a9b", marginBottom: 10, textTransform: "uppercase" as const }}>Scope / Method</div>
                {geoData && (["SPT Boring", "CPT Sounding", "Continuous Core", "Marine MASW"] as const).map(scope => {
                  const scopeMeta = geoData.meta.perScope.find((p: any) => p.scope === scope)
                  const count = scopeMeta?.total ?? 0
                  const completed = scopeMeta?.completed ?? 0
                  const pct = count > 0 ? (completed / count) * 100 : 0
                  const checked = geoScopeFilters.has(scope)
                  const barColor = pct === 0 ? "#374151" : pct < 50 ? "#F0A500" : pct < 100 ? "#A3C037" : "#639922"
                  return (
                    <div key={scope} style={{ marginBottom: 10, opacity: checked ? 1 : 0.5 }}>
                      <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 0", cursor: "pointer" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const next = new Set(geoScopeFilters)
                              if (checked) next.delete(scope); else next.add(scope)
                              setGeoScopeFilters(next)
                            }}
                            style={{ accentColor: "#378ADD" }}
                          />
                          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <svg width="12" height="12" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
                              {scope === "SPT Boring" && <circle cx="8" cy="8" r="5.5" fill="#fff" stroke="#000" strokeWidth="1"/>}
                              {scope === "CPT Sounding" && <polygon points="8,2 14,13 2,13" fill="#fff" stroke="#000" strokeWidth="1" strokeLinejoin="round"/>}
                              {scope === "Continuous Core" && <polygon points="8,2 14,8 8,14 2,8" fill="#fff" stroke="#000" strokeWidth="1" strokeLinejoin="round"/>}
                              {scope === "Marine MASW" && <rect x="2.5" y="2.5" width="11" height="11" fill="#fff" stroke="#000" strokeWidth="1"/>}
                            </svg>
                            <span>{scope}</span>
                          </span>
                        </span>
                        <span style={{ color: "#7a8a9b", fontSize: 11 }}>{count}</span>
                      </label>
                      <div style={{ marginTop: 4, marginLeft: 24 }}>
                        <div style={{ position: "relative" as const, height: 14, background: "#1a2530", borderRadius: 3, overflow: "hidden" as const }}>
                          <div style={{ position: "absolute" as const, left: 0, top: 0, bottom: 0, width: `${pct}%`, background: barColor, transition: "width 0.3s" }}/>
                          <div style={{ position: "absolute" as const, left: 0, right: 0, top: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: pct > 50 ? "#0a0e14" : "#cdd6df" }}>
                            {completed}/{count} · {pct.toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* STATUS section */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: "#7a8a9b", marginBottom: 10, textTransform: "uppercase" as const }}>Status</div>
                {geoData && (["Planned", "Completed", "In Progress", "On Hold", "Aborted"] as const).map(status => {
                  const count = geoData.meta[status as keyof typeof geoData.meta] as number ?? 0
                  const checked = geoStatusFilters.has(status)
                  const dotColor = status === "Completed" ? "#639922" : status === "In Progress" ? "#F0A500" : status === "Planned" ? "#fff" : status === "On Hold" ? "#EF9F27" : "#E24B4A"
                  return (
                    <label key={status} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", cursor: "pointer", opacity: checked ? 1 : 0.5 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = new Set(geoStatusFilters)
                            if (checked) next.delete(status); else next.add(status)
                            setGeoStatusFilters(next)
                          }}
                          style={{ accentColor: "#378ADD" }}
                        />
                        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: dotColor, border: status === "Planned" ? "1px solid #000" : "none" }}/>
                        <span>{status}</span>
                      </span>
                      <span style={{ color: "#7a8a9b", fontSize: 11 }}>{count}</span>
                    </label>
                  )
                })}
              </div>

              {/* VESSELS section */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: "#7a8a9b", marginBottom: 10, textTransform: "uppercase" as const }}>Vessels (Safety Zone)</div>
                {(["Baltic Constructor", "WaveWalker 1", "Excalibur"] as const).map(vesselName => {
                  const settings = geoVesselSettings[vesselName]
                  if (!settings) return null
                  return (
                    <div key={vesselName} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", opacity: settings.visible ? 1 : 0.5 }}>
                      <input
                        type="checkbox"
                        checked={settings.visible}
                        onChange={() => {
                          setGeoVesselSettings(prev => ({
                            ...prev,
                            [vesselName]: { ...prev[vesselName], visible: !prev[vesselName].visible }
                          }))
                        }}
                        style={{ accentColor: settings.color }}
                      />
                      <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: settings.color, flexShrink: 0 }}/>
                      <span style={{ flex: 1, fontSize: 11 }}>{vesselName}</span>
                      <input
                        type="number"
                        value={settings.safetyZone}
                        min={0}
                        max={5000}
                        step={50}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10) || 0
                          setGeoVesselSettings(prev => ({
                            ...prev,
                            [vesselName]: { ...prev[vesselName], safetyZone: value }
                          }))
                        }}
                        style={{
                          width: 60,
                          padding: "3px 5px",
                          background: "#0a0e14",
                          border: "1px solid #1e2f3e",
                          color: "#cdd6df",
                          fontSize: 11,
                          textAlign: "right" as const,
                          borderRadius: 3,
                        }}
                      />
                      <span style={{ fontSize: 10, color: "#7a8a9b" }}>m</span>
                    </div>
                  )
                })}
              </div>

            </div>

            {/* CENTER — Map */}
            <div style={{ flex: 1, position: "relative" as const }}>
              {geoLoading && (
                <div style={{ position: "absolute" as const, top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1000, background: "rgba(15,25,35,0.9)", color: "#fff", padding: "12px 24px", borderRadius: 6, fontSize: 13 }}>
                  Loading GEO drilling data…
                </div>
              )}
              {geoError && (
                <div style={{ position: "absolute" as const, top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1000, background: "rgba(15,25,35,0.9)", color: "#E24B4A", padding: "12px 24px", borderRadius: 6, fontSize: 13 }}>
                  Error: {geoError}
                </div>
              )}
              <div id="geo-map" style={{ width: "100%", height: "100%" }}/>
            </div>

            {/* RIGHT PANEL — Site Details */}
            <div style={{ width: 320, minWidth: 320, background: "#0f1923", borderLeft: "1px solid #1e2f3e", overflowY: "auto" as const, padding: 16, color: "#cdd6df", fontSize: 12 }}>
              {!selectedGeoFeature ? (
                <>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: "#7a8a9b", marginBottom: 10, textTransform: "uppercase" as const }}>Site Details</div>
                  <div style={{ color: "#4a6070", fontStyle: "italic" as const, fontSize: 11 }}>Click a site on the map to see details…</div>
                </>
              ) : (() => {
                const p = selectedGeoFeature.properties
                const statusColor = p.status === "Completed" ? "#639922" : p.status === "In Progress" ? "#F0A500" : p.status === "On Hold" ? "#EF9F27" : p.status === "Aborted" ? "#E24B4A" : "#fff"
                const isMasw = p.locationType === "masw_line"
                const pct = p.depthProgress && typeof p.depthProgress === "number" ? p.depthProgress * 100 : 0
                const barColor = pct === 0 ? "#374151" : pct < 50 ? "#F0A500" : pct < 100 ? "#A3C037" : "#639922"
                const fmt = (v: any) => v == null || v === "" ? "—" : v

                return (
                  <>
                    {/* Header with close button */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{p.locationId}</div>
                        <div style={{ fontSize: 11, color: "#7a8a9b", marginTop: 2 }}>{p.scopeMethod} · {isMasw ? "MASW Line" : "Borehole"}</div>
                      </div>
                      <button
                        onClick={() => setSelectedGeoFeature(null)}
                        style={{ background: "transparent", border: "1px solid #1e2f3e", color: "#7a8a9b", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "2px 7px", borderRadius: 3 }}
                        title="Close"
                      >×</button>
                    </div>

                    {/* STATUS */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", color: "#7a8a9b", marginBottom: 4, textTransform: "uppercase" as const }}>Status</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: statusColor, border: p.status === "Planned" ? "1px solid #000" : "none" }}/>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{p.status}</span>
                      </div>
                    </div>

                    {/* PROGRESS */}
                    {!isMasw && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", color: "#7a8a9b", marginBottom: 4, textTransform: "uppercase" as const }}>Drilling Progress</div>
                        <div style={{ position: "relative" as const, height: 18, background: "#1a2530", borderRadius: 3, overflow: "hidden" as const }}>
                          <div style={{ position: "absolute" as const, left: 0, top: 0, bottom: 0, width: `${pct}%`, background: barColor, transition: "width 0.3s" }}/>
                          <div style={{ position: "absolute" as const, left: 0, right: 0, top: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: pct > 50 ? "#0a0e14" : "#cdd6df" }}>
                            {p.achievedDepth != null ? `${p.achievedDepth} / ${p.plannedDepth} m · ${pct.toFixed(1)}%` : `Planned ${p.plannedDepth} m`}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* LOCATION */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", color: "#7a8a9b", marginBottom: 4, textTransform: "uppercase" as const }}>Location</div>
                      <div style={{ fontSize: 11, lineHeight: 1.6 }}>
                        <div><span style={{ color: "#7a8a9b" }}>Planned:</span> {fmt(p.north?.toFixed(5))}°N, {fmt(p.east?.toFixed(5))}°E</div>
                        {(p.northFinal != null && p.eastFinal != null) && (
                          <div><span style={{ color: "#7a8a9b" }}>Final:</span> {p.northFinal.toFixed(5)}°N, {p.eastFinal.toFixed(5)}°E</div>
                        )}
                        {p.seabedDepth != null && (
                          <div><span style={{ color: "#7a8a9b" }}>Seabed:</span> {p.seabedDepth} m</div>
                        )}
                        {isMasw && p.lineLength != null && (
                          <div><span style={{ color: "#7a8a9b" }}>Line length:</span> {p.lineLength} m</div>
                        )}
                        {isMasw && p.targetDepth != null && (
                          <div><span style={{ color: "#7a8a9b" }}>Target depth:</span> {p.targetDepth} m</div>
                        )}
                      </div>
                    </div>

                    {/* VESSEL & DATES */}
                    {(p.vessel || p.dateStarted || p.dateCompleted) && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", color: "#7a8a9b", marginBottom: 4, textTransform: "uppercase" as const }}>Vessel & Dates</div>
                        <div style={{ fontSize: 11, lineHeight: 1.6 }}>
                          <div><span style={{ color: "#7a8a9b" }}>Vessel:</span> {fmt(p.vessel)}</div>
                          <div><span style={{ color: "#7a8a9b" }}>Started:</span> {fmt(p.dateStarted)}</div>
                          <div><span style={{ color: "#7a8a9b" }}>Completed:</span> {fmt(p.dateCompleted)}</div>
                          {p.duration != null && p.duration > 0 && (
                            <div><span style={{ color: "#7a8a9b" }}>Duration:</span> {p.duration} day{p.duration !== 1 ? "s" : ""}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* DRILLING DETAILS — only for boreholes */}
                    {!isMasw && (p.refusal != null || p.samples) && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", color: "#7a8a9b", marginBottom: 4, textTransform: "uppercase" as const }}>Drilling Details</div>
                        <div style={{ fontSize: 11, lineHeight: 1.6 }}>
                          {p.refusal != null && <div><span style={{ color: "#7a8a9b" }}>Refusal:</span> {p.refusal}</div>}
                          {p.samples && <div><span style={{ color: "#7a8a9b" }}>Samples:</span> <span style={{ wordBreak: "break-word" as const }}>{p.samples}</span></div>}
                          {p.hseqFlag != null && p.hseqFlag !== 0 && (
                            <div><span style={{ color: "#E24B4A", fontWeight: 600 }}>HSEQ Flag:</span> {p.hseqFlag}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* OBSERVATIONS */}
                    {p.observations && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", color: "#7a8a9b", marginBottom: 4, textTransform: "uppercase" as const }}>Observations</div>
                        <div style={{ fontSize: 11, lineHeight: 1.5, color: "#cdd6df", background: "#0a0e14", padding: 8, borderRadius: 3, border: "1px solid #1e2f3e", whiteSpace: "pre-wrap" as const }}>
                          {p.observations}
                        </div>
                      </div>
                    )}

                    {/* PLANNED REMARKS */}
                    {p.plannedRemarks && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", color: "#7a8a9b", marginBottom: 4, textTransform: "uppercase" as const }}>Planned Remarks</div>
                        <div style={{ fontSize: 11, lineHeight: 1.5, color: "#cdd6df" }}>{p.plannedRemarks}</div>
                      </div>
                    )}

                    {/* SHOW ALL PROPERTIES TOGGLE */}
                    <div style={{ marginTop: 16, borderTop: "1px solid #1e2f3e", paddingTop: 12 }}>
                      <button
                        onClick={() => setShowAllGeoProps(prev => !prev)}
                        style={{ width: "100%", background: "#1a2530", border: "1px solid #1e2f3e", color: "#cdd6df", padding: "6px 10px", borderRadius: 3, cursor: "pointer", fontSize: 11, fontWeight: 500, textAlign: "left" as const, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      >
                        <span>Show all properties</span>
                        <span style={{ color: "#7a8a9b" }}>{showAllGeoProps ? "▼" : "▶"}</span>
                      </button>
                      {showAllGeoProps && (
                        <div style={{ marginTop: 8, background: "#0a0e14", border: "1px solid #1e2f3e", borderRadius: 3, padding: 8, fontSize: 10, lineHeight: 1.6, fontFamily: "ui-monospace, monospace" as const, maxHeight: 300, overflowY: "auto" as const }}>
                          {Object.entries(p).map(([key, value]) => (
                            <div key={key} style={{ display: "flex", gap: 6, marginBottom: 3 }}>
                              <span style={{ color: "#7a8a9b", minWidth: 110, flexShrink: 0 }}>{key}:</span>
                              <span style={{ color: "#cdd6df", wordBreak: "break-word" as const }}>{value == null ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>

          </div>
        )}

      </div>
    </>
  )
}

function StatBadge({ label, value, color }: { label: string; value: number | string; color: string }) {
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

const GEO_STATUS_COLORS: Record<string, string> = {
  "Completed":   "#639922",
  "In Progress": "#F0A500",
  "Planned":     "#FFFFFF",
  "On Hold":     "#EF9F27",
  "Aborted":     "#E24B4A",
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
