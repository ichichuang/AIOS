import type { AiosInventory } from "../types/inventory";

export async function loadInventory(): Promise<AiosInventory> {
  const response = await fetch("/aios-inventory.snapshot.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load inventory snapshot: HTTP ${response.status}`);
  }
  return (await response.json()) as AiosInventory;
}
