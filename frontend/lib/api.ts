import axios from "axios";
import { isSupabaseConfigured } from "./supabase";
import { ParseReceiptResponse, SplitSession, SummaryResponse } from "./types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
});

api.interceptors.request.use(async (config) => {
  if (isSupabaseConfigured()) {
    try {
      const { supabase } = await import("./supabase");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch { /* auth not available, continue without token */ }
  }
  return config;
});

function getApiErrorMessage(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err)) return fallback;
  const detail = err.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  return fallback;
}

export async function parseReceipt(images: File[], date?: string): Promise<ParseReceiptResponse> {
  const form = new FormData();
  images.forEach((file) => form.append("images", file));
  if (date) form.append("created_at", date);
  try {
    const { data } = await api.post<ParseReceiptResponse>("/api/parse-receipt", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  } catch (err) {
    throw new Error(
      getApiErrorMessage(
        err,
        "We couldn't parse this receipt right now. Please try again in a minute.",
      ),
    );
  }
}

export async function getSession(sessionId: string): Promise<SplitSession> {
  const { data } = await api.get<SplitSession>(`/api/sessions/${sessionId}`);
  return data;
}

export async function listSessions(): Promise<SplitSession[]> {
  const { data } = await api.get<SplitSession[]>("/api/sessions");
  return data;
}

export async function updateSession(session: SplitSession): Promise<SplitSession> {
  const { data } = await api.put<SplitSession>(`/api/sessions/${session.session_id}`, {
    name: session.name,
    items: session.items,
    people: session.people,
    charge_split_mode: session.charge_split_mode,
  });
  return data;
}

export async function getSummary(sessionId: string): Promise<SummaryResponse> {
  const { data } = await api.get<SummaryResponse>(`/api/sessions/${sessionId}/summary`);
  return data;
}

export async function createShareToken(sessionId: string): Promise<string> {
  const { data } = await api.post<{ share_token: string }>(`/api/sessions/${sessionId}/share`);
  return data.share_token;
}

export async function getSharedSession(token: string): Promise<SplitSession> {
  const { data } = await api.get<SplitSession>(`/api/share/${token}`);
  return data;
}

export async function getSharedSummary(token: string): Promise<SummaryResponse> {
  const { data } = await api.get<SummaryResponse>(`/api/share/${token}/summary`);
  return data;
}
