import type { SupabaseClient } from "@supabase/supabase-js";

export type VaultArtifactCategory =
  | "care_document"
  | "insurance_card"
  | "instructions"
  | "medication_photo"
  | "other"
  | "referral";
export type VaultArtifactVisibility = "family_visible" | "private";
export type VaultArtifactAttachmentStatus = "attached" | "revoked" | "unattached";
export type VaultArtifactStatus =
  | "access_changed"
  | "attached"
  | "boundary_unavailable"
  | "created"
  | "denied"
  | "duplicate_request"
  | "empty"
  | "invalid_request"
  | "ready"
  | "stale_permission_context"
  | "unavailable"
  | "unsupported_artifact_type";

export type VaultArtifactProjection = {
  artifactAlias: string | null;
  artifactCategory: VaultArtifactCategory | null;
  attachmentStatus: VaultArtifactAttachmentStatus | null;
  capabilityKeys: string[];
  count: number;
  createdTimeBucket: string | null;
  permissionVersion: string | null;
  result: string | null;
  status: VaultArtifactStatus;
  visibilityCategory: VaultArtifactVisibility | null;
};

export type VaultArtifactSummary = {
  capabilityKeys: string[];
  count: number;
  permissionVersion: string | null;
  result: string | null;
  status: VaultArtifactStatus;
};

export type VaultArtifactAdvisory = {
  capabilityKeys: string[];
  permissionVersion: string | null;
  status: VaultArtifactStatus;
};

type RpcRow = Record<string, unknown>;

const ARTIFACT_CATEGORIES: VaultArtifactCategory[] = [
  "care_document",
  "medication_photo",
  "insurance_card",
  "referral",
  "instructions",
  "other",
];
const VISIBILITY_CATEGORIES: VaultArtifactVisibility[] = ["family_visible", "private"];
const ATTACHMENT_STATUSES: VaultArtifactAttachmentStatus[] = ["attached", "revoked", "unattached"];
const STATUSES: VaultArtifactStatus[] = [
  "access_changed",
  "attached",
  "boundary_unavailable",
  "created",
  "denied",
  "duplicate_request",
  "empty",
  "invalid_request",
  "ready",
  "stale_permission_context",
  "unavailable",
  "unsupported_artifact_type",
];

export async function getArtifactAccessAdvisorySummary({
  client,
  permissionVersion,
}: {
  client: SupabaseClient;
  permissionVersion?: string | null;
}): Promise<VaultArtifactAdvisory> {
  const row = await callFirstRpcRow(client, "get_artifact_access_advisory_summary", {
    permission_version: permissionVersion,
  });

  return {
    capabilityKeys: readStringArray(row?.capability_keys),
    permissionVersion: readString(row?.permission_version),
    status: readStatus(row?.status),
  };
}

export async function getVaultArtifactSummary({
  client,
  permissionVersion,
}: {
  client: SupabaseClient;
  permissionVersion?: string | null;
}): Promise<VaultArtifactSummary> {
  const row = await callFirstRpcRow(client, "get_vault_artifact_summary", {
    permission_version: permissionVersion,
  });

  return {
    capabilityKeys: readStringArray(row?.capability_keys),
    count: readCount(row?.count),
    permissionVersion: readString(row?.permission_version),
    result: readString(row?.result),
    status: readStatus(row?.status),
  };
}

export async function listVaultArtifacts({
  client,
  limit = 20,
  permissionVersion,
}: {
  client: SupabaseClient;
  limit?: number;
  permissionVersion?: string | null;
}): Promise<VaultArtifactProjection[]> {
  const rows = await callRpcRows(client, "list_vault_artifacts", {
    limit,
    permission_version: permissionVersion,
  });

  return rows.map(readArtifactProjection);
}

export async function createVaultArtifactPlaceholder({
  artifactCategory,
  client,
  permissionVersion,
  visibilityCategory,
}: {
  artifactCategory: VaultArtifactCategory;
  client: SupabaseClient;
  permissionVersion?: string | null;
  visibilityCategory: VaultArtifactVisibility;
}): Promise<VaultArtifactProjection> {
  const row = await callFirstRpcRow(client, "create_vault_artifact_placeholder", {
    artifact_category: artifactCategory,
    permission_version: permissionVersion,
    visibility_category: visibilityCategory,
  });

  return readArtifactProjection(row);
}

export async function attachVaultArtifactToTimeline({
  artifactAlias,
  client,
  permissionVersion,
}: {
  artifactAlias: string;
  client: SupabaseClient;
  permissionVersion?: string | null;
}): Promise<VaultArtifactProjection> {
  const row = await callFirstRpcRow(client, "attach_vault_artifact_to_timeline", {
    artifact_alias: artifactAlias,
    permission_version: permissionVersion,
  });

  return readArtifactProjection(row);
}

export function isVaultArtifactCategory(value: string): value is VaultArtifactCategory {
  return ARTIFACT_CATEGORIES.includes(value as VaultArtifactCategory);
}

export function isVaultArtifactVisibility(value: string): value is VaultArtifactVisibility {
  return VISIBILITY_CATEGORIES.includes(value as VaultArtifactVisibility);
}

async function callRpcRows(
  client: SupabaseClient,
  fn: string,
  request: Record<string, unknown>,
): Promise<RpcRow[]> {
  const compactRequest = Object.fromEntries(
    Object.entries(request).filter(([, value]) => value !== null && value !== undefined),
  );
  const { data, error } = await client.rpc(fn, { p_request: compactRequest });

  if (error || !Array.isArray(data)) {
    return [
      {
        capability_keys: [],
        count: 0,
        permission_version: null,
        result: null,
        status: "unavailable",
      },
    ];
  }

  return data as RpcRow[];
}

async function callFirstRpcRow(
  client: SupabaseClient,
  fn: string,
  request: Record<string, unknown>,
): Promise<RpcRow | null> {
  const rows = await callRpcRows(client, fn, request);
  return rows[0] ?? null;
}

function readArtifactProjection(row: RpcRow | null): VaultArtifactProjection {
  return {
    artifactAlias: readString(row?.artifact_alias),
    artifactCategory: readOneOf(row?.artifact_category, ARTIFACT_CATEGORIES),
    attachmentStatus: readOneOf(row?.attachment_status, ATTACHMENT_STATUSES),
    capabilityKeys: readStringArray(row?.capability_keys),
    count: readCount(row?.count),
    createdTimeBucket: readString(row?.created_time_bucket),
    permissionVersion: readString(row?.permission_version),
    result: readString(row?.result),
    status: readStatus(row?.status),
    visibilityCategory: readOneOf(row?.visibility_category, VISIBILITY_CATEGORIES),
  };
}

function readCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readOneOf<T extends string>(value: unknown, acceptedValues: T[]): T | null {
  return typeof value === "string" && acceptedValues.includes(value as T) ? (value as T) : null;
}

function readStatus(value: unknown): VaultArtifactStatus {
  return readOneOf(value, STATUSES) ?? "unavailable";
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
