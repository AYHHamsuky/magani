export const money = (kobo: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100);

export const day = (d: string | Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" }).format(new Date(d)) : "";

export const categories = {
  NCD_MEDICATION: "Chronic medication",
  DIALYSIS: "Dialysis",
  CANCER: "Cancer care",
  SURGERY: "Surgery",
  MATERNAL_CHILD: "Mother and child",
  EMERGENCY: "Emergency care",
  OTHER: "Other treatment",
} as const;
export type Category = keyof typeof categories;

export const hospitalTypes = {
  FEDERAL_TEACHING: "Federal teaching hospital",
  FEDERAL_MEDICAL_CENTRE: "Federal medical centre",
  STATE_SPECIALIST: "State specialist hospital",
  GENERAL: "General hospital",
  PRIMARY_HEALTH: "Primary health centre",
} as const;
export type HospitalType = keyof typeof hospitalTypes;

export const orderStatus: Record<string, string> = {
  SENT: "Sent to pharmacy",
  ACCEPTED: "Accepted",
  READY: "Ready",
  DISPENSED: "Dispensed",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
};
export const orderPill = (s: string) => (s === "DECLINED" || s === "CANCELLED" ? "out" : s === "DISPENSED" ? "" : "low");

export const campaignStatus: Record<string, string> = {
  PENDING_REVIEW: "Waiting for review",
  LIVE: "Live",
  FUNDED: "Fully funded",
  CLOSED: "Closed",
  REJECTED: "Needs changes",
};
export const campaignPill = (s: string) => (s === "REJECTED" ? "out" : s === "PENDING_REVIEW" ? "low" : "");

export const itemsText = (items: { medicine: string; strength?: string | null; quantity: number }[]) =>
  items.map((i) => `${i.medicine}${i.strength ? ` ${i.strength}` : ""} ×${i.quantity}`).join(", ");

export const pct = (part: number, whole: number) => (whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 0);
