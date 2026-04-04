import { orchestrateDebate } from "@/lib/debate/orchestrator";
import { encodeSSE } from "@/lib/debate/stream-protocol";
import { validateEnv } from "@/env";
import { z } from "zod";

const requestSchema = z.object({
  text: z.string().min(1).max(5000),
});

export async function POST(req: Request): Promise<Response> {
  try {
    validateEnv();
  } catch {
    return new Response(JSON.stringify({ error: "Missing API keys" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid request", details: parsed.error }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: Parameters<typeof encodeSSE>[0]) => {
        try {
          controller.enqueue(encoder.encode(encodeSSE(event)));
        } catch {
          // Stream may be closed if client disconnected
        }
      };

      try {
        await orchestrateDebate(parsed.data.text, emit);
        emit({ type: "done" });
      } catch (error) {
        emit({
          type: "error",
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
