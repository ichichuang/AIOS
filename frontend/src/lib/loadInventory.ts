import type { AiosInventory } from "../types/inventory";

export async function loadInventory(): Promise<AiosInventory> {
  const response = await fetch("/aios-inventory.snapshot.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`无法加载清单快照：HTTP ${response.status}`);
  }
  return (await response.json()) as AiosInventory;
}
