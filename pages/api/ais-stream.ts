import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "./auth/[...nextauth]"
import WebSocket from "ws"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).end()

  const apiKey = process.env.AISSTREAM_KEY
  if (!apiKey) return res.status(500).end()

  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.flushHeaders()

  const ws = new WebSocket("wss://stream.aisstream.io/v0/stream")

  ws.on("open", () => {
    ws.send(JSON.stringify({
      APIKey: apiKey,
      BoundingBoxes: [[[53.5, 9.0], [66.0, 30.0]]],
      FilterMessageTypes: ["PositionReport"]
    }))
  })

  ws.on("message", (data) => {
    const str = data.toString()
    res.write(`data: ${str}\n\n`)
  })

  ws.on("close", () => res.end())
  ws.on("error", () => res.end())

  req.on("close", () => ws.close())
}
