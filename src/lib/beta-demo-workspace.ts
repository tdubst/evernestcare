import type { VaultArtifactProjection } from "@/lib/persistence/vault-artifacts-repository";
import type { HydratedCareBoundary } from "@/lib/permissions/care-boundary-repository";
import type {
  CareCircleInvitationSummary,
  CareCircleMemberSummary,
  CareCirclePermissionSummary,
  CareCirclePreviewResult,
  CareCircleSummaryResult,
} from "@/lib/permissions/care-circle-repository";

export const BETA_DEMO_PERMISSION_VERSION = "beta-preview-v0.1.0";

export const BETA_DEMO_BOUNDARY: HydratedCareBoundary = {
  activeCareRecipientId: "beta-preview-recipient",
  activeCareTeamId: "beta-preview-team",
  appUserId: "beta-preview-user",
  careNoteAccess: {
    canAppend: true,
    canView: true,
    status: "ready",
  },
  grants: [
    "care_event.view",
    "care_note.append",
    "care_note.view",
    "document.manage",
    "document.upload",
    "document.view",
    "invitation.manage",
    "permissions.manage",
    "team.view",
  ],
  membershipId: "beta-preview-membership",
  membershipStatus: "active",
  permissionVersion: BETA_DEMO_PERMISSION_VERSION,
  roleKey: "care_lead",
};

export const BETA_DEMO_VAULT_CAPABILITIES = ["document.view", "document.upload", "document.manage"];

export const BETA_DEMO_VAULT_ARTIFACTS: VaultArtifactProjection[] = [
  {
    artifactAlias: "beta-placeholder-care-document",
    artifactCategory: "care_document",
    attachmentStatus: "attached",
    capabilityKeys: BETA_DEMO_VAULT_CAPABILITIES,
    count: 2,
    createdTimeBucket: "this_week",
    permissionVersion: BETA_DEMO_PERMISSION_VERSION,
    result: "available",
    status: "ready",
    visibilityCategory: "family_visible",
  },
  {
    artifactAlias: "beta-placeholder-instructions",
    artifactCategory: "instructions",
    attachmentStatus: "unattached",
    capabilityKeys: BETA_DEMO_VAULT_CAPABILITIES,
    count: 2,
    createdTimeBucket: "today",
    permissionVersion: BETA_DEMO_PERMISSION_VERSION,
    result: "available",
    status: "ready",
    visibilityCategory: "family_visible",
  },
];

export const BETA_DEMO_CARE_CIRCLE_MEMBERS: CareCircleMemberSummary[] = [
  {
    capabilityCategories: [
      { access: "can_help_coordinate", category: "coordination" },
      { access: "visible", category: "care_circle" },
    ],
    membershipStatus: "active",
    roleCategory: "care_lead",
    subjectAlias: "current_user",
  },
  {
    capabilityCategories: [
      { access: "read_only", category: "care_circle" },
      { access: "limited", category: "privacy" },
    ],
    membershipStatus: "active",
    roleCategory: "family",
    subjectAlias: "member_1",
  },
  {
    capabilityCategories: [
      { access: "read_only", category: "care_circle" },
      { access: "limited", category: "privacy" },
    ],
    membershipStatus: "active",
    roleCategory: "viewer",
    subjectAlias: "member_2",
  },
];

export const BETA_DEMO_CARE_CIRCLE_INVITATIONS: CareCircleInvitationSummary[] = [
  {
    audienceCategory: "family_coordination",
    capabilityCategories: [
      { access: "can_help_coordinate", category: "coordination" },
      { access: "visible", category: "care_circle" },
    ],
    expiresIn: "7_days",
    expiryStatus: "active",
    invitePreviewId: "beta-preview-invite",
    inviteStatus: "pending",
    roleCategory: "family",
  },
];

export const BETA_DEMO_CARE_CIRCLE_PERMISSIONS: CareCirclePermissionSummary[] = [
  {
    accessState: "allowed",
    capabilityCategory: "care_circle",
    capabilityKey: "team.view",
    result: "allowed",
    roleCategory: "care_lead",
    sourceScope: "beta_preview",
  },
  {
    accessState: "allowed",
    capabilityCategory: "coordination",
    capabilityKey: "invitation.manage",
    result: "allowed",
    roleCategory: "care_lead",
    sourceScope: "beta_preview",
  },
  {
    accessState: "allowed",
    capabilityCategory: "privacy",
    capabilityKey: "permissions.manage",
    result: "allowed",
    roleCategory: "care_lead",
    sourceScope: "beta_preview",
  },
];

export const BETA_DEMO_CARE_CIRCLE_SUMMARY: CareCircleSummaryResult = {
  advisoryPermissions: BETA_DEMO_CARE_CIRCLE_PERMISSIONS,
  careCircle: BETA_DEMO_CARE_CIRCLE_MEMBERS,
  pendingInvitations: BETA_DEMO_CARE_CIRCLE_INVITATIONS,
  permissionVersion: BETA_DEMO_PERMISSION_VERSION,
  status: "ready",
};

export const BETA_DEMO_INVITE_PREVIEW: CareCirclePreviewResult = {
  audienceCategory: "family_coordination",
  capabilityCategories: [
    { access: "can_help_coordinate", category: "coordination" },
    { access: "visible", category: "care_circle" },
  ],
  expiresIn: "7_days",
  expiryStatus: "active",
  permissionVersion: BETA_DEMO_PERMISSION_VERSION,
  roleCategory: "family",
  status: "ready",
};
