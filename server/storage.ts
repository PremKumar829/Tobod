import fs from 'fs';
import path from 'path';
import {
  AdminUser,
  AdminRole,
  Announcement,
  BotConfig,
  DashboardMetrics,
  DailyHistoryRecord,
  ScheduleSlot,
  JoinRequest,
  Member,
  OwnerNotification,
  ActivityLog,
  GroupStatus
} from '../src/types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// --- INDIAN STANDARD TIME (IST - Asia/Kolkata, UTC+5:30) HELPERS ---
export function getIstDateString(dateInput: string | number | Date = new Date()): string {
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d); // "YYYY-MM-DD"
}

export function getIstDateLabel(dateInput: string | number | Date = new Date()): string {
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d); // e.g. "20 Sep 2026"
}

export function getIstHour(dateInput: string | number | Date = new Date()): number {
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(d);
  const hourPart = parts.find(p => p.type === 'hour');
  return hourPart ? parseInt(hourPart.value, 10) : d.getUTCHours();
}

interface DatabaseSchema {
  config: BotConfig;
  admins: AdminUser[];
  members: Record<string, Member>;
  joinRequests: JoinRequest[];
  announcements: Announcement[];
  ownerNotifications: OwnerNotification[];
  logs: ActivityLog[];
  dailyHistory?: DailyHistoryRecord[];
}

const DEFAULT_CONFIG: BotConfig = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  botUsername: 'GroupManagerAutoBot',
  botFirstName: 'Group Master Bot',
  groupId: process.env.TELEGRAM_GROUP_ID || '-1002345678901',
  groupTitle: 'Official VIP Community',
  ownerChatId: process.env.TELEGRAM_OWNER_ID || '987654321',
  ownerUsername: 'GroupOwner',
  
  scheduleEnabled: true,
  openTime: '08:00',
  closeTime: '22:00',
  timezone: 'Asia/Kolkata',
  activeDays: [0, 1, 2, 3, 4, 5, 6],
  dailyMidnightResetTimezone: 'Asia/Kolkata',
  scheduleSlots: [
    { id: 'slot_1', label: 'Daytime Open', openTime: '08:00', closeTime: '22:00', enabled: true }
  ],
  
  currentGroupStatus: 'open',
  manualOverride: false,
  autoApproveMode: 'only_when_open',
  closedNoticeMessage: '🔒 The group is currently CLOSED for the night (Indian Standard Time: 22:00 - 08:00 IST). All incoming join requests are queued and will be automatically approved when the group opens in the morning!',
  openedNoticeMessage: '🟢 The group is now OPEN! Good morning everyone. All pending join requests have been automatically approved by the bot. Welcome new members!',
  lockChatWhenClosed: true,
  notifyOwnerOnJoinRequest: true,

  // Welcome message settings (User requested: username + Welcome to group name in special font + 🇮🇳🇮🇳🇮🇳! ✅)
  welcomeMessageEnabled: true,
  welcomeMessageTemplate: '👋 Welcome {username}! 🎉\n\n𝐖𝐞𝐥𝐜𝐨𝐦𝐞 𝐭𝐨 {group_name} 🇮🇳🇮🇳🇮🇳! ✅\n\nWe are excited to have you in the community! Please follow group rules and enjoy.',
  welcomeMessageFont: 'bold_serif',
  welcomeMessageDestination: 'group',

  // Automod: Link Filter & Anti-Abuse Filter
  linkFilterEnabled: true,
  linkFilterAction: 'delete_warn',
  linkFilterWhitelistAdmins: true,
  linkFilterWarnText: '⚠️ @{username}, links are not allowed in this group! Your message has been removed. 🛡️',

  abuseFilterEnabled: true,
  abuseFilterWords: [
    'abuse', 'scam', 'fraud', 'mc', 'bc', 'bhenchod', 'madarchod', 'chutiya',
    'gandu', 'bhosdike', 'harami', 'kutta', 'saale', 'randi', 'lund', 'lavde',
    'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'spam', 'dm for paid', 'crypto profit'
  ],
  abuseFilterAction: 'delete_warn',
  abuseFilterWarnText: '🚫 @{username}, abusive or offensive words are strictly prohibited here! Your message has been deleted. 🛡️',

  // Multi-group management
  managedGroups: [
    {
      id: 'grp_main_vip',
      groupId: process.env.TELEGRAM_GROUP_ID || '-1002345678901',
      title: 'Official VIP Community',
      inviteLink: '',
      status: 'open',
      isActive: true,
      createdAt: new Date().toISOString(),
      memberCount: 8,
    }
  ],
  
  // Access Control & Command Permissions (Owner & Admin Only)
  adminOnlyCommands: true,
  nonAdminResponseMode: 'silent',
  autoDeleteUnauthorizedCommands: true,

  connectionMode: 'simulator',
  isBotRunning: true,
  lastScheduleCheck: new Date().toISOString(),
};

const DEFAULT_ADMINS: AdminUser[] = [
  {
    id: 'admin_owner_1',
    name: 'Chief Owner',
    username: 'owner',
    role: 'level_1_owner',
    pin: '1234',
    permissions: {
      canViewAnalytics: true,
      canRemoveMembers: true,
      canBroadcast: true,
      canApproveRequests: true,
      canExportReports: true,
      canChangeSchedule: true,
      canManageAdmins: true,
      canChangeCredentials: true,
    },
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    lastLoginAt: new Date().toISOString(),
  },
  {
    id: 'admin_analyst_2',
    name: 'Alex Analyst (Level 2)',
    username: 'alex_mod',
    role: 'level_2_admin',
    pin: '5678',
    permissions: {
      canViewAnalytics: true,
      canRemoveMembers: false,
      canBroadcast: false,
      canApproveRequests: false,
      canExportReports: false,
      canChangeSchedule: false,
      canManageAdmins: false,
      canChangeCredentials: false,
    },
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    lastLoginAt: new Date().toISOString(),
  },
  {
    id: 'admin_mod_3',
    name: 'Sarah Moderator (Level 3)',
    username: 'sarah_mod',
    role: 'level_3_moderator',
    pin: '9999',
    permissions: {
      canViewAnalytics: true,
      canRemoveMembers: false,
      canBroadcast: true,
      canApproveRequests: true,
      canExportReports: false,
      canChangeSchedule: false,
      canManageAdmins: false,
      canChangeCredentials: false,
    },
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    lastLoginAt: new Date().toISOString(),
  }
];

