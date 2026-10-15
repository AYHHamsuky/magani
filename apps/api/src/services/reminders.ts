import cron from "node-cron";
import { reminderText } from "@magani/shared";
import { db } from "../db";
import { sendSms } from "./sms";

const DAY = 86_400_000;

export async function sendReminder(planId: string) {
  const plan = await db.refillPlan.findUniqueOrThrow({
    where: { id: planId },
    include: { patient: { include: { pharmacy: true } }, product: true },
  });
  const message = reminderText({
    language: plan.patient.language,
    patient: plan.patient.name.split(" ")[0],
    product: plan.product.name,
    pharmacy: plan.patient.pharmacy.name,
    due: plan.nextDueDate,
  });
  const key = { refillPlanId_dueDate: { refillPlanId: plan.id, dueDate: plan.nextDueDate } };
  try {
    await sendSms(plan.patient.phone, message);
    return db.reminder.upsert({
      where: key,
      update: { status: "SENT", sentAt: new Date(), message, error: null },
      create: { refillPlanId: plan.id, dueDate: plan.nextDueDate, status: "SENT", message },
    });
  } catch (e) {
    return db.reminder.upsert({
      where: key,
      update: { status: "FAILED", error: String(e) },
      create: { refillPlanId: plan.id, dueDate: plan.nextDueDate, status: "FAILED", message, error: String(e) },
    });
  }
}

/** Remind patients whose refill is due within 2 days and who have not been reminded for that due date. */
export async function runReminderSweep() {
  const plans = await db.refillPlan.findMany({
    where: { active: true, nextDueDate: { lte: new Date(Date.now() + 2 * DAY) } },
    include: { reminders: true },
  });
  const pending = plans.filter(
    (p) => !p.reminders.some((r) => r.dueDate.getTime() === p.nextDueDate.getTime() && r.status === "SENT"),
  );
  for (const p of pending) await sendReminder(p.id);
  console.log(`[reminders] sent ${pending.length}`);
}

export function scheduleReminders() {
  cron.schedule("0 8 * * *", () => void runReminderSweep(), { timezone: "Africa/Lagos" });
}
