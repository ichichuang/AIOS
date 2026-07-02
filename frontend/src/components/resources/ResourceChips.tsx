import { Chip, Stack } from "@mui/material";
import { getResourceDisplay } from "../../i18n/resourceText";
import type { AiosResource } from "../../types/inventory";

interface ResourceChipsProps {
  resource: AiosResource;
  extra?: string[];
}

export function ResourceChips({ resource, extra = [] }: ResourceChipsProps) {
  const display = getResourceDisplay(resource);

  return (
    <Stack className="resource-chip-row" direction="row" sx={{ flexWrap: "wrap", gap: 0.75 }}>
      <Chip className={`status-chip status-${resource.status}`} label={display.zhStatus} />
      <Chip className={`risk-chip risk-${resource.risk}`} label={display.zhRisk} />
      {extra.map((label) => (
        <Chip key={label} label={label} variant="outlined" />
      ))}
    </Stack>
  );
}
