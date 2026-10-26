import { getPublicConfig } from "./public-config";

const apiUrl = getPublicConfig("EXPO_PUBLIC_API_URL", process.env.EXPO_PUBLIC_API_URL)?.replace(/\/+$/, "");

export type ApiGroup = {
  id: string;
  name: string;
  group_type: "subject" | "class" | "general";
  short_code: string | null;
  subject_code: string | null;
  faculty_name: string | null;
  description: string | null;
  summary: string | null;
  icon_key: string | null;
  color_hex: string | null;
  created_at: string;
  group_members: {
    user_id: string;
    role: "student" | "rep" | "staff";
    profiles: { display_name: string } | { display_name: string }[] | null;
  }[];
};

export type ApiMessage = {
  id: string;
  group_id: string;
  author_id: string | null;
  author_role: "student" | "rep" | "staff";
  body: string;
  is_pinned: boolean;
  is_important: boolean;
  expires_at: string | null;
  preserved_at: string | null;
  preserved_by: string | null;
  preserved_profile: { display_name: string } | { display_name: string }[] | null;
  created_at: string;
  profiles: { display_name: string } | { display_name: string }[] | null;
};

export type ApiMaterial = {
  id: string;
  group_id: string;
  uploaded_by: string | null;
  title: string;
  material_type: "pdf" | "ppt" | "youtube" | "zoom" | "text";
  url: string;
  retention_label: string | null;
  posted_at: string;
  profiles: { display_name: string } | { display_name: string }[] | null;
};

export type ApiActivity = {
  messages: ApiMessage[];
  materials: ApiMaterial[];
};

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, accessToken: string, options: RequestInit = {}): Promise<T> {
  if (!apiUrl) {
    throw new ApiError("Set EXPO_PUBLIC_API_URL in the Expo .env file or Hugging Face Space Variables.", 0);
  }

  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      "The ClassVault backend is temporarily unavailable or unreachable. The Hugging Face Space may be paused or offline. Please try again later.",
      0
    );
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "error" in payload
        ? (payload as { error?: { message?: string } }).error?.message
        : undefined;
    if (response.status >= 500 && !message) {
      throw new ApiError(
        `The ClassVault backend is temporarily unavailable (HTTP ${response.status}). The Hugging Face Space may be paused. Please try again after it is running.`,
        response.status
      );
    }
    throw new ApiError(message || `The API request failed (${response.status}).`, response.status);
  }

  return payload as T;
}

export const classVaultApi = {
  getGroups(accessToken: string) {
    return request<{ groups: ApiGroup[] }>("/api/groups", accessToken);
  },

  getActivity(accessToken: string) {
    return request<ApiActivity>("/api/activity", accessToken);
  },

  getGroupMessages(accessToken: string, groupId: string) {
    return request<{ messages: ApiMessage[] }>(
      `/api/groups/${encodeURIComponent(groupId)}/messages`,
      accessToken
    );
  },

  getGroupMaterials(accessToken: string, groupId: string) {
    return request<{ materials: ApiMaterial[] }>(
      `/api/groups/${encodeURIComponent(groupId)}/materials`,
      accessToken
    );
  },

  createGroup(
    accessToken: string,
    input: { name: string; groupType: "subject" | "class" | "general"; description?: string }
  ) {
    return request<{ group: ApiGroup }>("/api/groups", accessToken, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  createMessage(accessToken: string, groupId: string, body: string) {
    return request<{ message: ApiMessage }>(
      `/api/groups/${encodeURIComponent(groupId)}/messages`,
      accessToken,
      { method: "POST", body: JSON.stringify({ body }) }
    );
  },

  createInvite(accessToken: string, groupId: string) {
    return request<{ invite: { code: string; expires_at: string } }>(
      `/api/groups/${encodeURIComponent(groupId)}/invites`,
      accessToken,
      { method: "POST", body: JSON.stringify({}) }
    );
  },

  joinInvite(accessToken: string, code: string) {
    return request<{ groupId: string }>("/api/invites/join", accessToken, {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },
};
