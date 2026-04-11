import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Plus, MessageSquare, Search, Users } from 'lucide-react';
import { chatApi } from '../../services/api';
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
  const messagesEndRef = useRef(null);

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
    mutationFn: () => chatApi.sendMessage(activeConvo._id, { text: message }),
    onSuccess: () => { setMessage(''); refetchMessages(); qc.invalidateQueries(['conversations']); }
  });

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
                return (
                  <div key={msg._id} className={`flex items-end gap-2.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                    {!isMine && <Avatar user={msg.senderId} size="xs" />}
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                      isMine ? 'bg-brand-navy text-white rounded-br-sm' : 'bg-white text-gray-800 shadow-card rounded-bl-sm'
                    }`}>
                      {!isMine && activeConvo.type === 'group' && (
                        <p className="text-xs font-semibold text-brand-navy mb-1">{msg.senderId?.name}</p>
                      )}
                      <p>{msg.text}</p>
                      <p className={`text-xs mt-1 ${isMine ? 'text-white/60' : 'text-gray-400'}`}>{timeAgo(msg.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-5 py-4 bg-white border-t border-gray-100">
              <div className="flex items-center gap-3 bg-surface-secondary rounded-xl px-4 py-2.5">
                <input value={message} onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && message.trim() && (e.preventDefault(), sendMutation.mutate())}
                  placeholder={`Message ${getConvoName(activeConvo)}...`}
                  className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder:text-gray-400" />
                <button onClick={() => message.trim() && sendMutation.mutate()} disabled={!message.trim() || sendMutation.isPending}
                  className="w-8 h-8 bg-brand-navy text-white rounded-lg flex items-center justify-center hover:bg-brand-navy-dark transition-colors disabled:opacity-50">
                  <Send size={14} />
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
