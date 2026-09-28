import { DEFAULT_TENANT } from "@core/roster";
import { publishSquad } from "@core/realtime/bus";
import { querySquadMemory } from "@core/squads/service";
import { errorResponse } from "../../../../../lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const body = (await request.json()) as { query?: unknown };
    if (typeof body.query !== "string") {
      return Response.json({ error: "Informe query." }, { status: 400 });
    }
    const view = await querySquadMemory(DEFAULT_TENANT, id, body.query);
    publishSquad(id, view);
    return Response.json(view);
  } catch (error) {
    return errorResponse(error);
  }
}
