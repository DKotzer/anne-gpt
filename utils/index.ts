import { createClient } from "@supabase/supabase-js";
import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from "eventsource-parser";
import prompts from "@/components/prompts";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY


export const supabase = createClient(supabaseUrl, supabaseKey)

export const OpenAIStream = async (prompt: string, apiKey: string) => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const title = process.env.NEXT_PUBLIC_TITLE;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    method: "POST",
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        ...prompts,
        {
          role: "system",
          content: `You are a helpful assistant that accurately answers queries using ${title}'s blog posts and book. Use the text provided to help form your answer, but avoid copying word-for-word from the documents. Try to use your own words when possible. Be accurate, helpful, clear and give lots of details and context. Make sure to reference any passages used by in your answer by number. If no reference is relevant, say so and answer the question without referencing any passages.`,
        },
        {
          role: "user",
          content:
            prompt +
            "If no reference is relevant, say so and answer the question without referencing any passages. Make sure to reference any passages used by in your answer by number. ",
        },
      ],
      max_tokens: 1000,
      temperature: 0.0,
      stream: true,
    }),
  });

  if (res.status !== 200) {
    throw new Error("OpenAI API returned an error");
  }

  const stream = new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === "event") {
          const data = event.data;

          if (data === "[DONE]") {
            controller.close();
            return;
          }

          try {
            const json = JSON.parse(data);
            const text = json.choices[0].delta.content;
            const queue = encoder.encode(text);
            controller.enqueue(queue);
          } catch (e) {
            controller.error(e);
          }
        }
      };

      const parser = createParser(onParse);

      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    },
  });

  return stream;
};
