import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Plus, MessageSquare, Search, Users, Upload, FileText, Loader2, X, MoreVertical, Check, CheckCheck } from 'lucide-react';
import { chatApi, uploadApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Avatar, PageLoader, EmptyState, Modal } from '../../components/ui';
import { timeAgo, getInitials } from '../../utils/helpers';

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
  const [message, setMessage] = useState('');
  const [newConvoOpen, setNewConvoOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [openMessageMenu, setOpenMessageMenu] = useState(null);
  /** Staged attachment — upload + send only when user clicks Send */
  const [pendingFile, setPendingFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const { data: convosData, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatApi.conversations().then(r => r.data),
  });

  const { data: messagesData, refetch: refetchMessages } = useQuery({
    queryKey: ['messages', activeConvo?._id],
    queryFn: () => chatApi.messages(activeConvo._id).then(r => r.data),
    enabled: !!activeConvo,
  });

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
    if (!activeConvo || !canSend || sendMutation.isPending) return;
    sendMutation.mutate({
      file: pendingFile,
      text: message,
      convoId: activeConvo._id,
    });
  };

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setPendingFile(file);
  };

  useEffect(() => {
    setPendingFile(null);
  }, [activeConvo?._id]);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.messages]);

  const conversations = (convosData?.conversations || []).filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.participants?.some(p => p.name?.toLowerCase().includes(search.toLowerCase()))
  );
  const messages = messagesData?.messages || [];

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

  if (isLoading) return <PageLoader />;

  return (
    <div className="flex h-[calc(100vh-120px)] -m-5 lg:-m-6 overflow-hidden rounded-xl border border-gray-100 shadow-card animate-fade-in">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 flex flex-col bg-white border-r border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Messages</h2>
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
          {conversations.length === 0 ? (
            <div className="py-10 text-center">
              <MessageSquare size={24} className="text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">No conversations yet</p>
            </div>
          ) : conversations.map(convo => {
            const otherUser = getConvoAvatar(convo);
            const online = isOnline(convo);
            const isActive = activeConvo?._id === convo._id;
            return (
              <button key={convo._id} onClick={() => setActiveConvo(convo)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-secondary transition-colors ${isActive ? 'bg-brand-navy/5 border-r-2 border-brand-navy' : ''}`}>
                <div className="relative flex-shrink-0">
                  {otherUser ? <Avatar user={otherUser} size="md" /> : (
                    <div className="w-9 h-9 rounded-full bg-brand-navy/10 flex items-center justify-center text-brand-navy text-xs font-bold">
                      <Users size={14} />
                    </div>
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
                  {convo.lastMessage?.text && (
                    <p className="text-xs text-gray-400 truncate">{convo.lastMessage.text}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-surface-secondary">
        {!activeConvo ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Select a conversation to start chatting</p>
              <button onClick={() => setNewConvoOpen(true)} className="btn-primary mt-4 mx-auto">
                <Plus size={15} /> New Chat
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-3.5 bg-white border-b border-gray-100 flex items-center gap-3">
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
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {messages.map(msg => {
                const isMine = msg.senderId?._id === user?._id || msg.senderId === user?._id;
                const status = isMine ? getMessageStatus(msg) : null;
                const isDeletedForEveryone = msg.isDeleted || msg.type === 'system';
                return (
                  <div key={msg._id} className={`flex items-end gap-2.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                    {!isMine && <Avatar user={msg.senderId} size="xs" />}
                    <div className={`group relative max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                      isMine ? 'bg-brand-navy text-white rounded-br-sm' : 'bg-white text-gray-800 shadow-card rounded-bl-sm'
                    }`}>
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
                      {!isMine && activeConvo.type === 'group' && (
                        <p className="text-xs font-semibold text-brand-navy mb-1">{msg.senderId?.name}</p>
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
                      {(msg.type === 'text' || isDeletedForEveryone) && msg.text && (
                        <p className={isDeletedForEveryone ? 'italic opacity-80' : ''}>{msg.text}</p>
                      )}
                      <div className={`text-xs mt-1 flex items-center gap-1 justify-end ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
                        <span>{timeAgo(msg.createdAt)}</span>
                        {isMine && (
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
            </div>

            {/* Input */}
            <div className="px-5 py-4 bg-white border-t border-gray-100 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,.zip,.mp4,.mov"
                onChange={handleFileChange}
              />
              {pendingFile && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-secondary border border-gray-200 text-sm text-gray-800">
                  <FileText size={16} className="text-brand-navy flex-shrink-0" />
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
              <div className="flex items-center gap-3 bg-neutral-700 rounded-xl px-4 py-2.5">
                <button
                  type="button"
                  onClick={handlePickFile}
                  disabled={sendMutation.isPending}
                  title="Attach file"
                  className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-white hover:text-white hover:bg-neutral-600/80 transition-colors disabled:opacity-40"
                >
                  <Upload size={18} />
                </button>
                <input value={message} onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && canSend && (e.preventDefault(), handleSend())}
                  placeholder={pendingFile ? 'Add a caption (optional)...' : `Message ${getConvoName(activeConvo)}...`}
                  className="flex-1 bg-transparent text-sm outline-none text-black placeholder:text-white placeholder:opacity-90"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!canSend || sendMutation.isPending}
                  className="w-8 h-8 bg-brand-navy text-white rounded-lg flex items-center justify-center hover:bg-brand-navy-dark transition-colors disabled:opacity-50"
                >
                  {sendMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
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
