import { Box, Stack, Typography } from "@mui/material";
import { memo } from "react";
import { zhCN } from "../../i18n/zh-CN";
import type { AiosResource } from "../../types/inventory";
import { PromptCopyButton } from "../PromptCopyButton";

interface PromptPanelProps {
  resource: AiosResource;
}

export const PromptPanel = memo(function PromptPanel({ resource }: PromptPanelProps) {
  const codexPrompt = resource.prompts.find((prompt) => prompt.target === "codex");
  const claudePrompt = resource.prompts.find((prompt) => prompt.target === "claude");

  return (
    <Box className="inspector-panel">
      <Typography component="h3" variant="h3">
        {zhCN.app.copyPrompt}
      </Typography>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
        <PromptCopyButton prompt={codexPrompt} target="codex" />
        <PromptCopyButton prompt={claudePrompt} target="claude" />
      </Stack>
      <Typography color="text.secondary" variant="body2">
        {resource.prompts.length > 0 ? zhCN.app.promptBodyEnglish : "此资源没有记录可复制提示词。"}
      </Typography>
    </Box>
  );
});
