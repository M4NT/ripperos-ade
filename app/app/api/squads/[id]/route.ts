import { DEFAULT_TENANT } from "@core/roster";
import { readSquad, deleteSquad } from "@core/squads/service";
import { errorResponse } from "../../../../lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    return Response.json(await readSquad(DEFAULT_TENANT, id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await deleteSquad(DEFAULT_TENANT, id);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
