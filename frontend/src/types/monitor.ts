export type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface Monitor {
  id: number;
  user_id: number;
  name: string;
  url: string;
  method: HTTPMethod;
  expected_status_code: number;
  check_interval_seconds: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type MonitorCreate = Omit<Monitor, "id" | "user_id" | "created_at" | "updated_at">;
export type MonitorUpdate = Partial<MonitorCreate>;
