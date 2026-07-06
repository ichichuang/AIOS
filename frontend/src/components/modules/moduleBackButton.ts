import { createElement, type ReactElement } from "react";
import { advancedSubviewBackLabels, getAdvancedSubviewParent, type AdvancedSupportView } from "../../lib/productShell";
import type { ResourceView } from "../../lib/filtering";
import { AiosBackHeader } from "../ui/AiosUiPrimitives";

export function renderBackButton(view: ResourceView, onBack?: () => void): ReactElement | null {
  if (!onBack || !getAdvancedSubviewParent(view)) return null;
  return createElement(AiosBackHeader, { label: advancedSubviewBackLabels[view as AdvancedSupportView] ?? "返回", onBack });
}
