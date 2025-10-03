import type { RequestHandler } from "express";
import { getSupabase } from "../lib/supabase";
import type {
  ApiErrorResponse,
  BatchCreateInput,
  BatchRow,
  CreateBatchResponse,
  ListBatchesResponse,
} from "@shared/api";

export const listBatches: RequestHandler = async (_req, res) => {
  const supa = getSupabase();
  if (!supa) {
    const payload: ApiErrorResponse = {
      ok: false,
      error: "Supabase not configured",
    };
    return res.status(500).json(payload);
  }
  const { data, error } = await supa
    .from("batches")
    .select(
      "batch_id, course_name, campus_name, batch_code, start_date, end_date, instructor, max_students, current_students, status, created_at",
    )
    .order("created_at", { ascending: false });
  if (error) {
    const payload: ApiErrorResponse = { ok: false, error: error.message };
    return res.status(500).json(payload);
  }
  const payload: ListBatchesResponse = {
    ok: true,
    items: (data as BatchRow[]) ?? [],
  };
  return res.json(payload);
};

export const createBatch: RequestHandler = async (req, res) => {
  const supa = getSupabase();
  if (!supa) {
    const payload: ApiErrorResponse = {
      ok: false,
      error: "Supabase not configured",
    };
    return res.status(500).json(payload);
  }

  const body = req.body as Partial<BatchCreateInput>;
  const required: Array<keyof BatchCreateInput> = [
    "course_name",
    "campus_name",
    "batch_code",
    "start_date",
    "end_date",
    "instructor",
    "max_students",
    "current_students",
  ];
  for (const k of required) {
    if (body[k] === undefined || body[k] === null || body[k] === "") {
      const payload: ApiErrorResponse = {
        ok: false,
        error: `Missing field: ${k}`,
      };
      return res.status(400).json(payload);
    }
  }

  const { data, error } = await supa
    .from("batches")
    .insert({
      course_name: body.course_name!,
      campus_name: body.campus_name!,
      batch_code: body.batch_code!,
      start_date: body.start_date!,
      end_date: body.end_date!,
      instructor: body.instructor!,
      max_students: body.max_students!,
      current_students: body.current_students!,
    })
    .select(
      "batch_id, course_name, campus_name, batch_code, start_date, end_date, instructor, max_students, current_students, status, created_at",
    )
    .single();

  if (error) {
    const code = String((error as any).code || "");
    const http = code === "23505" ? 409 : 500; // unique_violation
    const payload: ApiErrorResponse = { ok: false, error: error.message };
    return res.status(http).json(payload);
  }

  const payload: CreateBatchResponse = { ok: true, item: data as BatchRow };
  return res.status(201).json(payload);
};
