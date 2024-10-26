import { NextApiRequest, NextApiResponse } from "next"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey: string | undefined =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase URL or Key")
}

const supabase = createClient(supabaseUrl, supabaseKey)

const saveQAHistory = async (question: string, answer: string, ip: string) => {
  const { data, error } = await supabase
    .from("qa_history")
    .insert({
      question,
      answer,
      ip,
      app: "anneAi",
    })
    .select("*")

  if (error) {
    console.log("error", error)
    throw new Error("Error saving QA history")
  } else {
    console.log("QA history saved", data)
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { question, answer } = req.body
    let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress

    console.log("ip test", ip)

    try {
      if (!ip) {
        ip = ""
      }
      await saveQAHistory(question, answer, ip as string)
      res.status(200).json({ message: "QA history saved successfully" })
    } catch (error) {
      console.error("Error saving QA history:", error)
      res.status(500).json({ error: "Error saving QA history" })
    }
  } else {
    res.status(405).json({ error: "Method not allowed" })
  }
}
