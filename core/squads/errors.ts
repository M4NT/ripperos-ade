export class RejectedInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RejectedInputError";
  }
}

export class SquadNotFoundError extends Error {
  constructor(squadId: string) {
    super(`Squad não encontrado: ${squadId}`);
    this.name = "SquadNotFoundError";
  }
}
