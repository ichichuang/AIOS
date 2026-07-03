import assert from "node:assert/strict";
import { classifySkillCapability, getSkillCapabilitySearchText } from "./skillCapabilityClassifier.ts";
import type { AiosResource } from "../types/inventory.ts";

function makeSkillResource(overrides: Partial<AiosResource> & Pick<AiosResource, "id" | "name" | "description">): AiosResource {
  return {
    toolType: "codex",
    capabilityType: "skill",
    status: "active",
    risk: "low",
    paths: [],
    safetyProfile: {
      readOnly: true,
      writesGlobalState: false,
      secretExposureRisk: "low",
      executionRisk: "low",
      notes: []
    },
    tokenPressure: {
      estimatedTokens: 0,
      level: "low",
      reason: "metadata"
    },
    prompts: [],
    ...overrides
  };
}

const frontend = classifySkillCapability(makeSkillResource({ id: "skill:frontend", name: "codex-frontend-ui-debug", description: "Debug frontend UI layout and browser rendering." }));
assert.equal(frontend.primaryCategory.key, "frontend-ui");
assert(frontend.evidenceKeywords.includes("frontend"));

const miniProgram = classifySkillCapability(
  makeSkillResource({
    id: "skill:wechat",
    name: "wechat-miniprogram-native-ui-frontend-framework",
    description: "微信小程序 native UI frontend framework.",
    zhName: "微信小程序原生 UI 框架"
  })
);
assert.equal(miniProgram.primaryCategory.key, "mini-program-mobile");
assert.equal(miniProgram.confidence, "high");

const playwright = classifySkillCapability(makeSkillResource({ id: "skill:playwright", name: "playwright-interactive", description: "Automate browser e2e screenshot testing." }));
assert.equal(playwright.primaryCategory.key, "browser-testing");
assert.match(getSkillCapabilitySearchText(playwright), /浏览器测试与截图/);

const agent = classifySkillCapability(makeSkillResource({ id: "skill:mcp", name: "aios-tool-router", description: "Route local AI agent MCP and Codex tool choices." }));
assert.equal(agent.primaryCategory.key, "ai-agent-mcp");

const discoveredOnly = classifySkillCapability(
  makeSkillResource({
    id: "skill:discovered",
    name: "local-layout-helper",
    description: "Filesystem-discovered metadata only.",
    metadata: {
      sourceKind: "filesystem",
      discoveredOnly: true,
      tags: ["frontend"],
      aliases: ["react-ui"],
      capabilities: ["browser-testing"]
    }
  })
);
assert.equal(discoveredOnly.primaryCategory.key, "frontend-ui");
assert.match(getSkillCapabilitySearchText(discoveredOnly), /前端与界面/);
