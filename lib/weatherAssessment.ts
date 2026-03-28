export interface WeatherHour {
  time: string
  waveHeight: number | null
  windSpeed?: number | null
}

export interface AssessmentAlert {
  type: "green" | "yellow" | "orange" | "red"
  time: string
  message: string
}

export interface AssessmentResult {
  alerts: AssessmentAlert[]
  anchorWindows: { start: string; end: string }[]
  crewChangeWindows: { start: string; end: string; jetDepart: string; jetArrive: string }[]
  keepStationBreaches: { start: string; end: string; duration: number }[]
  bcDepartureDeadline: string | null
  summary: string
}

const HS_ANCHOR = 0.4
const HS_DIVE = 0.5
const HS_KEEP = 1.0
const KEEP_BREACH_HOURS = 6
const BC_TRANSIT_HOURS = 6
const JET_TRANSIT_HOURS = 1
const JET_DEPARTURES = [{ depart: 7, arrive: 8 }, { depart: 19, arrive: 20 }]

function addHours(isoTime: string, hours: number): string {
  const d = new Date(isoTime)
  d.setHours(d.getHours() + hours)
  return d.toISOString()
}

function formatTime(isoTime: string): string {
  const d = new Date(isoTime)
  return d.toLocaleString("pl-PL", {
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
    timeZone: "UTC"
  }) + " UTC"
}

function getHs(h: WeatherHour): number {
  return h.waveHeight ?? 0
}

