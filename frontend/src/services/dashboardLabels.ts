import type { PaymentMethod, SalesChannel } from "../types";

export const channelLabels: Record<SalesChannel, string> = {
  RETAIL_STORE: "Retail Store",
  ONLINE_STORE: "Online Store",
  MARKETPLACE: "Marketplace",
};

export const paymentLabels: Record<PaymentMethod, string> = {
  CASH: "Cash",
  CARD: "Card",
  UPI: "UPI",
  BANK_TRANSFER: "Bank Transfer",
};

export const CHART_COLORS = ["#14B8A6", "#1D4ED8", "#38BDF8", "#A78BFA", "#FB7185", "#34D399", "#F59E0B", "#EC4899"];
