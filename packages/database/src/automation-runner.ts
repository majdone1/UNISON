import { getNotificationAdapters, getWebhookAdapter, demoUuid, nowIso } from '@unison/shared';
import type { BoardItem } from '@unison/types';
import type { AutomationRule, AutomationRun, DemoStoreState } from './demo-store';

export interface AutomationRunResult {
  automationId: string;
  name: string;
  actionsFired: string[];
  skipped?: string;
}

export type AutomationEvent =
  | { type: 'item.status_changed'; previousStatus: string }
  | { type: 'item.created' }
  | { type: 'item.due_within' }
  | { type: 'item.updated'; fields?: string[] }
  | { type: 'item.group_changed'; previousGroupId: string };

const MAX_CHAIN_DEPTH = 3;
const chainDepth = new WeakMap<object, number>();

export interface AutomationCondition {
  field: string;
  op: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'is_blank' | 'not_blank';
  value?: unknown;
}

function fieldValue(item: BoardItem, field: string): unknown {
  if (field === 'status') return item.status;
  if (field === 'priority') return item.priority;
  if (field === 'progress') return item.progress;
  if (field === 'name') return item.name;
  if (field === 'dueDate') return item.dueDate;
  if (field === 'groupId') return item.groupId;
  if (field === 'assigneeIds') return item.assigneeIds;
  if (field.startsWith('values.')) return item.values[field.slice(7)];
  return item.values[field] ?? null;
}

function matchCondition(item: BoardItem, cond: AutomationCondition): boolean {
  const raw = fieldValue(item, cond.field);
  switch (cond.op) {
    case 'eq':
      return String(raw ?? '') === String(cond.value ?? '');
    case 'neq':
      return String(raw ?? '') !== String(cond.value ?? '');
    case 'gt':
      return Number(raw) > Number(cond.value);
    case 'lt':
      return Number(raw) < Number(cond.value);
    case 'contains':
      return String(raw ?? '')
        .toLowerCase()
        .includes(String(cond.value ?? '').toLowerCase());
    case 'is_blank':
      return raw == null || raw === '' || (Array.isArray(raw) && raw.length === 0);
    case 'not_blank':
      return !(raw == null || raw === '' || (Array.isArray(raw) && raw.length === 0));
    default:
      return false;
  }
}

function matchingRules(
  store: DemoStoreState,
  item: BoardItem,
  event: AutomationEvent,
): AutomationRule[] {
  return store.automations.filter((a) => {
    if (!a.enabled || a.orgId !== item.orgId) return false;
    if (a.boardId && a.boardId !== item.boardId) return false;
    if (a.trigger.type !== event.type) return false;
    if (event.type === 'item.status_changed') {
      if (a.trigger.to && a.trigger.to !== item.status) return false;
      if (a.trigger.from && a.trigger.from !== event.previousStatus) return false;
    }
    if (event.type === 'item.due_within') {
      if (!item.dueDate) return false;
      const within = a.trigger.withinDays ?? 2;
      const ms = new Date(item.dueDate).getTime() - Date.now();
      if (ms < 0 || ms > within * 86400000) return false;
    }
    if (event.type === 'item.group_changed') {
      if (a.trigger.to && a.trigger.to !== item.groupId) return false;
      if (a.trigger.from && a.trigger.from !== event.previousGroupId) return false;
    }
    const conditions = a.conditions ?? [];
    if (conditions.length) {
      const ok = conditions.every((c) => matchCondition(item, c));
      if (!ok) return false;
    }
    return true;
  });
}

