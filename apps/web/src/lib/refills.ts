import { useToast } from "@magani/ui";
import { ApiError } from "./api";
import { useCollectRefill, useRemind } from "./queries";
import type { CarePatient } from "./workspace";

export function useRefillActions() {
  const collect = useCollectRefill();
  const remind = useRemind();
  const toast = useToast();
  const fail = (e: unknown) => toast.error(e instanceof ApiError ? e.message : "Could not reach the server.");
  return {
    busy: collect.isPending || remind.isPending,
    collect: (p: CarePatient) =>
      p.plan &&
      collect.mutate(p.plan.id, {
        onSuccess: (r) => {
          toast.success(`${p.name}'s refill recorded. Next one is in ${p.plan!.interval} days.`);
          r.warnings.forEach((w) => toast.info(w));
        },
        onError: fail,
      }),
    remind: (p: CarePatient) =>
      p.plan &&
      remind.mutate(p.plan.id, {
        onSuccess: (r) =>
          r.status === "SENT" ? toast.success(`Reminder sent to ${p.name}.`) : toast.error(`The SMS to ${p.name} did not go through.`),
        onError: fail,
      }),
  };
}
