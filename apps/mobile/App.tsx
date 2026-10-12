import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api } from './src/api';
import { colors } from './src/theme';
import { enqueue, flushQueue, loadQueue, type OfflineMutation } from './src/offline-queue';

type Screen = 'auth' | 'mywork' | 'boards' | 'board' | 'item' | 'notifications';
type ItemTab = 'overview' | 'columns' | 'updates' | 'files';

interface SessionUser {
  id: string;
  displayName: string;
  email: string;
}

interface Board {
  id: string;
  name: string;
  description?: string | null;
}

interface Column {
  id: string;
  name: string;
  type: string;
  settings?: { systemField?: string; formula?: string };
}

interface Item {
  id: string;
  name: string;
  status: string;
  priority: string;
  boardId: string;
  groupId?: string;
  description?: string | null;
  progress?: number;
  values?: Record<string, unknown>;
  parentItemId?: string | null;
  dueDate?: string | null;
}

interface Comment {
  id: string;
  body: string;
  itemId?: string;
}

interface Notification {
  id: string;
  title: string;
  body: string;
  href?: string | null;
  readAt?: string | null;
}

interface Attachment {
  id: string;
  fileName: string;
  sizeBytes: number;
}

const STATUSES = ['not_started', 'working', 'stuck', 'done', 'cancelled'];

