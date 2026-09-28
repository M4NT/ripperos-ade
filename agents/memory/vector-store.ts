import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { vectorStoreDir } from "./layout";

export const EMBEDDING_DIMS = 64;
const TABLE = "memory";

export interface MemoryRecord {
  id: string;
  squadId: string;
  text: string;
  createdAt: string;
}

export interface MemoryHit extends MemoryRecord {
  distance: number | null;
}

interface MemoryRow {
  id: string;
  squad_id: string;
  text: string;
  created_at: string;
  vector: number[];
}

type LanceConnection = {
  tableNames: () => Promise<string[]>;
  openTable: (name: string) => Promise<LanceTable>;
  createTable: (name: string, data: MemoryRow[]) => Promise<LanceTable>;
};

type LanceTable = {
  add: (rows: MemoryRow[]) => Promise<unknown>;
  vectorSearch: (vector: number[]) => {
    limit: (n: number) => { toArray: () => Promise<Array<MemoryRow & { _distance?: number }>> };
  };
};

const connections = new Map<string, Promise<LanceConnection>>();
let connectImpl: ((uri: string) => Promise<LanceConnection>) | null = null;

export function setLanceConnect(connect: (uri: string) => Promise<unknown>): void {
  connectImpl = async (uri) => (await connect(uri)) as LanceConnection;
}

export function embedText(text: string, dims = EMBEDDING_DIMS): number[] {
  const vector = new Array<number>(dims).fill(0);
  const tokens = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  if (tokens.length === 0) {
    vector[0] = 1;
    return vector;
  }
  for (const token of tokens) {
    let hash = 2166136261;
    for (let index = 0; index < token.length; index += 1) {
      hash ^= token.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    const bucket = Math.abs(hash) % dims;
    vector[bucket] += hash & 1 ? 1 : -1;
  }
  let norm = 0;
  for (const value of vector) norm += value * value;
  const scale = Math.sqrt(norm) || 1;
  return vector.map((value) => value / scale);
}

async function connectTenant(tenantId: string): Promise<LanceConnection> {
  const directory = vectorStoreDir(tenantId);
  const cached = connections.get(directory);
  if (cached) return cached;
  const opening = openConnection(directory);
  connections.set(directory, opening);
  try {
    return await opening;
  } catch (error) {
    connections.delete(directory);
    throw error;
  }
}

async function openConnection(directory: string): Promise<LanceConnection> {
  if (!connectImpl) {
    throw new Error("LanceDB não registrado.");
  }
  await mkdir(directory, { recursive: true });
  return connectImpl(directory);
}

async function openOrCreate(connection: LanceConnection, row: MemoryRow): Promise<LanceTable> {
  const names = await connection.tableNames();
  if (names.includes(TABLE)) return connection.openTable(TABLE);
  return connection.createTable(TABLE, [row]);
}

export async function rememberSummary(input: {
  tenantId: string;
  squadId: string;
  text: string;
  id?: string;
  createdAt?: string;
}): Promise<MemoryRecord> {
  const record: MemoryRecord = {
    id: input.id ?? randomUUID(),
    squadId: input.squadId,
    text: input.text,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  const row: MemoryRow = {
    id: record.id,
    squad_id: record.squadId,
    text: record.text,
    created_at: record.createdAt,
    vector: embedText(record.text),
  };
  const connection = await connectTenant(input.tenantId);
  const names = await connection.tableNames();
  if (names.includes(TABLE)) {
    const table = await connection.openTable(TABLE);
    await table.add([row]);
  } else {
    await openOrCreate(connection, row);
  }
  return record;
}

export async function searchMemory(tenantId: string, query: string, limit = 5): Promise<MemoryHit[]> {
  const connection = await connectTenant(tenantId);
  const names = await connection.tableNames();
  if (!names.includes(TABLE)) return [];
  const table = await connection.openTable(TABLE);
  const rows = await table.vectorSearch(embedText(query)).limit(limit).toArray();
  return rows.map((row) => ({
    id: row.id,
    squadId: row.squad_id,
    text: row.text,
    createdAt: row.created_at,
    distance: typeof row._distance === "number" ? row._distance : null,
  }));
}
