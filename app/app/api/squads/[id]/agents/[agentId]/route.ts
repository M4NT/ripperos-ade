import { DEFAULT_TENANT } from "@core/roster";
import { removeAgent } from "@core/squads/service";
import { errorResponse } from "../../../../../../lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; agentId: string }> }) {
  const { id, agentId } = await context.params;
  try {
    return Response.json(await removeAgent(DEFAULT_TENANT, id, agentId));
  } catch (error) {
    return errorResponse(error);
  }
}
