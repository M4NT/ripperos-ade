import { DEFAULT_TENANT } from "@core/roster";
import { releaseHandoff } from "@core/squads/service";
import { publishSquad } from "@core/realtime/bus";
import { errorResponse } from "../../../../../lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const body = (await request.json()) as { agentId?: unknown };
    if (typeof body.agentId !== "string") {
      return Response.json({ error: "Informe agentId." }, { status: 400 });
    }
    const view = await releaseHandoff(DEFAULT_TENANT, id, body.agentId);
    publishSquad(id, view);
    return Response.json(view);
  } catch (error) {
    return errorResponse(error);
  }
}
