import { NextResponse } from "next/server";
import { RejectedInputError, SquadNotFoundError } from "@core/squads/service";
import { KillSwitchError } from "@proxy/queue";

export function errorResponse(error: unknown) {
  if (error instanceof KillSwitchError) {
    return NextResponse.json({ error: "Kill switch ativo. O squad está pausado." }, { status: 423 });
  }
  if (error instanceof RejectedInputError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof SquadNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof Error && /inválido/i.test(error.message)) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error(error);
  return NextResponse.json({ error: "Falha interna." }, { status: 500 });
}
