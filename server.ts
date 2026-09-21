import express from 'express';
import path from 'path';
import { execSync } from 'child_process';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { storage, getIstDateString } from './server/storage.js';
import { telegramService } from './server/telegram.js';
import { schedulerEngine } from './server/scheduler.js';
import { formatWelcomeMessage } from './src/utils/textStyler.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize scheduler and polling
  schedulerEngine.start();
  telegramService.startPolling();

  // --- API ROUTES FIRST ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Get full metrics & dashboard summary
  app.get('/api/metrics', (req, res) => {
    try {
      const metrics = storage.getMetrics();
      res.json(metrics);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get bot config
  app.get('/api/config', (req, res) => {
    try {
      const config = storage.getConfig();
      // Mask token slightly for security in API response
      const maskedToken = config.botToken ? `${config.botToken.substring(0, 6)}...${config.botToken.slice(-4)}` : '';
      res.json({
        ...config,
        hasBotToken: !!config.botToken,
        maskedToken,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update bot config
  app.post('/api/config', (req, res) => {
    try {
      const updates = req.body;
      const updated = storage.updateConfig(updates);
      
      storage.addLog({
        timestamp: new Date().toISOString(),
        type: 'admin_action',
        action: 'Bot Configuration Updated',
        description: 'System settings, schedule, or automation parameters were modified.',
        actor: req.body.adminName || 'Admin',
        success: true,
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Test bot token connection
  app.post('/api/bot/test-connection', async (req, res) => {
    try {
      const token = req.body.token || storage.getConfig().botToken;
      if (!token) {
        return res.status(400).json({ ok: false, error: 'No Telegram bot token provided.' });
      }

      const info = await telegramService.getBotInfo(token);
      if (info.ok && info.result) {
        storage.updateConfig({
          botToken: token,
          botUsername: info.result.username || '',
          botFirstName: info.result.first_name || '',
          isBotRunning: true,
        });

        storage.addLog({
          timestamp: new Date().toISOString(),
          type: 'bot_status',
          action: 'Bot Connection Verified',
          description: `Connected to Telegram as @${info.result.username} (${info.result.first_name})`,
          actor: 'System',
          success: true,
        });

        res.json({ ok: true, bot: info.result });
      } else {
        res.status(400).json({ ok: false, error: info.description || 'Invalid Bot Token' });
      }
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Get full bot diagnostics and health status
  app.get('/api/bot/diagnostics', async (req, res) => {
    try {
      const diagnostics = await telegramService.runFullDiagnostics();
      res.json(diagnostics);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Clear conflicting webhooks to restore long polling
  app.post('/api/bot/clear-webhook', async (req, res) => {
    try {
      const del = await telegramService.deleteWebhook(false);
      telegramService.stopPolling();
      telegramService.startPolling();
      res.json({ success: del.ok, description: del.description || 'Webhook cleared. Long-polling restarted.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Send a test ping message to a specific chat ID or owner
  app.post('/api/bot/send-test', async (req, res) => {
    try {
      const { chatId } = req.body;
      const config = storage.getConfig();
      const targetId = chatId || config.ownerChatId;

      if (!config.botToken) {
        return res.status(400).json({ ok: false, error: 'Telegram Bot Token is not configured yet.' });
      }
      if (!targetId) {
        return res.status(400).json({ ok: false, error: 'Target Chat ID is required.' });
      }

      const pingMsg = [
        `🔔 *Telegram Bot Test Ping*`,
        `━━━━━━━━━━━━━━━━━━━━━━`,
        `✅ Your bot is responding and communicating with Telegram API!`,
        `⏰ Timestamp: \`${new Date().toISOString()}\``,
        `🤖 Bot Username: @${config.botUsername || 'GroupManagerBot'}`,
        `🚪 Group State: ${config.currentGroupStatus === 'open' ? '🟢 OPEN' : '🔴 CLOSED'}`
      ].join('\n');

      const sendRes = await telegramService.sendMessage(targetId, pingMsg, { parse_mode: 'Markdown' });
      res.json(sendRes);
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Get members with filtering (Indian Standard Time - IST aware)
  app.get('/api/members', (req, res) => {
    try {
      const { filter, search, date } = req.query as { filter?: string; search?: string; date?: string };
      let members = storage.getMembersList();

      const now = new Date();
      const todayDateIst = getIstDateString(now);
      const yesterdayDateObj = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayDateIst = getIstDateString(yesterdayDateObj);

      if (filter === 'today_joined') {
        members = members.filter(m => getIstDateString(m.lastJoinedAt) === todayDateIst);
      } else if (filter === 'today_exited') {
        members = members.filter(m => m.lastExitedAt && getIstDateString(m.lastExitedAt) === todayDateIst);
      } else if (filter === 'yesterday_joined') {
        members = members.filter(m => getIstDateString(m.lastJoinedAt) === yesterdayDateIst);
      } else if (filter === 'yesterday_exited') {
        members = members.filter(m => m.lastExitedAt && getIstDateString(m.lastExitedAt) === yesterdayDateIst);
      } else if (filter === 'date' && date) {
        members = members.filter(m => getIstDateString(m.lastJoinedAt) === date || (m.lastExitedAt && getIstDateString(m.lastExitedAt) === date));
      } else if (filter === 'new') {
        members = members.filter(m => !m.isRejoined && m.joinCount === 1);
      } else if (filter === 'rejoined') {
        members = members.filter(m => m.isRejoined || m.joinCount > 1);
      } else if (filter === 'active') {
        members = members.filter(m => m.status === 'active');
      } else if (filter === 'exited') {
        members = members.filter(m => m.status === 'exited');
      }

      if (search) {
        const q = search.toLowerCase();
        members = members.filter(m =>
          m.username?.toLowerCase().includes(q) ||
          m.firstName?.toLowerCase().includes(q) ||
          m.lastName?.toLowerCase().includes(q) ||
          m.telegramId.includes(q)
        );
      }

      // Sort by last joined recent first
      members.sort((a, b) => new Date(b.lastJoinedAt).getTime() - new Date(a.lastJoinedAt).getTime());

      res.json(members);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Remove member from group (Kick or Ban from Web Dashboard)
  app.post('/api/members/:telegramId/remove', async (req, res) => {
    try {
      const { telegramId } = req.params;
      const { reason, adminName, ban } = req.body;
      const config = storage.getConfig();

      let tgResult: { ok: boolean; description?: string } = { ok: true, description: '' };
      if (config.botToken && config.groupId) {
        if (ban) {
          tgResult = await telegramService.banChatMember(config.groupId, telegramId);
        } else {
          tgResult = await telegramService.kickChatMember(config.groupId, telegramId);
        }
      }

      const removalResult = storage.removeMemberFromGroup(
        telegramId,
        {
          actor: adminName || 'Dashboard Admin',
          reason: reason || (ban ? 'Banned from Web Dashboard' : 'Removed from Web Dashboard'),
          ban: !!ban
        }
      );

      res.json({
        success: removalResult.success,
        member: removalResult.member,
        message: removalResult.message,
        telegramResult: tgResult,
        action: ban ? 'banned' : 'removed'
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get join requests
  app.get('/api/join-requests', (req, res) => {
    try {
      const { status } = req.query;
      let requests = storage.getJoinRequests();
      if (status && typeof status === 'string' && status !== 'all') {
        requests = requests.filter(r => r.status === status);
      }
      res.json(requests);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Approve single join request
  app.post('/api/join-requests/:id/approve', async (req, res) => {
    try {
      const { id } = req.params;
      const { adminName } = req.body;
      const config = storage.getConfig();
      
      const reqItem = storage.getJoinRequests().find(r => r.id === id);
      if (!reqItem) {
        return res.status(404).json({ error: 'Request not found' });
      }

      const targetChatId = reqItem.groupId || config.groupId;
      let tgResult: { ok: boolean; description?: string } = { ok: true };

      if (config.botToken) {
        tgResult = await telegramService.approveJoinRequest(targetChatId, reqItem.telegramId);
        console.log(`[Telegram Approve] User: ${reqItem.telegramId} in Chat: ${targetChatId} ->`, tgResult);
        
        // If approval succeeded in Telegram (or in simulator mode), send the custom welcome message!
        if (tgResult.ok) {
          await telegramService.sendWelcomeMessage(
            targetChatId,
            {
              id: reqItem.telegramId,
              username: reqItem.username,
              first_name: reqItem.firstName,
              last_name: reqItem.lastName,
            },
            reqItem.groupTitle || config.groupTitle
          );
        }
      }

      const approved = storage.markRequestApproved(id, adminName || 'Admin');
      
      storage.addLog({
        timestamp: new Date().toISOString(),
        type: 'approval',
        action: 'Manual Join Approval',
        description: `Approved join request for ${reqItem.firstName} ${reqItem.lastName} (@${reqItem.username || reqItem.telegramId}) in ${reqItem.groupTitle || targetChatId}${!tgResult.ok ? ` [Telegram: ${tgResult.description}]` : ''}`,
        actor: adminName || 'Admin',
        success: tgResult.ok,
      });

      res.json({
        success: true,
        request: approved,
        telegramResult: tgResult,
        warning: !tgResult.ok ? tgResult.description : undefined
      });
    } catch (err: any) {
      console.error('Error approving join request:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Reject single join request
  app.post('/api/join-requests/:id/reject', async (req, res) => {
    try {
      const { id } = req.params;
      const { adminName } = req.body;
      const config = storage.getConfig();

      const reqItem = storage.getJoinRequests().find(r => r.id === id);
      if (!reqItem) {
        return res.status(404).json({ error: 'Request not found' });
      }

      const targetChatId = reqItem.groupId || config.groupId;
      let tgResult: { ok: boolean; description?: string } = { ok: true };

      if (config.botToken) {
        tgResult = await telegramService.declineJoinRequest(targetChatId, reqItem.telegramId);
      }

      const rejected = storage.markRequestRejected(id, adminName || 'Admin');

      storage.addLog({
        timestamp: new Date().toISOString(),
        type: 'rejection',
        action: 'Manual Join Rejection',
        description: `Declined join request for ${reqItem.firstName} ${reqItem.lastName} (@${reqItem.username || reqItem.telegramId}) in ${reqItem.groupTitle || targetChatId}`,
        actor: adminName || 'Admin',
        success: true,
      });

      res.json({ success: true, request: rejected, telegramResult: tgResult });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Approve all pending join requests
  app.post('/api/join-requests/approve-all', async (req, res) => {
    try {
      const { adminName } = req.body;
      const config = storage.getConfig();
      const pending = storage.getJoinRequests().filter(r => r.status === 'pending');
      const results: { id: string; ok: boolean; description?: string }[] = [];

      for (const p of pending) {
        const targetChatId = p.groupId || config.groupId;
        if (config.botToken) {
          try {
            const res = await telegramService.approveJoinRequest(targetChatId, p.telegramId);
            results.push({ id: p.id, ok: res.ok, description: res.description });
            if (res.ok) {
              await telegramService.sendWelcomeMessage(
                targetChatId,
                { id: p.telegramId, username: p.username, first_name: p.firstName, last_name: p.lastName },
                p.groupTitle || config.groupTitle
              );
            }
          } catch (e: any) {
            results.push({ id: p.id, ok: false, description: e.message });
            console.warn('Error in bulk approve:', e);
          }
        }
      }

      const approved = storage.approveAllPendingRequests(adminName || 'Admin Bulk Approval');

      storage.addLog({
        timestamp: new Date().toISOString(),
        type: 'approval',
        action: 'Bulk Join Approval',
        description: `Bulk approved ${approved.length} pending join request(s).`,
        actor: adminName || 'Admin',
        success: true,
        metadata: { approvedCount: approved.length },
      });

      res.json({ success: true, approvedCount: approved.length, results });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Toggle group open / close manually
  app.post('/api/group/toggle-status', async (req, res) => {
    try {
      const { status, adminName } = req.body as { status: 'open' | 'closed'; adminName?: string };
      const actor = adminName || 'Admin';

      if (status === 'open') {
        const result = await schedulerEngine.forceOpen(actor);
        res.json({ success: true, newStatus: 'open', approvedCount: result.approvedCount });
      } else {
        await schedulerEngine.forceClose(actor);
        res.json({ success: true, newStatus: 'closed' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Broadcast announcement
  app.post('/api/announcements', async (req, res) => {
    try {
      const { title, text, pin, silent, parseMode, adminName } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Announcement message text is required.' });
      }

      const result = await telegramService.broadcastAnnouncement(title, text, {
        pin: !!pin,
        silent: !!silent,
        parseMode: parseMode || 'Markdown',
        adminName: adminName || 'Admin',
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get announcements history
  app.get('/api/announcements', (req, res) => {
    try {
      const list = storage.getAnnouncements();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get owner notifications feed
  app.get('/api/owner-notifications', (req, res) => {
    try {
      const notifs = storage.getOwnerNotifications();
      res.json(notifs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get audit activity logs
  app.get('/api/logs', (req, res) => {
    try {
      const logs = storage.getLogs();
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Export CSV reports
  app.get('/api/export/:type', (req, res) => {
    try {
      const { type } = req.params;
      const validTypes = ['today_activity', 'all_members', 'join_requests', 'audit_logs'] as const;
      if (!validTypes.includes(type as any)) {
        return res.status(400).send('Invalid export type');
      }

      const csvContent = storage.generateCsv(type as any);
      const filename = `telegram_${type}_${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  // --- 2-LEVEL ADMIN MANAGEMENT & AUTH ---

  // Admin login with PIN
  app.post('/api/auth/login', (req, res) => {
    try {
      const { username, pin } = req.body;
      const admin = storage.authenticate(username, pin);
      if (admin) {
        storage.addLog({
          timestamp: new Date().toISOString(),
          type: 'admin_action',
          action: 'Admin Authenticated',
          description: `${admin.name} logged in with role ${admin.role}.`,
          actor: admin.name,
          success: true,
        });
        res.json({ success: true, admin });
      } else {
        res.status(401).json({ success: false, error: 'Invalid username or PIN' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get admins list
  app.get('/api/admins', (req, res) => {
    try {
      const admins = storage.getAdmins().map(a => ({
        id: a.id,
        name: a.name,
        username: a.username,
        role: a.role,
        telegramUserId: a.telegramUserId,
        permissions: a.permissions,
        createdAt: a.createdAt,
        lastLoginAt: a.lastLoginAt,
      }));
      res.json(admins);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Database storage statistics and tables info
  app.get('/api/database/stats', (req, res) => {
    try {
      const stats = storage.getDatabaseStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Download complete database JSON backup
  app.get('/api/database/backup', (req, res) => {
    try {
      const backupJson = storage.exportDatabaseBackup();
      const filename = `telegram_bot_db_backup_${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(backupJson);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Direct download full project source archive (.zip)
  app.get('/api/project/export-zip', (req, res) => {
    try {
      const zipBuffer = execSync('git archive --format=zip -9 HEAD', { cwd: process.cwd() });
      const filename = `telegram_group_manager_${new Date().toISOString().split('T')[0]}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(zipBuffer);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create zip archive: ' + err.message });
    }
  });

  // Direct download full project source archive (.tar.gz)
  app.get('/api/project/export-archive', (req, res) => {
    try {
      const archiveBuffer = execSync('git archive --format=tar.gz HEAD', { cwd: process.cwd() });
      const filename = `telegram_group_manager_src_${new Date().toISOString().split('T')[0]}.tar.gz`;
      res.setHeader('Content-Type', 'application/gzip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(archiveBuffer);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create source code archive: ' + err.message });
    }
  });

  // Create or update admin (Level 1 only)
  app.post('/api/admins', (req, res) => {
    try {
      const adminData = req.body;
      const saved = storage.saveAdmin(adminData);
      storage.addLog({
        timestamp: new Date().toISOString(),
        type: 'admin_action',
        action: 'Admin User Configured',
        description: `Admin "${saved.name}" (${saved.role}) was added or updated.`,
        actor: 'Level 1 Owner',
        success: true,
      });
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete admin
  app.delete('/api/admins/:id', (req, res) => {
    try {
      const { id } = req.params;
      const ok = storage.deleteAdmin(id);
      if (!ok) {
        return res.status(400).json({ error: 'Cannot delete Level 1 Super Admin / Owner account.' });
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- DATA CLEANUP / RESET ENDPOINT ---
  app.post('/api/data/clear', (req, res) => {
    try {
      const { target, preservePending } = req.body;
      const validTargets = ['requests', 'members', 'logs', 'notifications', 'all'];
      if (!validTargets.includes(target)) {
        return res.status(400).json({ error: 'Invalid clear target' });
      }
      const result = storage.clearData(target, { preservePending: !!preservePending });
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- MULTI-GROUP MANAGEMENT ENDPOINTS ---
  app.get('/api/groups', (req, res) => {
    try {
      const groups = storage.getManagedGroups();
      res.json(groups);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/groups', (req, res) => {
    try {
      const { groupId, title, inviteLink, status } = req.body;
      if (!groupId || !title) {
        return res.status(400).json({ error: 'Group ID and Group Name are required' });
      }
      const newGroup = storage.addManagedGroup({ groupId, title, inviteLink, status });
      res.json(newGroup);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/groups/:id', (req, res) => {
    try {
      const updated = storage.updateManagedGroup(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Group not found' });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/groups/:id', (req, res) => {
    try {
      const ok = storage.deleteManagedGroup(req.params.id);
      if (!ok) return res.status(400).json({ error: 'Cannot delete the only remaining active group' });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/groups/:id/activate', (req, res) => {
    try {
      const active = storage.setActiveGroup(req.params.id);
      if (!active) return res.status(404).json({ error: 'Group not found' });
      res.json({ success: true, activeGroup: active });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- WELCOME MESSAGE TEST & PREVIEW ---
  app.post('/api/welcome/test-send', async (req, res) => {
    try {
      const { chatId, sampleUsername, sampleName, groupName, fontStyle, template } = req.body;
      const config = storage.getConfig();
      const targetChat = chatId || config.groupId;

      const formatted = formatWelcomeMessage(
        template || config.welcomeMessageTemplate,
        {
          username: sampleUsername || 'JohnDoe',
          firstName: sampleName || 'John',
          lastName: 'Doe'
        },
        groupName || config.groupTitle,
        fontStyle || config.welcomeMessageFont || 'bold_serif'
      );

      let sendResult: any = { ok: true, simulated: true };
      if (config.botToken && targetChat) {
        sendResult = await telegramService.sendMessage(targetChat, formatted);
      }

      res.json({
        success: true,
        formattedMessage: formatted,
        telegramResult: sendResult
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- INTERACTIVE EVENT SIMULATOR (Sandbox for testing) ---
  app.post('/api/simulate', async (req, res) => {
    try {
      const { eventType, payload } = req.body;

      if (eventType === 'new_join_request') {
        // Generate random user who has never joined
        const randomId = Math.floor(100000 + Math.random() * 900000);
        const names = ['Liam', 'Emma', 'Noah', 'Olivia', 'William', 'Ava', 'James', 'Isabella', 'Benjamin', 'Mia'];
        const name = names[Math.floor(Math.random() * names.length)];
        const result = await telegramService.handleJoinRequest({
          id: randomId,
          first_name: name,
          last_name: 'Simulated',
          username: `${name.toLowerCase()}_${Math.floor(Math.random() * 100)}`,
        });
        return res.json({ success: true, result });
      }

      if (eventType === 'rejoin_request') {
        // Pick an existing member to simulate rejoining
        const members = storage.getMembersList();
        const target = members[Math.floor(Math.random() * members.length)] || {
          telegramId: '1002',
          firstName: 'David',
          lastName: 'Miller',
          username: 'david_crypto'
        };

        const result = await telegramService.handleJoinRequest({
          id: target.telegramId,
          first_name: target.firstName,
          last_name: target.lastName,
          username: target.username,
        });
        return res.json({ success: true, result });
      }

      if (eventType === 'member_exit') {
        const activeMembers = storage.getMembersList().filter(m => m.status === 'active');
        if (activeMembers.length > 0) {
          const victim = activeMembers[Math.floor(Math.random() * activeMembers.length)];
          storage.recordExit(victim.telegramId, victim.username);
          storage.addLog({
            timestamp: new Date().toISOString(),
            type: 'admin_action',
            action: 'Member Exited (Simulated)',
            description: `${victim.firstName} ${victim.lastName} left the group.`,
            actor: 'Simulator',
            success: true,
          });
          return res.json({ success: true, member: victim });
        }
        return res.json({ success: false, message: 'No active members to exit' });
      }

      if (eventType === 'trigger_open') {
        const result = await schedulerEngine.forceOpen('Simulator');
        return res.json({ success: true, approvedCount: result.approvedCount });
      }

      if (eventType === 'trigger_close') {
        await schedulerEngine.forceClose('Simulator');
        return res.json({ success: true });
      }

      res.status(400).json({ error: 'Unknown simulation event' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Telegram Webhook endpoint for live bot
  app.post('/api/telegram/webhook', async (req, res) => {
    try {
      const update = req.body;
      if (update && update.update_id) {
        await telegramService.processUpdate(update);
      }
      res.json({ ok: true });
    } catch (err) {
      console.error('Webhook processing error:', err);
      res.status(200).json({ ok: true }); // Always return 200 to Telegram
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Telegram Bot Manager server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
