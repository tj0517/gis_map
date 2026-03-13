import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/router"
import { useEffect, useRef, useState } from "react"
import Head from "next/head"
import type { GeoJSON, UXOFeature } from "./api/data"
import { getMarkerStyle, markerSVG, LEGEND_ITEMS } from "../lib/symbology"

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

  // Inicjalizacja mapy
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return
    import("leaflet").then((leaflet) => {
      L = leaflet.default
      // Fix domyślnych ikon Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({ iconUrl: "", shadowUrl: "" })

      const map = L.map(mapDivRef.current!, {
        center: [56.0, 14.5], // Bałtyk — dostosuj do projektu
        zoom: 10,
        zoomControl: true,
      })

      // Mapa bazowa — OpenStreetMap
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map)

      // Morska mapa bazowa (opcja alternatywna)
      const nautical = L.tileLayer(
        "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png",
        { attribution: "© OpenSeaMap contributors", maxZoom: 18, opacity: 0.7 }
      ).addTo(map)

      mapRef.current = map
    })
  }, [])

  // Renderuj punkty gdy dane gotowe
  useEffect(() => {
    if (!mapRef.current || !geojson || !L) return

    // Usuń poprzednie warstwy UXO
    mapRef.current.eachLayer((layer: any) => {
      if (layer._uxoMarker) mapRef.current.removeLayer(layer)
    })

    const features = geojson.features.filter(f => {
      if (filterStatus !== "ALL" && f.properties.status !== filterStatus) return false
      if (filterSector !== "ALL" && f.properties.sector !== filterSector) return false
      return true
    })

    features.forEach(feature => {
      const { east, north, status, type, id, sector, risk, depth, priority } = feature.properties
      const style = getMarkerStyle(status, type)
      const svgUrl = markerSVG(style, 22)

      const icon = L.icon({
        iconUrl: svgUrl,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -14],
      })

      // UWAGA: Leaflet używa [lat, lng] — tutaj [NORTH, EAST]
      const marker = L.marker([north, east], { icon })
      marker._uxoMarker = true

      marker.on("click", () => setSelected(feature))
      marker.bindTooltip(id, { permanent: false, direction: "top", offset: [0, -12] })
      marker.addTo(mapRef.current)
    })

    // Dopasuj widok do punktów przy pierwszym ładowaniu
    if (features.length > 0 && !selected) {
      const coords = features.map(f => [f.properties.north, f.properties.east] as [number, number])
      mapRef.current.fitBounds(coords, { padding: [40, 40] })
    }
  }, [geojson, filterStatus, filterSector])

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
      </Head>

      <div style={styles.layout}>

        {/* ── TOPBAR ── */}
        <div style={styles.topbar}>
          <div style={styles.topbarLeft}>
            <span style={styles.logo}>🌊</span>
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
              {["ALL", "pUXO", "Inspected", "Removed"].map(s => (
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
                const style = getMarkerStyle(item.status, item.type)
                return (
                  <div key={item.label} style={styles.legendItem}>
                    <img src={markerSVG(style, 16)} width={16} height={16} alt=""/>
                    <span style={styles.legendLabel}>{item.label}</span>
                  </div>
                )
              })}
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
  sidebar:        { width: 220, background: "#0f1923", borderRight: "1px solid #1e2f3e", padding: 16, overflowY: "auto", flexShrink: 0, display: "flex", flexDirection: "column", gap: 20 },
  sideSection:    { display: "flex", flexDirection: "column", gap: 6 },
  sideLabel:      { fontSize: 10, fontWeight: 500, color: "#4a6070", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 },
  filterBtn:      { background: "none", border: "1px solid #2a3a4a", borderRadius: 6, color: "#6b8099", fontSize: 12, cursor: "pointer", padding: "6px 10px", textAlign: "left" as const },
  filterBtnActive:{ background: "#1F4E79", border: "1px solid #378ADD", color: "#fff" },
  select:         { background: "#1a2632", border: "1px solid #2a3a4a", borderRadius: 6, color: "#a0b4c4", fontSize: 12, padding: "6px 8px" },
  legendItem:     { display: "flex", alignItems: "center", gap: 8, padding: "3px 0" },
  legendLabel:    { fontSize: 11, color: "#6b8099" },
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
}
