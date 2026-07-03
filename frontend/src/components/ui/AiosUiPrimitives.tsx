import { Accordion, AccordionDetails, AccordionSummary, Box, ButtonBase, Chip, Typography } from "@mui/material";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import type { ReactNode } from "react";
import { type ResourceView, VIEW_LABELS } from "../../lib/filtering";

export interface AiosUsageChip {
  label: string;
  className?: string;
  variant?: "filled" | "outlined";
}

export interface AiosTechnicalDetailRow {
  label: string;
  value: string | number;
  code?: boolean;
}

interface AiosModuleFrameProps {
  view: ResourceView;
  summary: string;
  count: number;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  ariaLabel?: string;
}

export function AiosModuleFrame({ view, summary, count, actions, children, className, contentClassName, ariaLabel }: AiosModuleFrameProps) {
  return (
    <Box className={["module-surface", "aios-module-frame", className].filter(Boolean).join(" ")} component="section" aria-label={ariaLabel ?? `${VIEW_LABELS[view]}模块`}>
      <Box className="module-header">
        <Box className="module-header-title">
          <Typography component="h2" variant="h2">
            {VIEW_LABELS[view]}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {summary}
          </Typography>
        </Box>
        <Box className="module-header-actions">
          <Chip color="primary" label={`${count} 项可见`} />
          {actions}
        </Box>
      </Box>
      <Box className={["module-scroll", "aios-module-content", contentClassName].filter(Boolean).join(" ")}>{children}</Box>
    </Box>
  );
}

export function AiosModuleControls({ children, className }: { children: ReactNode; className?: string }) {
  return <Box className={["aios-module-controls", className].filter(Boolean).join(" ")}>{children}</Box>;
}

export function AiosPillRail({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <Box className={["aios-pill-rail", className].filter(Boolean).join(" ")} role="tablist" aria-label={label}>
      {children}
    </Box>
  );
}

export function AiosSection({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Box className={["aios-section", "dashboard-section", className].filter(Boolean).join(" ")} component="section">
      {children}
    </Box>
  );
}

interface AiosSectionHeaderProps {
  title: string;
  summary?: string;
  count?: number;
  action?: ReactNode;
  className?: string;
}

export function AiosSectionHeader({ title, summary, count, action, className }: AiosSectionHeaderProps) {
  return (
    <Box className={["aios-section-header", className].filter(Boolean).join(" ")}>
      <Box className="aios-section-heading">
        <Typography component="h3" variant="h3">
          {title}
        </Typography>
        {summary && (
          <Typography color="text.secondary" variant="body2">
            {summary}
          </Typography>
        )}
      </Box>
      <Box className="aios-section-actions">
        {typeof count === "number" && <Chip label={`${count} 项`} variant="outlined" />}
        {action}
      </Box>
    </Box>
  );
}

export function AiosChipZone({ chips, className }: { chips?: AiosUsageChip[]; className?: string }) {
  if (!chips || chips.length === 0) return null;
  return (
    <Box className={["aios-chip-zone", "resource-chip-row", className].filter(Boolean).join(" ")}>
      {chips.slice(0, 2).map((chip) => (
        <Chip className={chip.className} key={chip.label} label={chip.label} variant={chip.variant ?? "outlined"} />
      ))}
    </Box>
  );
}

interface AiosUsageCardProps {
  title: string;
  purpose: string;
  chips?: AiosUsageChip[];
  className?: string;
  icon?: ReactNode;
  meta?: ReactNode;
  selected?: boolean;
  technicalName?: string;
  onClick?: () => void;
}

export function AiosUsageCard({ title, purpose, chips = [], className, icon, meta, selected = false, technicalName, onClick }: AiosUsageCardProps) {
  const body = (
    <>
      {icon && <Box className="aios-usage-icon">{icon}</Box>}
      <Box className="aios-usage-main">
        <Box className="aios-usage-title-line">
          <Typography className="resource-title" component="h3">
            {title}
          </Typography>
          {technicalName && (
            <Box className="code-pill resource-technical-name" component="code">
              {technicalName}
            </Box>
          )}
        </Box>
        <Typography className="resource-description" color="text.secondary" variant="body2">
          {purpose}
        </Typography>
        {meta}
      </Box>
      <AiosChipZone chips={chips} />
    </>
  );

  return (
    <Box className={["aios-usage-card", "material-card", selected ? "selected" : "", className].filter(Boolean).join(" ")} data-motion="resource-card">
      {onClick ? (
        <ButtonBase className="aios-usage-action" aria-pressed={selected} onClick={onClick}>
          {body}
        </ButtonBase>
      ) : (
        <Box className="aios-usage-action static">{body}</Box>
      )}
    </Box>
  );
}

interface AiosCapabilityLauncherCardProps {
  title: string;
  description: string;
  actionLabel: string;
  icon: ReactNode;
  metaLabel?: string;
  onClick: () => void;
}

export function AiosCapabilityLauncherCard({ title, description, actionLabel, icon, metaLabel, onClick }: AiosCapabilityLauncherCardProps) {
  return (
    <Box className="aios-capability-launcher-card" data-motion="resource-card">
      <ButtonBase className="aios-capability-launcher-action" onClick={onClick}>
        <Box className="aios-capability-launcher-icon">{icon}</Box>
        <Box className="aios-capability-launcher-copy">
          <Box className="aios-capability-launcher-title-line">
            <Typography className="aios-capability-launcher-title" component="h3">
              {title}
            </Typography>
            {metaLabel && (
              <Box className="code-pill aios-capability-launcher-meta" component="code">
                {metaLabel}
              </Box>
            )}
          </Box>
          <Typography className="aios-capability-launcher-description" color="text.secondary" variant="body2">
            {description}
          </Typography>
        </Box>
        <Chip className="aios-capability-launcher-chip" label={actionLabel} variant="outlined" />
      </ButtonBase>
    </Box>
  );
}

