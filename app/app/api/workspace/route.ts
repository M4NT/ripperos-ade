import { DEFAULT_TENANT } from "@core/roster";
import { readWorkspace, renameHuman } from "@core/squads/service";
import { errorResponse } from "../../../lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await readWorkspace(DEFAULT_TENANT));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { humanName?: unknown };
    if (typeof body.humanName !== "string") {
      return Response.json({ error: "Informe humanName." }, { status: 400 });
    }
    await renameHuman(DEFAULT_TENANT, body.humanName);
    return Response.json(await readWorkspace(DEFAULT_TENANT));
  } catch (error) {
    return errorResponse(error);
  }
}
