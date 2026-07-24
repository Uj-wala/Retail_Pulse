import type { CSSProperties } from "react";

export const chartTooltipStyle: CSSProperties = {
  borderRadius: 8,
  fontSize: 12,
  background: "rgb(var(--color-surface))",
  border: "1px solid rgba(148, 163, 184, 0.25)",
  color: "rgb(var(--color-text))",
  boxShadow: "0 8px 24px -6px rgba(15, 23, 42, 0.35)",
};

export const chartTooltipLabelStyle: CSSProperties = {
  color: "rgb(var(--color-text))",
  fontWeight: 600,
};

export const chartTooltipItemStyle: CSSProperties = {
  color: "rgb(var(--color-text-muted))",
};