interface AiosUsageRowProps {
  title: string;
  purpose: string;
  chips?: AiosUsageChip[];
  className?: string;
  selected?: boolean;
  technicalName?: string;
  onClick?: () => void;
}

export function AiosUsageRow({ title, purpose, chips = [], className, selected = false, technicalName, onClick }: AiosUsageRowProps) {
  return (
    <AiosUsageCard
      className={["aios-usage-row", "usage-row", className].filter(Boolean).join(" ")}
      chips={chips}
      purpose={purpose}
      selected={selected}
      technicalName={technicalName}
      title={title}
      onClick={onClick}
    />
  );
}

interface AiosTimelineRowProps {
  title: string;
  filename: string;
  timestamp: string;
  summary: string;
  chips?: AiosUsageChip[];
  className?: string;
  selected?: boolean;
  onClick?: () => void;
}

export function AiosTimelineRow({ title, filename, timestamp, summary, chips = [], className, selected = false, onClick }: AiosTimelineRowProps) {
  const body = (
    <>
      <Box className="timeline-row-main">
        <Box className="timeline-row-title-line">
          <Typography className="resource-title" component="h3">
            {title}
          </Typography>
          <Box className="code-pill resource-technical-name" component="code">
            {filename}
          </Box>
        </Box>
        <Typography className="timeline-row-summary" color="text.secondary" variant="body2">
          <Box component="span" className="timeline-row-date">
            {timestamp}
          </Box>
          <Box component="span" className="timeline-row-divider" aria-hidden="true">
            ·
          </Box>
          <Box component="span" className="timeline-row-copy">
            {summary}
          </Box>
        </Typography>
      </Box>
      <AiosChipZone chips={chips} className="timeline-row-chips" />
    </>
  );

  return (
    <Box className={["timeline-row", "aios-timeline-row", "resource-card", selected ? "selected" : "", className].filter(Boolean).join(" ")} data-motion="resource-card">
      {onClick ? (
        <ButtonBase className="timeline-row-action" aria-pressed={selected} onClick={onClick}>
          {body}
        </ButtonBase>
      ) : (
        <Box className="timeline-row-action static">{body}</Box>
      )}
    </Box>
  );
}

interface AiosInspectorSectionProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}

interface AiosInspectorEmptyGuideProps {
  title: string;
  summary: string;
  hints: string[];
  badge?: string;
}

export function AiosInspectorEmptyGuide({ title, summary, hints, badge }: AiosInspectorEmptyGuideProps) {
  return (
    <Box className="inspector-panel inspector-empty-panel aios-inspector-empty-guide">
      <Box className="aios-inspector-empty-heading">
        <Typography component="h3" variant="h3">
          {title}
        </Typography>
        {badge && <Chip label={badge} variant="outlined" />}
      </Box>
      <Typography color="text.secondary" variant="body2">
        {summary}
      </Typography>
      <Box className="aios-inspector-empty-hints" component="ul">
        {hints.map((hint) => (
          <li key={hint}>{hint}</li>
        ))}
      </Box>
    </Box>
  );
}

interface AiosInspectorUsagePanelProps {
  title: string;
  summary: string;
  children: ReactNode;
}

export function AiosInspectorUsagePanel({ title, summary, children }: AiosInspectorUsagePanelProps) {
  return (
    <Box className="aios-inspector-usage-panel">
      <Box className="aios-inspector-usage-copy">
        <Typography className="inspector-field-label" component="p">
          {title}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {summary}
        </Typography>
      </Box>
      <Box className="aios-inspector-usage-actions">{children}</Box>
    </Box>
  );
}

export function AiosInspectorSection({ title, children, defaultExpanded = false }: AiosInspectorSectionProps) {
  return (
    <Accordion className="aios-inspector-section" defaultExpanded={defaultExpanded} disableGutters elevation={0} variant="outlined">
      <AccordionSummary expandIcon={<ExpandMoreRounded />}>
        <Typography component="h3">{title}</Typography>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}

export function AiosTechnicalDetails({ rows, children }: { rows?: AiosTechnicalDetailRow[]; children?: ReactNode }) {
  return (
    <Box className="aios-technical-details">
      {rows && rows.length > 0 && (
        <Box className="aios-technical-grid">
          {rows.map((row, index) => (
            <Box className="resource-meta-row" key={`${row.label}:${index}`}>
              <Typography color="text.secondary" component="span">
                {row.label}
              </Typography>
              {row.code ? (
                <Box className="code-pill resource-meta-code" component="code" title={formatTechnicalDetailValue(row.value)}>
                  {formatTechnicalDetailValue(row.value)}
                </Box>
              ) : (
                <Typography component="strong" title={formatTechnicalDetailValue(row.value)}>
                  {formatTechnicalDetailValue(row.value)}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}
      {children}
    </Box>
  );
}

function formatTechnicalDetailValue(value: string | number): string {
  const formatted = String(value).trim();
  return formatted.length > 0 ? formatted : "未记录";
}
