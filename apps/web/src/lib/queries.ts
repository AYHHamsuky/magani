import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AcceptOrderInput, PatientInput, ProductInput, ReceiveInput, RefillPlanInput, SaleInput, StockRow } from "@magani/shared";
import { api } from "./api";

export interface RefillPlan {
  id: string;
  productId: string;
  quantityPerRefill: number;
  intervalDays: number;
  nextDueDate: string;
  product: { name: string; strength: string | null; priceKobo: number };
  reminders: { status: "SENT" | "FAILED"; sentAt: string }[];
}
export interface Patient {
  id: string;
  name: string;
  phone: string;
  language: "HAUSA" | "ENGLISH";
  programme: "HYPERTENSION" | "DIABETES" | "OTHER";
  refillPlans: RefillPlan[];
}
export interface Sale {
  id: string;
  soldAt: string;
  totalKobo: number;
  items: { id: string; quantity: number; priceKobo: number; product: { name: string } }[];
}
export interface Batch {
  id: string;
  productId: string;
  batchNo: string;
  expiry: string;
  quantity: number;
  product: { name: string; strength: string | null };
}

export const useStock = () => useQuery({ queryKey: ["stock"], queryFn: () => api<StockRow[]>("/products") });
export const usePatients = () => useQuery({ queryKey: ["patients"], queryFn: () => api<Patient[]>("/patients") });
export const useSales = () => useQuery({ queryKey: ["sales"], queryFn: () => api<Sale[]>("/sales") });
export const useExpiring = () => useQuery({ queryKey: ["expiring"], queryFn: () => api<Batch[]>("/stock/expiring?days=90") });

function useInvalidating<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries() });
}

export const useCreateProduct = () => useInvalidating((i: ProductInput) => api("/products", { body: i }));
export const useReceive = () => useInvalidating((i: ReceiveInput) => api("/stock/receive", { body: i }));
export const useSale = () =>
  useInvalidating((i: SaleInput) => api<{ warnings: string[] }>("/sales", { body: i }));
export const useRegisterPatient = () =>
  useInvalidating(async ({ patient, plan }: { patient: PatientInput; plan: RefillPlanInput }) => {
    const p = await api<Patient>("/patients", { body: patient });
    return api(`/patients/${p.id}/refills`, { body: plan });
  });
export const useCollectRefill = () =>
  useInvalidating((id: string) => api<{ warnings: string[] }>(`/refills/${id}/collect`, { method: "POST" }));
export const useRemind = () =>
  useInvalidating((id: string) => api<{ status: "SENT" | "FAILED" }>(`/refills/${id}/remind`, { method: "POST" }));

export type OrderStatus = "SENT" | "ACCEPTED" | "READY" | "DISPENSED" | "DECLINED" | "CANCELLED";
export interface MedicineOrder {
  id: string;
  externalRef: string;
  status: OrderStatus;
  partner: { id: string; name: string; kind: "HOSPITAL" | "PLATFORM" };
  patient: { name: string; phone: string };
  prescriber: string | null;
  fulfilment: "PICKUP" | "DELIVERY";
  deliveryAddress: string | null;
  payer: "PARTNER" | "PATIENT";
  note: string | null;
  declineReason: string | null;
  totalKobo: number | null;
  items: {
    id: string;
    medicine: string;
    strength: string | null;
    quantity: number;
    instructions: string | null;
    dispensedAs: { name: string; strength: string | null; unitPriceKobo: number } | null;
  }[];
  createdAt: string;
  dispensedAt: string | null;
}

export const useOrders = () =>
  useQuery({ queryKey: ["orders"], queryFn: () => api<MedicineOrder[]>("/orders"), refetchInterval: 30_000 });
export const useOrderAction = () =>
  useInvalidating(
    ({ id, action, body }: { id: string; action: "accept" | "ready" | "dispense" | "decline"; body?: AcceptOrderInput | { reason: string } }) =>
      api<{ warnings?: string[] }>(`/orders/${id}/${action}`, { method: "POST", body }),
  );
