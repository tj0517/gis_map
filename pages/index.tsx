import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/router"
import { useEffect, useRef, useState } from "react"
import Head from "next/head"
import type { GeoJSON, UXOFeature } from "./api/data"
import { getMarkerStyle, LEGEND_ITEMS } from "../lib/symbology"

let L: any = null

const SIMOPS_VESSELS = [
  { mmsi: "261007303", name: "Baltic Constructor", role: "UXO Survey",         color: "#E24B4A" },
  { mmsi: "261005510", name: "WŁA-184 HELOT",      role: "Environmental",      color: "#378ADD" },
  { mmsi: "261098090", name: "Baltic Messenger",   role: "UXO Support",        color: "#EF9F27" },
  { mmsi: "261011330", name: "Baltic Jet",         role: "UXO Support",        color: "#F0A500" },
  { mmsi: "261005193", name: "PM Explorer",        role: "Environmental",      color: "#5BA4CF" },
  { mmsi: "261001480", name: "Geo Scanner",        role: "Magnetometers",      color: "#A78BFA" },
  { mmsi: "261091090", name: "Geo Sonar",          role: "Sub-bottom/SSS",     color: "#C084FC" },
  { mmsi: "261002065", name: "Baltic Surveyor",    role: "UXO Survey",         color: "#FB923C" },
  { mmsi: "261018650", name: "Litoral",            role: "Buoy Deployment",    color: "#34D399" },
  { mmsi: "261029790", name: "Hektor AG",          role: "Environmental",      color: "#60A5FA" },
  { mmsi: "244962000", name: "Nordnes",            role: "3rd Party OFW",      color: "#94A3B8" },
  { mmsi: "205787000", name: "Boka Falcon",        role: "3rd Party OFW",      color: "#94A3B8" },
  { mmsi: "253477000", name: "Vagant",             role: "3rd Party OFW",      color: "#94A3B8" },
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

        {/* MAIN */}
        <div style={styles.main}>
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
              <label style={styles.layerToggle}>
                <input type="checkbox" checked={showVessels} onChange={e => setShowVessels(e.target.checked)} style={{ accentColor: "#EF9F27", marginRight: 6 }}/>
                <span style={{ ...styles.legendLabel, color: showVessels ? "#a0b4c4" : "#4a6070" }}>AIS Vessels</span>
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
