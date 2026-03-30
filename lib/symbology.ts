// Symbologia SSDM — STATUS + TYPE → plik SVG

export type MarkerStyle = {
  iconUrl: string
  size: number
  label: string
}

const REMOVED_SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">' +
  '<circle cx="10" cy="10" r="8" fill="#639922" stroke="#27500A" stroke-width="1.5"/>' +
  '</svg>'
)}`

const ICONS: Record<string, MarkerStyle> = {
  "pUXO":                    { iconUrl: "/IOGP1030.svg",        size: 20, label: "pUXO — niezweryfikowany" },
  "Inspected|pUXO":      { iconUrl: "/IOGP1030.svg",        size: 20, label: "Inspected · pUXO" },
  "Inspected|Not found": { iconUrl: "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="white" stroke="black" stroke-width="1.5"/></svg>'), size: 20, label: "Not found" },
  "Not found|pUXO":      { iconUrl: "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="white" stroke="black" stroke-width="1.5"/></svg>'), size: 20, label: "Not found" },
  "Inspected|cUXO":          { iconUrl: "/IOGP1026.svg",        size: 20, label: "Inspected · cUXO" },
  "Inspected|Cable/wire":    { iconUrl: "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg viewBox="-100 -100 200 200" xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round" fill-rule="evenodd"><g fill="none" stroke="rgb(0,128,0)" stroke-width="4"><polyline points="0,0 0,0"/></g><g fill="none" stroke="rgb(0,128,0)" stroke-width="4"><circle cx="-62.203" cy="0" r="27.797"/><polyline points="-34.406,0 34.405,0"/><circle cx="62.203" cy="0" r="27.797"/></g></svg>'), size: 20, label: "Inspected · Cable/wire" },
  "Inspected|Debris":        { iconUrl: "/IOGP1021.svg",        size: 20, label: "Inspected · Debris" },
  "Inspected|Wreck":         { iconUrl: "/IOGP1022.svg",        size: 20, label: "Inspected · Wreck" },
  "Inspected|Boulder":       { iconUrl: "/IOGP1007.svg",        size: 20, label: "Inspected · Boulder" },
  "Inspected|Other":         { iconUrl: "/IOGP1041.svg",        size: 20, label: "Inspected · Other" },
  "Planned|Cable/wire":      { iconUrl: "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg viewBox="-100 -100 200 200" xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round" fill-rule="evenodd"><g fill="none" stroke="rgb(220,120,0)" stroke-width="4"><polyline points="0,0 0,0"/></g><g fill="none" stroke="rgb(220,120,0)" stroke-width="4"><circle cx="-62.203" cy="0" r="27.797"/><polyline points="-34.406,0 34.405,0"/><circle cx="62.203" cy="0" r="27.797"/></g></svg>'), size: 20, label: "Planned · Cable/wire" },
  "Removed":                 { iconUrl: REMOVED_SVG,            size: 20, label: "Removed" },
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
  { status: "Inspected",   type: "Not found",  label: "Inspected · Not found" },
  { status: "Inspected",   type: "cUXO",       label: "Inspected · cUXO" },
  { status: "Inspected",   type: "Cable/wire", label: "Inspected · Cable/wire" },
  { status: "Planned",     type: "Cable/wire", label: "Planned · Cable/wire" },
  { status: "Inspected",   type: "Debris",     label: "Inspected · Debris" },
  { status: "Inspected",   type: "Wreck",      label: "Inspected · Wreck" },
  { status: "Inspected",   type: "Boulder",    label: "Inspected · Boulder" },
  { status: "Inspected",   type: "Other",      label: "Inspected · Other" },
  { status: "Removed",     type: "",           label: "Removed" },
]
