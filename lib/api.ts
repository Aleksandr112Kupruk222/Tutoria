import type { Lesson } from "./lessons";
export interface Folder {
  id: string;
  name: string;
  description: string;
  color: "cyan" | "magenta" | "green";
  teacher?: string;
}
export interface Entry {
  id: string;
  folderId: string;
  lesson: Lesson;
  revision: number;
  published: boolean;
}
export interface Catalog {
  folders: Folder[];
  lessons: Entry[];
}
export interface Session {
  user: { id: string; name: string; username: string; mustChange: boolean };
  youtube: {
    configured: boolean;
    connection: { channel_id: string; channel_title: string } | null;
  };
}
export async function api<T>(
  path: string,
  data?: unknown,
  method = "POST",
): Promise<T> {
  const r = await fetch(path, {
    method: data === undefined ? "GET" : method,
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
    cache: "no-store",
  });
  const content = await r
    .json()
    .catch(() => ({
      error:
        "The content service is not running. Start the complete app server.",
    }));
  if (!r.ok) {
    const e = new Error(
      (content as { error?: string }).error || "Request failed",
    ) as Error & { status: number };
    e.status = r.status;
    throw e;
  }
  return content as T;
}
