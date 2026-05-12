"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { findConflictingBooking } from "@/lib/queries/bookings";
import { PERIOD_HOURS, type PeriodId } from "@/lib/ui/booking";

const STATUSES = ["Confirmed", "Pending", "Review"] as const;
type Status = (typeof STATUSES)[number];

function isStatus(v: string): v is Status {
  return (STATUSES as readonly string[]).includes(v);
}

function isPeriod(v: string): v is PeriodId {
  return v === "morning" || v === "midday" || v === "evening";
}

function deriveTimes(
  date: string,
  period: PeriodId,
): { startsAt: string; endsAt: string } {
  const { start, end } = PERIOD_HOURS[period];
  return {
    startsAt: `${date}T${start}:00+07:00`,
    endsAt: `${date}T${end}:00+07:00`,
  };
}

function isValidDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export async function createBooking(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const room_id = String(formData.get("room_id") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  const date = String(formData.get("date") ?? "").trim();
  const period = String(formData.get("period") ?? "");
  const user_label = String(formData.get("user_label") ?? "").trim();
  const purpose_raw = String(formData.get("purpose") ?? "").trim();

  if (!room_id) return;
  if (!isStatus(status)) return;
  if (!isValidDate(date)) return;
  if (!isPeriod(period)) return;
  if (!user_label) return;

  const { startsAt, endsAt } = deriveTimes(date, period);

  const conflict = await findConflictingBooking(room_id, startsAt, endsAt);
  if (conflict) {
    throw new Error(
      `Conflict: room already booked by ${conflict.user_label} (${conflict.starts_at} — ${conflict.ends_at})`,
    );
  }

  const db = await createClient();
  const { error } = await db.from("bookings").insert({
    room_id,
    status,
    starts_at: startsAt,
    ends_at: endsAt,
    user_label,
    purpose: purpose_raw || null,
    created_by_admin_id: admin.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/bookings");
  revalidatePath("/student/booking");
  revalidatePath("/admin");
  redirect("/admin/bookings");
}

export async function updateBooking(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const room_id = String(formData.get("room_id") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  const date = String(formData.get("date") ?? "").trim();
  const period = String(formData.get("period") ?? "");
  const user_label = String(formData.get("user_label") ?? "").trim();
  const purpose_raw = String(formData.get("purpose") ?? "").trim();

  if (!room_id) return;
  if (!isStatus(status)) return;
  if (!isValidDate(date)) return;
  if (!isPeriod(period)) return;
  if (!user_label) return;

  const { startsAt, endsAt } = deriveTimes(date, period);

  const conflict = await findConflictingBooking(room_id, startsAt, endsAt, id);
  if (conflict) {
    throw new Error(
      `Conflict: room already booked by ${conflict.user_label} (${conflict.starts_at} — ${conflict.ends_at})`,
    );
  }

  const db = await createClient();
  const { error } = await db
    .from("bookings")
    .update({
      room_id,
      status,
      starts_at: startsAt,
      ends_at: endsAt,
      user_label,
      purpose: purpose_raw || null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/bookings");
  revalidatePath("/student/booking");
  revalidatePath("/admin");
  redirect("/admin/bookings");
}

export async function cancelBooking(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = await createClient();
  const { error } = await db.from("bookings").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/bookings");
  revalidatePath("/student/booking");
  revalidatePath("/admin");
  redirect("/admin/bookings");
}