function fireActions(
  store: DemoStoreState,
  rule: AutomationRule,
  item: BoardItem,
  actorUserId: string,
  depth: number,
): string[] {
  const actionsFired: string[] = [];
  const adapters = getNotificationAdapters();
  const now = nowIso();

  for (const action of rule.actions) {
    if (action.type === 'assign.actor') {
      if (!item.assigneeIds.includes(actorUserId)) {
        item.assigneeIds = [...item.assigneeIds, actorUserId];
      }
      actionsFired.push(action.type);
      continue;
    }
    if (action.type === 'assign.user' && action.userId) {
      if (!item.assigneeIds.includes(action.userId)) {
        item.assigneeIds = [...item.assigneeIds, action.userId];
      }
      actionsFired.push(action.type);
      continue;
    }
    if (action.type === 'set_status' && action.status) {
      const prev = item.status;
      if (prev !== action.status) {
        item.status = action.status as BoardItem['status'];
        actionsFired.push(action.type);
        if (depth < MAX_CHAIN_DEPTH) {
          runAutomations(
            store,
            item,
            { type: 'item.status_changed', previousStatus: prev },
            actorUserId,
            depth + 1,
          );
        }
      }
      continue;
    }
    if (action.type === 'set_field' && action.field) {
      if (action.field === 'priority' && action.value != null) {
        item.priority = String(action.value) as BoardItem['priority'];
      } else if (action.field === 'progress' && action.value != null) {
        item.progress = Number(action.value);
      } else if (action.field === 'dueDate') {
        item.dueDate = action.value == null ? null : String(action.value);
      } else {
        item.values = { ...item.values, [action.field]: action.value };
      }
      item.updatedAt = now;
      actionsFired.push(action.type);
      continue;
    }
    if (action.type === 'set_date' && action.field === 'dueDate') {
      const days = Number(action.value ?? 0);
      item.dueDate = new Date(Date.now() + days * 86400000).toISOString();
      actionsFired.push(action.type);
      continue;
    }
    if (action.type === 'move_group' && action.groupId) {
      const prev = item.groupId;
      item.groupId = action.groupId;
      actionsFired.push(action.type);
      if (depth < MAX_CHAIN_DEPTH && prev !== action.groupId) {
        runAutomations(
          store,
          item,
          { type: 'item.group_changed', previousGroupId: prev },
          actorUserId,
          depth + 1,
        );
      }
      continue;
    }
    if (action.type === 'create_subitem') {
      const name = String(action.value ?? 'Subitem');
      store.items.push({
        id: demoUuid(`auto-sub-${Date.now()}`),
        boardId: item.boardId,
        groupId: item.groupId,
        orgId: item.orgId,
        parentItemId: item.id,
        name,
        status: 'not_started',
        priority: 'none',
        position: store.items.filter((i) => i.parentItemId === item.id).length,
        progress: 0,
        assigneeIds: [],
        watcherIds: [],
        values: {},
        createdBy: actorUserId,
        updatedBy: actorUserId,
        createdAt: now,
        updatedAt: now,
      });
      actionsFired.push(action.type);
      continue;
    }
    if (action.type === 'webhook.http' && action.url) {
      const delivery = getWebhookAdapter().deliver({
        orgId: item.orgId,
        automationId: rule.id,
        itemId: item.id,
        url: action.url,
        method: action.method ?? 'POST',
        headers: action.headers,
        body: {
          event: rule.trigger.type,
          itemId: item.id,
          boardId: item.boardId,
          name: item.name,
          status: item.status,
          automationId: rule.id,
        },
      });
      store.webhookDeliveries ??= [];
      store.webhookDeliveries.unshift(delivery);
      if (store.webhookDeliveries.length > 200) store.webhookDeliveries.length = 200;
      actionsFired.push(action.type);
      continue;
    }

    /** Post a system note into the org general channel (communication center). */
    if (action.type === 'notify.channel') {
      const channel =
        store.chatChannels?.find(
          (c) =>
            c.orgId === item.orgId &&
            !c.archivedAt &&
            (action.value ? c.id === String(action.value) || c.name === String(action.value) : c.kind === 'workspace'),
        ) ?? store.chatChannels?.find((c) => c.orgId === item.orgId && c.kind === 'workspace');
      if (channel) {
        store.chatMessages ??= [];
        store.chatMessages.push({
          id: demoUuid(`auto-msg-${Date.now()}`),
          orgId: item.orgId,
          channelId: channel.id,
          authorId: actorUserId,
          body: `Automation “${rule.name}”: ${item.name} → ${item.status}`,
          mentionUserIds: [],
          linkRefs: [
            {
              type: 'item',
              id: item.id,
              href: `/app/boards/${item.boardId}?item=${item.id}`,
            },
          ],
          createdAt: now,
          updatedAt: now,
        });
        actionsFired.push(action.type);
      }
      continue;
    }

    /** Slack integration mock — only fires if connection is connected_mock; never fakes live Slack. */
    if (action.type === 'integration.slack') {
      const conn = store.integrationConnections?.find(
        (c) => c.orgId === item.orgId && c.providerId === 'slack',
      );
      if (!conn || conn.status !== 'connected_mock') {
        actionsFired.push('integration.slack:skipped_not_connected');
        continue;
      }
      store.webhookDeliveries ??= [];
      store.webhookDeliveries.unshift({
        id: demoUuid(`slack-mock-${Date.now()}`),
        orgId: item.orgId,
        automationId: rule.id,
        itemId: item.id,
        url: 'https://hooks.example.com/slack/mock',
        method: 'POST',
        status: 'mock_ok',
        statusCode: 200,
        detail: 'Slack mock delivery (no live network)',
        requestBody: {
          text: `[UNISON mock Slack] ${rule.name}: ${item.name} (${item.status})`,
          credentialRef: '[ref]',
        },
        createdAt: now,
      });
      actionsFired.push(action.type);
      continue;
    }

    const recipients = new Set<string>();
    if (action.type === 'notify.assignees') item.assigneeIds.forEach((id) => recipients.add(id));
    if (action.type === 'notify.watchers') item.watcherIds.forEach((id) => recipients.add(id));
    if (action.type === 'notify.email' || action.type === 'notify.push') {
      item.assigneeIds.forEach((id) => recipients.add(id));
      item.watcherIds.forEach((id) => recipients.add(id));
    }
    if (action.userId) recipients.add(action.userId);

    for (const userId of recipients) {
      const prefs = store.notificationPrefs?.[userId];
      if (prefs?.muteAutomation) continue;
      if (prefs && prefs.inApp === false && action.channel === 'in_app') continue;
      store.notifications.unshift({
        id: demoUuid(`notif-auto-${Date.now()}-${userId}-${Math.random()}`),
        userId,
        orgId: item.orgId,
        type: `automation.${rule.id}`,
        title: rule.name,
        body: `${item.name} (${rule.trigger.type})`,
        href: `/app/boards/${item.boardId}?item=${item.id}`,
        createdAt: now,
      });
      const channel =
        action.channel === 'email' || action.type === 'notify.email'
          ? 'email'
          : action.channel === 'push' || action.type === 'notify.push'
            ? 'push'
            : action.channel === 'desktop'
              ? 'desktop'
              : null;
      if (channel) {
        if (prefs && channel === 'email' && prefs.email === false) continue;
        if (prefs && channel === 'push' && prefs.push === false) continue;
        const adapter = adapters.find((a) => a.channel === channel);
        void adapter?.send({
          userId,
          title: rule.name,
          body: `${item.name}`,
          href: `/app/boards/${item.boardId}?item=${item.id}`,
        });
      }
    }
    actionsFired.push(action.type);
  }
  return actionsFired;
}