function generateSeedData(): DatabaseSchema {
  const now = Date.now();
  const members: Record<string, Member> = {};
  const joinRequests: JoinRequest[] = [];
  const announcements: Announcement[] = [];
  const ownerNotifications: OwnerNotification[] = [];
  const logs: ActivityLog[] = [];

  // Seed sample members
  const sampleMembersList = [
    { id: '1001', user: 'sarah_tech', fn: 'Sarah', ln: 'Jenkins', count: 1, rejoined: false, daysAgo: 5, status: 'active' as const },
    { id: '1002', user: 'david_crypto', fn: 'David', ln: 'Miller', count: 3, rejoined: true, daysAgo: 1, status: 'active' as const },
    { id: '1003', user: 'elena_ro', fn: 'Elena', ln: 'Rostova', count: 2, rejoined: true, daysAgo: 0, status: 'active' as const },
    { id: '1004', user: 'michael_b', fn: 'Michael', ln: 'Brown', count: 1, rejoined: false, daysAgo: 0, status: 'active' as const },
    { id: '1005', user: 'priya_sharma', fn: 'Priya', ln: 'Sharma', count: 1, rejoined: false, daysAgo: 0, status: 'active' as const },
    { id: '1006', user: 'alexander_k', fn: 'Alexander', ln: 'King', count: 2, rejoined: true, daysAgo: 0, status: 'exited' as const },
    { id: '1007', user: 'sophie_dev', fn: 'Sophie', ln: 'Taylor', count: 1, rejoined: false, daysAgo: 2, status: 'active' as const },
    { id: '1008', user: 'lucas_m', fn: 'Lucas', ln: 'Morales', count: 1, rejoined: false, daysAgo: 0, status: 'active' as const },
  ];

  sampleMembersList.forEach(m => {
    const joinTime = new Date(now - m.daysAgo * 86400000 - Math.random() * 20000000).toISOString();
    const exitTime = m.status === 'exited' ? new Date(now - 2 * 3600000).toISOString() : undefined;
    members[m.id] = {
      telegramId: m.id,
      username: m.user,
      firstName: m.fn,
      lastName: m.ln,
      joinCount: m.count,
      isRejoined: m.rejoined,
      firstJoinedAt: new Date(now - (m.daysAgo + (m.rejoined ? 20 : 0)) * 86400000).toISOString(),
      lastJoinedAt: joinTime,
      lastExitedAt: exitTime,
      status: m.status,
      history: [
        {
          id: `evt_${m.id}_1`,
          type: 'join',
          timestamp: joinTime,
          details: m.rejoined ? `Rejoined group for the ${m.count} time` : 'Joined group as new member'
        }
      ]
    };
  });

  // Seed pending join requests
  joinRequests.push(
    {
      id: 'req_2001',
      telegramId: '1009',
      username: 'mark_investor',
      firstName: 'Mark',
      lastName: 'Vance',
      requestedAt: new Date(now - 18 * 60000).toISOString(),
      status: 'pending',
      isRejoin: false,
      previousJoinCount: 0,
      previousExitsCount: 0,
      groupStatusAtRequest: 'closed',
      notifiedOwner: true,
    },
    {
      id: 'req_2002',
      telegramId: '1002',
      username: 'david_crypto',
      firstName: 'David',
      lastName: 'Miller',
      requestedAt: new Date(now - 55 * 60000).toISOString(),
      status: 'pending',
      isRejoin: true,
      previousJoinCount: 2,
      firstSeenAt: new Date(now - 45 * 86400000).toISOString(),
      previousExitsCount: 2,
      groupStatusAtRequest: 'closed',
      notifiedOwner: true,
    },
    {
      id: 'req_2003',
      telegramId: '1010',
      username: 'claire_art',
      firstName: 'Claire',
      lastName: 'Dupont',
      requestedAt: new Date(now - 120 * 60000).toISOString(),
      status: 'approved',
      processedAt: new Date(now - 110 * 60000).toISOString(),
      processedBy: 'auto_schedule',
      isRejoin: false,
      previousJoinCount: 0,
      previousExitsCount: 0,
      groupStatusAtRequest: 'open',
      notifiedOwner: true,
    }
  );

  // Seed owner notifications
  ownerNotifications.push(
    {
      id: 'notif_1',
      timestamp: new Date(now - 18 * 60000).toISOString(),
      telegramId: '1009',
      fullName: 'Mark Vance',
      username: 'mark_investor',
      isRejoin: false,
      joinCount: 1,
      previousExitsCount: 0,
      groupStatus: 'closed',
      actionTaken: 'Held in Pending Queue (Group is Closed)',
      sentToTelegram: true,
      rawSummary: 'New first-time applicant Mark Vance requested to join while group is closed.'
    },
    {
      id: 'notif_2',
      timestamp: new Date(now - 55 * 60000).toISOString(),
      telegramId: '1002',
      fullName: 'David Miller',
      username: 'david_crypto',
      isRejoin: true,
      joinCount: 3,
      previousExitsCount: 2,
      firstSeenAt: new Date(now - 45 * 86400000).toISOString(),
      previousTenure: 'Member previously left 18 days ago after 27 days in group',
      groupStatus: 'closed',
      actionTaken: 'Held in Pending Queue (Group is Closed)',
      sentToTelegram: true,
      rawSummary: 'REJOIN ALERT: David Miller (@david_crypto) has applied for the 3rd time.'
    }
  );

  // Seed sample announcements
  announcements.push(
    {
      id: 'ann_1',
      title: 'Weekly Community AMA & Update',
      text: '🚀 *Weekly Community AMA Session*\nJoin us this Friday at 18:00 UTC for our open voice Q&A and project roadmap reveal! Drop your questions below.',
      parseMode: 'Markdown',
      pinMessage: true,
      silentNotification: false,
      targetChatId: DEFAULT_CONFIG.groupId,
      status: 'sent',
      sentAt: new Date(now - 2 * 86400000).toISOString(),
      sentBy: 'Chief Owner',
      telegramMessageId: 8492,
      recipientCount: 1420
    }
  );

  // Seed sample activity logs
  logs.push(
    {
      id: 'log_1',
      timestamp: new Date(now - 10 * 60000).toISOString(),
      type: 'bot_status',
      action: 'Scheduler Heartbeat',
      description: 'Checked group status. Schedule is operating normally.',
      actor: 'System Bot',
      success: true
    },
    {
      id: 'log_2',
      timestamp: new Date(now - 18 * 60000).toISOString(),
      type: 'join_request',
      action: 'New Join Request Received',
      description: 'Mark Vance (@mark_investor) requested to join. Sent notification to Owner.',
      actor: 'Telegram Bot',
      success: true
    },
    {
      id: 'log_3',
      timestamp: new Date(now - 55 * 60000).toISOString(),
      type: 'join_request',
      action: 'Rejoin Request Received',
      description: 'David Miller (@david_crypto) re-applied (Join #3). Owner alerted with member history.',
      actor: 'Telegram Bot',
      success: true
    },
    {
      id: 'log_4',
      timestamp: new Date(now - 110 * 60000).toISOString(),
      type: 'approval',
      action: 'Auto-Approved Join Request',
      description: 'Claire Dupont request was automatically approved during open hours.',
      actor: 'Auto Engine',
      success: true
    }
  );

  return {
    config: DEFAULT_CONFIG,
    admins: DEFAULT_ADMINS,
    members,
    joinRequests,
    announcements,
    ownerNotifications,
    logs
  };
}

