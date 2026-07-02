import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertWritableAppPath } from "./domain/path-policy.js";
import { generateInventory } from "./index.js";

function parseOutArg(argv: string[]): string {
  const outIndex = argv.indexOf("--out");
  if (outIndex >= 0 && argv[outIndex + 1]) {
    return path.resolve(process.cwd(), argv[outIndex + 1]);
  }
  return path.resolve(process.cwd(), "../frontend/public/aios-inventory.snapshot.json");
}

async function main(): Promise<void> {
  const outputPath = parseOutArg(process.argv.slice(2));
  assertWritableAppPath(outputPath);

  const inventory = await generateInventory();
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
  console.log(`AIOS inventory snapshot written: ${outputPath}`);
  console.log(`resources=${inventory.resources.length} mcpServers=${inventory.mcpServers.length}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
