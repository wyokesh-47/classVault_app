import { createHash, randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { ApiError, getRequiredUserId, throwDatabaseError } from "./errors";
import { requireAuth } from "./middleware/require-auth";
import { supabase } from "./supabase";

const router = Router();
const groupTypes = ["subject", "class", "general"] as const;
const groupRoles = ["student", "rep", "staff"] as const;
const materialTypes = ["pdf", "ppt", "youtube", "zoom", "text"] as const;

const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(60),
  groupType: z.enum(groupTypes),
  description: z.string().trim().max(180).optional(),
  shortCode: z.string().trim().max(30).optional(),
  subjectCode: z.string().trim().max(40).optional(),
  facultyName: z.string().trim().max(100).optional(),
});

const createMessageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

const createMaterialSchema = z.object({
  title: z.string().trim().min(1).max(160),
  materialType: z.enum(materialTypes),
  url: z.string().url().max(2048),
  retentionLabel: z.string().trim().max(80).optional(),
});

const createInviteSchema = z.object({
  expiresInDays: z.number().int().min(1).max(90).default(7),
  maxUses: z.number().int().min(1).max(1000).nullable().default(null),
});

const joinInviteSchema = z.object({
  code: z.string().trim().min(32).max(128),
});

function readBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      "INVALID_REQUEST",
      parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")
    );
  }
  return parsed.data;
}

function readGroupId(value: string): string {
  const parsed = z.string().uuid().safeParse(value);
  if (!parsed.success) {
    throw new ApiError(400, "INVALID_GROUP_ID", "The group ID must be a UUID.");
  }
  return parsed.data;
}

async function ensureProfile(userId: string, email: string | undefined, metadata: unknown) {
  const profileMetadata =
    typeof metadata === "object" && metadata !== null
      ? (metadata as Record<string, unknown>)
      : {};
  const nameFromMetadata =
    profileMetadata.full_name ?? profileMetadata.name ?? profileMetadata.display_name;
  const displayName =
    typeof nameFromMetadata === "string" && nameFromMetadata.trim()
      ? nameFromMetadata.trim().slice(0, 100)
      : email?.split("@")[0] || "ClassVault user";

  const { error } = await supabase.from("profiles").upsert(
    { id: userId, email: email ?? null, display_name: displayName },
    { onConflict: "id" }
  );

  if (error) {
    throwDatabaseError(error);
  }
}

async function requireMembership(groupId: string, userId: string) {
  const { data, error } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throwDatabaseError(error);
  }
  if (!data) {
    throw new ApiError(403, "GROUP_MEMBERSHIP_REQUIRED", "You are not a member of this group.");
  }
  return data.role as (typeof groupRoles)[number];
}

async function requireManager(groupId: string, userId: string) {
  const role = await requireMembership(groupId, userId);
  if (role !== "rep" && role !== "staff") {
    throw new ApiError(403, "GROUP_MANAGER_REQUIRED", "A group rep or staff member is required.");
  }
  return role;
}

router.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

router.use("/api", requireAuth);

router.get("/api/groups", async (request, response) => {
  const userId = getRequiredUserId(request.user?.id);
  const { data: memberships, error: membershipError } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId);

  if (membershipError) {
    throwDatabaseError(membershipError);
  }

  const groupIds = [...new Set((memberships ?? []).map((membership) => membership.group_id))];
  if (groupIds.length === 0) {
    response.json({ groups: [] });
    return;
  }

  const { data: groups, error: groupsError } = await supabase
    .from("groups")
    .select(
      "id, name, group_type, short_code, subject_code, faculty_name, description, summary, icon_key, color_hex, created_at"
    )
    .in("id", groupIds)
    .order("created_at", { ascending: false });

  const { data: groupMembers, error: groupMembersError } = await supabase
    .from("group_members")
    .select("group_id, user_id, role, profiles(display_name)")
    .in("group_id", groupIds);

  if (groupsError || groupMembersError) {
    throwDatabaseError(groupsError ?? groupMembersError);
  }
  response.json({
    groups: (groups ?? []).map((group) => ({
      ...group,
      group_members: (groupMembers ?? [])
        .filter((member) => member.group_id === group.id)
        .map((member) => ({
          user_id: member.user_id,
          role: member.role,
          profiles: member.profiles,
        })),
    })),
  });
});

router.get("/api/activity", async (request, response) => {
  const userId = getRequiredUserId(request.user?.id);
  const { data: memberships, error: membershipError } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId);

  if (membershipError) {
    throwDatabaseError(membershipError);
  }
  const groupIds = [...new Set((memberships ?? []).map((membership) => membership.group_id))];
  if (groupIds.length === 0) {
    response.json({ messages: [], materials: [] });
    return;
  }

  const now = new Date().toISOString();
  const [messagesResult, materialsResult] = await Promise.all([
    supabase
      .from("messages")
      .select("id, group_id, author_id, author_role, body, is_pinned, is_important, expires_at, preserved_at, preserved_by, created_at, profiles!messages_author_id_fkey(display_name), preserved_profile:profiles!messages_preserved_by_fkey(display_name)")
      .in("group_id", groupIds)
      .or(`expires_at.is.null,expires_at.gt.${now},preserved_at.not.is.null`)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("materials")
      .select("id, group_id, uploaded_by, title, material_type, url, retention_label, posted_at, profiles!materials_uploaded_by_fkey(display_name)")
      .in("group_id", groupIds)
      .order("posted_at", { ascending: false })
      .limit(20),
  ]);

  if (messagesResult.error || materialsResult.error) {
    throwDatabaseError(messagesResult.error ?? materialsResult.error);
  }
  response.json({
    messages: messagesResult.data ?? [],
    materials: materialsResult.data ?? [],
  });
});

