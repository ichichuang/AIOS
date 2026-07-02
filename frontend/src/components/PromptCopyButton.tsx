import { Button, Tooltip } from "@mui/material";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import { useRef, useState } from "react";
import { zhCN } from "../i18n/zh-CN";
import { useCopyFeedbackMotion } from "../lib/useAiosMotion";
import type { PromptTarget, UsagePrompt } from "../types/inventory";

interface PromptCopyButtonProps {
  prompt?: UsagePrompt;
  target?: PromptTarget;
  compact?: boolean;
}

export function PromptCopyButton({ prompt, target, compact }: PromptCopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const copyTarget = prompt?.target ?? target ?? "codex";
  const label = copyTarget === "codex" ? zhCN.app.copyCodexCall : zhCN.app.copyClaudeCall;
  useCopyFeedbackMotion(buttonRef, copied);

  async function copyPrompt() {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt.prompt);
    } catch {
      fallbackCopy(prompt.prompt);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <Tooltip title={prompt ? `${label}：${prompt.title}` : zhCN.app.notAvailable}>
      <span className="copy-tooltip-wrap">
        <Button
          ref={buttonRef}
          className="copy-button"
          disabled={!prompt}
          size={compact ? "small" : "medium"}
          startIcon={<ContentCopyRounded fontSize="small" />}
          type="button"
          variant={copied ? "contained" : "outlined"}
          onClick={copyPrompt}
        >
          {copied ? zhCN.app.copied : label}
        </Button>
      </span>
    </Tooltip>
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
