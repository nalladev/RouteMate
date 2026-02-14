export const COMMUNITY_INVITE_PRESET_HOURS = [1, 6, 24, 72, 168] as const;

export type CommunityInvitePresetHours = (typeof COMMUNITY_INVITE_PRESET_HOURS)[number];

export const PENDING_COMMUNITY_INVITE_TOKEN_KEY = 'pendingCommunityInviteToken';
