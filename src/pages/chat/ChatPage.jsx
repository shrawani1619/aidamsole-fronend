import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Plus, MessageSquare, Search, Users, Upload, FileText, Loader2, X, MoreVertical, Check, CheckCheck, Hand } from 'lucide-react';
import { chatApi, uploadApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Avatar, PageLoader, Modal } from '../../components/ui';
import { timeAgo } from '../../utils/helpers';

/** Per-user unread from API (Map serializes to plain object in JSON). */
function unreadForUser(convo, userId) {
  if (!convo?.unreadCount || !userId) return 0;
  const u = String(userId);
  const uc = convo.unreadCount;
  if (typeof uc.get === 'function') return Number(uc.get(u)) || 0;
  const raw = uc[u] ?? uc[String(u)];
  return Math.max(0, Math.min(999, Number(raw) || 0));
}

function NewConvoModal({ onClose }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [type, setType] = useState('direct');
  const [name, setName] = useState('');
  const [selected, setSelected] = useState([]);
  const { data } = useQuery({ queryKey: ['chat-users'], queryFn: () => chatApi.users().then(r => r.data) });
  const users = data?.users || [];

  const mutation = useMutation({
    mutationFn: () => chatApi.createConversation({ type, name, participantIds: selected }),
    onSuccess: () => { qc.invalidateQueries(['conversations']); onClose(); }
  });

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(i => i !== id) : [...s, id]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['direct', 'group'].map(t => (
          <button key={t} onClick={() => setType(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${type === t ? 'bg-brand-navy text-white border-brand-navy' : 'border-gray-200 text-gray-600'}`}>
            {t === 'direct' ? '👤 Direct' : '👥 Group'}
          </button>
        ))}
      </div>
      {type === 'group' && (
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Group name..." className="input" />
      )}
      <div>
        <p className="label">Select {type === 'direct' ? 'user' : 'members'}</p>
        <div className="max-h-52 overflow-y-auto space-y-1 mt-1">
          {users.map(u => (
            <button key={u._id} onClick={() => toggle(u._id)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${selected.includes(u._id) ? 'bg-brand-navy/10 border border-brand-navy/20' : 'hover:bg-surface-secondary'}`}>
              <Avatar user={u} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{u.name}</p>
                <p className="text-xs text-gray-400">{u.departmentRole || u.role?.replace(/_/g, ' ')}</p>
              </div>
              {selected.includes(u._id) && <span className="text-brand-navy text-sm">✓</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => mutation.mutate()} disabled={!selected.length || mutation.isPending}>
          {mutation.isPending ? 'Creating...' : 'Start Chat'}
        </button>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const { on, emit, joinRoom, onlineUsers } = useSocket() || {};
  const qc = useQueryClient();
  const [activeConvo, setActiveConvo] = useState(null);
  /** Teammate selected for a new direct chat (no conversation yet) */
  const [draftPeer, setDraftPeer] = useState(null);
  const [message, setMessage] = useState('');
  const [newConvoOpen, setNewConvoOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [openMessageMenu, setOpenMessageMenu] = useState(null);
  /** Staged attachment — upload + send only when user clicks Send */
  const [pendingFile, setPendingFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const { data: convosData, isLoading: convosLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatApi.conversations().then(r => r.data),
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['chat-users'],
    queryFn: () => chatApi.users().then(r => r.data),
  });

  const { data: messagesData, refetch: refetchMessages } = useQuery({
    queryKey: ['messages', activeConvo?._id],
    queryFn: () => chatApi.messages(activeConvo._id).then(r => r.data),
    enabled: !!activeConvo,
  });

  // Opening a thread loads messages and clears server unread — refresh sidebar counts
  useEffect(() => {
    if (!activeConvo?._id || messagesData === undefined) return;
    qc.invalidateQueries({ queryKey: ['conversations'] });
  }, [activeConvo?._id, messagesData, qc]);

  const sendMutation = useMutation({
    mutationFn: async ({ file, text, convoId }) => {
      if (file) {
        const { data } = await uploadApi.single(file);
        const fileUrl = data?.file?.url;
        const fileName = data?.file?.filename || file.name;
        if (!fileUrl) throw new Error('Upload failed');
        const isImage = /^image\//.test(file.type || data?.file?.mimetype || '');
        const caption = (text || '').trim();
        await chatApi.sendMessage(convoId, {
          type: isImage ? 'image' : 'file',
          text: isImage ? caption : (caption || fileName),
          fileUrl,
          fileName,
        });
        return;
      }
      if (text?.trim()) {
        await chatApi.sendMessage(convoId, { text: text.trim() });
      }
    },
    onSuccess: () => {
      setMessage('');
      setPendingFile(null);
      refetchMessages();
      qc.invalidateQueries(['conversations']);
    },
  });

  /** Create direct chat with draft peer, optionally send first message / attachment */
  const openDirectMutation = useMutation({
    mutationFn: async ({ peer, file, text }) => {
      const { data } = await chatApi.createConversation({ type: 'direct', participantIds: [peer._id] });
      const convo = data?.conversation;
      if (!convo?._id) throw new Error('Could not start chat');
      if (file) {
        const { data: up } = await uploadApi.single(file);
        const fileUrl = up?.file?.url;
        const fileName = up?.file?.filename || file.name;
        if (!fileUrl) throw new Error('Upload failed');
        const isImage = /^image\//.test(file.type || up?.file?.mimetype || '');
        const caption = (text || '').trim();
        await chatApi.sendMessage(convo._id, {
          type: isImage ? 'image' : 'file',
          text: isImage ? caption : (caption || fileName),
          fileUrl,
          fileName,
        });
      } else if (text?.trim()) {
        await chatApi.sendMessage(convo._id, { text: text.trim() });
      }
      return convo;
    },
    onSuccess: (convo) => {
      setDraftPeer(null);
      setMessage('');
      setPendingFile(null);
      setActiveConvo(convo);
      qc.invalidateQueries(['conversations']);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ messageId, mode }) => {
      await chatApi.deleteMessage(messageId, mode);
    },
    onSuccess: () => {
      setOpenMessageMenu(null);
      refetchMessages();
      qc.invalidateQueries(['conversations']);
    },
  });

  const canSend = !!(message.trim() || pendingFile);

  const handleSend = () => {
    if (draftPeer && !activeConvo) {
      if (!canSend || openDirectMutation.isPending) return;
      openDirectMutation.mutate({ peer: draftPeer, file: pendingFile, text: message });
      return;
    }
    if (!activeConvo || !canSend || sendMutation.isPending) return;
    sendMutation.mutate({
      file: pendingFile,
      text: message,
      convoId: activeConvo._id,
    });
  };

  const handleSayHii = () => {
    if (!draftPeer || activeConvo || openDirectMutation.isPending) return;
    openDirectMutation.mutate({ peer: draftPeer, text: 'Hii' });
  };

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setPendingFile(file);
  };

  useEffect(() => {
    setPendingFile(null);
  }, [activeConvo?._id, draftPeer?._id]);

  // Socket: listen for messages in active conversation
  useEffect(() => {
    if (!on || !activeConvo) return;
    const unsub = on('chat:message', (msg) => {
      if (msg.conversationId === activeConvo._id) refetchMessages();
      qc.invalidateQueries(['conversations']);
    });
    return unsub;
  }, [on, activeConvo]);

  useEffect(() => {
    if (!on || !activeConvo) return;
    const unsub = on('chat:message:update', (evt) => {
      if (evt.conversationId === activeConvo._id) refetchMessages();
      qc.invalidateQueries(['conversations']);
    });
    return unsub;
  }, [on, activeConvo, refetchMessages, qc]);

  useEffect(() => {
    if (activeConvo && joinRoom) joinRoom(activeConvo._id);
  }, [activeConvo]);

  // Latest messages stay at bottom (WhatsApp-style); scroll after paint
  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ block: 'end', behavior: 'auto' });
    });
    return () => cancelAnimationFrame(id);
  }, [messagesData?.messages, activeConvo?._id]);

  const rawConversations = convosData?.conversations || [];
  const searchTrim = search.trim();
  const searchLower = searchTrim.toLowerCase();

  const teamUsers = (usersData?.users || []).filter((u) => u._id !== user?._id);

  const findDirectConvoForPeer = (peerId) =>
    rawConversations.find(
      (c) =>
        c.type === 'direct' &&
        c.participants?.length === 2 &&
        c.participants.some((p) => p._id === peerId)
    );

  const otherConvos = rawConversations.filter(
    (c) => c.type !== 'direct' || c.participants?.length !== 2
  );

  const teamUsersFiltered = teamUsers.filter((u) => {
    if (!searchTrim) return true;
    const n = String(u.name ?? '').toLowerCase();
    const e = String(u.email ?? '').toLowerCase();
    const r = String(u.departmentRole ?? '').toLowerCase();
    return n.includes(searchLower) || e.includes(searchLower) || r.includes(searchLower);
  });

  /** WhatsApp-style: most recently active DMs first (API user order is arbitrary). */
  const teamUsersSorted = useMemo(() => {
    const directActivityTime = (peerId) => {
      const c = rawConversations.find(
        (conv) =>
          conv.type === 'direct' &&
          conv.participants?.length === 2 &&
          conv.participants.some((p) => p._id === peerId)
      );
      if (!c) return 0;
      if (c.lastMessage?.timestamp) return new Date(c.lastMessage.timestamp).getTime();
      if (c.updatedAt) return new Date(c.updatedAt).getTime();
      return 0;
    };
    return [...teamUsersFiltered].sort((a, b) => {
      const tb = directActivityTime(b._id);
      const ta = directActivityTime(a._id);
      if (tb !== ta) return tb - ta;
      return String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { sensitivity: 'base' });
    });
  }, [teamUsersFiltered, rawConversations]);

  const otherConvosFiltered = otherConvos.filter((c) => {
    if (!searchTrim) return true;
    const name = String(c.name ?? '').toLowerCase();
    if (name.includes(searchLower)) return true;
    const lastText = String(c.lastMessage?.text ?? '').toLowerCase();
    if (lastText.includes(searchLower)) return true;
    const parts = c.participants || [];
    return parts.some((p) => {
      if (!p || typeof p !== 'object') return false;
      const pn = String(p.name ?? '').toLowerCase();
      const pe = String(p.email ?? '').toLowerCase();
      return pn.includes(searchLower) || pe.includes(searchLower);
    });
  });

  const messages = messagesData?.messages || [];

  const totalChatUnread = rawConversations.reduce((sum, c) => sum + unreadForUser(c, user?._id), 0);

  const getMessageStatus = (msg) => {
    const others = (activeConvo?.participants || []).filter((p) => p._id !== user?._id);
    const readBy = (msg.readBy || []).map((id) => String(id));
    const everyoneSeen = others.length > 0 && others.every((p) => readBy.includes(String(p._id)));
    const delivered = others.some((p) => readBy.includes(String(p._id)));
    if (everyoneSeen) return 'seen';
    if (delivered) return 'delivered';
    return 'sent';
  };

  const getConvoName = (convo) => {
    if (convo.name) return convo.name;
    const other = convo.participants?.find(p => p._id !== user?._id);
    return other?.name || 'Unknown';
  };

  const getConvoAvatar = (convo) => {
    if (convo.type === 'group') return null;
    return convo.participants?.find(p => p._id !== user?._id);
  };

  const isOnline = (convo) => {
    const other = convo.participants?.find(p => p._id !== user?._id);
    return onlineUsers?.includes(other?._id);
  };

  if (convosLoading || usersLoading) return <PageLoader />;

  const isTeamRowActive = (u, convo) => {
    if (convo) return activeConvo?._id === convo._id;
    return draftPeer?._id === u._id;
  };

  const onSelectTeamMember = (u) => {
    const convo = findDirectConvoForPeer(u._id);
    if (convo) {
      setActiveConvo(convo);
      setDraftPeer(null);
    } else {
      setActiveConvo(null);
      setDraftPeer(u);
    }
  };

  /** New DM thread (no messages yet): grey-focused panel, not pure black */
  const isDraftGreyTheme = !!(draftPeer && !activeConvo);

  return (
    <div className="flex h-[calc(100vh-120px)] -m-5 lg:-m-6 overflow-hidden rounded-xl border border-gray-100 shadow-card animate-fade-in">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 flex flex-col bg-white border-r border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-sm font-semibold text-gray-900">Messages</h2>
              {totalChatUnread > 0 && (
                <span className="inline-flex min-w-[1.25rem] h-5 px-1 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold tabular-nums">
                  {totalChatUnread > 99 ? '99+' : totalChatUnread}
                </span>
              )}
            </div>
            <button onClick={() => setNewConvoOpen(true)} className="p-1.5 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-dark">
              <Plus size={14} />
            </button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="input pl-8 text-xs" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {teamUsersSorted.length === 0 && otherConvosFiltered.length === 0 ? (
            <div className="py-10 text-center px-3">
              {searchTrim ? (
                <>
                  <Search size={24} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No team members or chats match &quot;{searchTrim}&quot;</p>
                  <button type="button" className="text-xs text-brand-navy mt-2 hover:underline" onClick={() => setSearch('')}>
                    Clear search
                  </button>
                </>
              ) : (
                <>
                  <Users size={24} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">No team members to message</p>
                </>
              )}
            </div>
          ) : (
            <>
              {teamUsersSorted.length > 0 && (
                <>
                  <div className="px-4 pt-3 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Team</div>
                  {teamUsersSorted.map((u) => {
                    const convo = findDirectConvoForPeer(u._id);
                    const online = onlineUsers?.includes(u._id);
                    const isActive = isTeamRowActive(u, convo);
                    const rowUnread = convo ? unreadForUser(convo, user?._id) : 0;
                    return (
                      <button
                        key={u._id}
                        type="button"
                        onClick={() => onSelectTeamMember(u)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-secondary transition-colors ${isActive ? 'bg-brand-navy/5 border-r-2 border-brand-navy' : ''}`}
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar user={u} size="md" />
                          {rowUnread > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[1.125rem] h-[1.125rem] px-0.5 flex items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-bold leading-none border-2 border-white tabular-nums z-10">
                              {rowUnread > 99 ? '99+' : rowUnread}
                            </span>
                          )}
                          {online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                            {convo?.lastMessage?.timestamp && (
                              <p className="text-xs text-gray-400 flex-shrink-0">{timeAgo(convo.lastMessage.timestamp)}</p>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate min-h-[1rem]">
                            {convo?.lastMessage?.text ? convo.lastMessage.text : '\u00a0'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
              {otherConvosFiltered.length > 0 && (
                <>
                  <div className="px-4 pt-3 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Groups &amp; more</div>
                  {otherConvosFiltered.map((convo) => {
                    const otherUser = getConvoAvatar(convo);
                    const online = isOnline(convo);
                    const isActive = activeConvo?._id === convo._id;
                    const rowUnread = unreadForUser(convo, user?._id);
                    return (
                      <button
                        key={convo._id}
                        type="button"
                        onClick={() => {
                          setActiveConvo(convo);
                          setDraftPeer(null);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-secondary transition-colors ${isActive ? 'bg-brand-navy/5 border-r-2 border-brand-navy' : ''}`}
                      >
                        <div className="relative flex-shrink-0">
                          {otherUser ? (
                            <Avatar user={otherUser} size="md" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-brand-navy/10 flex items-center justify-center text-brand-navy text-xs font-bold">
                              <Users size={14} />
                            </div>
                          )}
                          {rowUnread > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[1.125rem] h-[1.125rem] px-0.5 flex items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-bold leading-none border-2 border-white tabular-nums z-10">
                              {rowUnread > 99 ? '99+' : rowUnread}
                            </span>
                          )}
                          {online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate">{getConvoName(convo)}</p>
                            {convo.lastMessage?.timestamp && (
                              <p className="text-xs text-gray-400 flex-shrink-0 ml-2">{timeAgo(convo.lastMessage.timestamp)}</p>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate min-h-[1rem]">
                            {convo.lastMessage?.text ? convo.lastMessage.text : '\u00a0'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div
        className={`flex-1 flex flex-col min-h-0 ${
          'bg-surface-secondary'
        }`}
      >
        {!activeConvo && !draftPeer ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Select a team member or conversation</p>
              <button type="button" onClick={() => setNewConvoOpen(true)} className="btn-primary mt-4 mx-auto">
                <Plus size={15} /> New Chat
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div
              className={`px-5 py-3.5 border-b flex items-center gap-3 flex-shrink-0 ${
                'bg-white border-gray-100'
              }`}
            >
              {draftPeer && !activeConvo ? (
                <>
                  <div className="relative">
                    <Avatar user={draftPeer} size="md" />
                    {onlineUsers?.includes(draftPeer._id) && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{draftPeer.name}</p>
                    <p className="text-xs text-gray-400">{onlineUsers?.includes(draftPeer._id) ? '🟢 Online' : 'Offline'}</p>
                  </div>
                </>
              ) : (
                <>
                  {getConvoAvatar(activeConvo) ? (
                    <div className="relative">
                      <Avatar user={getConvoAvatar(activeConvo)} size="md" />
                      {isOnline(activeConvo) && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />}
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-brand-navy/10 flex items-center justify-center"><Users size={16} className="text-brand-navy" /></div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{getConvoName(activeConvo)}</p>
                    <p className="text-xs text-gray-400">
                      {activeConvo.type === 'group' ? `${activeConvo.participants?.length} members` : isOnline(activeConvo) ? '🟢 Online' : 'Offline'}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Messages */}
            <div
              className={`flex-1 overflow-y-auto min-h-0 p-5 space-y-3 ${
                ''
              }`}
            >
              {draftPeer && !activeConvo ? (
                <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center gap-5 px-2">
                  <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white/70 backdrop-blur px-6 py-8 shadow-card">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      No messages yet. Say hello to start the conversation.
                    </p>
                    <button
                      type="button"
                      onClick={handleSayHii}
                      disabled={openDirectMutation.isPending}
                      className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-navy text-white text-sm font-medium hover:bg-brand-navy-dark transition-colors disabled:opacity-50 shadow-md"
                    >
                      {openDirectMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Hand size={18} />}
                      Say Hii
                    </button>
                  </div>
                </div>
              ) : (
                <>
              {messages.map(msg => {
                const isMine = msg.senderId?._id === user?._id || msg.senderId === user?._id;
                const status = isMine ? getMessageStatus(msg) : null;
                const isDeletedForEveryone =
                  msg.isDeleted === true ||
                  (msg.type === 'system' && String(msg.text || '').includes('deleted'));
                return (
                  <div key={msg._id} className={`flex items-end gap-2.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                    {!isMine && <Avatar user={msg.senderId} size="xs" />}
                    <div
                      className={`group relative max-w-[70%] px-4 py-2.5 text-sm rounded-2xl ${
                        isDeletedForEveryone
                          ? 'bg-gray-100 text-gray-600 border border-gray-200 shadow-sm'
                          : isMine
                            ? 'bg-brand-navy text-white rounded-br-sm'
                            : 'bg-white text-gray-800 shadow-card rounded-bl-sm'
                      }`}
                    >
                      {isMine && !isDeletedForEveryone && (
                        <button
                          type="button"
                          onClick={() => setOpenMessageMenu((cur) => (cur === msg._id ? null : msg._id))}
                          className={`absolute top-1 right-1 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${
                            isMine ? 'hover:bg-white/20' : 'hover:bg-gray-100'
                          }`}
                          aria-label="Message options"
                        >
                          <MoreVertical size={14} />
                        </button>
                      )}
                      {isMine && openMessageMenu === msg._id && (
                        <div className="absolute top-7 right-1 z-20 w-40 rounded-lg border border-gray-100 bg-white text-gray-700 shadow-lg py-1">
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate({ messageId: msg._id, mode: 'me' })}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50"
                            disabled={deleteMutation.isPending}
                          >
                            Delete for me
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate({ messageId: msg._id, mode: 'everyone' })}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50"
                            disabled={deleteMutation.isPending}
                          >
                            Delete for everyone
                          </button>
                        </div>
                      )}
                      {!isMine && activeConvo.type === 'group' && !isDeletedForEveryone && (
                        <p className="text-xs font-semibold text-brand-navy mb-1">{msg.senderId?.name}</p>
                      )}
                      {!isMine && activeConvo.type === 'group' && isDeletedForEveryone && msg.senderId?.name && (
                        <p className="text-[10px] font-medium text-gray-500 mb-1">{msg.senderId.name}</p>
                      )}
                      {msg.type === 'image' && msg.fileUrl && !isDeletedForEveryone && (
                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="block">
                          <img
                            src={msg.fileUrl}
                            alt={msg.fileName || ''}
                            className="max-w-full max-h-56 rounded-lg object-contain"
                          />
                        </a>
                      )}
                      {msg.type === 'file' && msg.fileUrl && !isDeletedForEveryone && (
                        <>
                          <a
                            href={msg.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-2 font-medium underline break-all ${
                              isMine ? 'text-white' : 'text-brand-navy'
                            }`}
                          >
                            <FileText size={16} className="flex-shrink-0" />
                            <span>{msg.fileName || 'File'}</span>
                          </a>
                          {msg.text && msg.text !== msg.fileName && (
                            <p className={`mt-1.5 text-sm ${isMine ? 'text-white/95' : 'text-gray-800'}`}>{msg.text}</p>
                          )}
                        </>
                      )}
                      {msg.type === 'image' && msg.text && !isDeletedForEveryone && (
                        <p className={`mt-1.5 text-sm ${isMine ? 'text-white/95' : 'text-gray-800'}`}>{msg.text}</p>
                      )}
                      {(msg.type === 'text' || msg.type === 'system' || isDeletedForEveryone) && msg.text && (
                        <p className={isDeletedForEveryone ? 'italic text-sm' : ''}>{msg.text}</p>
                      )}
                      <div
                        className={`text-xs mt-1 flex items-center gap-1 justify-end ${
                          isDeletedForEveryone ? 'text-gray-400' : isMine ? 'text-white/60' : 'text-gray-400'
                        }`}
                      >
                        <span>{timeAgo(msg.createdAt)}</span>
                        {isMine && !isDeletedForEveryone && (
                          <span
                            className={status === 'seen' ? 'text-sky-300' : 'text-white/70'}
                            title={status === 'seen' ? 'Seen' : status === 'delivered' ? 'Delivered' : 'Sent'}
                          >
                            {status === 'sent' ? <Check size={13} /> : <CheckCheck size={13} />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div
              className="px-5 py-4 border-t border-gray-100 space-y-2 flex-shrink-0 bg-white"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,.zip,.mp4,.mov"
                onChange={handleFileChange}
              />
              {pendingFile && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm bg-surface-secondary border-gray-200 text-gray-800"
                >
                  <FileText size={16} className="flex-shrink-0 text-brand-navy" />
                  <span className="flex-1 min-w-0 truncate font-medium" title={pendingFile.name}>{pendingFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setPendingFile(null)}
                    className="p-1 rounded-md text-gray-500 hover:text-gray-800 hover:bg-white/80"
                    aria-label="Remove attachment"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <div
                className="flex items-center gap-3 rounded-xl border-2 border-gray-400 bg-gray-50 px-4 py-2.5 shadow-sm"
              >
                <button
                  type="button"
                  onClick={handlePickFile}
                  disabled={draftPeer ? openDirectMutation.isPending : sendMutation.isPending}
                  title="Attach file"
                  className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40 text-gray-600 hover:text-brand-navy hover:bg-white"
                >
                  <Upload size={18} />
                </button>
                <input value={message} onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && canSend && !((draftPeer ? openDirectMutation.isPending : sendMutation.isPending)) && (e.preventDefault(), handleSend())}
                  placeholder={
                    pendingFile
                      ? 'Add a caption (optional)...'
                      : draftPeer
                        ? `Message ${draftPeer.name}...`
                        : `Message ${getConvoName(activeConvo)}...`
                  }
                  className="flex-1 bg-transparent text-sm outline-none text-gray-900 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!canSend || (draftPeer ? openDirectMutation.isPending : sendMutation.isPending)}
                  className="w-8 h-8 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 bg-brand-navy hover:bg-brand-navy-dark"
                >
                  {(draftPeer ? openDirectMutation.isPending : sendMutation.isPending) ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal open={newConvoOpen} onClose={() => setNewConvoOpen(false)} title="New Conversation">
        <NewConvoModal onClose={() => setNewConvoOpen(false)} />
      </Modal>
    </div>
  );
}
