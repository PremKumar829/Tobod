import { storage } from './storage.js';
import { formatWelcomeMessage } from '../src/utils/textStyler.js';
import { AdminRole, AdminPermissions, Member } from '../src/types.js';

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
}

interface TelegramChatJoinRequest {
  chat: TelegramChat;
  from: TelegramUser;
  user_chat_id: number;
  date: number;
  bio?: string;
  invite_link?: { invite_link: string };
}

interface TelegramChatMemberUpdated {
  chat: TelegramChat;
  from: TelegramUser;
  date: number;
  old_chat_member: { status: string; user: TelegramUser };
  new_chat_member: { status: string; user: TelegramUser };
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: TelegramUser;
    chat: TelegramChat;
    text?: string;
    date: number;
  };
  chat_join_request?: TelegramChatJoinRequest;
  chat_member?: TelegramChatMemberUpdated;
}

export class TelegramService {
  private pollingActive: boolean = false;
  private lastUpdateId: number = 0;
  private pollTimeoutRef: NodeJS.Timeout | null = null;
  public lastPollingError: string | null = null;
  public lastPollTimestamp: string | null = null;
  public totalUpdatesProcessed: number = 0;
  private adminCache = new Map<string, {
    isAuthorized: boolean;
    isOwner: boolean;
    isAdmin: boolean;
    role: AdminRole;
    level: number;
    roleTitle: string;
    permissions?: AdminPermissions;
    cachedAt: number;
  }>();

  // --- API CALLS ---
  public async callTelegramApi(endpoint: string, payload: Record<string, unknown>, customToken?: string): Promise<{ ok: boolean; result?: any; description?: string; error_code?: number }> {
    const config = storage.getConfig();
    const token = customToken || config.botToken;

    if (!token) {
      return { ok: false, description: 'Telegram Bot Token is not configured' };
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      return data;
    } catch (err: any) {
      console.error(`Telegram API error on ${endpoint}:`, err.message);
      return { ok: false, description: err.message };
    }
  }

  public async getBotInfo(token?: string): Promise<{ ok: boolean; result?: any; description?: string }> {
    return this.callTelegramApi('getMe', {}, token);
  }

  public async getWebhookInfo(): Promise<{ ok: boolean; result?: any; description?: string }> {
    return this.callTelegramApi('getWebhookInfo', {});
  }

  public async deleteWebhook(dropPending: boolean = false): Promise<{ ok: boolean; description?: string }> {
    return this.callTelegramApi('deleteWebhook', { drop_pending_updates: dropPending });
  }

  public async setWebhook(url: string): Promise<{ ok: boolean; description?: string }> {
    return this.callTelegramApi('setWebhook', {
      url,
      allowed_updates: ['chat_join_request', 'chat_member', 'message'],
    });
  }

  public async getChat(chatId: string | number): Promise<{ ok: boolean; result?: any; description?: string }> {
    return this.callTelegramApi('getChat', { chat_id: chatId });
  }

  public async getChatAdministrators(chatId: string | number): Promise<{ ok: boolean; result?: any; description?: string }> {
    return this.callTelegramApi('getChatAdministrators', { chat_id: chatId });
  }

  public async getChatMember(chatId: string | number, userId: string | number): Promise<{ ok: boolean; result?: any; description?: string }> {
    return this.callTelegramApi('getChatMember', { chat_id: chatId, user_id: Number(userId) });
  }

  public async runFullDiagnostics(): Promise<{
    tokenConfigured: boolean;
    botValid: boolean;
    botInfo?: any;
    webhookActive: boolean;
    webhookUrl?: string;
    pollingActive: boolean;
    lastPollTimestamp: string | null;
    lastPollingError: string | null;
    groupReachable: boolean;
    groupTitle?: string;
    botIsGroupAdmin: boolean;
    groupError?: string;
    ownerChatReachable: boolean;
    recommendations: string[];
  }> {
    const config = storage.getConfig();
    const recommendations: string[] = [];

    if (!config.botToken) {
      return {
        tokenConfigured: false,
        botValid: false,
        webhookActive: false,
        pollingActive: false,
        lastPollTimestamp: null,
        lastPollingError: 'Bot token not configured',
        groupReachable: false,
        botIsGroupAdmin: false,
        ownerChatReachable: false,
        recommendations: [
          'Paste your Telegram Bot Token from @BotFather in the Bot Settings tab or the quick connection bar.',
          'Start a private chat with your bot on Telegram and send /start to verify connection.',
        ],
      };
    }

    // 1. Check getMe
    const meRes = await this.getBotInfo();
    const botValid = !!(meRes.ok && meRes.result);
    const botInfo = meRes.result;

    if (!botValid) {
      return {
        tokenConfigured: true,
        botValid: false,
        webhookActive: false,
        pollingActive: this.pollingActive,
        lastPollTimestamp: this.lastPollTimestamp,
        lastPollingError: meRes.description || 'Invalid token',
        groupReachable: false,
        botIsGroupAdmin: false,
        ownerChatReachable: false,
        recommendations: [
          `Telegram rejected your bot token (${meRes.description || 'Unauthorized'}). Check @BotFather to copy the exact HTTP API token.`,
        ],
      };
    }

    // 2. Check Webhook status
    const whRes = await this.getWebhookInfo();
    const webhookActive = !!(whRes.ok && whRes.result?.url);
    const webhookUrl = whRes.result?.url;

    if (config.connectionMode === 'polling' && webhookActive) {
      recommendations.push('A webhook was previously set for this token, which blocks polling getUpdates. Click "Clear Webhook / Force Polling" to fix this.');
    }

    // 3. Check group
    let groupReachable = false;
    let groupTitle = undefined;
    let botIsGroupAdmin = false;
    let groupError = undefined;

    if (config.groupId && config.groupId !== '-1002345678901') {
      const chatRes = await this.getChat(config.groupId);
      if (chatRes.ok && chatRes.result) {
        groupReachable = true;
        groupTitle = chatRes.result.title;

        // Check if bot is admin
        if (botInfo?.id) {
          const memberRes = await this.getChatMember(config.groupId, botInfo.id);
          if (memberRes.ok && memberRes.result) {
            const status = memberRes.result.status;
            botIsGroupAdmin = status === 'administrator' || status === 'creator';
            if (!botIsGroupAdmin) {
              recommendations.push(`The bot is in group "${groupTitle}" but is NOT an Administrator. Promote the bot to Admin with "Approve new chat members" permission.`);
            }
          }
        }
      } else {
        groupError = chatRes.description || 'Cannot access chat';
        recommendations.push(`Cannot access Group ID "${config.groupId}": ${groupError}. Make sure the bot is invited to the group and the Group ID is correct.`);
      }
    } else {
      recommendations.push('Set your actual Telegram Group Chat ID (e.g. -100...) in Bot Settings to enable group state management.');
    }

    // 4. Check owner
    let ownerChatReachable = false;
    if (config.ownerChatId && config.ownerChatId !== '987654321') {
      ownerChatReachable = true;
    } else {
      recommendations.push('Start a chat with the bot in Telegram and send /myid to get your Telegram ID, then set it as Owner Chat ID in Bot Settings.');
    }

    return {
      tokenConfigured: true,
      botValid,
      botInfo,
      webhookActive,
      webhookUrl,
      pollingActive: this.pollingActive,
      lastPollTimestamp: this.lastPollTimestamp,
      lastPollingError: this.lastPollingError,
      groupReachable,
      groupTitle,
      botIsGroupAdmin,
      groupError,
      ownerChatReachable,
      recommendations,
    };
  }

