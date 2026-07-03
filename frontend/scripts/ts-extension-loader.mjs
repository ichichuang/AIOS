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
