import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Dataset } from "./types";

export async function loadDataset(): Promise<Dataset> {
  const p = join(process.cwd(), "public", "data", "turbine-24h.json");
  const raw = await readFile(p, "utf-8");
  return JSON.parse(raw) as Dataset;
}