export function analyzeWeather(hours: WeatherHour[]): AssessmentResult {
  const alerts: AssessmentAlert[] = []
  const anchorWindows: { start: string; end: string }[] = []
  const crewChangeWindows: { start: string; end: string; jetDepart: string; jetArrive: string }[] = []
  const keepStationBreaches: { start: string; end: string; duration: number }[] = []
  let bcDepartureDeadline: string | null = null

  // Limit do 48h
  const now = new Date()
  const cutoff = new Date(now.getTime() + 48 * 60 * 60 * 1000)
  const h48 = hours.filter(h => new Date(h.time) <= cutoff)

  // 1. Anchor windows (Hs <= 0.4m)
  let anchorStart: string | null = null
  for (let i = 0; i < h48.length; i++) {
    const hs = getHs(h48[i])
    if (hs <= HS_ANCHOR) {
      if (!anchorStart) anchorStart = h48[i].time
    } else {
      if (anchorStart) {
        anchorWindows.push({ start: anchorStart, end: h48[i - 1].time })
        anchorStart = null
      }
    }
  }
  if (anchorStart) anchorWindows.push({ start: anchorStart, end: h48[h48.length - 1].time })

  anchorWindows.forEach(w => {
    alerts.push({
      type: "green",
      time: w.start,
      message: `Można rzucić kotwice i rozpocząć pracę od ${formatTime(w.start)} do ${formatTime(w.end)}`
    })
  })

  // 2. Crew change windows — stałe rejsy: 07:00→08:00 i 19:00→20:00
  for (let i = 0; i < h48.length; i++) {
    const hour = new Date(h48[i].time)
    const hUTC = hour.getUTCHours()
    const hs = getHs(h48[i])

    for (const jet of JET_DEPARTURES) {
      if (hUTC === jet.arrive) {
        // Sprawdź czy Hs <= 0.5m w godzinie przybycia i przez kolejne 2h (operacja + powrót)
        const arriveHs = getHs(h48[i])
        const returnIdx = Math.min(i + JET_TRANSIT_HOURS, h48.length - 1)
        const returnHs = getHs(h48[returnIdx])

        const jetDepart = new Date(h48[i].time)
        jetDepart.setUTCHours(jet.depart, 0, 0, 0)
        const jetArrive = new Date(h48[i].time)
        jetArrive.setUTCHours(jet.arrive, 0, 0, 0)
        const jetReturn = new Date(h48[returnIdx].time)

        if (arriveHs <= HS_DIVE && returnHs <= HS_DIVE) {
          crewChangeWindows.push({
            start: jetArrive.toISOString(),
            end: jetReturn.toISOString(),
            jetDepart: jetDepart.toISOString(),
            jetArrive: jetArrive.toISOString(),
          })
          alerts.push({
            type: "yellow",
            time: jetDepart.toISOString(),
            message: `Crew change ${jet.depart === 7 ? "poranny" : "wieczorny"} możliwy — Baltic Jet wypływa z Łeby ${formatTime(jetDepart.toISOString())}, dociera do BC ${formatTime(jetArrive.toISOString())} · Hs prognozowane: ${arriveHs.toFixed(2)}m`
          })
        } else {
          const excess = arriveHs - HS_DIVE
          const isPotential = excess <= 0.2
          alerts.push({
            type: isPotential ? "yellow" : "orange",
            time: jetDepart.toISOString(),
            message: `Crew change ${jet.depart === 7 ? "poranny" : "wieczorny"} ${isPotential ? "POTENCJALNIE NIEMOŻLIWY" : "NIEMOŻLIWY"} — Hs ${arriveHs.toFixed(2)}m przekracza limit 0.5m · Baltic Jet pozostaje w Łebie`
          })
        }
      }
    }
  }

  // 3. Keep station breaches (Hs > 1.0m przez >= 6h)
  let breachStart: string | null = null
  for (let i = 0; i < h48.length; i++) {
    const hs = getHs(h48[i])
    if (hs > HS_KEEP) {
      if (!breachStart) breachStart = h48[i].time
    } else {
      if (breachStart) {
        const durationH = (new Date(h48[i - 1].time).getTime() - new Date(breachStart).getTime()) / 3600000 + 1
        if (durationH >= KEEP_BREACH_HOURS) {
          keepStationBreaches.push({ start: breachStart, end: h48[i - 1].time, duration: Math.round(durationH) })
          // BC musi wyjść BC_TRANSIT_HOURS przed początkiem breach
          const deadline = addHours(breachStart, -BC_TRANSIT_HOURS)
          if (!bcDepartureDeadline || new Date(deadline) < new Date(bcDepartureDeadline)) {
            bcDepartureDeadline = deadline
          }
          alerts.push({
            type: "orange",
            time: deadline,
            message: `⚠️ Pogoda przekroczy Keep Station limit o ${formatTime(breachStart)} na ${Math.round(durationH)}h — BC musi podnieść kotwice i wypłynąć do Władysławowa najpóźniej ${formatTime(deadline)}`
          })
        }
        breachStart = null
      }
    }
  }
  if (breachStart) {
    const durationH = (new Date(h48[h48.length - 1].time).getTime() - new Date(breachStart).getTime()) / 3600000 + 1
    if (durationH >= KEEP_BREACH_HOURS) {
      keepStationBreaches.push({ start: breachStart, end: h48[h48.length - 1].time, duration: Math.round(durationH) })
      const deadline = addHours(breachStart, -BC_TRANSIT_HOURS)
      if (!bcDepartureDeadline || new Date(deadline) < new Date(bcDepartureDeadline)) {
        bcDepartureDeadline = deadline
      }
      alerts.push({
        type: "orange",
        time: deadline,
        message: `⚠️ Pogoda przekroczy Keep Station limit o ${formatTime(breachStart)} na ${Math.round(durationH)}h — BC musi podnieść kotwice i wypłynąć do Władysławowa najpóźniej ${formatTime(deadline)}`
      })
    }
  }

  // 4. BC Departure deadline alert (czerwony)
  if (bcDepartureDeadline) {
    alerts.push({
      type: "red",
      time: bcDepartureDeadline,
      message: `🔴 KRYTYCZNY — Baltic Constructor musi opuścić pozycję najpóźniej ${formatTime(bcDepartureDeadline)} aby zdążyć do Władysławowa przed złą pogodą`
    })
  }

  // Sort alerts by time
  alerts.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

  // Summary
  let summary = ""
  if (keepStationBreaches.length === 0 && anchorWindows.length > 0) {
    summary = "✅ Warunki sprzyjające operacjom w ciągu najbliższych 48h. Brak prognozowanych przekroczeń limitu Keep Station."
  } else if (keepStationBreaches.length > 0 && bcDepartureDeadline) {
    summary = `⚠️ Prognozowane przekroczenie limitu Keep Station. Baltic Constructor powinien opuścić pozycję najpóźniej ${formatTime(bcDepartureDeadline)}.`
  } else if (anchorWindows.length === 0) {
    summary = "🔴 Brak okien operacyjnych w ciągu najbliższych 48h. Warunki nie pozwalają na rzucenie kotwic."
  } else {
    summary = "🟡 Zmienne warunki. Sprawdź szczegółowe alerty poniżej."
  }

  return { alerts, anchorWindows, crewChangeWindows, keepStationBreaches, bcDepartureDeadline, summary }
}
