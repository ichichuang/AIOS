import { Button, Text } from "@radix-ui/themes";
import { useRef, useState } from "react";
import { zhCN } from "../i18n/zh-CN";
import { useCopyFeedback } from "../lib/useAiosMotion";
import type { UsagePrompt } from "../types/inventory";

interface PromptCopyButtonProps {
  prompt: UsagePrompt;
}

export function PromptCopyButton({ prompt }: PromptCopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useCopyFeedback(buttonRef, copied);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt.prompt);
    } catch {
      fallbackCopy(prompt.prompt);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <Button ref={buttonRef} className="copy-button" type="button" variant={copied ? "solid" : "soft"} onClick={copyPrompt}>
      <Text as="span">{prompt.target === "codex" ? "Codex" : "Claude"}</Text>
      <strong>{copied ? zhCN.app.copied : zhCN.app.copy}</strong>
    </Button>
  );
}

function fallbackCopy(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}
