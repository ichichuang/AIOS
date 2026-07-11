import { readFile } from "node:fs/promises";
import { transform } from "esbuild";

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const canTryTypeScriptExtension =
      error?.code === "ERR_MODULE_NOT_FOUND" &&
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !specifier.endsWith(".ts") &&
      !specifier.endsWith(".tsx") &&
      !specifier.endsWith(".js") &&
      !specifier.endsWith(".jsx") &&
      !specifier.endsWith(".json");

    if (!canTryTypeScriptExtension) throw error;

    try {
      return await nextResolve(`${specifier}.ts`, context);
    } catch {
      return nextResolve(`${specifier}.tsx`, context);
    }
  }
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".ts") || url.endsWith(".tsx")) {
    const source = await readFile(new URL(url), "utf8");
    const result = await transform(source, {
      loader: url.endsWith(".tsx") ? "tsx" : "ts",
      format: "esm",
      target: "es2022",
      jsx: "automatic",
      define: {
        "import.meta.env.DEV": "false",
        "import.meta.env.PROD": "true",
        "import.meta.env.SSR": "true"
      }
    });
    return { format: "module", shortCircuit: true, source: result.code };
  }
  return nextLoad(url, context);
}
