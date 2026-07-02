import { useState } from "react";
import type { UsagePrompt } from "../types/inventory";

interface PromptCopyButtonProps {
  prompt: UsagePrompt;
}

export function PromptCopyButton({ prompt }: PromptCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt.prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button className="copy-button" type="button" onClick={copyPrompt}>
      <span>{prompt.target === "codex" ? "Codex" : "Claude"}</span>
      <strong>{copied ? "Copied" : "Copy"}</strong>
    </button>
  );
}
