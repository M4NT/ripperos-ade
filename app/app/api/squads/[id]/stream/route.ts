import { DEFAULT_TENANT } from "@core/roster";
import { subscribeSquad } from "@core/realtime/bus";
import { readSquad } from "@core/squads/service";
import type { SquadView } from "@core/types";
import { errorResponse } from "../../../../../lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let initial: SquadView;
  try {
    initial = await readSquad(DEFAULT_TENANT, id);
  } catch (error) {
    return errorResponse(error);
  }

  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  let closed = false;
  const stream = new ReadableStream({
    start(controller) {
      const send = (view: SquadView) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: snapshot\ndata: ${JSON.stringify(view)}\n\n`));
      };
      send(initial);
      unsubscribe = subscribeSquad(id, send);
      const ping = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 15000);
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(ping);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* já fechado */
        }
      };
      request.signal.addEventListener("abort", close);
    },
    cancel() {
      closed = true;
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
