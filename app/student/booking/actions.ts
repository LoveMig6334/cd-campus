"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findConflictingBooking } from "@/lib/queries/bookings";
import { checkAnonRateLimit } from "@/lib/rateLimit";
import { PERIOD_HOURS, type PeriodId } from "@/lib/ui/booking";
import type { ActionResult } from "@/lib/actions";

const ID_RE = /^[0-9]{4}$/;
const PERIOD_IDS = ["morning", "midday", "evening"] as const;
function isPeriod(v: string): v is PeriodId {
  return (PERIOD_IDS as readonly string[]).includes(v);
}

export async function bookRoom(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const limit = await checkAnonRateLimit("booking");
  if (!limit.ok) {
    return {
      ok: false,
      error: "มีคำขอมากเกินไป ลองใหม่ใน 1 นาที / Too many requests, try again in a minute.",
    };
  }

  const room_id = String(formData.get("room") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const period = String(formData.get("period") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const student_id_4 = String(formData.get("student_id_4") ?? "").trim();
  const klassRaw = String(formData.get("klass") ?? "").trim();
  const purposeRaw = String(formData.get("purpose") ?? "").trim();

  if (!room_id) return { ok: false, error: "Please choose a room." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: "Please choose a date." };
  }
  if (!isPeriod(period)) {
    return { ok: false, error: "Please choose a time period." };
  }
  if (!name) return { ok: false, error: "Please tell us your name." };
  if (!ID_RE.test(student_id_4)) {
    return { ok: false, error: "Student ID must be 4 digits." };
  }

  const slot = PERIOD_HOURS[period];
  const starts_at = `${date}T${slot.start}:00+07:00`;
  const ends_at = `${date}T${slot.end}:00+07:00`;

  if (await findConflictingBooking(room_id, starts_at, ends_at)) {
    return { ok: false, error: "That room is already taken for that period." };
  }

  const db = await createClient();
  const { error } = await db.from("bookings").insert({
    room_id,
    user_label: name,
    purpose: purposeRaw || null,
    student_id_4,
    klass: klassRaw || null,
    starts_at,
    ends_at,
    status: "Pending",
    bar_variant: "default",
  });
  if (error) {
    if (error.code === "23P01") {
      return {
        ok: false,
        error: "ห้องนี้เพิ่งถูกจองไป / This room was just booked. Please pick another slot.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/student/booking");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  return { ok: true };
}
