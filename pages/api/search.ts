import { supabaseAdmin } from "@/utils"
import { supabase } from "@/utils"
export const config = {
  runtime: "edge",
}

const handler = async (req: Request): Promise<Response> => {
  const apiKey = process.env.OPENAI_API_KEY
  try {
    const { query, matches } = (await req.json()) as {
      query: string
      matches: number
    }

    const input = query.replace(/\n/g, " ")

    const res = await fetch("https://api.openai.com/v1/embeddings", {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      method: "POST",
      body: JSON.stringify({
        model: "text-embedding-ada-002",
        input,
      }),
    })

    const json = await res.json()
    const embedding = json.data[0].embedding

    const { data: chunks, error } = await supabaseAdmin.rpc("pg_search", {
      query_embedding: embedding,
      similarity_threshold: 0.65,
      match_count: matches,
    })

    if (error) {
      console.error("Supabase RPC error:", error)
      throw new Error("Failed to fetch data from Supabase")
    }

    if (!chunks || !Array.isArray(chunks)) {
      console.error("Invalid chunks data:", chunks)
      throw new TypeError("Expected chunks to be an array")
    }

    // Proceed with your logic, ensuring chunks is a valid array
    console.log("Chunks data:", chunks)

    return new Response(JSON.stringify(chunks), { status: 200 })
  } catch (error) {
    console.error(error)
    return new Response("Error", { status: 500 })
  }
}

export default handler