router.post("/api/groups", async (request, response) => {
  const user = request.user;
  const userId = getRequiredUserId(user?.id);
  const input = readBody(createGroupSchema, request.body);
  await ensureProfile(userId, user?.email, user?.user_metadata);

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({
      name: input.name,
      group_type: input.groupType,
      description: input.description || null,
      summary: input.description || null,
      short_code: input.shortCode || null,
      subject_code: input.subjectCode || null,
      faculty_name: input.facultyName || null,
      created_by: userId,
    })
    .select()
    .single();

  if (groupError || !group) {
    throwDatabaseError(groupError);
  }

  const { error: membershipError } = await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: userId,
    role: "rep",
  });

  if (membershipError) {
    const { error: rollbackError } = await supabase.from("groups").delete().eq("id", group.id);
    if (rollbackError) {
      console.error("Failed to clean up a group after membership creation failed.", {
        code: rollbackError.code,
        message: rollbackError.message,
      });
    }
    throwDatabaseError(membershipError);
  }

  response.status(201).json({ group });
});

router.get("/api/groups/:groupId/messages", async (request, response) => {
  const userId = getRequiredUserId(request.user?.id);
  const groupId = readGroupId(request.params.groupId);
  const role = await requireMembership(groupId, userId);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("messages")
    .select("id, group_id, author_id, author_role, body, is_pinned, is_important, expires_at, preserved_at, preserved_by, created_at, profiles!messages_author_id_fkey(display_name), preserved_profile:profiles!messages_preserved_by_fkey(display_name)")
    .eq("group_id", groupId)
    .or(`expires_at.is.null,expires_at.gt.${now},preserved_at.not.is.null`)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throwDatabaseError(error);
  }
  response.json({ role, messages: data ?? [] });
});

router.post("/api/groups/:groupId/messages", async (request, response) => {
  const user = request.user;
  const userId = getRequiredUserId(user?.id);
  const groupId = readGroupId(request.params.groupId);
  const role = await requireMembership(groupId, userId);
  const input = readBody(createMessageSchema, request.body);
  const expiresAt =
    role === "student"
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : null;

  const { data, error } = await supabase
    .from("messages")
    .insert({
      group_id: groupId,
      author_id: userId,
      author_role: role,
      body: input.body,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error || !data) {
    throwDatabaseError(error);
  }
  response.status(201).json({ message: data });
});

router.get("/api/groups/:groupId/materials", async (request, response) => {
  const userId = getRequiredUserId(request.user?.id);
  const groupId = readGroupId(request.params.groupId);
  await requireMembership(groupId, userId);

  const { data, error } = await supabase
    .from("materials")
    .select("id, group_id, uploaded_by, title, material_type, url, retention_label, posted_at, profiles!materials_uploaded_by_fkey(display_name)")
    .eq("group_id", groupId)
    .order("posted_at", { ascending: false });

  if (error) {
    throwDatabaseError(error);
  }
  response.json({ materials: data ?? [] });
});

router.post("/api/groups/:groupId/materials", async (request, response) => {
  const userId = getRequiredUserId(request.user?.id);
  const groupId = readGroupId(request.params.groupId);
  await requireManager(groupId, userId);
  const input = readBody(createMaterialSchema, request.body);

  const { data, error } = await supabase
    .from("materials")
    .insert({
      group_id: groupId,
      uploaded_by: userId,
      title: input.title,
      material_type: input.materialType,
      url: input.url,
      retention_label: input.retentionLabel || null,
    })
    .select()
    .single();

  if (error || !data) {
    throwDatabaseError(error);
  }
  response.status(201).json({ material: data });
});

router.post("/api/groups/:groupId/invites", async (request, response) => {
  const userId = getRequiredUserId(request.user?.id);
  const groupId = readGroupId(request.params.groupId);
  await requireManager(groupId, userId);
  const input = readBody(createInviteSchema, request.body);
  const code = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("group_invites")
    .insert({
      group_id: groupId,
      token_hash: tokenHash,
      created_by: userId,
      expires_at: expiresAt,
      max_uses: input.maxUses,
    })
    .select("id, group_id, expires_at, max_uses, created_at")
    .single();

  if (error || !data) {
    throwDatabaseError(error);
  }
  response.status(201).json({ invite: { ...data, code } });
});

router.post("/api/invites/join", async (request, response) => {
  const user = request.user;
  const userId = getRequiredUserId(user?.id);
  const input = readBody(joinInviteSchema, request.body);
  await ensureProfile(userId, user?.email, user?.user_metadata);
  const tokenHash = createHash("sha256").update(input.code).digest("hex");

  const { data, error } = await supabase.rpc("consume_group_invite", {
    p_token_hash: tokenHash,
    p_user_id: userId,
  });

  if (error) {
    if (error.message.includes("invite_not_found")) {
      throw new ApiError(404, "INVITE_NOT_FOUND", "This invite code is invalid.");
    }
    if (error.message.includes("invite_expired")) {
      throw new ApiError(410, "INVITE_EXPIRED", "This invite code has expired.");
    }
    if (error.message.includes("invite_limit_reached")) {
      throw new ApiError(410, "INVITE_LIMIT_REACHED", "This invite code has reached its use limit.");
    }
    if (error.message.includes("already_a_member")) {
      throw new ApiError(409, "ALREADY_A_MEMBER", "You already belong to this group.");
    }
    throwDatabaseError(error);
  }

  response.status(201).json({ groupId: data });
});

export { router };
