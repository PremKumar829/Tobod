export type AdminRole = 'level_1_owner' | 'level_2_admin' | 'level_3_moderator';

export type GroupStatus = 'open' | 'closed';

export type AutoApproveMode = 'always' | 'only_when_open' | 'manual';

export type SpecialFontStyle = 'bold_serif' | 'bold_sans' | 'script' | 'double_struck' | 'monospace' | 'normal';

export interface ManagedGroup {
  id: string;
  groupId: string;
  title: string;
  inviteLink?: string;
  status: GroupStatus;
  isActive: boolean;
  createdAt: string;
  memberCount?: number;
  pendingRequestsCount?: number;
}

export interface AdminPermissions {
  canViewAnalytics: boolean;
  canRemoveMembers: boolean;
  canBroadcast: boolean;
  canApproveRequests: boolean;
  canExportReports: boolean;
  canChangeSchedule: boolean;
  canManageAdmins: boolean;
  canChangeCredentials: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  username: string;
  role: AdminRole;
  pin: string;
  telegramUserId?: string;
  permissions: AdminPermissions;
  createdAt: string;
  lastLoginAt: string;
}

export interface ScheduleSlot {
  id: string;
  label: string;
  name?: string;
  openTime: string; // "HH:MM"
  closeTime: string; // "HH:MM"
  enabled: boolean;
}

export interface BotConfig {
  botToken: string;
  botUsername: string;
  botFirstName: string;
  groupId: string;
  groupTitle: string;
  ownerChatId: string;
  ownerUsername: string;
  
  // Schedule settings
  scheduleEnabled: boolean;
  openTime: string; // "HH:MM" e.g. "09:00"
  closeTime: string; // "HH:MM" e.g. "21:00"
  timezone: string; // e.g. "Asia/Kolkata", "UTC", "America/New_York"
  activeDays: number[]; // 0-6 (0 = Sunday)
  scheduleSlots?: ScheduleSlot[]; // Multiple schedule windows per day
  dailyMidnightResetTimezone?: string; // e.g. 'Asia/Kolkata' (IST)
  
  // Automation settings
  currentGroupStatus: GroupStatus;
  manualOverride: boolean;
  autoApproveMode: AutoApproveMode;
  closedNoticeMessage: string;
  openedNoticeMessage: string;
  lockChatWhenClosed: boolean;
  notifyOwnerOnJoinRequest: boolean;

  // Welcome message settings (User-requested special font: 𝐖𝐞𝐥𝐜𝐨𝐦𝐞 𝐭𝐨 𝐆𝐫𝐨𝐮𝐩 🇮🇳🇮🇳🇮🇳! ✅)
  welcomeMessageEnabled: boolean;
  welcomeMessageTemplate: string;
  welcomeMessageFont: SpecialFontStyle;
  welcomeMessageDestination: 'group' | 'dm' | 'both';

  // Link filter & Anti-Abuse moderation
  linkFilterEnabled: boolean;
  linkFilterAction: 'delete' | 'delete_warn';
  linkFilterWhitelistAdmins: boolean;
  linkFilterWarnText: string;

  abuseFilterEnabled: boolean;
  abuseFilterWords: string[];
  abuseFilterAction: 'delete' | 'delete_warn';
  abuseFilterWarnText: string;

  // Multi-group management
  managedGroups?: ManagedGroup[];
  
  // Access Control & Command Permissions (Owner & Admin Only)
  adminOnlyCommands: boolean;
  nonAdminResponseMode: 'silent' | 'alert_dm';
  autoDeleteUnauthorizedCommands: boolean;

  // Connection settings
  connectionMode: 'polling' | 'webhook' | 'simulator';
  webhookUrl?: string;
  isBotRunning: boolean;
  lastScheduleCheck: string;
}

export type MemberStatus = 'active' | 'exited' | 'banned';

export interface MemberEvent {
  id: string;
  type: 'join' | 'exit' | 'rejoin' | 'request_created' | 'request_approved' | 'request_rejected';
  timestamp: string;
  details: string;
}

export interface Member {
  telegramId: string;
  username: string;
  firstName: string;
  lastName: string;
  joinCount: number;
  isRejoined: boolean;
  firstJoinedAt: string;
  lastJoinedAt: string;
  lastExitedAt?: string;
  status: MemberStatus;
  history: MemberEvent[];
}

export interface JoinRequest {
  id: string;
  telegramId: string;
  username: string;
  firstName: string;
  lastName: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  isRejoin: boolean;
  previousJoinCount: number;
  firstSeenAt?: string;
  previousExitsCount: number;
  processedAt?: string;
  processedBy?: string; // 'auto_schedule' | 'auto_instant' | adminName
  groupStatusAtRequest: GroupStatus;
  notifiedOwner: boolean;
  groupId?: string;
  groupTitle?: string;
}

export interface Announcement {
  id: string;
  title: string;
  text: string;
  parseMode: 'Markdown' | 'HTML' | 'Plain';
  pinMessage: boolean;
  silentNotification: boolean;
  targetChatId: string;
  status: 'sent' | 'failed' | 'scheduled';
  sentAt: string;
  sentBy: string;
  telegramMessageId?: number;
  recipientCount?: number;
}

export interface OwnerNotification {
  id: string;
  timestamp: string;
  telegramId: string;
  fullName: string;
  username: string;
  isRejoin: boolean;
  joinCount: number;
  previousExitsCount: number;
  firstSeenAt?: string;
  previousTenure?: string;
  groupStatus: GroupStatus;
  actionTaken: string;
  sentToTelegram: boolean;
  rawSummary: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  type: 'join_request' | 'approval' | 'rejection' | 'schedule_transition' | 'announcement' | 'admin_action' | 'bot_status' | 'automod';
  action: string;
  description: string;
  actor: string;
  success: boolean;
  metadata?: Record<string, unknown>;
}

export interface DailyHistoryRecord {
  date: string; // "YYYY-MM-DD" in Asia/Kolkata (IST)
  dateLabel: string; // e.g. "20 Sep 2026"
  joinsCount: number;
  exitsCount: number;
  netGrowth: number; // joins - exits
  newMembersCount: number;
  rejoinsCount: number;
  approvalsCount: number;
  isToday?: boolean;
  isYesterday?: boolean;
}

export interface DashboardMetrics {
  todayJoiningCount: number;
  todayExitingCount: number;
  newMembersCount: number;
  uniqueRejoinedCount: number;
  
  // Yesterday (Indian Time - IST)
  yesterdayJoiningCount: number;
  yesterdayExitingCount: number;
  yesterdayNewMembersCount: number;
  yesterdayRejoinedCount: number;

  // Calendar dates
  todayDateIst: string;
  yesterdayDateIst: string;
  dailyHistory: DailyHistoryRecord[];

  pendingRequestsCount: number;
  totalActiveMembers: number;
  totalHistoricalMembers: number;
  currentGroupStatus: GroupStatus;
  nextScheduleEvent: {
    type: 'open' | 'close';
    timeString: string;
    countdownMinutes: number;
  };
  hourlyStats: {
    hour: string;
    joins: number;
    exits: number;
  }[];
  recentRequests: JoinRequest[];
  recentOwnerNotifications: OwnerNotification[];
}