  public async sendMessage(chatId: string | number, text: string, options: { parse_mode?: 'Markdown' | 'HTML'; disable_notification?: boolean } = {}) {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: options.parse_mode || 'Markdown',
      disable_notification: !!options.disable_notification,
    };
    return this.callTelegramApi('sendMessage', payload);
  }

  public async pinChatMessage(chatId: string | number, messageId: number) {
    return this.callTelegramApi('pinChatMessage', {
      chat_id: chatId,
      message_id: messageId,
      disable_notification: false,
    });
  }

  public async approveJoinRequest(chatId: string | number, userId: string | number): Promise<{ ok: boolean; description?: string }> {
    return this.callTelegramApi('approveChatJoinRequest', {
      chat_id: chatId,
      user_id: Number(userId),
    });
  }

  public async declineJoinRequest(chatId: string | number, userId: string | number): Promise<{ ok: boolean; description?: string }> {
    return this.callTelegramApi('declineChatJoinRequest', {
      chat_id: chatId,
      user_id: Number(userId),
    });
  }

  public async banChatMember(chatId: string | number, userId: string | number, revokeMessages: boolean = false): Promise<{ ok: boolean; description?: string }> {
    const config = storage.getConfig();
    if (!config.botToken) {
      return { ok: true, description: 'Simulated ban in test environment' };
    }
    return this.callTelegramApi('banChatMember', {
      chat_id: chatId,
      user_id: Number(userId),
      revoke_messages: revokeMessages
    });
  }

  public async unbanChatMember(chatId: string | number, userId: string | number): Promise<{ ok: boolean; description?: string }> {
    const config = storage.getConfig();
    if (!config.botToken) {
      return { ok: true, description: 'Simulated unban in test environment' };
    }
    return this.callTelegramApi('unbanChatMember', {
      chat_id: chatId,
      user_id: Number(userId),
      only_if_banned: true
    });
  }

  public async kickChatMember(chatId: string | number, userId: string | number, options?: { ban?: boolean; revokeMessages?: boolean }): Promise<{ ok: boolean; description?: string }> {
    const banRes = await this.banChatMember(chatId, userId, options?.revokeMessages);
    if (!banRes.ok) {
      return banRes;
    }
    // If user wants to kick (eject) without permanent ban, unban immediately so they can re-apply or join later
    if (!options?.ban) {
      await this.unbanChatMember(chatId, userId);
    }
    return { ok: true };
  }

  public async deleteMessage(chatId: string | number, messageId: number): Promise<{ ok: boolean; description?: string }> {
    return this.callTelegramApi('deleteMessage', {
      chat_id: chatId,
      message_id: messageId,
    });
  }

  public async sendWelcomeMessage(
    chatId: string | number,
    user: { id: string | number; username?: string; first_name?: string; last_name?: string },
    groupTitle?: string
  ) {
    const config = storage.getConfig();
    if (!config.welcomeMessageEnabled) return;

    const title = groupTitle || config.groupTitle || 'Official Group';
    const text = formatWelcomeMessage(
      config.welcomeMessageTemplate,
      {
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
      },
      title,
      config.welcomeMessageFont || 'bold_serif'
    );

    const dest = config.welcomeMessageDestination || 'group';

    if (dest === 'group' || dest === 'both') {
      try {
        await this.sendMessage(chatId, text);
      } catch (err) {
        console.warn('Failed to send welcome message to group chat:', err);
      }
    }

    if (dest === 'dm' || dest === 'both') {
      try {
        await this.sendMessage(user.id, text);
      } catch (err) {
        console.warn('Failed to send welcome message to user DM:', err);
      }
    }
  }

  public async setChatPermissions(chatId: string | number, canSendMessages: boolean) {
    return this.callTelegramApi('setChatPermissions', {
      chat_id: chatId,
      permissions: {
        can_send_messages: canSendMessages,
        can_send_audios: canSendMessages,
        can_send_documents: canSendMessages,
        can_send_photos: canSendMessages,
        can_send_videos: canSendMessages,
        can_send_video_notes: canSendMessages,
        can_send_voice_notes: canSendMessages,
        can_send_polls: canSendMessages,
        can_send_other_messages: canSendMessages,
        can_add_web_page_previews: canSendMessages,
      }
    });
  }

  /**
   * Verifies if a Telegram user is authorized as Owner or Administrator.
   * Checks:
   * 1. Direct Owner Chat ID or Owner Username in Bot Config
   * 2. Registered 2-Level Admins in Dashboard (matching telegramUserId or username)
   * 3. Telegram Group Administrators (status === 'creator' or 'administrator')
   */
  public async verifyUserAuthority(
    fromId: string,
    fromUser: { id: number; username?: string; first_name?: string; last_name?: string },
    chatId?: string | number
  ): Promise<{
    isAuthorized: boolean;
    isOwner: boolean;
    isAdmin: boolean;
    role: AdminRole;
    level: number;
    roleTitle: string;
    permissions?: AdminPermissions;
  }> {
    const config = storage.getConfig();
    const cleanFromUsername = (fromUser.username || '').replace('@', '').toLowerCase();
    const cleanOwnerUsername = (config.ownerUsername || '').replace('@', '').toLowerCase();

    // Check cache (valid for 2 minutes)
    const cacheKey = `${fromId}:${chatId || ''}`;
    const cached = this.adminCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < 120000) {
      return cached;
    }

    // 1. Direct match with configured Owner Chat ID or Owner Username
    const isOwnerId = fromId === config.ownerChatId;
    const isOwnerUser = Boolean(cleanOwnerUsername && cleanFromUsername && cleanFromUsername === cleanOwnerUsername);

    if (isOwnerId || isOwnerUser) {
      const result = {
        isAuthorized: true,
        isOwner: true,
        isAdmin: true,
        role: 'level_1_owner' as AdminRole,
        level: 1,
        roleTitle: '👑 Super Admin (Level 1)',
        permissions: {
          canViewAnalytics: true,
          canRemoveMembers: true,
          canBroadcast: true,
          canApproveRequests: true,
          canChangeSchedule: true,
          canExportReports: true,
          canManageAdmins: true,
          canChangeCredentials: true
        },
        cachedAt: Date.now()
      };
      this.adminCache.set(cacheKey, result);
      return result;
    }

    // 2. Check 3-Tier Admins list in dashboard
    const registeredAdmins = storage.getAdmins();
    const matchedAdmin = registeredAdmins.find(a => {
      const idMatch = a.telegramUserId && String(a.telegramUserId) === fromId;
      const userMatch = cleanFromUsername && a.username && a.username.replace('@', '').toLowerCase() === cleanFromUsername;
      return idMatch || userMatch;
    });

    if (matchedAdmin) {
      const isOwnerRole = matchedAdmin.role === 'level_1_owner';
      const isL2 = matchedAdmin.role === 'level_2_admin';
      const level = isOwnerRole ? 1 : isL2 ? 2 : 3;
      const roleTitle = isOwnerRole
        ? '👑 Super Admin (Level 1)'
        : isL2
        ? '📊 Analyst Admin (Level 2 - Stats Only)'
        : '🛡️ Moderator (Level 3)';

      const result = {
        isAuthorized: true,
        isOwner: isOwnerRole,
        isAdmin: true,
        role: matchedAdmin.role,
        level,
        roleTitle,
        permissions: matchedAdmin.permissions,
        cachedAt: Date.now()
      };
      this.adminCache.set(cacheKey, result);
      return result;
    }

    // 3. Check Telegram Group Admin status if group reachable
    const targetGroup = (chatId && String(chatId).startsWith('-')) ? chatId : config.groupId;
    if (targetGroup && targetGroup !== '-1002345678901' && config.botToken) {
      try {
        const memberRes = await this.getChatMember(targetGroup, fromId);
        if (memberRes.ok && memberRes.result) {
          const status = memberRes.result.status;
          if (status === 'creator') {
            const result = {
              isAuthorized: true,
              isOwner: true,
              isAdmin: true,
              role: 'level_1_owner' as AdminRole,
              level: 1,
              roleTitle: '👑 Telegram Group Creator (Level 1)',
              permissions: {
                canViewAnalytics: true,
                canRemoveMembers: true,
                canBroadcast: true,
                canApproveRequests: true,
                canChangeSchedule: true,
                canExportReports: true,
                canManageAdmins: true,
                canChangeCredentials: true
              },
              cachedAt: Date.now()
            };
            this.adminCache.set(cacheKey, result);
            return result;
          }
          if (status === 'administrator') {
            const result = {
              isAuthorized: true,
              isOwner: false,
              isAdmin: true,
              role: 'level_2_admin' as AdminRole,
              level: 2,
              roleTitle: '🛡️ Telegram Group Administrator (Level 2)',
              permissions: {
                canViewAnalytics: true,
                canRemoveMembers: false,
                canBroadcast: true,
                canApproveRequests: true,
                canChangeSchedule: false,
                canExportReports: true,
                canManageAdmins: false,
                canChangeCredentials: false
              },
              cachedAt: Date.now()
            };
            this.adminCache.set(cacheKey, result);
            return result;
          }
        }
      } catch {
        // Fallthrough if Telegram API fails
      }
    }

    // 4. Initial setup check: if ownerChatId is not set or default dummy '987654321',
    // allow initial owner binding on first interaction
    if (!config.ownerChatId || config.ownerChatId === '987654321') {
      const result = {
        isAuthorized: true,
        isOwner: true,
        isAdmin: true,
        role: 'level_1_owner' as AdminRole,
        level: 1,
        roleTitle: '👑 Initializing Owner (Level 1)',
        permissions: {
          canViewAnalytics: true,
          canRemoveMembers: true,
          canBroadcast: true,
          canApproveRequests: true,
          canChangeSchedule: true,
          canExportReports: true,
          canManageAdmins: true,
          canChangeCredentials: true
        },
        cachedAt: Date.now()
      };
      return result;
    }

    const result = {
      isAuthorized: false,
      isOwner: false,
      isAdmin: false,
      role: 'level_2_admin' as AdminRole,
      level: 0,
      roleTitle: '👤 Regular Member (Non-Admin)',
      cachedAt: Date.now()
    };
    this.adminCache.set(cacheKey, result);
    return result;
  }

  // --- JOIN REQUEST HANDLER ---
  public async handleJoinRequest(
    user: { id: number | string; username?: string; first_name?: string; last_name?: string },
    chatId?: string | number,
    chatTitle?: string
  ) {
    const config = storage.getConfig();
    const targetChatId = chatId || config.groupId;

    // 1. Add request to database and retrieve user history
    const { request, isRejoin, historyStats } = storage.addJoinRequest(user, targetChatId, chatTitle);
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Anonymous';
    const userDisplay = user.username ? `@${user.username}` : `ID: ${user.id}`;

    let actionTaken = 'Stored in Pending Queue';
    let autoApproved = false;

    // 2. Check if we should auto-approve right now
    const shouldApproveNow =
      config.autoApproveMode === 'always' ||
      (config.autoApproveMode === 'only_when_open' && config.currentGroupStatus === 'open');

    if (shouldApproveNow) {
      actionTaken = 'Auto-Approved Instantly';
      autoApproved = true;
      storage.markRequestApproved(request.id, 'auto_instant');

      // If live bot token, execute Telegram approve
      if (config.botToken) {
        await this.approveJoinRequest(targetChatId, user.id);
        await this.sendWelcomeMessage(targetChatId, user, chatTitle || config.groupTitle);
      }

      storage.addLog({
        timestamp: new Date().toISOString(),
        type: 'approval',
        action: 'Join Request Auto-Approved',
        description: `Approved ${fullName} (${userDisplay}) automatically in ${chatTitle || targetChatId} (Group is OPEN).`,
        actor: 'Auto Engine',
        success: true,
      });
    } else {
      actionTaken = config.currentGroupStatus === 'closed'
        ? 'Held in Pending Queue (Group is Closed)'
        : 'Held in Pending Queue (Manual Approval Configured)';

      storage.addLog({
        timestamp: new Date().toISOString(),
        type: 'join_request',
        action: 'Join Request Queued',
        description: `Held ${fullName} (${userDisplay}) in pending queue for ${chatTitle || targetChatId}. Group status is ${config.currentGroupStatus.toUpperCase()}.`,
        actor: 'Scheduler Rule',
        success: true,
      });
    }

    // 3. Send detailed statistics report to OWNER
    const ownerChatId = config.ownerChatId;
    const historySummary = isRejoin
      ? `🔁 *REJOINED MEMBER* (Join #${historyStats.joinCount + 1})\n• First Seen: ${historyStats.firstSeenAt ? new Date(historyStats.firstSeenAt).toLocaleDateString() : 'Unknown'}\n• Previous Exits: ${historyStats.previousExitsCount}\n• Past Record: ${historyStats.previousTenure || 'Frequent Member'}`
      : `🆕 *NEW FIRST-TIME APPLICANT*\n• Zero previous join records in database.`;

    const ownerTelegramMessage = [
      `🔔 *NEW JOIN REQUEST RECEIVED*`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `👤 *Applicant:* ${fullName}`,
      `🏷️ *Telegram ID:* \`${user.id}\` (${user.username ? '@' + user.username : 'No username'})`,
      `📊 *Member History & Stats:*`,
      historySummary,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `🚪 *Current Group Status:* ${config.currentGroupStatus === 'open' ? '🟢 OPEN' : '🔴 CLOSED'}`,
      `⚡ *Action Taken:* ${actionTaken}`,
      `⏰ *Time:* ${new Date().toLocaleTimeString()} UTC`
    ].join('\n');

    let sentToTelegram = false;
    if (config.notifyOwnerOnJoinRequest && config.botToken && ownerChatId) {
      try {
        const res = await this.sendMessage(ownerChatId, ownerTelegramMessage, { parse_mode: 'Markdown' });
        sentToTelegram = res.ok;
      } catch (err) {
        console.error('Failed to dispatch message to owner:', err);
      }
    }

    // 4. Save to dashboard Owner Notifications feed
    storage.addOwnerNotification({
      timestamp: new Date().toISOString(),
      telegramId: String(user.id),
      fullName,
      username: user.username || '',
      isRejoin,
      joinCount: historyStats.joinCount + 1,
      previousExitsCount: historyStats.previousExitsCount,
      firstSeenAt: historyStats.firstSeenAt,
      previousTenure: historyStats.previousTenure,
      groupStatus: config.currentGroupStatus,
      actionTaken,
      sentToTelegram,
      rawSummary: `${isRejoin ? '🔁 Rejoin' : '🆕 New'}: ${fullName} (${userDisplay}) - ${actionTaken}`,
    });

    return { request, autoApproved, isRejoin, actionTaken };
  }

  // --- PROCESS TELEGRAM UPDATE ---
  public async processUpdate(update: TelegramUpdate) {
    // 1. Join Request update
    if (update.chat_join_request) {
      const cjr = update.chat_join_request;
      // If group id not configured, auto-update with detected group
      const currentCfg = storage.getConfig();
      if (currentCfg.groupId === '-1002345678901' || !currentCfg.groupId) {
        storage.updateConfig({ groupId: String(cjr.chat.id), groupTitle: cjr.chat.title || currentCfg.groupTitle });
      }
      await this.handleJoinRequest({
        id: cjr.from.id,
        username: cjr.from.username,
        first_name: cjr.from.first_name,
        last_name: cjr.from.last_name,
      }, cjr.chat.id, cjr.chat.title);
      return;
    }

    // 2. Chat member updated (Join / Exit tracking)
    if (update.chat_member) {
      const cm = update.chat_member;
      const oldStatus = cm.old_chat_member.status;
      const newStatus = cm.new_chat_member.status;
      const user = cm.new_chat_member.user;

      if (['left', 'kicked'].includes(newStatus) && !['left', 'kicked'].includes(oldStatus)) {
        // User left the group
        storage.recordExit(user.id, user.username);
        storage.addLog({
          timestamp: new Date().toISOString(),
          type: 'admin_action',
          action: 'Member Exited',
          description: `${user.first_name} ${user.last_name || ''} (@${user.username || user.id}) left ${cm.chat.title || 'the group'}.`,
          actor: 'Telegram Event',
          success: true
        });
      } else if (['member', 'administrator'].includes(newStatus) && ['left', 'kicked'].includes(oldStatus)) {
        // User joined directly
        storage.recordJoin(user);
        storage.addLog({
          timestamp: new Date().toISOString(),
          type: 'approval',
          action: 'Member Joined Directly',
          description: `${user.first_name} ${user.last_name || ''} (@${user.username || user.id}) joined ${cm.chat.title || 'the group'}.`,
          actor: 'Telegram Event',
          success: true
        });

        // Dispatch Welcome Message
        const cfg = storage.getConfig();
        if (cfg.welcomeMessageEnabled && cfg.botToken) {
          await this.sendWelcomeMessage(cm.chat.id, user, cm.chat.title);
        }
      }
      return;
    }

    // 3. Message handling (Automod & Commands)
    if (update.message && update.message.text) {
      const fullText = update.message.text.trim();
      const parts = fullText.split(' ');
      const rawCommand = parts[0].toLowerCase();
      // Support /command@bot_name
      const command = rawCommand.split('@')[0];
      const isCommand = command.startsWith('/');
      const chatId = update.message.chat.id;
      const isPrivate = update.message.chat.type === 'private';
      const fromUser = update.message.from;
      const fromId = String(fromUser.id);
      const config = storage.getConfig();
      const senderName = `${fromUser.first_name || ''} ${fromUser.last_name || ''}`.trim() || 'User';

      // Check authority: verify if sender is verified Owner or Admin
      const auth = await this.verifyUserAuthority(fromId, fromUser, chatId);
      const isOwnerOrAdmin = auth.isAuthorized;

      // --- AUTOMODERATION FOR GROUP MESSAGES ---
      if (!isPrivate && !isOwnerOrAdmin) {
        // 1. Link Filter
        if (config.linkFilterEnabled) {
          const hasLink = /(https?:\/\/[^\s]+)|(t\.me\/[^\s]+)|(telegram\.me\/[^\s]+)|([a-zA-Z0-9-]+\.(com|org|net|in|co|io|me|xyz|biz|info|live|online|tech|app|link|site|top|club|xyz)[^\s]*)/gi.test(fullText);
          if (hasLink) {
            console.log(`[AutoMod] Detected link in group message from ${senderName}. Deleting message ${update.message.message_id}...`);
            await this.deleteMessage(chatId, update.message.message_id);

            const userMention = fromUser.username ? `@${fromUser.username}` : (fromUser.first_name || 'Member');
            const warnText = (config.linkFilterWarnText || '⚠️ @{username}, links are strictly prohibited in this group! Your message has been removed. 🛡️').replace(/{username}/g, userMention);

            if (config.linkFilterAction === 'delete_warn') {
              await this.sendMessage(chatId, warnText);
            }

            storage.addLog({
              timestamp: new Date().toISOString(),
              type: 'automod',
              action: 'Link Filter Triggered',
              description: `Automod deleted unauthorized link message from ${senderName} (${userMention}).`,
              actor: 'AutoMod Link Filter',
              success: true
            });
            return;
          }
        }

        // 2. Anti-Abuse / Offensive Words Filter
        if (config.abuseFilterEnabled && config.abuseFilterWords && config.abuseFilterWords.length > 0) {
          const lowerText = fullText.toLowerCase();
          const matchedWord = config.abuseFilterWords.find(w => {
            const word = w.trim().toLowerCase();
            if (!word) return false;
            const regex = new RegExp(`(^|\\W)${word}(\\W|$)`, 'i');
            return regex.test(lowerText);
          });

          if (matchedWord) {
            console.log(`[AutoMod] Detected abusive word "${matchedWord}" from ${senderName}. Deleting message ${update.message.message_id}...`);
            await this.deleteMessage(chatId, update.message.message_id);

            const userMention = fromUser.username ? `@${fromUser.username}` : (fromUser.first_name || 'Member');
            const warnText = (config.abuseFilterWarnText || '🚫 @{username}, abusive or offensive language is not tolerated! Your message has been deleted. 🛡️').replace(/{username}/g, userMention);

            if (config.abuseFilterAction === 'delete_warn') {
              await this.sendMessage(chatId, warnText);
            }

            storage.addLog({
              timestamp: new Date().toISOString(),
              type: 'automod',
              action: 'Abusive Message Filtered',
              description: `Automod deleted abusive message containing "${matchedWord}" from ${senderName} (${userMention}).`,
              actor: 'AutoMod Abuse Filter',
              success: true
            });
            return;
          }
        }
      }

      // --- ENFORCE: BOT IS FOR OWNER & ADMIN ONLY ---
      // Requirement: "Bot ka use sirf owner and Admin krega and sirf owner Admin ka command ka response kre other users ka nhi"
      if (config.adminOnlyCommands !== false && !isOwnerOrAdmin) {
        if (isCommand) {
          console.log(`[Access Control] Command "${command}" from unauthorized user ${senderName} (${fromId}) was BLOCKED.`);

          // 1. If in a group chat, delete the unauthorized command message so the group stays clean
          if (!isPrivate && config.autoDeleteUnauthorizedCommands !== false) {
            await this.deleteMessage(chatId, update.message.message_id);
          }

          // 2. Audit log the blocked attempt
          storage.addLog({
            timestamp: new Date().toISOString(),
            type: 'admin_action',
            action: 'Non-Admin Command Blocked',
            description: `Blocked command "${command}" from unauthorized user ${senderName} (@${fromUser.username || fromId}). Bot responds exclusively to Owner & Admins.`,
            actor: senderName,
            success: false,
            metadata: { telegramId: fromId, command, chatType: update.message.chat.type }
          });

          // 3. User request constraint: Do NOT respond to other users!
          // Only send notice if explicitly configured as alert_dm in private chat, otherwise remain 100% silent
          if (config.nonAdminResponseMode === 'alert_dm' && isPrivate) {
            await this.sendMessage(
              chatId,
              `🔒 *Access Restricted*\n\nThis bot is configured to respond *only to the Group Owner & Administrators*. Regular users cannot execute bot commands.`,
              { parse_mode: 'Markdown' }
            );
          }

          return;
        }

        // If non-admin sends casual non-command text in private chat, do not reply
        if (isPrivate) {
          console.log(`[Access Control] Ignoring private chat message from non-admin user ${senderName} (${fromId}).`);
          return;
        }
      }

      // --- AUTHORIZED COMMAND HANDLERS (EXCLUSIVELY FOR OWNER & ADMINS) ---
      if (command === '/start' || command === '/help') {
        const metrics = storage.getMetrics();
        const isL2 = auth.level === 2;

        const helpMsg = isL2 ? [
          `📊 *Level 2 Analyst Command Center*`,
          `━━━━━━━━━━━━━━━━━━━━━━`,
          `👋 Welcome *${senderName}*!`,
          `• *Role:* ${auth.roleTitle}`,
          `• *User ID:* \`${fromId}\``,
          `• *Access Mode:* 📈 *Analytics & Reports Only*`,
          ``,
          `📌 *Allowed Analytics Commands:*`,
          `• \`/today\` (or \`/aaj\`) - Today's joined and exited members (IST)`,
          `• \`/yesterday\` (or \`/kal\`) - Yesterday's archived join/exit count`,
          `• \`/stats\` - Group growth, rejoins & active member counter`,
          `• \`/status\` - Live group operating status (Open/Closed)`,
          `• \`/myid\` - View your account identity & permissions`,
          `• \`/ping\` - Check bot responsiveness`,
          ``,
          `🔒 _Administrative actions (/open, /close, /broadcast, /kick) are restricted to Level 1 Super Admins._`,
        ].join('\n') : [
          `🤖 *Admin & Owner Command Center*`,
          `━━━━━━━━━━━━━━━━━━━━━━`,
          `👋 Welcome *${senderName}*!`,
          `• *Verified Role:* ${auth.roleTitle}`,
          `• *User ID:* \`${fromId}\``,
          `• *Group Status:* ${config.currentGroupStatus === 'open' ? '🟢 OPEN' : '🔴 CLOSED'}`,
          `• *Pending Join Requests:* *${metrics.pendingRequestsCount}*`,
          `• *Today Joined / Exited:* *${metrics.todayJoiningCount}* / *${metrics.todayExitingCount}* (IST)`,
          ``,
          `📌 *Available Commands:*`,
          `• \`/today\` - Today's joined & exited members (Reset 12:00 AM IST)`,
          `• \`/yesterday\` - Yesterday's archived join & exit record`,
          `• \`/stats\` - Comprehensive group analytics & growth summary`,
          `• \`/status\` - Live group status, operating hours & counts`,
          `• \`/pending\` - Queued join requests awaiting approval`,
          `• \`/open\` - Manually open group & approve all pending requests`,
          `• \`/close\` - Close group & queue new requests`,
          `• \`/kick <id/user> [reason]\` - Remove member from Telegram group`,
          `• \`/ban <id/user> [reason]\` - Permanently ban member from group`,
          `• \`/broadcast <text>\` - Send announcement to the group`,
          `• \`/myid\` - View your verified Telegram ID & permissions`,
          `• \`/ping\` - Check bot responsiveness`,
          ``,
          `👑 _You have full Level 1 administrative control._`,
        ].join('\n');

        await this.sendMessage(chatId, helpMsg, { parse_mode: 'Markdown' });
      } else if (command === '/myid' || command === '/id') {
        const idMsg = [
          `🆔 *Your Telegram Identity & Authority*`,
          `━━━━━━━━━━━━━━━━━━━━━━`,
          `• *Name:* ${senderName}`,
          `• *User ID:* \`${fromId}\``,
          `• *Username:* ${fromUser.username ? '@' + fromUser.username : 'No username set'}`,
          `• *Chat Type:* ${update.message.chat.type}`,
          `• *Chat ID:* \`${chatId}\``,
          `• *Authority Level:* ${auth.roleTitle}`,
          `• *Command Access:* ✅ Authorized (${auth.roleTitle})`,
          ``,
          `🔐 *Permissions:*`,
          `• View Analytics: ${auth.permissions?.canViewAnalytics !== false ? '✅ Allowed' : '❌ Restricted'}`,
          `• Remove Members: ${auth.permissions?.canRemoveMembers ? '✅ Allowed' : '❌ Restricted'}`,
          `• Broadcast to Group: ${auth.permissions?.canBroadcast ? '✅ Allowed' : '❌ Restricted'}`,
          `• Approve Join Requests: ${auth.permissions?.canApproveRequests ? '✅ Allowed' : '❌ Restricted'}`,
          `• Change Operating Schedule: ${auth.permissions?.canChangeSchedule ? '✅ Allowed' : '❌ Restricted'}`,
          `• Export System Reports: ${auth.permissions?.canExportReports ? '✅ Allowed' : '❌ Restricted'}`,
          ``,
          `_You can manage administrative roles anytime via the Web Dashboard._`
        ].join('\n');
        await this.sendMessage(chatId, idMsg, { parse_mode: 'Markdown' });
      } else if (command === '/ping') {
        await this.sendMessage(chatId, `🏓 *Pong!* Bot is online, healthy and responding.\n• Authority: ${auth.roleTitle}\n• Server Time: ${new Date().toISOString()}`, { parse_mode: 'Markdown' });
      } else if (command === '/today' || command === '/aaj') {
        const metrics = storage.getMetrics();
        const netGrowth = metrics.todayJoiningCount - metrics.todayExitingCount;
        const netSign = netGrowth >= 0 ? `+${netGrowth}` : `${netGrowth}`;

        const todayMsg = [
          `📅 *Today's Group Analytics (Indian Standard Time)*`,
          `━━━━━━━━━━━━━━━━━━━━━━`,
          `• *Date:* \`${metrics.todayDateIst}\``,
          `• *Reset Schedule:* \`12:00 AM Midnight IST (00:00)\``,
          ``,
          `📈 *Today's Activity:*`,
          `• 🟢 *Members Joined Today:* *${metrics.todayJoiningCount}*`,
          `• 🔴 *Members Exited Today:* *${metrics.todayExitingCount}*`,
          `• 📊 *Net Daily Growth:* *${netSign}* members`,
          `• 👥 *Total Active Members:* *${metrics.totalActiveMembers}*`,
          `• ⏳ *Pending Join Requests:* *${metrics.pendingRequestsCount}*`,
          ``,
          `💡 _Counter automatically resets to 0 at 12:00 AM IST every night._`,
        ].join('\n');
        await this.sendMessage(chatId, todayMsg, { parse_mode: 'Markdown' });
      } else if (command === '/yesterday' || command === '/kal') {
        const metrics = storage.getMetrics();
        const joined = metrics.yesterdayJoiningCount;
        const exited = metrics.yesterdayExitingCount;
        const netGrowth = joined - exited;
        const netSign = netGrowth >= 0 ? `+${netGrowth}` : `${netGrowth}`;

        const yesterdayMsg = [
          `⏮️ *Yesterday's Archived Analytics (Indian Standard Time)*`,
          `━━━━━━━━━━━━━━━━━━━━━━`,
          `• *Archived Date:* \`${metrics.yesterdayDateIst}\``,
          `• *Midnight Snapshot:* Recorded at 12:00 AM IST`,
          ``,
          `📊 *Yesterday's Summary:*`,
          `• 🟢 *Members Joined Yesterday:* *${joined}*`,
          `• 🔴 *Members Exited Yesterday:* *${exited}*`,
          `• 📈 *Net Day Growth:* *${netSign}* members`,
          `• 🆕 *New First-Time:* *${metrics.yesterdayNewMembersCount}*`,
          `• 🔁 *Rejoined Members:* *${metrics.yesterdayRejoinedCount}*`,
          ``,
          `_You can browse full archived history via the Web Dashboard._`
        ].join('\n');
        await this.sendMessage(chatId, yesterdayMsg, { parse_mode: 'Markdown' });
      } else if (command === '/stats') {
        const metrics = storage.getMetrics();
        const statsMsg = [
          `📈 *Group Growth & Analytics Overview*`,
          `━━━━━━━━━━━━━━━━━━━━━━`,
          `• *Group:* \`${config.groupTitle || config.groupId}\``,
          `• *Active Members:* *${metrics.totalActiveMembers}*`,
          `• *Pending Queue:* *${metrics.pendingRequestsCount}*`,
          ``,
          `📊 *Daily Breakdown (IST - 12:00 AM Reset):*`,
          `• 🟢 *Today Joined:* *${metrics.todayJoiningCount}*`,
          `• 🔴 *Today Exited:* *${metrics.todayExitingCount}*`,
          `• 🟢 *Yesterday Joined:* *${metrics.yesterdayJoiningCount}*`,
          `• 🔴 *Yesterday Exited:* *${metrics.yesterdayExitingCount}*`,
          `• 🔁 *Total Rejoined Members:* *${metrics.uniqueRejoinedCount}*`,
          `• 👥 *Total Recorded in DB:* *${metrics.totalHistoricalMembers}*`,
          ``,
          `_Times aligned with Indian Standard Time (UTC+05:30)._`
        ].join('\n');
        await this.sendMessage(chatId, statsMsg, { parse_mode: 'Markdown' });
      } else if (command === '/status') {
        const metrics = storage.getMetrics();
        const statusMsg = [
          `📊 *Group Automation Live Status*`,
          `━━━━━━━━━━━━━━━━━━━━━━`,
          `• *Group State:* ${metrics.currentGroupStatus === 'open' ? '🟢 OPEN' : '🔴 CLOSED'}`,
          `• *Target Group:* \`${config.groupTitle || config.groupId}\``,
          `• *Schedule:* ${config.scheduleEnabled ? `Enabled (${config.openTime} - ${config.closeTime} ${config.timezone})` : 'Disabled'}`,
          `• *Pending Join Requests:* *${metrics.pendingRequestsCount}*`,
          `• *Total Active Members:* *${metrics.totalActiveMembers}*`,
          `• *Today Joined (IST):* *${metrics.todayJoiningCount}* | *Today Exited:* *${metrics.todayExitingCount}*`,
          `• *Yesterday Joined:* *${metrics.yesterdayJoiningCount}* | *Yesterday Exited:* *${metrics.yesterdayExitingCount}*`,
          `• *Auto-Approve Policy:* \`${config.autoApproveMode}\``,
          `• *Access Control:* 🔒 *Owner & Admin Only* (Active)`,
          ``,
          `_Dashboard is syncing in real-time._`
        ].join('\n');
        await this.sendMessage(chatId, statusMsg, { parse_mode: 'Markdown' });
      } else if (command === '/pending') {
        const pending = storage.getJoinRequests().filter(r => r.status === 'pending');
        const pendingMsg = pending.length === 0
          ? `✅ *Pending Queue Empty*\nAll applicants have already been approved and processed.`
          : `⏳ *There are ${pending.length} pending join request(s):*\n` +
            pending.slice(0, 8).map((p, i) => `${i + 1}. *${p.firstName} ${p.lastName || ''}* (@${p.username || p.telegramId}) - ${p.isRejoin ? '🔁 Rejoin' : '🆕 New'}`).join('\n') +
            (pending.length > 8 ? `\n...and ${pending.length - 8} more in queue.` : '') +
            `\n\n_Send \`/open\` or approve via the Web Dashboard._`;
        await this.sendMessage(chatId, pendingMsg, { parse_mode: 'Markdown' });
      } else if (command === '/open') {
        if (auth.level === 2) {
          await this.sendMessage(
            chatId,
            `⛔ *Access Denied: Level 2 Admin*\n\nYour admin role is **Level 2 (Analytics & Statistics Only)**.\n\n✅ You are permitted to view join & exit analytics:\n• \`/today\` — Today's joined and exited members\n• \`/yesterday\` — Yesterday's archived statistics\n• \`/stats\` — Group growth & counters\n\n❌ Opening the group requires **Level 1 Super Admin** privileges.`,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        const canApprove = auth.isOwner || auth.permissions?.canApproveRequests;
        if (!canApprove) {
          await this.sendMessage(
            chatId,
            `⛔ *Permission Denied:* Your admin role does not have *canApproveRequests* permission to open the group.`,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        // If default ownerChatId was dummy, auto-bind this user as owner
        if (!config.ownerChatId || config.ownerChatId === '987654321') {
          storage.updateConfig({ ownerChatId: fromId, ownerUsername: fromUser.username || '' });
        }

        storage.updateConfig({ currentGroupStatus: 'open', manualOverride: true });
        const approved = storage.approveAllPendingRequests(`Telegram Command by ${senderName}`);
        
        // Execute Telegram API approvals
        for (const req of approved) {
          if (config.botToken) {
            await this.approveJoinRequest(config.groupId, req.telegramId);
          }
        }

        if (config.openedNoticeMessage && config.botToken) {
          await this.sendMessage(config.groupId, config.openedNoticeMessage);
        }

        storage.addLog({
          timestamp: new Date().toISOString(),
          type: 'schedule_transition',
          action: 'Group Opened via Telegram',
          description: `Group was opened by ${auth.roleTitle} ${senderName} (@${fromUser.username || fromId}) via /open. Approved ${approved.length} pending requests.`,
          actor: senderName,
          success: true,
        });

        await this.sendMessage(
          chatId,
          `🟢 *Group has been OPENED by ${auth.roleTitle}*\n• Approved *${approved.length}* pending join request(s).\n• Auto-approval is active for incoming applicants!`,
          { parse_mode: 'Markdown' }
        );
      } else if (command === '/close') {
        if (auth.level === 2) {
          await this.sendMessage(
            chatId,
            `⛔ *Access Denied: Level 2 Admin*\n\nYour admin role is **Level 2 (Analytics & Statistics Only)**.\n\n✅ You are permitted to view join & exit analytics:\n• \`/today\` — Today's joined and exited members\n• \`/yesterday\` — Yesterday's archived statistics\n• \`/stats\` — Group growth & counters\n\n❌ Closing the group requires **Level 1 Super Admin** privileges.`,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        const canClose = auth.isOwner || auth.permissions?.canChangeSchedule;
        if (!canClose) {
          await this.sendMessage(
            chatId,
            `⛔ *Permission Denied:* Your admin role does not have *canChangeSchedule* permission to close the group.`,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        if (!config.ownerChatId || config.ownerChatId === '987654321') {
          storage.updateConfig({ ownerChatId: fromId, ownerUsername: fromUser.username || '' });
        }

        storage.updateConfig({ currentGroupStatus: 'closed', manualOverride: true });
        if (config.closedNoticeMessage && config.botToken) {
          await this.sendMessage(config.groupId, config.closedNoticeMessage);
        }

        storage.addLog({
          timestamp: new Date().toISOString(),
          type: 'schedule_transition',
          action: 'Group Closed via Telegram',
          description: `Group was closed by ${auth.roleTitle} ${senderName} (@${fromUser.username || fromId}) via /close.`,
          actor: senderName,
          success: true,
        });

        await this.sendMessage(
          chatId,
          `🔴 *Group has been CLOSED by ${auth.roleTitle}*\n• All incoming join requests will be held in pending queue.\n• Once re-opened, all queued applicants will be auto-approved!`,
          { parse_mode: 'Markdown' }
        );
      } else if (command === '/kick' || command === '/ban') {
        const isBan = command === '/ban';
        if (auth.level === 2) {
          await this.sendMessage(
            chatId,
            `⛔ *Access Denied: Level 2 Admin*\n\nYour admin role is **Level 2 (Analytics & Statistics Only)**.\n\n❌ Removing or banning members requires **Level 1 Super Admin** privileges.`,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        const canRemove = auth.isOwner || auth.permissions?.canRemoveMembers;
        if (!canRemove) {
          await this.sendMessage(
            chatId,
            `⛔ *Permission Denied:* Your role (*${auth.roleTitle}*) does not have *canRemoveMembers* permission to kick or ban members.`,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        const targetUser = parts[1]?.trim();
        const reason = parts.slice(2).join(' ').trim() || (isBan ? 'Banned by Admin' : 'Kicked by Admin');

        if (!targetUser) {
          await this.sendMessage(
            chatId,
            `⚠️ *Usage:* \`${command} <user_id_or_username> [reason]\`\n\n_Example:_\n\`${command} 123456789 Violation of group rules\`\n\`${command} @baduser Spamming\``,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        // Find member in storage
        const members: Member[] = storage.getMembers();
        const cleanTarget = targetUser.replace('@', '').toLowerCase();
        const foundMember = members.find((m: Member) =>
          String(m.telegramId) === targetUser ||
          (m.username && m.username.toLowerCase() === cleanTarget)
        );

        const targetUserId = foundMember ? foundMember.telegramId : targetUser.replace(/\D/g, '');
        if (!targetUserId) {
          await this.sendMessage(
            chatId,
            `❌ *Error:* Could not find member "${targetUser}" in group records. Please provide their numeric Telegram ID.`,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        const targetGroup = (chatId && String(chatId).startsWith('-')) ? chatId : config.groupId;
        let tgSuccess = false;
        let tgError: string | undefined;

        if (config.botToken) {
          const res = isBan
            ? await this.banChatMember(targetGroup, targetUserId)
            : await this.kickChatMember(targetGroup, targetUserId);
          tgSuccess = res.ok;
          tgError = res.description;
        } else {
          tgSuccess = true;
        }

        const removalResult = storage.removeMemberFromGroup(
          targetUserId,
          {
            actor: `${auth.roleTitle} ${senderName} (@${fromUser.username || fromId})`,
            reason,
            ban: isBan
          }
        );

        const actionWord = isBan ? 'Banned' : 'Kicked & Removed';
        const memberName = removalResult.member
          ? `${removalResult.member.firstName} ${removalResult.member.lastName || ''}`.trim()
          : targetUser;

        await this.sendMessage(
          chatId,
          `✅ *Member ${actionWord} Successfully!*\n• *Member:* ${memberName} (\`${targetUserId}\`)\n• *Action:* ${isBan ? 'Permanent Ban' : 'Kicked from Group'}\n• *Reason:* ${reason}\n• *Admin:* ${senderName} (${auth.roleTitle})${tgError ? `\n\n⚠️ _Telegram API note: ${tgError}_` : ''}`,
          { parse_mode: 'Markdown' }
        );
      } else if (command === '/broadcast' || command === '/announce') {
        if (auth.level === 2) {
          await this.sendMessage(
            chatId,
            `⛔ *Access Denied: Level 2 Admin*\n\nYour admin role is **Level 2 (Analytics & Statistics Only)**.\n\n❌ Sending broadcasts requires **Level 1 Super Admin** privileges.`,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        const canBroadcast = auth.isOwner || auth.permissions?.canBroadcast;
        if (!canBroadcast) {
          await this.sendMessage(
            chatId,
            `⛔ *Permission Denied:* Your admin role does not have *canBroadcast* permission to send group broadcasts.`,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        const broadcastMsg = parts.slice(1).join(' ').trim();
        if (!broadcastMsg) {
          await this.sendMessage(
            chatId,
            `📢 *Broadcast Command Usage:*\n\`/broadcast Your announcement message here\`\n\n_Example:_\n\`/broadcast Hello members, our live Q&A session starts in 10 minutes!\``,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        if (config.botToken && config.groupId) {
          await this.sendMessage(config.groupId, broadcastMsg);
        }

        storage.addLog({
          timestamp: new Date().toISOString(),
          type: 'announcement',
          action: 'Group Broadcast Sent',
          description: `Broadcast message sent to group by ${auth.roleTitle} ${senderName} (@${fromUser.username || fromId}).`,
          actor: senderName,
          success: true,
          metadata: { text: broadcastMsg }
        });

        await this.sendMessage(
          chatId,
          `✅ *Broadcast Sent Successfully!*\nMessage delivered to target group: \`${config.groupTitle || config.groupId}\``,
          { parse_mode: 'Markdown' }
        );
      } else if (isPrivate) {
        // Fallback for private chats ONLY when verified Owner or Admin sends unrecognized text
        const fallbackMsg = [
          `👋 Hello *${senderName}* (${auth.roleTitle})!`,
          `I received your message.`,
          ``,
          `Send \`/help\` or \`/status\` to view the list of administrative commands.`,
        ].join('\n');
        await this.sendMessage(chatId, fallbackMsg, { parse_mode: 'Markdown' });
      }
    }
  }

  // --- POLLING LOOP ---
  public startPolling() {
    if (this.pollingActive) return;
    this.pollingActive = true;
    this.pollLoop();
  }

  public stopPolling() {
    this.pollingActive = false;
    if (this.pollTimeoutRef) {
      clearTimeout(this.pollTimeoutRef);
      this.pollTimeoutRef = null;
    }
  }

  private async pollLoop() {
    if (!this.pollingActive) return;
    const config = storage.getConfig();

    if (!config.botToken) {
      // Idle polling check every 4 seconds if token not yet provided
      this.lastPollingError = 'Bot token not configured';
      this.pollTimeoutRef = setTimeout(() => this.pollLoop(), 4000);
      return;
    }

    try {
      const res = await this.callTelegramApi('getUpdates', {
        offset: this.lastUpdateId + 1,
        timeout: 10,
        allowed_updates: ['chat_join_request', 'chat_member', 'message'],
      });

      if (!res.ok) {
        this.lastPollingError = res.description || 'Failed to fetch updates';
        console.warn('Telegram polling warning:', res.description);

        // Auto-fix webhook conflict: if getUpdates fails because a webhook is set, delete it!
        if (res.description && (res.description.includes('webhook') || res.description.includes('getUpdates method while webhook is active'))) {
          console.log('Webhook conflict detected in polling mode. Auto-deleting webhook...');
          await this.deleteWebhook(false);
        }
      } else {
        this.lastPollingError = null;
        this.lastPollTimestamp = new Date().toISOString();

        if (Array.isArray(res.result) && res.result.length > 0) {
          for (const update of res.result) {
            this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);
            this.totalUpdatesProcessed++;
            try {
              await this.processUpdate(update);
            } catch (err: any) {
              console.error('Error processing telegram update:', err.message);
            }
          }
        }
      }
    } catch (err: any) {
      this.lastPollingError = err.message;
      console.warn('Polling network error (will retry):', err.message);
    }

    if (this.pollingActive) {
      // Quick poll iteration
      this.pollTimeoutRef = setTimeout(() => this.pollLoop(), 800);
    }
  }

  // --- BROADCAST ANNOUNCEMENT ---
  public async broadcastAnnouncement(title: string, text: string, options: { pin?: boolean; silent?: boolean; parseMode?: 'Markdown' | 'HTML'; adminName?: string }): Promise<{ success: boolean; messageId?: number; error?: string }> {
    const config = storage.getConfig();
    const adminName = options.adminName || 'Admin';
    const targetChatId = config.groupId;

    const fullText = title ? `📢 *${title}*\n\n${text}` : text;

    let telegramMessageId: number | undefined;
    let sentSuccess = true;
    let errorMsg: string | undefined;

    if (config.botToken && targetChatId) {
      let res = await this.sendMessage(targetChatId, fullText, {
        parse_mode: options.parseMode || 'Markdown',
        disable_notification: !!options.silent,
      });

      // If failed due to formatting parse error (e.g. unescaped characters in Markdown), retry sending as plain text
      if (!res.ok && res.description && (res.description.toLowerCase().includes('parse') || res.description.toLowerCase().includes('entity') || res.description.toLowerCase().includes('can\'t find end'))) {
        console.warn('Telegram parse error on announcement, retrying as plain text without parse_mode:', res.description);
        const plainText = title ? `📢 ${title}\n\n${text}` : text;
        res = await this.sendMessage(targetChatId, plainText, {
          disable_notification: !!options.silent,
        });
      }

      if (res.ok && res.result) {
        telegramMessageId = res.result.message_id;
        if (options.pin && telegramMessageId) {
          await this.pinChatMessage(targetChatId, telegramMessageId);
        }
      } else {
        sentSuccess = false;
        errorMsg = res.description || 'Telegram API returned error';
        console.warn(`[Broadcast] Telegram send failed: ${errorMsg}`);
      }
    } else if (!config.botToken) {
      sentSuccess = true;
      errorMsg = 'Bot Token is not configured. Announcement saved locally to dashboard.';
    }

    // Record announcement in database regardless (so dashboard logs it)
    const announcement = storage.addAnnouncement({
      title,
      text,
      parseMode: options.parseMode || 'Markdown',
      pinMessage: !!options.pin,
      silentNotification: !!options.silent,
      targetChatId,
      status: sentSuccess ? 'sent' : 'failed',
      sentAt: new Date().toISOString(),
      sentBy: adminName,
      telegramMessageId,
      recipientCount: storage.getMetrics().totalActiveMembers,
    });

    storage.addLog({
      timestamp: new Date().toISOString(),
      type: 'announcement',
      action: 'Broadcast Announcement',
      description: `Announcement "${title}" broadcasted to ${config.groupTitle || targetChatId} by ${adminName}.${options.pin ? ' (Pinned)' : ''}`,
      actor: adminName,
      success: sentSuccess,
      metadata: { announcementId: announcement.id, telegramMessageId },
    });

    return { success: sentSuccess, messageId: telegramMessageId, error: errorMsg };
  }
}

export const telegramService = new TelegramService();
