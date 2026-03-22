import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "./auth/[...nextauth]"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: "Unauthorized" })

  const apiKey = process.env.AISSTREAM_KEY
  if (!apiKey) return res.status(500).json({ error: "No API key" })

  res.status(200).json({ key: apiKey })
}
