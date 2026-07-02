import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

export async function sha256File(targetPath: string): Promise<string | null> {
  return new Promise((resolve) => {
    const hash = createHash("sha256");
    const stream = createReadStream(targetPath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", () => resolve(null));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}
