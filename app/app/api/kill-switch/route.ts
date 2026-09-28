import { DEFAULT_TENANT } from "@core/roster";
import { readKillSwitch } from "@core/security/kill-switch";
import { setTenantKillSwitch } from "@core/squads/service";
import { errorResponse } from "../../../lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await readKillSwitch());
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { engaged?: unknown; squadId?: unknown };
    if (typeof body.engaged !== "boolean") {
      return Response.json({ error: "Informe engaged booleano." }, { status: 400 });
    }
    const squadId = typeof body.squadId === "string" ? body.squadId : null;
    return Response.json(await setTenantKillSwitch(DEFAULT_TENANT, body.engaged, squadId));
  } catch (error) {
    return errorResponse(error);
  }
}
