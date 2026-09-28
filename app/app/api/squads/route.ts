import { DEFAULT_TENANT } from "@core/roster";
import { createSquad, readWorkspace } from "@core/squads/service";
import { errorResponse } from "../../../lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const home = await readWorkspace(DEFAULT_TENANT);
    return Response.json(home.squads);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { title?: unknown };
    if (typeof body.title !== "string") {
      return Response.json({ error: "Informe o nome do squad." }, { status: 400 });
    }
    const view = await createSquad(DEFAULT_TENANT, body.title);
    return Response.json(view, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