class StorageManager {
  private db: DatabaseSchema;

  constructor() {
    this.ensureDirectory();
    this.db = this.loadDatabase();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch (err) {
        console.error('Error creating data dir:', err);
      }
    }
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.config && parsed.members) {
          // Merge with any new default keys
          parsed.config = { ...DEFAULT_CONFIG, ...parsed.config };
          if (!parsed.config.managedGroups || parsed.config.managedGroups.length === 0) {
            parsed.config.managedGroups = DEFAULT_CONFIG.managedGroups;
          }
          if (!parsed.config.abuseFilterWords || parsed.config.abuseFilterWords.length === 0) {
            parsed.config.abuseFilterWords = DEFAULT_CONFIG.abuseFilterWords;
          }
          if (parsed.config.welcomeMessageEnabled === undefined) {
            parsed.config.welcomeMessageEnabled = true;
          }
          if (!parsed.config.welcomeMessageTemplate) {
            parsed.config.welcomeMessageTemplate = DEFAULT_CONFIG.welcomeMessageTemplate;
          }
          if (!parsed.config.welcomeMessageFont) {
            parsed.config.welcomeMessageFont = DEFAULT_CONFIG.welcomeMessageFont;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read db.json, generating fresh seed data:', e);
    }

    const seeded = generateSeedData();
    this.saveDatabase(seeded);
    return seeded;
  }

  public saveDatabase(dataToSave?: DatabaseSchema) {
    try {
      this.ensureDirectory();
      const payload = JSON.stringify(dataToSave || this.db, null, 2);
      fs.writeFileSync(DB_FILE, payload, 'utf-8');
    } catch (e) {
      console.error('Failed to write db.json:', e);
    }
  }

  // --- CONFIG ---
  public getConfig(): BotConfig {
    return { ...this.db.config };
  }

  public updateConfig(partial: Partial<BotConfig>): BotConfig {
    this.db.config = { ...this.db.config, ...partial };
    this.saveDatabase();
    return this.getConfig();
  }

  // --- ADMINS ---
  public getAdmins(): AdminUser[] {
    return [...this.db.admins];
  }

  public getAdminById(id: string): AdminUser | undefined {
    return this.db.admins.find(a => a.id === id);
  }

  public authenticate(username: string, pin: string): AdminUser | null {
    const admin = this.db.admins.find(a => (a.username.toLowerCase() === username.toLowerCase() || a.name.toLowerCase() === username.toLowerCase()) && a.pin === pin);
    if (admin) {
      admin.lastLoginAt = new Date().toISOString();
      this.saveDatabase();
      return admin;
    }
    return null;
  }

  public saveAdmin(adminData: Partial<AdminUser> & { name: string; username: string; pin: string; role: AdminRole }): AdminUser {
    if (adminData.id) {
      const idx = this.db.admins.findIndex(a => a.id === adminData.id);
      if (idx !== -1) {
        this.db.admins[idx] = { ...this.db.admins[idx], ...adminData };
        this.saveDatabase();
        return this.db.admins[idx];
      }
    }

    const isL1 = adminData.role === 'level_1_owner';
    const isL2 = adminData.role === 'level_2_admin';

    const newAdmin: AdminUser = {
      id: `admin_${Date.now()}`,
      name: adminData.name,
      username: adminData.username,
      pin: adminData.pin,
      role: adminData.role,
      telegramUserId: adminData.telegramUserId,
      permissions: adminData.permissions || {
        canViewAnalytics: true,
        canRemoveMembers: isL1,
        canBroadcast: isL1 || adminData.role === 'level_3_moderator',
        canApproveRequests: isL1 || adminData.role === 'level_3_moderator',
        canExportReports: isL1,
        canChangeSchedule: isL1,
        canManageAdmins: isL1,
        canChangeCredentials: isL1,
      },
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    this.db.admins.push(newAdmin);
    this.saveDatabase();
    return newAdmin;
  }

  public deleteAdmin(id: string): boolean {
    const target = this.db.admins.find(a => a.id === id);
    if (!target || target.role === 'level_1_owner') {
      return false; // Cannot delete Level 1 Owner
    }
    this.db.admins = this.db.admins.filter(a => a.id !== id);
    this.saveDatabase();
    return true;
  }

  // --- MEMBERS ---
  public getMembersList(): Member[] {
    return Object.values(this.db.members);
  }

  public getMembers(): Member[] {
    return Object.values(this.db.members);
  }

  public getMember(telegramId: string): Member | undefined {
    return this.db.members[telegramId];
  }

  public recordJoin(user: { id: string | number; username?: string; first_name?: string; last_name?: string }): { member: Member; isRejoin: boolean } {
    const tid = String(user.id);
    const existing = this.db.members[tid];
    const now = new Date().toISOString();

    if (existing) {
      existing.joinCount += 1;
      existing.isRejoined = true;
      existing.lastJoinedAt = now;
      existing.status = 'active';
      if (user.username) existing.username = user.username;
      if (user.first_name) existing.firstName = user.first_name;
      if (user.last_name) existing.lastName = user.last_name;
      existing.history.push({
        id: `evt_${Date.now()}`,
        type: 'rejoin',
        timestamp: now,
        details: `Rejoined group (Join Count #${existing.joinCount})`
      });
      this.saveDatabase();
      return { member: existing, isRejoin: true };
    } else {
      const newMember: Member = {
        telegramId: tid,
        username: user.username || `user_${tid}`,
        firstName: user.first_name || 'Anonymous',
        lastName: user.last_name || '',
        joinCount: 1,
        isRejoined: false,
        firstJoinedAt: now,
        lastJoinedAt: now,
        status: 'active',
        history: [
          {
            id: `evt_${Date.now()}`,
            type: 'join',
            timestamp: now,
            details: 'First time joined group'
          }
        ]
      };
      this.db.members[tid] = newMember;
      this.saveDatabase();
      return { member: newMember, isRejoin: false };
    }
  }

  public recordExit(telegramId: string | number, username?: string): Member | null {
    const tid = String(telegramId);
    const existing = this.db.members[tid];
    const now = new Date().toISOString();

    if (existing) {
      existing.status = 'exited';
      existing.lastExitedAt = now;
      existing.history.push({
        id: `evt_${Date.now()}`,
        type: 'exit',
        timestamp: now,
        details: 'Member exited/left the group'
      });
      this.saveDatabase();
      return existing;
    } else {
      // Record unknown member who exited
      const unknownMember: Member = {
        telegramId: tid,
        username: username || `user_${tid}`,
        firstName: 'Exited Member',
        lastName: '',
        joinCount: 1,
        isRejoined: false,
        firstJoinedAt: now,
        lastJoinedAt: now,
        lastExitedAt: now,
        status: 'exited',
        history: [
          {
            id: `evt_${Date.now()}`,
            type: 'exit',
            timestamp: now,
            details: 'Observed member exit'
          }
        ]
      };
      this.db.members[tid] = unknownMember;
      this.saveDatabase();
      return unknownMember;
    }
  }

  public removeMemberFromGroup(
    telegramId: string | number,
    options: { actor: string; reason?: string; ban?: boolean }
  ): { success: boolean; member?: Member; message: string } {
    const tid = String(telegramId);
    const existing = this.db.members[tid];
    const now = new Date().toISOString();

    if (!existing) {
      return { success: false, message: `Member with Telegram ID ${telegramId} not found in database.` };
    }

    const wasActive = existing.status === 'active';
    existing.status = 'exited';
    existing.lastExitedAt = now;
    if (!existing.history) existing.history = [];

    const actionLabel = options.ban ? 'Permanently Banned' : 'Removed / Kicked';
    const reasonLabel = options.reason ? ` (Reason: ${options.reason})` : '';

    existing.history.unshift({
      id: `evt_${Date.now()}`,
      type: 'exit',
      timestamp: now,
      details: `${actionLabel} from group by Admin ${options.actor}${reasonLabel}`
    });

    this.addLog({
      timestamp: now,
      type: 'admin_action',
      action: options.ban ? 'Member Banned' : 'Member Removed',
      description: `${actionLabel} member @${existing.username || existing.telegramId} (${existing.firstName}) by ${options.actor}${reasonLabel}`,
      actor: options.actor,
      success: true,
      metadata: { telegramId: tid, reason: options.reason, ban: options.ban }
    });

    this.saveDatabase();
    return {
      success: true,
      member: existing,
      message: `Member @${existing.username || existing.telegramId} (${existing.firstName}) was successfully ${options.ban ? 'banned' : 'removed'} from the group.`
    };
  }

  // --- JOIN REQUESTS ---
  public getJoinRequests(): JoinRequest[] {
    return [...this.db.joinRequests].sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }

  public addJoinRequest(user: { id: string | number; username?: string; first_name?: string; last_name?: string }, groupId?: string | number, groupTitle?: string): {
    request: JoinRequest;
    isRejoin: boolean;
    historyStats: {
      joinCount: number;
      firstSeenAt?: string;
      previousExitsCount: number;
      previousTenure?: string;
    };
  } {
    const tid = String(user.id);
    const existing = this.db.members[tid];
    const isRejoin = !!existing && existing.joinCount > 0;
    const now = new Date().toISOString();

    const previousExitsCount = existing
      ? existing.history.filter(h => h.type === 'exit').length
      : 0;

    let previousTenure: string | undefined;
    if (existing && existing.firstJoinedAt) {
      const days = Math.round((Date.now() - new Date(existing.firstJoinedAt).getTime()) / 86400000);
      previousTenure = `Known for ${days} days (First seen: ${new Date(existing.firstJoinedAt).toLocaleDateString()})`;
    }

    const newReq: JoinRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      telegramId: tid,
      username: user.username || '',
      firstName: user.first_name || 'New',
      lastName: user.last_name || 'Member',
      requestedAt: now,
      status: 'pending',
      isRejoin,
      previousJoinCount: existing ? existing.joinCount : 0,
      firstSeenAt: existing?.firstJoinedAt,
      previousExitsCount,
      groupStatusAtRequest: this.db.config.currentGroupStatus,
      notifiedOwner: true,
      groupId: groupId ? String(groupId) : this.db.config.groupId,
      groupTitle: groupTitle || this.db.config.groupTitle,
    };

    this.db.joinRequests.unshift(newReq);
    this.saveDatabase();

    return {
      request: newReq,
      isRejoin,
      historyStats: {
        joinCount: existing ? existing.joinCount : 0,
        firstSeenAt: existing?.firstJoinedAt,
        previousExitsCount,
        previousTenure
      }
    };
  }

  public markRequestApproved(requestId: string, processedBy: string): JoinRequest | null {
    const req = this.db.joinRequests.find(r => r.id === requestId);
    if (!req) return null;
    req.status = 'approved';
    req.processedAt = new Date().toISOString();
    req.processedBy = processedBy;
    this.recordJoin({
      id: req.telegramId,
      username: req.username,
      first_name: req.firstName,
      last_name: req.lastName
    });
    this.saveDatabase();
    return req;
  }

  public markRequestRejected(requestId: string, processedBy: string): JoinRequest | null {
    const req = this.db.joinRequests.find(r => r.id === requestId);
    if (!req) return null;
    req.status = 'rejected';
    req.processedAt = new Date().toISOString();
    req.processedBy = processedBy;
    this.saveDatabase();
    return req;
  }

  public approveAllPendingRequests(processedBy: string): JoinRequest[] {
    const pending = this.db.joinRequests.filter(r => r.status === 'pending');
    const now = new Date().toISOString();
    pending.forEach(req => {
      req.status = 'approved';
      req.processedAt = now;
      req.processedBy = processedBy;
      this.recordJoin({
        id: req.telegramId,
        username: req.username,
        first_name: req.firstName,
        last_name: req.lastName
      });
    });
    this.saveDatabase();
    return pending;
  }

  // --- OWNER NOTIFICATIONS ---
  public addOwnerNotification(notif: Omit<OwnerNotification, 'id'>): OwnerNotification {
    const item: OwnerNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ...notif,
    };
    this.db.ownerNotifications.unshift(item);
    if (this.db.ownerNotifications.length > 200) {
      this.db.ownerNotifications = this.db.ownerNotifications.slice(0, 200);
    }
    this.saveDatabase();
    return item;
  }

  public getOwnerNotifications(): OwnerNotification[] {
    return [...this.db.ownerNotifications];
  }

  // --- ANNOUNCEMENTS ---
  public getAnnouncements(): Announcement[] {
    return [...this.db.announcements].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }

  public addAnnouncement(ann: Omit<Announcement, 'id'>): Announcement {
    const item: Announcement = {
      id: `ann_${Date.now()}`,
      ...ann,
    };
    this.db.announcements.unshift(item);
    this.saveDatabase();
    return item;
  }

  // --- AUDIT LOGS ---
  public addLog(log: Omit<ActivityLog, 'id'>): ActivityLog {
    const item: ActivityLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ...log,
    };
    this.db.logs.unshift(item);
    if (this.db.logs.length > 500) {
      this.db.logs = this.db.logs.slice(0, 500);
    }
    this.saveDatabase();
    return item;
  }

  public getLogs(): ActivityLog[] {
    return [...this.db.logs];
  }

  // --- METRICS & REPORTING (INDIAN STANDARD TIME - IST) ---
  public getMetrics(): DashboardMetrics {
    const membersList = Object.values(this.db.members);
    const now = new Date();
    const todayDateIst = getIstDateString(now);
    const yesterdayDateObj = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayDateIst = getIstDateString(yesterdayDateObj);

    let todayJoiningCount = 0;
    let todayExitingCount = 0;
    let newMembersCount = 0;
    let uniqueRejoinedCount = 0;

    let yesterdayJoiningCount = 0;
    let yesterdayExitingCount = 0;
    let yesterdayNewMembersCount = 0;
    let yesterdayRejoinedCount = 0;

    // Daily History accumulator for all dates
    const historyMap: Record<string, DailyHistoryRecord> = {};

    const getOrCreateHistory = (dateStr: string): DailyHistoryRecord => {
      if (!historyMap[dateStr]) {
        historyMap[dateStr] = {
          date: dateStr,
          dateLabel: getIstDateLabel(new Date(dateStr + 'T12:00:00+05:30')),
          joinsCount: 0,
          exitsCount: 0,
          netGrowth: 0,
          newMembersCount: 0,
          rejoinsCount: 0,
          approvalsCount: 0,
          isToday: dateStr === todayDateIst,
          isYesterday: dateStr === yesterdayDateIst,
        };
      }
      return historyMap[dateStr];
    };

    // Ensure today and yesterday are always represented
    getOrCreateHistory(todayDateIst);
    getOrCreateHistory(yesterdayDateIst);

    // Merge any explicitly archived daily snapshots from db
    if (Array.isArray(this.db.dailyHistory)) {
      this.db.dailyHistory.forEach(archived => {
        const entry = getOrCreateHistory(archived.date);
        entry.joinsCount = Math.max(entry.joinsCount, archived.joinsCount || 0);
        entry.exitsCount = Math.max(entry.exitsCount, archived.exitsCount || 0);
        entry.newMembersCount = Math.max(entry.newMembersCount, archived.newMembersCount || 0);
        entry.rejoinsCount = Math.max(entry.rejoinsCount, archived.rejoinsCount || 0);
        entry.approvalsCount = Math.max(entry.approvalsCount, archived.approvalsCount || 0);
        entry.netGrowth = entry.joinsCount - entry.exitsCount;
      });
    }

    membersList.forEach(m => {
      const joinDateIst = getIstDateString(m.lastJoinedAt);
      const joinRec = getOrCreateHistory(joinDateIst);
      joinRec.joinsCount++;
      if (m.isRejoined || m.joinCount > 1) {
        joinRec.rejoinsCount++;
      } else {
        joinRec.newMembersCount++;
      }
      joinRec.netGrowth = joinRec.joinsCount - joinRec.exitsCount;

      if (joinDateIst === todayDateIst) {
        todayJoiningCount++;
        if (m.isRejoined || m.joinCount > 1) {
          uniqueRejoinedCount++;
        } else {
          newMembersCount++;
        }
      } else if (joinDateIst === yesterdayDateIst) {
        yesterdayJoiningCount++;
        if (m.isRejoined || m.joinCount > 1) {
          yesterdayRejoinedCount++;
        } else {
          yesterdayNewMembersCount++;
        }
      }

      if (m.lastExitedAt) {
        const exitDateIst = getIstDateString(m.lastExitedAt);
        const exitRec = getOrCreateHistory(exitDateIst);
        exitRec.exitsCount++;
        exitRec.netGrowth = exitRec.joinsCount - exitRec.exitsCount;

        if (exitDateIst === todayDateIst) {
          todayExitingCount++;
        } else if (exitDateIst === yesterdayDateIst) {
          yesterdayExitingCount++;
        }
      }
    });

    // Count join requests in daily history
    this.db.joinRequests.forEach(r => {
      if (r.status === 'approved' && r.processedAt) {
        const procDateIst = getIstDateString(r.processedAt);
        const rec = getOrCreateHistory(procDateIst);
        rec.approvalsCount++;
      }
    });

    // Sort history with latest date first
    const dailyHistory = Object.values(historyMap).sort((a, b) => b.date.localeCompare(a.date));

    const pendingRequestsCount = this.db.joinRequests.filter(r => r.status === 'pending').length;
    const totalActiveMembers = membersList.filter(m => m.status === 'active').length;

    // Calculate hourly stats for TODAY according to Indian Standard Time (IST 00:00 to 23:00)
    const hours = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
    const currentIstH = getIstHour(now);
    
    const hourlyStats = hours.map((h, idx) => {
      const bucketHour = idx * 2;
      const isPastOrCurrent = bucketHour <= currentIstH;
      
      let joins = 0;
      let exits = 0;

      membersList.forEach(m => {
        if (getIstDateString(m.lastJoinedAt) === todayDateIst) {
          const jh = getIstHour(m.lastJoinedAt);
          if (jh >= bucketHour && jh < bucketHour + 2) joins++;
        }
        if (m.lastExitedAt && getIstDateString(m.lastExitedAt) === todayDateIst) {
          const eh = getIstHour(m.lastExitedAt);
          if (eh >= bucketHour && eh < bucketHour + 2) exits++;
        }
      });

      return {
        hour: h,
        joins: isPastOrCurrent ? joins : 0,
        exits: isPastOrCurrent ? exits : 0,
      };
    });

    // Calculate countdown to next schedule event (supports multiple slots if configured)
    const [openH, openM] = (this.db.config.openTime || '08:00').split(':').map(Number);
    const [closeH, closeM] = (this.db.config.closeTime || '22:00').split(':').map(Number);
    const currentMinutes = currentIstH * 60 + now.getMinutes();
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    let nextType: 'open' | 'close' = 'open';
    let countdownMinutes = 0;
    let timeString = '';

    if (this.db.config.currentGroupStatus === 'open') {
      nextType = 'close';
      timeString = this.db.config.closeTime;
      if (closeMinutes > currentMinutes) {
        countdownMinutes = closeMinutes - currentMinutes;
      } else {
        countdownMinutes = 1440 - currentMinutes + closeMinutes;
      }
    } else {
      nextType = 'open';
      timeString = this.db.config.openTime;
      if (openMinutes > currentMinutes) {
        countdownMinutes = openMinutes - currentMinutes;
      } else {
        countdownMinutes = 1440 - currentMinutes + openMinutes;
      }
    }

    return {
      todayJoiningCount,
      todayExitingCount,
      newMembersCount,
      uniqueRejoinedCount,
      yesterdayJoiningCount,
      yesterdayExitingCount,
      yesterdayNewMembersCount,
      yesterdayRejoinedCount,
      todayDateIst,
      yesterdayDateIst,
      dailyHistory,
      pendingRequestsCount,
      totalActiveMembers,
      totalHistoricalMembers: membersList.length,
      currentGroupStatus: this.db.config.currentGroupStatus,
      nextScheduleEvent: {
        type: nextType,
        timeString,
        countdownMinutes,
      },
      hourlyStats,
      recentRequests: this.db.joinRequests.slice(0, 10),
      recentOwnerNotifications: this.db.ownerNotifications.slice(0, 8),
    };
  }

  // --- MIDNIGHT IST RESET TRIGGER ---
  public performMidnightIstReset(previousDate: string, newDate: string) {
    try {
      const metrics = this.getMetrics();
      const yesterdayRecord = metrics.dailyHistory.find(d => d.date === previousDate) || {
        date: previousDate,
        dateLabel: getIstDateLabel(new Date(previousDate + 'T12:00:00+05:30')),
        joinsCount: metrics.yesterdayJoiningCount,
        exitsCount: metrics.yesterdayExitingCount,
        netGrowth: metrics.yesterdayJoiningCount - metrics.yesterdayExitingCount,
        newMembersCount: metrics.yesterdayNewMembersCount,
        rejoinsCount: metrics.yesterdayRejoinedCount,
        approvalsCount: 0,
      };

      this.db.dailyHistory = this.db.dailyHistory || [];
      const existingIdx = this.db.dailyHistory.findIndex(h => h.date === previousDate);
      if (existingIdx >= 0) {
        this.db.dailyHistory[existingIdx] = yesterdayRecord;
      } else {
        this.db.dailyHistory.push(yesterdayRecord);
      }

      this.addLog({
        timestamp: new Date().toISOString(),
        type: 'schedule_transition',
        action: 'Midnight Daily Reset (IST 12:00 AM)',
        description: `Indian Standard Time midnight crossed. Archived ${previousDate}: ${yesterdayRecord.joinsCount} joins, ${yesterdayRecord.exitsCount} exits. Today's (${newDate}) counters reset to 0.`,
        actor: 'Midnight IST Engine',
        success: true,
        metadata: {
          previousDate,
          newDate,
          joinsArchived: yesterdayRecord.joinsCount,
          exitsArchived: yesterdayRecord.exitsCount
        }
      });

      this.saveDatabase();
      console.log(`[Storage] Midnight IST Reset completed. Archived ${previousDate} -> reset for ${newDate}.`);
    } catch (err) {
      console.error('[Storage] Error during midnight IST reset:', err);
    }
  }

  // --- CSV EXPORTS ---
  public generateCsv(type: 'today_activity' | 'all_members' | 'join_requests' | 'audit_logs'): string {
    if (type === 'today_activity') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startTimestamp = startOfToday.getTime();
      
      const rows = [
        ['Telegram ID', 'Username', 'Full Name', 'Action Type', 'Join Count', 'Is Rejoined', 'Timestamp', 'Current Status'].join(',')
      ];

      Object.values(this.db.members).forEach(m => {
        const lastJoin = new Date(m.lastJoinedAt).getTime();
        if (lastJoin >= startTimestamp) {
          rows.push([
            `"${m.telegramId}"`,
            `"${m.username}"`,
            `"${m.firstName} ${m.lastName}"`.trim(),
            `"JOIN"`,
            m.joinCount,
            m.isRejoined ? 'YES' : 'NO',
            `"${m.lastJoinedAt}"`,
            `"${m.status}"`
          ].join(','));
        }
        if (m.lastExitedAt) {
          const lastExit = new Date(m.lastExitedAt).getTime();
          if (lastExit >= startTimestamp) {
            rows.push([
              `"${m.telegramId}"`,
              `"${m.username}"`,
              `"${m.firstName} ${m.lastName}"`.trim(),
              `"EXIT"`,
              m.joinCount,
              m.isRejoined ? 'YES' : 'NO',
              `"${m.lastExitedAt}"`,
              `"${m.status}"`
            ].join(','));
          }
        }
      });
      return rows.join('\n');
    }

    if (type === 'all_members') {
      const rows = [
        ['Telegram ID', 'Username', 'First Name', 'Last Name', 'Status', 'Join Count', 'Is Rejoined', 'First Joined At', 'Last Joined At', 'Last Exited At'].join(',')
      ];
      Object.values(this.db.members).forEach(m => {
        rows.push([
          `"${m.telegramId}"`,
          `"${m.username}"`,
          `"${m.firstName}"`,
          `"${m.lastName}"`,
          `"${m.status}"`,
          m.joinCount,
          m.isRejoined ? 'YES' : 'NO',
          `"${m.firstJoinedAt}"`,
          `"${m.lastJoinedAt}"`,
          `"${m.lastExitedAt || ''}"`
        ].join(','));
      });
      return rows.join('\n');
    }

    if (type === 'join_requests') {
      const rows = [
        ['Request ID', 'Telegram ID', 'Username', 'Full Name', 'Status', 'Is Rejoin', 'Previous Joins', 'Requested At', 'Processed At', 'Processed By', 'Group Status When Requested'].join(',')
      ];
      this.db.joinRequests.forEach(r => {
        rows.push([
          `"${r.id}"`,
          `"${r.telegramId}"`,
          `"${r.username}"`,
          `"${r.firstName} ${r.lastName}"`.trim(),
          `"${r.status}"`,
          r.isRejoin ? 'YES' : 'NO',
          r.previousJoinCount,
          `"${r.requestedAt}"`,
          `"${r.processedAt || ''}"`,
          `"${r.processedBy || ''}"`,
          `"${r.groupStatusAtRequest}"`
        ].join(','));
      });
      return rows.join('\n');
    }

    // Default: audit logs
    const rows = [
      ['Log ID', 'Timestamp', 'Type', 'Action', 'Description', 'Actor', 'Success'].join(',')
    ];
    this.db.logs.forEach(l => {
      rows.push([
        `"${l.id}"`,
        `"${l.timestamp}"`,
        `"${l.type}"`,
        `"${l.action.replace(/"/g, '""')}"`,
        `"${l.description.replace(/"/g, '""')}"`,
        `"${l.actor}"`,
        l.success ? 'TRUE' : 'FALSE'
      ].join(','));
    });
    return rows.join('\n');
  }

  // --- DATA CLEANUP / RESET ---
  public clearData(target: 'requests' | 'members' | 'logs' | 'notifications' | 'all', options: { preservePending?: boolean } = {}): {
    deletedRequests: number;
    deletedMembers: number;
    deletedLogs: number;
    deletedNotifications: number;
    message: string;
  } {
    let deletedRequests = 0;
    let deletedMembers = 0;
    let deletedLogs = 0;
    let deletedNotifications = 0;

    if (target === 'requests' || target === 'all') {
      const beforeReq = this.db.joinRequests.length;
      if (options.preservePending && target === 'requests') {
        this.db.joinRequests = this.db.joinRequests.filter(r => r.status === 'pending');
        deletedRequests = beforeReq - this.db.joinRequests.length;
      } else {
        this.db.joinRequests = [];
        deletedRequests = beforeReq;
      }
    }

    if (target === 'members' || target === 'all') {
      deletedMembers = Object.keys(this.db.members).length;
      this.db.members = {};
    }

    if (target === 'logs' || target === 'all') {
      deletedLogs = this.db.logs.length;
      this.db.logs = [];
    }

    if (target === 'notifications' || target === 'all') {
      deletedNotifications = this.db.ownerNotifications.length;
      this.db.ownerNotifications = [];
    }

    this.saveDatabase();

    this.addLog({
      timestamp: new Date().toISOString(),
      type: 'admin_action',
      action: 'Data Purge / Cleanup',
      description: `Executed clear on "${target}". Purged ${deletedRequests} requests, ${deletedMembers} members, ${deletedLogs} activity logs, ${deletedNotifications} notifications.`,
      actor: 'Admin Dashboard',
      success: true,
    });

    return {
      deletedRequests,
      deletedMembers,
      deletedLogs,
      deletedNotifications,
      message: `Cleared ${target}: ${deletedRequests} requests, ${deletedMembers} members, ${deletedLogs} logs, ${deletedNotifications} notifications.`
    };
  }

  // --- MULTI-GROUP MANAGEMENT ---
  public getManagedGroups() {
    if (!this.db.config.managedGroups || this.db.config.managedGroups.length === 0) {
      this.db.config.managedGroups = [
        {
          id: 'grp_main_vip',
          groupId: this.db.config.groupId,
          title: this.db.config.groupTitle,
          inviteLink: '',
          status: this.db.config.currentGroupStatus,
          isActive: true,
          createdAt: new Date().toISOString(),
          memberCount: Object.keys(this.db.members).length,
        }
      ];
      this.saveDatabase();
    }
    return this.db.config.managedGroups;
  }

  public addManagedGroup(group: { groupId: string; title: string; inviteLink?: string; status?: any }) {
    const groups = this.getManagedGroups();
    const newGroup = {
      id: `grp_${Date.now()}`,
      groupId: group.groupId.trim(),
      title: group.title.trim() || 'Telegram Group',
      inviteLink: group.inviteLink?.trim() || '',
      status: group.status || 'open',
      isActive: groups.length === 0,
      createdAt: new Date().toISOString(),
      memberCount: 0,
    };
    groups.push(newGroup);
    this.db.config.managedGroups = groups;
    this.saveDatabase();
    return newGroup;
  }

  public updateManagedGroup(id: string, updates: Partial<{ groupId: string; title: string; inviteLink: string; status: any; isActive: boolean }>) {
    const groups = this.getManagedGroups();
    const idx = groups.findIndex(g => g.id === id);
    if (idx === -1) return null;
    groups[idx] = { ...groups[idx], ...updates };
    this.db.config.managedGroups = groups;
    if (groups[idx].isActive) {
      if (updates.groupId) this.db.config.groupId = updates.groupId;
      if (updates.title) this.db.config.groupTitle = updates.title;
      if (updates.status) this.db.config.currentGroupStatus = updates.status;
    }
    this.saveDatabase();
    return groups[idx];
  }

  public deleteManagedGroup(id: string): boolean {
    const groups = this.getManagedGroups();
    if (groups.length <= 1) return false;
    this.db.config.managedGroups = groups.filter(g => g.id !== id);
    if (!this.db.config.managedGroups.some(g => g.isActive) && this.db.config.managedGroups.length > 0) {
      this.db.config.managedGroups[0].isActive = true;
      this.db.config.groupId = this.db.config.managedGroups[0].groupId;
      this.db.config.groupTitle = this.db.config.managedGroups[0].title;
    }
    this.saveDatabase();
    return true;
  }

  public setActiveGroup(id: string) {
    const groups = this.getManagedGroups();
    const target = groups.find(g => g.id === id);
    if (!target) return null;
    groups.forEach(g => { g.isActive = (g.id === id); });
    this.db.config.groupId = target.groupId;
    this.db.config.groupTitle = target.title;
    this.db.config.currentGroupStatus = target.status;
    this.db.config.managedGroups = groups;
    this.saveDatabase();
    return target;
  }

  // --- DATABASE HEALTH, STATS & BACKUPS ---
  public getDatabaseStats() {
    this.ensureDirectory();
    let fileSize = 0;
    try {
      if (fs.existsSync(DB_FILE)) {
        fileSize = fs.statSync(DB_FILE).size;
      }
    } catch {
      fileSize = 0;
    }

    const membersList = Object.values(this.db.members);
    return {
      engine: 'JSON/SQLite File-backed Storage Engine with Atomic Sync',
      dbPath: DB_FILE,
      sizeBytes: fileSize,
      sizeFormatted: `${(fileSize / 1024).toFixed(1)} KB`,
      lastSaved: new Date().toISOString(),
      tables: [
        { name: 'members', rowCount: membersList.length, description: 'Telegram group members directory & rejoin counter' },
        { name: 'admins', rowCount: this.db.admins.length, description: '3-tier admin accounts (Level 1 Owner, Level 2 Analyst, Level 3 Moderator)' },
        { name: 'joinRequests', rowCount: this.db.joinRequests.length, description: 'Pending & reviewed join requests' },
        { name: 'dailyHistory', rowCount: (this.db.dailyHistory || []).length, description: 'Daily IST 12:00 AM archived join/exit snapshots' },
        { name: 'announcements', rowCount: this.db.announcements.length, description: 'Broadcast message logs & delivery records' },
        { name: 'logs', rowCount: this.db.logs.length, description: 'System audit trails & automated events' },
        { name: 'ownerNotifications', rowCount: this.db.ownerNotifications.length, description: 'Direct alerts sent to Owner Telegram chat' },
        { name: 'managedGroups', rowCount: (this.db.config.managedGroups || []).length, description: 'Connected Telegram target groups' },
      ],
      totalRows: membersList.length + this.db.admins.length + this.db.joinRequests.length + (this.db.dailyHistory || []).length + this.db.announcements.length + this.db.logs.length,
      activeMembers: membersList.filter(m => m.status === 'active').length,
      exitedMembers: membersList.filter(m => m.status === 'exited').length,
    };
  }

  public exportDatabaseBackup(): string {
    return JSON.stringify(this.db, null, 2);
  }
}

export const storage = new StorageManager();
