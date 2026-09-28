import { DEFAULT_TENANT } from "@core/roster";
import { publishSquad } from "@core/realtime/bus";
import { updateSquadMeta } from "@core/squads/service";
import { errorResponse } from "../../../../../lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const body = (await request.json()) as { prAtual?: unknown; refreshGit?: unknown };
    const prAtual = body.prAtual === null || typeof body.prAtual === "string" ? body.prAtual : undefined;
    const view = await updateSquadMeta(DEFAULT_TENANT, id, {
      prAtual,
      refreshGit: body.refreshGit === true,
    });
    publishSquad(id, view);
    return Response.json(view);
  } catch (error) {
    return errorResponse(error);
  }
}
