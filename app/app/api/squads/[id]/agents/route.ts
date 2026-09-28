import { DEFAULT_TENANT } from "@core/roster";
import { addAgent } from "@core/squads/service";
import { errorResponse } from "../../../../../lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const body = (await request.json()) as { name?: unknown; role?: unknown };
    if (typeof body.name !== "string" || typeof body.role !== "string") {
      return Response.json({ error: "Informe nome e função." }, { status: 400 });
    }
    return Response.json(await addAgent(DEFAULT_TENANT, id, { name: body.name, role: body.role }), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
