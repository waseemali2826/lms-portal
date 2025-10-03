/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

/**
 * Batches API types
 */
export interface BatchRow {
  batch_id: string;
  course_name: string;
  campus_name: string;
  batch_code: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  instructor: string;
  max_students: number;
  current_students: number;
  status: string;
  created_at: string; // ISO date
}

export interface BatchCreateInput {
  course_name: string;
  campus_name: string;
  batch_code: string;
  start_date: string;
  end_date: string;
  instructor: string;
  max_students: number;
  current_students: number;
}

export interface ListBatchesResponse {
  ok: true;
  items: BatchRow[];
}

export interface CreateBatchResponse {
  ok: true;
  item: BatchRow;
}

export interface ApiErrorResponse {
  ok: false;
  error: string;
}
