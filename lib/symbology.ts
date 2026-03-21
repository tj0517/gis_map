// Symbologia SSDM — STATUS + TYPE → plik SVG

export type MarkerStyle = {
  iconUrl: string
  size: number
  label: string
}

const ICONS: Record<string, MarkerStyle> = {
  "pUXO":                    { iconUrl: "/IOGP1030.svg",        size: 20, label: "pUXO — niezweryfikowany" },
  "Inspected|pUXO":          { iconUrl: "/IOGP1030.svg",        size: 20, label: "Inspected · pUXO" },
  "Inspected|cUXO":          { iconUrl: "/IOGP1026.svg",        size: 20, label: "Inspected · cUXO" },
  "Inspected|Cable/wire":    { iconUrl: "/IOGP1012.svg",        size: 20, label: "Inspected · Cable/wire" },
  "Inspected|Debris":        { iconUrl: "/IOGP1021.svg",        size: 20, label: "Inspected · Debris" },
  "Inspected|Wreck":         { iconUrl: "/IOGP1022.svg",        size: 20, label: "Inspected · Wreck" },
  "Inspected|Boulder":       { iconUrl: "/IOGP1007.svg",        size: 20, label: "Inspected · Boulder" },
  "Inspected|Other":         { iconUrl: "/IOGP1041.svg",        size: 20, label: "Inspected · Other" },
  "Removed":                 { iconUrl: "/Removed_custom.svg",  size: 20, label: "Removed" },
  "In progress":             { iconUrl: "/Vessel.svg",          size: 48, label: "In progress — nurkowanie" },
}

export function getMarkerStyle(status: string, type: string): MarkerStyle {
  return (
    ICONS[`${status}|${type}`] ??
    ICONS[status] ??
    ICONS["pUXO"]
  )
}

// Kept for backwards compatibility with legend rendering
export function getMarkerIcon(status: string): string | null {
  return ICONS[status]?.iconUrl ?? null
}

// Legacy — no longer used for rendering, kept so legend imports don't break
export function markerSVG(style: MarkerStyle): string {
  return style.iconUrl
}

// Legenda — unikalne kombinacje
export const LEGEND_ITEMS = [
  { status: "pUXO",        type: "",           label: "pUXO — niezweryfikowany" },
  { status: "In progress", type: "",           label: "In progress — nurkowanie" },
  { status: "Inspected",   type: "pUXO",       label: "Inspected · pUXO" },
  { status: "Inspected",   type: "cUXO",       label: "Inspected · cUXO" },
  { status: "Inspected",   type: "Cable/wire", label: "Inspected · Cable/wire" },
  { status: "Inspected",   type: "Debris",     label: "Inspected · Debris" },
  { status: "Inspected",   type: "Wreck",      label: "Inspected · Wreck" },
  { status: "Inspected",   type: "Boulder",    label: "Inspected · Boulder" },
  { status: "Inspected",   type: "Other",      label: "Inspected · Other" },
  { status: "Removed",     type: "",           label: "Removed" },
]