function recordRun(
  store: DemoStoreState,
  run: Omit<AutomationRun, 'id' | 'createdAt'> & { createdAt?: string },
) {
  store.automationRuns ??= [];
  store.automationRuns.unshift({
    id: demoUuid(`auto-run-${Date.now()}-${Math.random()}`),
    createdAt: run.createdAt ?? nowIso(),
    orgId: run.orgId,
    automationId: run.automationId,
    itemId: run.itemId,
    triggerType: run.triggerType,
    actionsFired: run.actionsFired,
    status: run.status,
    detail: run.detail,
  });
  // Cap history
  if (store.automationRuns.length > 200) {
    store.automationRuns.length = 200;
  }
}

export function runAutomations(
  store: DemoStoreState,
  item: BoardItem,
  event: AutomationEvent,
  actorUserId: string,
  depth = 0,
): AutomationRunResult[] {
  if (depth >= MAX_CHAIN_DEPTH) {
    recordRun(store, {
      orgId: item.orgId,
      automationId: 'loop-guard',
      itemId: item.id,
      triggerType: event.type,
      actionsFired: [],
      status: 'skipped_loop',
      detail: `Max chain depth ${MAX_CHAIN_DEPTH}`,
    });
    return [
      {
        automationId: 'loop-guard',
        name: 'Loop protection',
        actionsFired: [],
        skipped: 'max_depth',
      },
    ];
  }

  const matching = matchingRules(store, item, event);
  const results: AutomationRunResult[] = [];
  const now = nowIso();
  chainDepth.set(store, depth);

  for (const rule of matching) {
    // Idempotency-ish: skip if same rule already ran on this item in this tick chain
    const recent = (store.automationRuns ?? []).find(
      (r) =>
        r.automationId === rule.id &&
        r.itemId === item.id &&
        r.triggerType === event.type &&
        Date.now() - new Date(r.createdAt).getTime() < 50,
    );
    if (recent && depth > 0) {
      results.push({
        automationId: rule.id,
        name: rule.name,
        actionsFired: [],
        skipped: 'duplicate_tick',
      });
      continue;
    }

    try {
      const actionsFired = fireActions(store, rule, item, actorUserId, depth);
      rule.lastRunAt = now;
      rule.runCount += 1;
      store.activity.unshift({
        id: demoUuid(`activity-auto-${Date.now()}-${rule.id}`),
        orgId: item.orgId,
        boardId: item.boardId,
        itemId: item.id,
        actorUserId,
        eventType: 'automation.ran',
        payload: {
          automationId: rule.id,
          name: rule.name,
          actionsFired,
          trigger: event.type,
          conditions: rule.conditions ?? [],
        },
        createdAt: now,
      });
      recordRun(store, {
        orgId: item.orgId,
        automationId: rule.id,
        itemId: item.id,
        triggerType: event.type,
        actionsFired,
        status: 'ok',
      });
      results.push({ automationId: rule.id, name: rule.name, actionsFired });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN';
      recordRun(store, {
        orgId: item.orgId,
        automationId: rule.id,
        itemId: item.id,
        triggerType: event.type,
        actionsFired: [],
        status: 'error',
        detail: message,
      });
      results.push({
        automationId: rule.id,
        name: rule.name,
        actionsFired: [],
        skipped: message,
      });
    }
  }
  return results;
}

/** Backward-compatible alias used by older tests */
export function runStatusAutomations(
  store: DemoStoreState,
  item: BoardItem,
  previousStatus: string,
  actorUserId: string,
): AutomationRunResult[] {
  if (previousStatus === item.status) return [];
  return runAutomations(
    store,
    item,
    { type: 'item.status_changed', previousStatus },
    actorUserId,
  );
}
