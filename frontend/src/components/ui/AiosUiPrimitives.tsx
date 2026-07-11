import { Accordion, AccordionDetails, AccordionSummary, Box, ButtonBase, Chip, Paper, Typography } from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { type ResourceView, VIEW_LABELS } from "../../lib/filtering";
import { useAiosLayoutModuleContentRef, useAiosLayoutModuleHeaderRef, useAiosLayoutRequestMeasure } from "../../lib/useAiosLayoutMetrics";
import {
  useAccordionRevealMotion,
  useEmptyStateRevealMotion,
  useListRowStaggerMotion,
  useSegmentedIndicatorMotion,
  useSmoothHoverSurfaceMotion,
  useVisibleCardRevealMotion
} from "../../lib/useAiosMotion";
import type { RefObject } from "react";

function useOptionalHoverCardLiftMotion(scope: RefObject<HTMLElement>, dependency: unknown, disabled: boolean): void {
  useSmoothHoverSurfaceMotion(scope, dependency, disabled ? { selector: ":not(*)" } : undefined);
}

export interface AiosUsageChip {
  label: string;
  className?: string;
  variant?: "filled" | "outlined";
}

export interface AiosTechnicalDetailRow {
  label: string;
  value: string | number;
  code?: boolean;
  codeClassName?: string;
}

export function AiosBackHeader({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <ButtonBase className="aios-back-header" aria-label={label} data-aios-hover-card data-aios-motion-surface onClick={onBack}>
      <ArrowBackRounded fontSize="small" />
      <Typography component="span">{label}</Typography>
    </ButtonBase>
  );
}

interface AiosModuleFrameProps {
  view: ResourceView;
  summary: string;
  count?: number;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  ariaLabel?: string;
  backButton?: ReactNode;
  motionKey?: unknown;
  disableHoverMotion?: boolean;
}

export function AiosModuleFrame({
  view,
  summary,
  count,
  actions,
  children,
  className,
  contentClassName,
  ariaLabel,
  backButton,
  motionKey,
  disableHoverMotion = false
}: AiosModuleFrameProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const moduleHeaderRef = useAiosLayoutModuleHeaderRef();
  const moduleContentRef = useAiosLayoutModuleContentRef();
  const requestMeasure = useAiosLayoutRequestMeasure();
  const setContentRef = useCallback(
    (node: HTMLDivElement | null) => {
      contentRef.current = node;
      moduleContentRef.current = node;
      requestMeasure();
    },
    [moduleContentRef, requestMeasure]
  );
  useVisibleCardRevealMotion(contentRef, motionKey ?? `${view}:${count ?? "none"}`);
  useListRowStaggerMotion(contentRef, motionKey ?? `${view}:${count ?? "none"}`);
  useEmptyStateRevealMotion(contentRef, motionKey ?? `${view}:${count ?? "none"}`);
  useOptionalHoverCardLiftMotion(contentRef, motionKey ?? view, disableHoverMotion);

  useEffect(() => {
    requestMeasure();
  }, [children, motionKey, requestMeasure]);

  return (
    <Box className={["module-surface", "aios-module-frame", className].filter(Boolean).join(" ")} component="section" aria-label={ariaLabel ?? `${VIEW_LABELS[view]}页面`} data-aios-motion-surface>
      <Box className="module-header" ref={moduleHeaderRef}>
        <Box className="module-header-title">
          {backButton}
          <Box className="module-header-text">
            <Typography component="h2" variant="h2">
              {VIEW_LABELS[view]}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {summary}
            </Typography>
          </Box>
        </Box>
        <Box className="module-header-actions">
          {typeof count === "number" && <Chip label={`${count} 项`} variant="outlined" size="small" />}
          {actions}
        </Box>
      </Box>
      <Box className={["module-scroll", "aios-module-content", contentClassName].filter(Boolean).join(" ")} ref={setContentRef} data-aios-module-content>
        {children}
      </Box>
    </Box>
  );
}

export function AiosHeroPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Paper className={["aios-hero-panel", className].filter(Boolean).join(" ")} component="section" elevation={0} data-aios-hover-card data-aios-layout-fixed data-aios-motion-surface data-motion="resource-card">
      {children}
    </Paper>
  );
}