/** Deep-link architecture: parse /app/boards/:boardId?item=:itemId */
function parseDeepLink(href?: string | null): { boardId?: string; itemId?: string } {
  if (!href) return {};
  const match = href.match(/\/app\/boards\/([^/?]+)(?:\?item=([^&]+))?/);
  if (!match) return {};
  return { boardId: match[1], itemId: match[2] };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('auth');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [myWork, setMyWork] = useState<Item[]>([]);
  const [buckets, setBuckets] = useState<Record<string, Item[]>>({});
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [itemTab, setItemTab] = useState<ItemTab>('overview');
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [cameraStub, setCameraStub] = useState<string | null>(null);
  const [pendingOffline, setPendingOffline] = useState(0);

  const loadSession = useCallback(async () => {
    const data = await api<{
      session: { user: SessionUser };
      users: Array<SessionUser & { platformRole?: string }>;
    }>('/api/session');
    setSessionUser(data.session.user);
    setUsers(
      (data.users ?? []).map((u) => ({
        id: u.id,
        displayName: u.displayName,
        email: u.email,
      })),
    );
  }, []);

  useEffect(() => {
    void loadSession().catch((err: Error) => setError(err.message));
  }, [loadSession]);

  useEffect(() => {
    setPendingOffline(loadQueue().length);
  }, [screen]);

  const syncOffline = useCallback(async () => {
    const result = await flushQueue(async (m: OfflineMutation) => {
      if (m.type === 'item.patch') {
        await api(`/api/items/${m.itemId}`, {
          method: 'PATCH',
          body: JSON.stringify(m.patch),
        });
      } else if (m.type === 'comment.add') {
        await api('/api/comments', {
          method: 'POST',
          body: JSON.stringify({ itemId: m.itemId, body: m.body }),
        });
      } else if (m.type === 'time.add') {
        await api('/api/time-entries', {
          method: 'POST',
          body: JSON.stringify({
            itemId: m.itemId,
            minutes: m.minutes,
            workedOn: m.workedOn,
          }),
        });
      }
    });
    setPendingOffline(result.remaining.length);
    if (result.error) setError(`Offline sync: ${result.error}`);
  }, []);

  async function enterAs(userId: string) {
    setLoading(true);
    setError(null);
    try {
      await api('/api/session', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
      await loadSession();
      setScreen('mywork');
      const work = await api<{ items: Item[]; buckets: Record<string, Item[]> }>('/api/my-work');
      setMyWork(work.items ?? []);
      setBuckets(work.buckets ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  async function openBoards() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ boards: Board[] }>('/api/boards');
      setBoards(data.boards ?? []);
      setScreen('boards');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function openBoard(id: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ items: Item[]; board: Board; columns: Column[] }>(
        `/api/boards/${id}`,
      );
      setBoardId(id);
      setColumns(data.columns ?? []);
      setItems((data.items ?? []).filter((i) => !i.parentItemId));
      setScreen('board');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function openItem(item: Item) {
    setSelectedItem(item);
    setItemTab('overview');
    setLoading(true);
    try {
      const bundle = await api<{
        comments: Array<Comment & { itemId: string }>;
        items: Item[];
        columns: Column[];
      }>(`/api/boards/${item.boardId}`);
      setColumns(bundle.columns ?? []);
      setComments(bundle.comments.filter((c) => c.itemId === item.id));
      setSelectedItem(bundle.items.find((i) => i.id === item.id) ?? item);
      const att = await api<{ attachments: Attachment[] }>(
        `/api/attachments?itemId=${item.id}`,
      );
      setAttachments(att.attachments ?? []);
      setScreen('item');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function patchItem(patch: Record<string, unknown>) {
    if (!selectedItem) return;
    try {
      await api(`/api/items/${selectedItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      await openItem(selectedItem);
    } catch {
      enqueue({
        id: `off-${Date.now()}`,
        type: 'item.patch',
        itemId: selectedItem.id,
        patch,
        createdAt: new Date().toISOString(),
      });
      setPendingOffline(loadQueue().length);
      setSelectedItem({ ...selectedItem, ...patch } as Item);
      setError('Offline — change queued for sync');
    }
  }

  async function setCell(columnId: string, value: unknown) {
    if (!selectedItem) return;
    await api('/api/cells', {
      method: 'PATCH',
      body: JSON.stringify({ itemId: selectedItem.id, columnId, value }),
    });
    await openItem(selectedItem);
  }

  async function postComment() {
    if (!selectedItem || !commentBody.trim()) return;
    await api('/api/comments', {
      method: 'POST',
      body: JSON.stringify({ itemId: selectedItem.id, body: commentBody }),
    });
    setCommentBody('');
    await openItem(selectedItem);
  }

  async function stubCameraUpload() {
    if (!selectedItem) return;
    // Camera / library stub — no native module; uploads a tiny text note as mock file
    const note = `field-photo-${Date.now()}.txt`;
    const payload = btoa(`UNISON camera stub ${new Date().toISOString()}`);
    await api('/api/attachments', {
      method: 'POST',
      body: JSON.stringify({
        itemId: selectedItem.id,
        fileName: note,
        contentType: 'text/plain',
        sizeBytes: 32,
        dataBase64: payload,
      }),
    });
    setCameraStub(`Captured stub → ${note}`);
    await openItem(selectedItem);
  }

  async function openNotifications() {
    setLoading(true);
    try {
      const data = await api<{ notifications: Notification[] }>('/api/notifications');
      setNotifications(data.notifications ?? []);
      setScreen('notifications');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function openNotificationDeepLink(n: Notification) {
    await api('/api/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ id: n.id }),
    });
    const { boardId: bId, itemId } = parseDeepLink(n.href);
    if (bId && itemId) {
      setBoardId(bId);
      await openItem({
        id: itemId,
        boardId: bId,
        name: n.title,
        status: 'working',
        priority: 'none',
      });
      return;
    }
    await openNotifications();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <Text style={styles.brand}>UNISON</Text>
        {sessionUser && screen !== 'auth' && (
          <Text style={styles.user}>{sessionUser.displayName}</Text>
        )}
      </View>

      {screen !== 'auth' && (
        <View style={styles.nav}>
          {(
            [
              ['mywork', 'My Work'],
              ['boards', 'Boards'],
              ['notifications', 'Alerts'],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: screen === key }}
              style={[styles.navBtn, screen === key && styles.navBtnActive]}
              onPress={() => {
                if (key === 'mywork') {
                  void api<{ items: Item[]; buckets: Record<string, Item[]> }>('/api/my-work').then(
                    (d) => {
                      setMyWork(d.items ?? []);
                      setBuckets(d.buckets ?? {});
                      setScreen('mywork');
                    },
                  );
                } else if (key === 'boards') void openBoards();
                else void openNotifications();
              }}
            >
              <Text style={styles.navText}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {loading && <ActivityIndicator color={colors.chartreuse} style={{ marginTop: 16 }} />}
      {error && <Text style={styles.error}>{error}</Text>}
      {pendingOffline > 0 && screen !== 'auth' ? (
        <Pressable
          accessibilityRole="button"
          style={[styles.navBtn, { marginHorizontal: 16, marginTop: 8 }]}
          onPress={() => void syncOffline()}
        >
          <Text style={styles.navText}>Sync {pendingOffline} offline change(s)</Text>
        </Pressable>
      ) : null}

      {screen === 'auth' && (
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.h1}>Sign in (demo)</Text>
          <Text style={styles.sub}>Native Expo client — same accounts as web.</Text>
          {users.map((u) => (
            <Pressable
              key={u.id}
              style={styles.card}
              accessibilityRole="button"
              onPress={() => void enterAs(u.id)}
            >
              <Text style={styles.cardTitle}>{u.displayName}</Text>
              <Text style={styles.cardMeta}>{u.email}</Text>
            </Pressable>
          ))}
          <Text style={styles.footer}>UNISON · By Majd Asali</Text>
        </ScrollView>
      )}

      {screen === 'mywork' && (
        <FlatList
          data={myWork}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.pad}
          ListHeaderComponent={
            <View>
              <Text style={styles.h1}>My Work</Text>
              <Text style={styles.sub}>
                Today {buckets.today?.length ?? 0} · Overdue {buckets.overdue?.length ?? 0} ·
                Upcoming {buckets.upcoming?.length ?? 0}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => void openItem(item)}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>
                {item.status} · {item.priority}
                {item.dueDate ? ` · ${new Date(item.dueDate).toLocaleDateString()}` : ''}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.sub}>Nothing assigned.</Text>}
        />
      )}

      {screen === 'boards' && (
        <FlatList
          data={boards}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.pad}
          ListHeaderComponent={<Text style={styles.h1}>Boards</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => void openBoard(item.id)}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>{item.description ?? 'Open board'}</Text>
            </Pressable>
          )}
        />
      )}

      {screen === 'board' && (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.pad}
          ListHeaderComponent={
            <View>
              <Pressable onPress={() => setScreen('boards')}>
                <Text style={styles.link}>← Boards</Text>
              </Pressable>
              <Text style={styles.h1}>Board items</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => void openItem(item)}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>
                {item.status} · {item.priority}
              </Text>
            </Pressable>
          )}
        />
      )}

      {screen === 'item' && selectedItem && (
        <ScrollView contentContainerStyle={styles.pad}>
          <Pressable onPress={() => (boardId ? setScreen('board') : setScreen('mywork'))}>
            <Text style={styles.link}>← Back</Text>
          </Pressable>
          <Text style={styles.h1}>{selectedItem.name}</Text>
          <View style={styles.tabs}>
            {(['overview', 'columns', 'updates', 'files'] as ItemTab[]).map((tab) => (
              <Pressable
                key={tab}
                style={[styles.tab, itemTab === tab && styles.tabActive]}
                onPress={() => setItemTab(tab)}
              >
                <Text style={styles.navText}>{tab}</Text>
              </Pressable>
            ))}
          </View>

          {itemTab === 'overview' && (
            <View>
              <Text style={styles.sub}>{selectedItem.description || 'No description'}</Text>
              <Text style={styles.label}>Status</Text>
              <View style={styles.rowWrap}>
                {STATUSES.map((s) => (
                  <Pressable
                    key={s}
                    style={[styles.chip, selectedItem.status === s && styles.chipActive]}
                    onPress={() => void patchItem({ status: s })}
                  >
                    <Text style={styles.chipText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>Progress {selectedItem.progress ?? 0}%</Text>
            </View>
          )}

          {itemTab === 'columns' && (
            <View>
              {columns.map((col) => {
                const value =
                  col.settings?.systemField === 'status'
                    ? selectedItem.status
                    : col.settings?.systemField === 'priority'
                      ? selectedItem.priority
                      : col.settings?.systemField === 'progress'
                        ? selectedItem.progress
                        : selectedItem.values?.[col.id];
                if (col.type === 'formula') {
                  return (
                    <View key={col.id} style={styles.card}>
                      <Text style={styles.cardTitle}>{col.name}</Text>
                      <Text style={styles.cardMeta}>{String(value ?? '—')}</Text>
                    </View>
                  );
                }
                if (col.type === 'status') {
                  return (
                    <View key={col.id} style={{ marginBottom: 12 }}>
                      <Text style={styles.label}>{col.name}</Text>
                      <View style={styles.rowWrap}>
                        {STATUSES.map((s) => (
                          <Pressable
                            key={s}
                            style={[styles.chip, selectedItem.status === s && styles.chipActive]}
                            onPress={() => void setCell(col.id, s)}
                          >
                            <Text style={styles.chipText}>{s}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  );
                }
                return (
                  <View key={col.id} style={styles.card}>
                    <Text style={styles.cardTitle}>{col.name}</Text>
                    <TextInput
                      style={styles.input}
                      defaultValue={value == null ? '' : String(value)}
                      placeholderTextColor={colors.muted}
                      onEndEditing={(e) => {
                        const raw = e.nativeEvent.text;
                        const next =
                          col.type === 'number' || col.type === 'duration' || col.type === 'progress'
                            ? raw === ''
                              ? null
                              : Number(raw)
                            : raw;
                        void setCell(col.id, next);
                      }}
                    />
                  </View>
                );
              })}
            </View>
          )}

          {itemTab === 'updates' && (
            <View>
              {comments.map((c) => (
                <View key={c.id} style={styles.card}>
                  <Text style={styles.cardMeta}>{c.body}</Text>
                </View>
              ))}
              <TextInput
                style={styles.input}
                placeholder="Add an update"
                placeholderTextColor={colors.muted}
                value={commentBody}
                onChangeText={setCommentBody}
              />
              <Pressable style={styles.primaryBtn} onPress={() => void postComment()}>
                <Text style={styles.primaryBtnText}>Post</Text>
              </Pressable>
            </View>
          )}

          {itemTab === 'files' && (
            <View>
              {attachments.map((a) => (
                <View key={a.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{a.fileName}</Text>
                  <Text style={styles.cardMeta}>{Math.round(a.sizeBytes / 1024)} KB</Text>
                </View>
              ))}
              <Pressable style={styles.primaryBtn} onPress={() => void stubCameraUpload()}>
                <Text style={styles.primaryBtnText}>Camera / library stub upload</Text>
              </Pressable>
              {cameraStub && <Text style={styles.sub}>{cameraStub}</Text>}
              <Text style={styles.sub}>
                Native camera module not bundled in demo — stub uploads a text receipt.
              </Text>
            </View>
          )}
          <Text style={styles.footer}>UNISON · By Majd Asali</Text>
        </ScrollView>
      )}

      {screen === 'notifications' && (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.pad}
          ListHeaderComponent={
            <View>
              <Text style={styles.h1}>Notifications</Text>
              <Text style={styles.sub}>Tap opens deep-linked board item when href present.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => void openNotificationDeepLink(item)}>
              <Text style={styles.cardTitle}>
                {item.title}
                {!item.readAt ? ' · unread' : ''}
              </Text>
              <Text style={styles.cardMeta}>{item.body}</Text>
              {item.href ? <Text style={styles.link}>{item.href}</Text> : null}
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.sub}>No notifications.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: { color: colors.chartreuse, letterSpacing: 3, fontWeight: '800' },
  user: { color: colors.muted, fontSize: 12 },
  nav: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  navBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navBtnActive: { backgroundColor: colors.ocean },
  navText: { color: colors.mist, fontSize: 13, fontWeight: '600' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.ocean },
  pad: { padding: 16, paddingBottom: 40 },
  h1: { color: colors.mist, fontSize: 30, fontWeight: '800', marginBottom: 8 },
  sub: { color: colors.muted, marginBottom: 12 },
  label: { color: colors.mist, marginTop: 8, marginBottom: 6, fontWeight: '600' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderColor: colors.border,
    borderWidth: 1,
    marginBottom: 10,
  },
  cardTitle: { color: colors.mist, fontSize: 16, fontWeight: '600' },
  cardMeta: { color: colors.muted, marginTop: 6 },
  error: { color: colors.coral, paddingHorizontal: 20, marginTop: 8 },
  link: { color: colors.chartreuse, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    color: colors.mist,
    marginTop: 8,
  },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: colors.chartreuse,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: colors.ink, fontWeight: '700' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: colors.ocean },
  chipText: { color: colors.mist, fontSize: 12 },
  footer: { color: colors.muted, fontSize: 11, marginTop: 24, textAlign: 'center' },
});
