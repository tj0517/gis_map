import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/router"
import { useEffect, useRef, useState } from "react"
import Head from "next/head"
import type { GeoJSON, UXOFeature } from "./api/data"
import { getMarkerStyle, LEGEND_ITEMS } from "../lib/symbology"

// Leaflet ładowany tylko po stronie klienta
let L: any = null

export default function MapPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const mapRef    = useRef<any>(null)
  const mapDivRef = useRef<HTMLDivElement>(null)

  const [geojson, setGeojson]         = useState<GeoJSON | null>(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [selected, setSelected]       = useState<UXOFeature | null>(null)
  const [filterStatus, setFilterStatus] = useState("ALL")
  const [filterSector, setFilterSector] = useState("ALL")
  const [showLegend, setShowLegend]   = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [showGeo3, setShowGeo3]             = useState(true)
  const [showSectors, setShowSectors]       = useState(true)
  const [showCorridor, setShowCorridor]     = useState(true)
  const layerGeo3Ref      = useRef<any>(null)
  const layerSectorsRef   = useRef<any>(null)
  const layerCorridorRef  = useRef<any>(null)
  const [mapReady, setMapReady] = useState(false)
  const [measureActive, setMeasureActive] = useState(false)
  const [cursorCoords, setCursorCoords] = useState<{lat: number, lng: number} | null>(null)
  const [searchId, setSearchId] = useState("")
  const measurePointsRef = useRef<any[]>([])
  const measureLayerRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const activeTooltipMarkerRef = useRef<any>(null)

  // Redirect jeśli nie zalogowany
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status])

  // Pobierz dane
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
      // Auto-refresh co 5 minut
      const interval = setInterval(fetchData, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [status])

  // Inicjalizacja mapy — zależy od status, bo div mapy renderuje się dopiero po zalogowaniu
  useEffect(() => {
    if (status !== "authenticated") return
    if (!mapDivRef.current) return

    // Jeśli kontener ma już mapę (Fast Refresh / Strict Mode), usuń ją
    if ((mapDivRef.current as any)._leaflet_id) {
      mapRef.current?.remove()
      mapRef.current = null
    }

    import("leaflet").then((leaflet) => {
      L = leaflet.default
      if (!mapDivRef.current) return
      // Podwójne sprawdzenie po async import
      if ((mapDivRef.current as any)._leaflet_id) return

      // Fix domyślnych ikon Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({ iconUrl: "", shadowUrl: "" })

      const map = L.map(mapDivRef.current!, {
        center: [54.84, 17.79],
        zoom: 13,
        zoomControl: true,
      })

      // Mapa bazowa — OpenStreetMap
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map)

      // Morska mapa bazowa (opcja alternatywna)
      L.tileLayer(
        "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png",
        { attribution: "© OpenSeaMap contributors", maxZoom: 18, opacity: 0.7 }
      ).addTo(map)

      mapRef.current = map
      setMapReady(true)
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [status])

  // Załaduj warstwy GeoJSON
  useEffect(() => {
    if (status !== "authenticated") return
    // Poczekaj na inicjalizację mapy
    const init = () => {
      if (!mapRef.current || !L) { setTimeout(init, 200); return }

      // GEO3_Area
      fetch("/layers/GEO3_Area.geojson")
        .then(r => r.json())
        .then(data => {
          if (!mapRef.current) return
          const layer = L.geoJSON(data, {
            filter: (f: any) => f.properties?.Layer === "zakres obszaru GEO3 - część morska",
            style: { fill: false, color: "#666", weight: 1, opacity: 0.6 },
          })
          layerGeo3Ref.current = layer
          if (showGeo3) layer.addTo(mapRef.current)
        })
        .catch(() => {/* plik jeszcze nie istnieje */})

      // UXO_Sectors
      fetch("/layers/UXO_Sectors.geojson")
        .then(r => r.json())
        .then(data => {
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
        })
        .catch(() => {})

      // Clearance_Corridor
      fetch("/layers/Clearance_Corridor.geojson")
        .then(r => r.json())
        .then(data => {
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
        })
        .catch(() => {})
    }
    init()
  }, [status])

  // Przełączanie widoczności warstw
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
      if (measureLayerRef.current) {
        measureLayerRef.current.clearLayers()
      }
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
        L.circleMarker(pt, {
          radius: 5, color: "#fff", weight: 2,
          fillColor: "#378ADD", fillOpacity: 1
        }).addTo(layer)
        if (i > 0) {
          const dist = map.distance(pts[i - 1], pt)
          const mid = [(pts[i-1][0] + pt[0]) / 2, (pts[i-1][1] + pt[1]) / 2]
          L.polyline([pts[i - 1], pt], { color: "#378ADD", weight: 2, dashArray: "6,4" }).addTo(layer)
          L.marker(mid, {
            icon: L.divIcon({
              className: "",
              html: `<div style="background:#0f2740;color:#c8dae8;font-size:11px;padding:2px 6px;border-radius:4px;border:1px solid #378ADD;white-space:nowrap">${dist >= 1000 ? (dist/1000).toFixed(2)+" km" : dist.toFixed(0)+" m"}</div>`,
              iconAnchor: [30, 10]
            })
          }).addTo(layer)
        }
      })

      if (pts.length > 1) {
        let total = 0
        for (let i = 1; i < pts.length; i++) total += map.distance(pts[i-1], pts[i])
        const last = pts[pts.length - 1]
        L.marker(last, {
          icon: L.divIcon({
            className: "",
            html: `<div style="background:#1F4E79;color:#fff;font-size:12px;font-weight:500;padding:3px 8px;border-radius:4px;border:1px solid #378ADD;white-space:nowrap">∑ ${total >= 1000 ? (total/1000).toFixed(2)+" km" : total.toFixed(0)+" m"}</div>`,
            iconAnchor: [-5, 10]
          })
        }).addTo(layer)
      }
    }

    map.on("click", onClick)
    return () => {
      map.off("click", onClick)
      map.getContainer().style.cursor = ""
    }
  }, [measureActive, mapReady])

  useEffect(() => {
    if (!mapRef.current || !mapReady) return
    const map = mapRef.current
    const onMove = (e: any) => setCursorCoords({ lat: e.latlng.lat, lng: e.latlng.lng })
    const onOut = () => setCursorCoords(null)
    map.on("mousemove", onMove)
    map.on("mouseout", onOut)
    return () => {
      map.off("mousemove", onMove)
      map.off("mouseout", onOut)
    }
  }, [mapReady])

  const handleSearch = (id: string) => {
    if (!geojson || !mapRef.current || !id) return
    const found = geojson.features.find(f => f.properties.id === id)
    if (found) {
      mapRef.current.setView([found.properties.north, found.properties.east], 17, { animate: true })
      setSelected(found)
      setSearchId("")
      setTimeout(() => {
        if (activeTooltipMarkerRef.current) {
          activeTooltipMarkerRef.current.closeTooltip()
        }
        const marker = markersRef.current.get(id)
        if (marker) {
          marker.openTooltip()
          activeTooltipMarkerRef.current = marker
        }
      }, 600)
    }
  }

  // Renderuj punkty gdy dane gotowe
  useEffect(() => {
    if (!mapRef.current || !geojson || !L || !mapReady) return

    // Usuń poprzednie warstwy UXO
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
      const marker = L.marker([north, east], {
        icon,
        zIndexOffset: status === "In progress" ? 1000 : 0,
      })
      marker._uxoMarker = true
      marker.on("click", (e: any) => {
        if (measureActive) {
          L.DomEvent.stopPropagation(e)
          const { lat, lng } = e.latlng
          measurePointsRef.current.push([lat, lng])
          mapRef.current.fire("click", { latlng: e.latlng })
        } else {
          setSelected(feature)
        }
      })
      marker.bindTooltip(id, { permanent: false, direction: "top", offset: [0, -12] })
      markersRef.current.set(id, marker)
      marker.addTo(mapRef.current)
    }

    // Add non-"In progress" markers first, then "In progress" on top
    features.filter(f => f.properties.status !== "In progress").forEach(addMarker)
    features.filter(f => f.properties.status === "In progress").forEach(addMarker)

    // Dopasuj widok do punktów przy pierwszym ładowaniu
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
      style: {
        transform: "scale(2)",
        transformOrigin: "top left",
      },
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
        <style>{`.geojson-label { background: rgba(15,25,35,0.75); border: none; box-shadow: none; color: #a0b4c4; font-size: 11px; padding: 2px 5px; white-space: nowrap; }`}</style>
      </Head>

      <div style={styles.layout}>

        {/* ── TOPBAR ── */}
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
            <button onClick={fetchData} style={styles.refreshBtn} title="Odśwież dane">
              ↻
            </button>
            <div style={styles.userInfo}>
              <span style={styles.userEmail}>{session?.user?.email}</span>
              <button onClick={() => signOut({ callbackUrl: "/login" })} style={styles.signoutBtn}>
                Wyloguj
              </button>
            </div>
          </div>
        </div>

        {/* ── MAIN ── */}
        <div style={styles.main}>

          {/* ── SIDEBAR ── */}
          <div style={styles.sidebar}>

            {/* Filtry */}
            <div style={styles.sideSection}>
              <div style={styles.sideLabel}>Status</div>
              {["ALL", "pUXO", "In progress", "Inspected", "Removed"].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  style={{ ...styles.filterBtn, ...(filterStatus === s ? styles.filterBtnActive : {}) }}
                >
                  {s === "ALL" ? "Wszystkie" : s}
                </button>
              ))}
            </div>

            <div style={styles.sideSection}>
              <div style={styles.sideLabel}>Sektor</div>
              <select
                value={filterSector}
                onChange={e => setFilterSector(e.target.value)}
                style={styles.select}
              >
                {sectors.map(s => (
                  <option key={s} value={s}>{s === "ALL" ? "Wszystkie sektory" : `Sektor ${s}`}</option>
                ))}
              </select>
            </div>

            {/* Legenda */}
            <div style={styles.sideSection}>
              <div
                style={{ ...styles.sideLabel, cursor: "pointer", userSelect: "none" }}
                onClick={() => setShowLegend(v => !v)}
              >
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

            {/* Postęp per sektor */}
            <div style={styles.sideSection}>
              <div style={styles.sideLabel}>Postęp per sektor</div>
              {geojson ? (() => {
                const sectorList = Array.from(new Set(geojson.features.map(f => f.properties.sector))).sort()
                return sectorList.map(sector => {
                  const total = geojson.features.filter(f => f.properties.sector === sector).length
                  const done = geojson.features.filter(f => f.properties.sector === sector && (f.properties.status === "Inspected" || f.properties.status === "Removed")).length
                  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
                  const color = pct === 100 ? "#639922" : pct > 0 ? "#EF9F27" : "#4a6070"
                  return (
                    <div key={sector} style={{ marginBottom: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 10, color: "#c8dae8" }}>
                          {(() => {
                            const s = String(sector)
                            return s.length === 3 ? `GEO3_${s[1]}_${s[2]}` : `S${sector}`
                          })()}
                        </span>
                        <span style={{ fontSize: 10, color, fontWeight: 500 }}>{done}/{total} · {pct}%</span>
                      </div>
                      <div style={{ height: 5, background: "#1a2f42", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: color,
                          borderRadius: 3,
                          transition: "width 0.4s ease"
                        }}/>
                      </div>
                    </div>
                  )
                })
              })() : (
                <div style={{ fontSize: 10, color: "#4a6070" }}>Ładowanie danych…</div>
              )}
            </div>

            {/* Warstwy */}
            <div style={styles.sideSection}>
              <div style={styles.sideLabel}>Warstwy</div>
              {([
                { label: "GEO3 Area",          checked: showGeo3,     set: setShowGeo3,     color: "#666" },
                { label: "UXO Sectors",        checked: showSectors,  set: setShowSectors,  color: "#2E6FA3" },
                { label: "Clearance Corridor", checked: showCorridor, set: setShowCorridor, color: "#E8871E" },
              ] as const).map(({ label, checked, set, color }) => (
                <label key={label} style={styles.layerToggle}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => set(e.target.checked)}
                    style={{ accentColor: color, marginRight: 6 }}
                  />
                  <span style={{ ...styles.legendLabel, color: checked ? "#a0b4c4" : "#4a6070" }}>{label}</span>
                </label>
              ))}
            </div>

            {/* Szukaj punktu */}
            <div style={styles.sideSection}>
              <div style={styles.sideLabel}>Szukaj punktu</div>
              <select
                value={searchId}
                onChange={e => { setSearchId(e.target.value); handleSearch(e.target.value) }}
                style={{ ...styles.select, width: "100%" }}
              >
                <option value="">— wybierz obiekt —</option>
                {geojson
                  ? [...geojson.features]
                      .sort((a, b) => a.properties.id.localeCompare(b.properties.id))
                      .map(f => (
                        <option key={f.properties.id} value={f.properties.id}>
                          {f.properties.id} · {f.properties.status} · S{f.properties.sector}
                        </option>
                      ))
                  : null
                }
              </select>
            </div>

            {/* Narzędzia */}
            <div style={styles.sideSection}>
              <div style={styles.sideLabel}>Narzędzia</div>
              <button
                onClick={() => setMeasureActive(v => !v)}
                style={{
                  ...styles.filterBtn,
                  ...(measureActive ? styles.filterBtnActive : {}),
                  display: "flex", alignItems: "center", gap: 6
                }}
              >
                <span style={{ fontSize: 14 }}>📏</span>
                {measureActive ? "Zakończ pomiar" : "Miara odległości"}
              </button>
              {measureActive && (
                <div style={{ fontSize: 10, color: "#6b9ab8", lineHeight: 1.4, padding: "4px 2px" }}>
                  Klikaj punkty na mapie. Kliknij przycisk ponownie aby zakończyć.
                </div>
              )}
              <button
                onClick={handleExportPNG}
                style={{
                  ...styles.filterBtn,
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <span style={{ fontSize: 14 }}>🖨️</span>
                Eksport PNG
              </button>
            </div>

            {/* Ostatnie odświeżenie */}
            {lastRefresh && (
              <div style={styles.refreshInfo}>
                Dane z: {lastRefresh.toLocaleTimeString("pl-PL")}
              </div>
            )}
          </div>

          {/* ── MAPA ── */}
          <div style={styles.mapArea}>
            <div ref={mapDivRef} style={styles.map}/>
            {cursorCoords && (
              <div style={{
                position: "absolute", bottom: 8, left: 8, zIndex: 1000,
                background: "rgba(13,31,45,0.85)", border: "1px solid #1e3448",
                borderRadius: 4, padding: "3px 8px", fontSize: 11,
                color: "#c8dae8", fontFamily: "monospace", pointerEvents: "none"
              }}>
                {cursorCoords.lat.toFixed(5)}° N &nbsp; {cursorCoords.lng.toFixed(5)}° E
              </div>
            )}

            {/* Loading overlay */}
            {loading && (
              <div style={styles.mapOverlay}>
                <div style={styles.spinner}/>
                <div style={styles.loadingText}>Ładowanie danych z OneDrive…</div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={styles.errorBanner}>
                Błąd pobierania danych: {error}
                <button onClick={fetchData} style={styles.retryBtn}>Spróbuj ponownie</button>
              </div>
            )}
          </div>

          {/* ── PANEL SZCZEGÓŁÓW ── */}
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
                {selected.properties.type !== "pUXO" || selected.properties.status !== "pUXO"
                  ? ` · ${selected.properties.type}`
                  : ""}
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

// ── STYLE ────────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  pUXO:      "#E24B4A",
  Inspected: "#EF9F27",
  Removed:   "#639922",
}

const styles: Record<string, any> = {
  fullscreen:     { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f1923" },
  layout:         { display: "flex", flexDirection: "column", height: "100vh", background: "#0f1923", fontFamily: "system-ui, sans-serif" },
  topbar:         { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 56, background: "#0f1923", borderBottom: "1px solid #1e2f3e", flexShrink: 0 },
  topbarLeft:     { display: "flex", alignItems: "center", gap: 12 },
  logo:           { fontSize: 24 },
  topTitle:       { color: "#fff", fontSize: 14, fontWeight: 500 },
  topSub:         { color: "#4a6070", fontSize: 11 },
  topbarRight:    { display: "flex", alignItems: "center", gap: 20 },
  statRow:        { display: "flex", gap: 20 },
  refreshBtn:     { background: "none", border: "1px solid #2a3a4a", borderRadius: 6, color: "#6b8099", fontSize: 18, cursor: "pointer", padding: "4px 10px", lineHeight: 1 },
  userInfo:       { display: "flex", alignItems: "center", gap: 10 },
  userEmail:      { color: "#4a6070", fontSize: 12 },
  signoutBtn:     { background: "none", border: "1px solid #2a3a4a", borderRadius: 6, color: "#6b8099", fontSize: 12, cursor: "pointer", padding: "4px 10px" },
  main:           { display: "flex", flex: 1, overflow: "hidden" },
  sidebar:        { width: 220, background: "#0d1f2d", borderRight: "1px solid #1e3448", padding: 16, overflowY: "auto", flexShrink: 0, display: "flex", flexDirection: "column", gap: 20 },
  sideSection:    { display: "flex", flexDirection: "column", gap: 6 },
  sideLabel:      { fontSize: 10, fontWeight: 500, color: "#6b9ab8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 },
  filterBtn:      { background: "none", border: "1px solid #2a3a4a", borderRadius: 6, color: "#6b8099", fontSize: 12, cursor: "pointer", padding: "6px 10px", textAlign: "left" as const },
  filterBtnActive:{ background: "#1F4E79", border: "1px solid #378ADD", color: "#fff" },
  select:         { background: "#1a2632", border: "1px solid #2a3a4a", borderRadius: 6, color: "#a0b4c4", fontSize: 12, padding: "6px 8px" },
  legendItem:     { display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", borderRadius: 4, background: "#0f2740" },
  legendLabel:    { fontSize: 11, color: "#c8dae8" },
  refreshInfo:    { fontSize: 11, color: "#2a3a4a", marginTop: "auto" },
  mapArea:        { flex: 1, position: "relative" as const },
  map:            { width: "100%", height: "100%" },
  mapOverlay:     { position: "absolute" as const, inset: 0, background: "rgba(15,25,35,0.7)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, zIndex: 1000 },
  loadingText:    { color: "#6b8099", fontSize: 14 },
  spinner:        { width: 32, height: 32, border: "3px solid #1e2f3e", borderTop: "3px solid #378ADD", borderRadius: "50%", animation: "spin 1s linear infinite" },
  errorBanner:    { position: "absolute" as const, bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#3a1a1a", border: "1px solid #A32D2D", borderRadius: 8, padding: "10px 16px", color: "#F09595", fontSize: 13, display: "flex", gap: 12, alignItems: "center", zIndex: 1000 },
  retryBtn:       { background: "#A32D2D", border: "none", borderRadius: 4, color: "#fff", fontSize: 12, cursor: "pointer", padding: "4px 10px" },
  detailPanel:    { width: 280, background: "#0f1923", borderLeft: "1px solid #1e2f3e", padding: 16, overflowY: "auto", flexShrink: 0 },
  detailHeader:   { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  detailId:       { color: "#fff", fontSize: 16, fontWeight: 500 },
  detailSub:      { color: "#4a6070", fontSize: 12, marginTop: 2 },
  closeBtn:       { background: "none", border: "none", color: "#4a6070", fontSize: 16, cursor: "pointer", padding: 4 },
  detailStatus:   (s: string) => ({
    display: "inline-block", fontSize: 12, fontWeight: 500,
    color: STATUS_COLORS[s] ?? "#6b8099",
    background: `${STATUS_COLORS[s] ?? "#6b8099"}22`,
    padding: "3px 10px", borderRadius: 4, marginBottom: 16,
  }),
  detailGrid:     { display: "flex", flexDirection: "column", gap: 0 },
  detailRow:      { display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #1e2f3e" },
  detailRowLabel: { fontSize: 12, color: "#4a6070" },
  detailRowValue: { fontSize: 12, color: "#a0b4c4", fontWeight: 500 },
  comment:        { marginTop: 16 },
  commentText:    { fontSize: 12, color: "#6b8099", lineHeight: 1.5, marginTop: 4 },
  layerToggle:    { display: "flex", alignItems: "center", cursor: "pointer", padding: "4px 6px", borderRadius: 4, background: "#0f2740" },
}
