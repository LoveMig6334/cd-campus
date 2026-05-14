"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkAnonRateLimit } from "@/lib/rateLimit";
import type { ActionResult } from "@/lib/actions";

const ID_RE = /^[0-9]{4}$/;

export async function postCarelinRequest(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const limit = await checkAnonRateLimit("carelin");
  if (!limit.ok) {
    return {
      ok: false,
      error: "มีคำขอมากเกินไป ลองใหม่ใน 1 นาที / Too many requests, try again in a minute.",
    };
  }

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const who_name = String(formData.get("who_name") ?? "").trim();
  const student_id_4 = String(formData.get("student_id_4") ?? "").trim();
  const klassRaw = String(formData.get("klass") ?? "").trim();
  const klass = klassRaw === "" ? null : klassRaw;

  if (!title) return { ok: false, error: "Please add a title." };
  if (!body) return { ok: false, error: "Please describe your request." };
  if (!who_name) return { ok: false, error: "Please tell us your name." };
  if (!ID_RE.test(student_id_4)) {
    return { ok: false, error: "Student ID must be exactly 4 digits." };
  }

  const db = await createClient();
  const { error } = await db
    .from("carelin_requests")
    .insert({ title, body, who_name, student_id_4, klass });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/student/carelin");
  revalidatePath("/admin/carelin");
  redirect("/student/carelin");
}
