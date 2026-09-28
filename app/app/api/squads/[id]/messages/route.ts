import { DEFAULT_TENANT } from "@core/roster";
import { postSquadMessage } from "@core/squads/service";
import { errorResponse } from "../../../../../lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const body = (await request.json()) as { text?: unknown; authorId?: unknown };
    if (typeof body.text !== "string" || typeof body.authorId !== "string") {
      return Response.json({ error: "Informe text e authorId." }, { status: 400 });
    }
    const result = await postSquadMessage({
      tenantId: DEFAULT_TENANT,
      squadId: id,
      authorId: body.authorId,
      text: body.text,
    });
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