export interface AiosSegmentedOption {
  value: string;
  label: string;
  count?: number;
}

export function AiosSegmentedSwitcher({
  ariaLabel,
  options,
  value,
  onChange,
  className
}: {
  ariaLabel: string;
  options: AiosSegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const scopeRef = useRef<HTMLDivElement | null>(null);
  useSegmentedIndicatorMotion(scopeRef, value);
  const handleClick = useCallback(
    (nextValue: string) => () => {
      if (nextValue !== value) onChange(nextValue);
    },
    [onChange, value]
  );

  return (
    <Box
      ref={scopeRef}
      className={["aios-segmented-switcher", className].filter(Boolean).join(" ")}
      data-aios-layout-fixed
      data-aios-motion-surface
      role="tablist"
      aria-label={ariaLabel}
    >
      <Box className="aios-segmented-track" data-segmented-track>
        <Box className="aios-segmented-indicator" data-segmented-indicator />
        {options.map((option) => {
          const active = option.value === value;
          return (
            <ButtonBase
              key={option.value}
              className={["aios-segmented-button", active ? "active" : ""].filter(Boolean).join(" ")}
              role="tab"
              aria-selected={active}
              data-aios-hover-card
              data-aios-motion-surface
              data-aios-selected-surface={active ? "true" : undefined}
              data-segmented-active={active ? "true" : undefined}
              onClick={handleClick(option.value)}
            >
              <Typography component="span">{option.label}</Typography>
              {typeof option.count === "number" && <Chip label={`${option.count} 项`} size="small" />}
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
}

interface AiosContentPanelProps {
  children: ReactNode;
  active: boolean;
  className?: string;
  id?: string;
  labelledBy?: string;
}

export function AiosContentPanel({ children, active, className, id, labelledBy }: AiosContentPanelProps) {
  return (
    <Box
      className={["aios-content-panel", active ? "aios-content-panel-active" : "aios-content-panel-hidden", className].filter(Boolean).join(" ")}
      role="tabpanel"
      id={id}
      aria-labelledby={labelledBy}
      hidden={!active}
      data-aios-internal-scroll={active ? "true" : undefined}
      data-aios-content-panel={active ? "active" : "hidden"}
    >
      {children}
    </Box>
  );
}

export function AiosAccordionPanel({
  children,
  className,
  count,
  defaultExpanded = true,
  summary,
  title
}: {
  children: ReactNode;
  className?: string;
  count?: number;
  defaultExpanded?: boolean;
  summary?: string;
  title: string;
}) {
  const accordionRef = useRef<HTMLDivElement | null>(null);
  useAccordionRevealMotion(accordionRef, `${title}:${count ?? "none"}`);

  return (
    <Accordion className={["aios-accordion-panel", className].filter(Boolean).join(" ")} defaultExpanded={defaultExpanded} disableGutters elevation={0} ref={accordionRef} data-aios-hover-card data-aios-motion-surface data-motion="resource-card">
      <AccordionSummary expandIcon={<ExpandMoreRounded />}>
        <Box className="aios-accordion-summary-copy">
          <Typography component="h3">{title}</Typography>
          {summary && (
            <Typography color="text.secondary" variant="body2">
              {summary}
            </Typography>
          )}
        </Box>
        {typeof count === "number" && <Chip label={`${count} 项`} variant="outlined" />}
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}

export function AiosModuleControls({ children, className }: { children: ReactNode; className?: string }) {
  return <Box className={["aios-module-controls", className].filter(Boolean).join(" ")} data-aios-motion-surface>{children}</Box>;
}

export interface AiosSectionRailOption {
  value: string;
  label: string;
  count?: number;
  icon?: ReactNode;
}

export function AiosSectionRail({
  ariaLabel,
  options,
  value,
  onChange,
  className,
  disableItemHover = false
}: {
  ariaLabel: string;
  options: AiosSectionRailOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disableItemHover?: boolean;
}) {
  const handleClick = useCallback(
    (nextValue: string) => () => {
      if (nextValue !== value) onChange(nextValue);
    },
    [onChange, value]
  );

  return (
    <Box
      className={["aios-section-rail", className].filter(Boolean).join(" ")}
      role="tablist"
      aria-label={ariaLabel}
      data-aios-layout-fixed
      data-aios-motion-surface
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <ButtonBase
            key={option.value}
            className={["aios-section-rail-item", active ? "active" : ""].filter(Boolean).join(" ")}
            role="tab"
            aria-selected={active}
            data-section-rail-active={active ? "true" : undefined}
            data-aios-selected-surface={active ? "true" : undefined}
            {...(disableItemHover ? {} : { "data-aios-hover-card": "true", "data-aios-motion-surface": "true" })}
            onClick={handleClick(option.value)}
          >
            {option.icon && <Box className="aios-section-rail-icon">{option.icon}</Box>}
            <Typography component="span">{option.label}</Typography>
            {typeof option.count === "number" && <Chip label={`${option.count} 项`} size="small" />}
          </ButtonBase>
        );
      })}
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
        <Chip className={chip.className} key={chip.label} label={chip.label} title={chip.label} variant={chip.variant ?? "outlined"} />
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
        <Box className="resource-header-row">
          <Typography className="resource-title" component="h3" title={title}>
            {title}
          </Typography>
          {chips.length > 0 && <AiosChipZone chips={chips.slice(0, 1)} />}
        </Box>
        {technicalName && (
          <Box className="resource-secondary-row">
            <Box className="code-pill resource-technical-name" component="code" title={technicalName}>
              {technicalName}
            </Box>
          </Box>
        )}
        <Typography className="resource-description" color="text.secondary" title={purpose} variant="body2">
          {purpose}
        </Typography>
        {meta && <Box className="resource-footer-row">{meta}</Box>}
      </Box>
    </>
  );

  return (
    <Box
      className={["aios-usage-card", "material-card", selected ? "selected" : "", className].filter(Boolean).join(" ")}
      data-aios-hover-card
      data-aios-motion-surface
      data-aios-selected-surface={selected ? "true" : undefined}
      data-motion="resource-card"
    >
      {onClick ? (
        <ButtonBase className="aios-usage-action" aria-current={selected ? "true" : undefined} aria-pressed={selected} onClick={onClick}>
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
    <Box className="aios-capability-launcher-card" data-aios-hover-card data-aios-motion-surface data-motion="resource-card">
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
  meta?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}

export function AiosTimelineRow({ title, filename, timestamp, summary, chips = [], className, meta, selected = false, onClick }: AiosTimelineRowProps) {
  const body = (
    <>
      <Box className="timeline-row-main">
        <Box className="resource-header-row">
          <Typography className="resource-title" component="h3" title={title}>
            {title}
          </Typography>
          <AiosChipZone chips={chips} />
        </Box>
        {filename && (
          <Box className="resource-secondary-row">
            <Box className="code-pill resource-technical-name" component="code" title={filename}>
              {filename}
            </Box>
          </Box>
        )}
        <Typography className="timeline-row-summary" color="text.secondary" title={`${timestamp} · ${summary}`} variant="body2">
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
        {meta && <Box className="resource-footer-row">{meta}</Box>}
      </Box>
    </>
  );

  return (
    <Box
      className={["timeline-row", "aios-timeline-row", "resource-card", selected ? "selected" : "", className].filter(Boolean).join(" ")}
      data-aios-hover-card
      data-aios-motion-surface
      data-aios-selected-surface={selected ? "true" : undefined}
      data-motion="resource-card"
    >
      {onClick ? (
        <ButtonBase className="timeline-row-action" aria-current={selected ? "true" : undefined} aria-pressed={selected} onClick={onClick}>
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
  className?: string;
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

export function AiosInspectorSection({ title, children, defaultExpanded = false, className }: AiosInspectorSectionProps) {
  return (
    <Accordion className={["aios-inspector-section", className].filter(Boolean).join(" ")} defaultExpanded={defaultExpanded} disableGutters elevation={0} variant="outlined">
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
                <Box className={["code-pill resource-meta-code", row.codeClassName].filter(Boolean).join(" ")} component="code" title={formatTechnicalDetailValue(row.value)}>
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
