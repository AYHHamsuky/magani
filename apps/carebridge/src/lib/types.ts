import type { Category, HospitalType } from "./format";

export interface Money {
  raisedKobo: number;
  donors: number;
  committedKobo: number;
  paidOutKobo: number;
  availableKobo: number;
}

export interface PublicHospital { id: string; name: string; type: HospitalType; state: string; lga: string; verified: boolean }

export interface PublicCampaign extends Money {
  id: string;
  slug: string;
  title: string;
  patientAlias: string;
  story: string;
  category: Category;
  status: "LIVE" | "FUNDED" | "CLOSED";
  targetKobo: number;
  liveAt: string | null;
  hospital: PublicHospital;
}

export interface OrderItem { medicine: string; strength?: string | null; quantity: number; instructions?: string }

export interface CampaignDetail extends PublicCampaign {
  costItems: { description: string; amountKobo: number }[];
  donations: { name: string; amountKobo: number; message: string | null; paidAt: string }[];
  disbursements: { payeeType: "HOSPITAL" | "PHARMACY"; payeeName: string; amountKobo: number; purpose: string; status: "DUE" | "PAID"; createdAt: string; paidAt: string | null }[];
  medicineOrders: { pharmacy: string; status: string; items: OrderItem[]; createdAt: string; dispensedAt: string | null; fulfilment: string }[];
}

export interface Stats {
  raisedKobo: number;
  donations: number;
  disbursedKobo: number;
  medicineOrdersDispensed: number;
  campaigns: number;
  verifiedHospitals: number;
  testMode: boolean;
}

export interface Pharmacy { id: string; name: string; state: string; lga: string }

export interface ConsoleOrder {
  id: string;
  campaignId: string | null;
  campaign: { id: string; title: string; patientAlias: string } | null;
  maganiOrderId: string | null;
  pharmacyName: string;
  pharmacyLocation: string;
  patientName: string;
  patientPhone: string;
  fulfilment: string;
  items: OrderItem[];
  status: string;
  totalKobo: number | null;
  declineReason: string | null;
  createdAt: string;
  dispensedAt: string | null;
  disbursement: { id: string; status: "DUE" | "PAID"; amountKobo: number } | null;
}

export interface Disbursement {
  id: string;
  campaignId: string | null;
  campaign: { id: string; title: string; patientAlias: string } | null;
  payeeType: "HOSPITAL" | "PHARMACY";
  payeeName: string;
  amountKobo: number;
  purpose: string;
  evidence: string | null;
  status: "DUE" | "PAID";
  createdAt: string;
  paidAt: string | null;
}

export interface ConsoleCampaign extends Money {
  id: string;
  slug: string;
  title: string;
  patientAlias: string;
  patientName: string;
  patientPhone: string;
  story: string;
  category: Category;
  caseReference: string;
  status: "PENDING_REVIEW" | "LIVE" | "FUNDED" | "CLOSED" | "REJECTED";
  targetKobo: number;
  reviewNote: string | null;
  createdAt: string;
  liveAt: string | null;
  hospital: { id?: string; name: string; state: string; verified: boolean };
  createdBy: { name: string; jobTitle: string | null; email?: string; phone?: string | null };
}

export interface ConsoleCampaignDetail extends ConsoleCampaign {
  items: { id: string; description: string; amountKobo: number }[];
  donations: { id: string; donorName: string; anonymous: boolean; amountKobo: number; message: string | null; paidAt: string }[];
  disbursements: Disbursement[];
  medicineOrders: ConsoleOrder[];
}
