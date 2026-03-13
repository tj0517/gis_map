// Symbologia zgodna z QGIS — STATUS + TYPE

export type MarkerStyle = {
  color: string       // fill
  stroke: string      // border
  shape: "circle" | "triangle" | "square"
  label: string
}

// Kolory wg TYPE (dla Inspected)
const TYPE_COLORS: Record<string, { color: string; stroke: string }> = {
  pUXO:       { color: "#EF9F27", stroke: "#854F0B" },
  cUXO:       { color: "#D85A30", stroke: "#712B13" },
  "Cable/wire": { color: "#378ADD", stroke: "#0C447C" },
  Debris:     { color: "#888780", stroke: "#5F5E5A" },
  Wreck:      { color: "#7F77DD", stroke: "#3C3489" },
  Boulder:    { color: "#1D9E75", stroke: "#085041" },
  Other:      { color: "#D4537E", stroke: "#72243E" },
}

export function getMarkerStyle(status: string, type: string): MarkerStyle {
  if (status === "Removed") {
    return {
      color: "#639922", stroke: "#27500A",
      shape: "square",
      label: "Removed",
    }
  }

  if (status === "Inspected") {
    const colors = TYPE_COLORS[type] ?? TYPE_COLORS["Other"]
    return {
      ...colors,
      shape: "triangle",
      label: `Inspected · ${type}`,
    }
  }

  // pUXO — niezweryfikowany
  return {
    color: "#E24B4A", stroke: "#A32D2D",
    shape: "circle",
    label: "pUXO · niezweryfikowany",
  }
}

// Generuj SVG icon jako Data URL dla Leaflet DivIcon
export function markerSVG(style: MarkerStyle, size = 20): string {
  const s = size
  const h = s
  let shape = ""

  if (style.shape === "circle") {
    shape = `<circle cx="${s/2}" cy="${s/2}" r="${s/2 - 1.5}" fill="${style.color}" stroke="${style.stroke}" stroke-width="1.5"/>`
  } else if (style.shape === "triangle") {
    const pad = 2
    shape = `<polygon points="${s/2},${pad} ${s-pad},${h-pad} ${pad},${h-pad}" fill="${style.color}" stroke="${style.stroke}" stroke-width="1.5"/>`
  } else if (style.shape === "square") {
    const pad = 2
    shape = `<rect x="${pad}" y="${pad}" width="${s - pad*2}" height="${h - pad*2}" fill="${style.color}" stroke="${style.stroke}" stroke-width="1.5"/>`
  }

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${h}" viewBox="0 0 ${s} ${h}">${shape}</svg>`
  )}`
}

// Legenda — unikalne kombinacje
export const LEGEND_ITEMS = [
  { status: "pUXO",      type: "",          label: "pUXO — niezweryfikowany" },
  { status: "Inspected", type: "pUXO",      label: "Inspected · pUXO" },
  { status: "Inspected", type: "cUXO",      label: "Inspected · cUXO" },
  { status: "Inspected", type: "Cable/wire",label: "Inspected · Cable/wire" },
  { status: "Inspected", type: "Debris",    label: "Inspected · Debris" },
  { status: "Inspected", type: "Wreck",     label: "Inspected · Wreck" },
  { status: "Inspected", type: "Boulder",   label: "Inspected · Boulder" },
  { status: "Inspected", type: "Other",     label: "Inspected · Other" },
  { status: "Removed",   type: "",          label: "Removed" },
]
