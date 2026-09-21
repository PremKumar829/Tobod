import { storage, getIstDateString } from './storage.js';
import { telegramService } from './telegram.js';

export class SchedulerEngine {
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastRecordedIstDate: string = '';

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastRecordedIstDate = getIstDateString(new Date());
    console.log(`[Scheduler] Background group automation scheduler started. Initial IST Date: ${this.lastRecordedIstDate}`);
    // Run immediate check, then schedule every 15 seconds
    this.tick();
    this.timer = setInterval(() => this.tick(), 15000);
  }

  public stop() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async tick() {
    try {
      const now = new Date();

      // Check for Indian Standard Time (IST) 12:00 AM Midnight Rollover
      const currentIstDate = getIstDateString(now);
      if (this.lastRecordedIstDate && this.lastRecordedIstDate !== currentIstDate) {
        console.log(`[Scheduler] 12:00 AM Midnight IST detected! Transition: ${this.lastRecordedIstDate} -> ${currentIstDate}`);
        storage.performMidnightIstReset(this.lastRecordedIstDate, currentIstDate);
      }
      this.lastRecordedIstDate = currentIstDate;

      const config = storage.getConfig();
      if (!config.scheduleEnabled) {
        return;
      }

      // Calculate current minutes in the day according to target timezone
      const timeString = now.toLocaleTimeString('en-US', {
        timeZone: config.timezone || 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });

      const [currentHour, currentMin] = timeString.split(':').map(Number);
      const currentTotalMinutes = currentHour * 60 + currentMin;

      let expectedStatus: 'open' | 'closed' = 'closed';

      // Check if multiple schedule slots are configured and enabled
      const enabledSlots = (config.scheduleSlots || []).filter(s => s.enabled);
      if (enabledSlots.length > 0) {
        let isAnySlotOpen = false;
        for (const slot of enabledSlots) {
          const [sOpenH, sOpenM] = (slot.openTime || '08:00').split(':').map(Number);
          const [sCloseH, sCloseM] = (slot.closeTime || '22:00').split(':').map(Number);
          const sOpenMinutes = sOpenH * 60 + sOpenM;
          const sCloseMinutes = sCloseH * 60 + sCloseM;

          if (sOpenMinutes < sCloseMinutes) {
            // Standard slot within same day (e.g. 09:00 - 13:00)
            if (currentTotalMinutes >= sOpenMinutes && currentTotalMinutes < sCloseMinutes) {
              isAnySlotOpen = true;
              break;
            }
          } else {
            // Overnight slot (e.g. 21:00 - 03:00)
            if (currentTotalMinutes >= sOpenMinutes || currentTotalMinutes < sCloseMinutes) {
              isAnySlotOpen = true;
              break;
            }
          }
        }
        expectedStatus = isAnySlotOpen ? 'open' : 'closed';
      } else {
        // Single default open/close time
        const [openHour, openMin] = (config.openTime || '08:00').split(':').map(Number);
        const [closeHour, closeMin] = (config.closeTime || '22:00').split(':').map(Number);
        const openTotalMinutes = openHour * 60 + openMin;
        const closeTotalMinutes = closeHour * 60 + closeMin;

        if (openTotalMinutes < closeTotalMinutes) {
          expectedStatus = (currentTotalMinutes >= openTotalMinutes && currentTotalMinutes < closeTotalMinutes)
            ? 'open'
            : 'closed';
        } else {
          expectedStatus = (currentTotalMinutes >= openTotalMinutes || currentTotalMinutes < closeTotalMinutes)
            ? 'open'
            : 'closed';
        }
      }

      // Check if day is active
      const currentDayOfWeek = now.getDay(); // 0-6
      if (Array.isArray(config.activeDays) && !config.activeDays.includes(currentDayOfWeek)) {
        expectedStatus = 'closed';
      }

      // Check if state needs to change
      if (config.currentGroupStatus !== expectedStatus && !config.manualOverride) {
        console.log(`[Scheduler] Transitioning group from ${config.currentGroupStatus} -> ${expectedStatus} (Current time: ${timeString})`);
        await this.handleStateTransition(expectedStatus, 'Automated Schedule Engine');
      }

      storage.updateConfig({ lastScheduleCheck: new Date().toISOString() });
    } catch (err) {
      console.error('[Scheduler] Error during tick:', err);
    }
  }

  public async handleStateTransition(newStatus: 'open' | 'closed', triggerSource: string) {
    const config = storage.getConfig();
    const previousStatus = config.currentGroupStatus;
    
    // Update config
    storage.updateConfig({
      currentGroupStatus: newStatus,
      manualOverride: false,
    });

    if (newStatus === 'closed') {
      // 1. Group is Closing
      // Broadcast closure notice if set
      if (config.closedNoticeMessage && config.botToken) {
        try {
          await telegramService.sendMessage(config.groupId, config.closedNoticeMessage);
        } catch (e) {
          console.warn('Failed to send group closed message to Telegram:', e);
        }
      }

      // Lock group chat permissions if enabled
      if (config.lockChatWhenClosed && config.botToken) {
        try {
          await telegramService.setChatPermissions(config.groupId, false);
        } catch (e) {
          console.warn('Could not lock chat permissions in Telegram:', e);
        }
      }

      storage.addLog({
        timestamp: new Date().toISOString(),
        type: 'schedule_transition',
        action: 'Group Closed',
        description: `Group closed by ${triggerSource}. All new join requests will be held in pending queue.`,
        actor: triggerSource,
        success: true,
      });

    } else {
      // 2. Group is Opening
      // Unlock group chat permissions if enabled
      if (config.lockChatWhenClosed && config.botToken) {
        try {
          await telegramService.setChatPermissions(config.groupId, true);
        } catch (e) {
          console.warn('Could not unlock chat permissions in Telegram:', e);
        }
      }

      // CRITICAL REQUIREMENT: "when group closed all joing request pending than Open the group all join request approve by bot"
      const pendingRequests = storage.getJoinRequests().filter(r => r.status === 'pending');
      let approvedCount = 0;

      if (pendingRequests.length > 0) {
        console.log(`[Scheduler] Group opened! Auto-approving ${pendingRequests.length} pending join requests...`);
        for (const req of pendingRequests) {
          try {
            if (config.botToken) {
              await telegramService.approveJoinRequest(config.groupId, req.telegramId);
            }
            storage.markRequestApproved(req.id, 'auto_schedule');
            approvedCount++;
          } catch (err) {
            console.error(`Error approving pending request ${req.id}:`, err);
          }
        }
      }

      // Broadcast open notice with auto-approve summary
      let openMessage = config.openedNoticeMessage;
      if (approvedCount > 0) {
        openMessage += `\n\n🎉 ${approvedCount} pending join request(s) have just been approved by the bot!`;
      }

      if (openMessage && config.botToken) {
        try {
          await telegramService.sendMessage(config.groupId, openMessage);
        } catch (e) {
          console.warn('Failed to send group opened message to Telegram:', e);
        }
      }

      storage.addLog({
        timestamp: new Date().toISOString(),
        type: 'schedule_transition',
        action: 'Group Opened & Requests Approved',
        description: `Group opened by ${triggerSource}. Approved ${approvedCount} pending join request(s).`,
        actor: triggerSource,
        success: true,
        metadata: { approvedCount },
      });
    }
  }

  public async forceOpen(adminName: string): Promise<{ approvedCount: number }> {
    const config = storage.getConfig();
    storage.updateConfig({ manualOverride: true, currentGroupStatus: 'open' });

    // Auto-approve all pending join requests
    const pendingRequests = storage.getJoinRequests().filter(r => r.status === 'pending');
    let approvedCount = 0;

    for (const req of pendingRequests) {
      if (config.botToken) {
        try {
          await telegramService.approveJoinRequest(config.groupId, req.telegramId);
        } catch (e) {
          console.warn('Failed to approve request via Telegram:', e);
        }
      }
      storage.markRequestApproved(req.id, `manual_open_by_${adminName}`);
      approvedCount++;
    }

    if (config.openedNoticeMessage && config.botToken) {
      try {
        await telegramService.sendMessage(config.groupId, `${config.openedNoticeMessage}\n\n(Group opened manually by ${adminName})`);
      } catch (e) {}
    }

    storage.addLog({
      timestamp: new Date().toISOString(),
      type: 'schedule_transition',
      action: 'Manual Group Open',
      description: `Group manually forced OPEN by ${adminName}. Approved ${approvedCount} pending join requests.`,
      actor: adminName,
      success: true,
      metadata: { approvedCount },
    });

    return { approvedCount };
  }

  public async forceClose(adminName: string) {
    const config = storage.getConfig();
    storage.updateConfig({ manualOverride: true, currentGroupStatus: 'closed' });

    if (config.closedNoticeMessage && config.botToken) {
      try {
        await telegramService.sendMessage(config.groupId, `${config.closedNoticeMessage}\n\n(Group closed manually by ${adminName})`);
      } catch (e) {}
    }

    storage.addLog({
      timestamp: new Date().toISOString(),
      type: 'schedule_transition',
      action: 'Manual Group Close',
      description: `Group manually forced CLOSED by ${adminName}. All incoming requests will be queued.`,
      actor: adminName,
      success: true,
    });
  }
}

export const schedulerEngine = new SchedulerEngine();
