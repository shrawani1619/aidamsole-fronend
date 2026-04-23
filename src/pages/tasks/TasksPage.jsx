import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, CheckSquare, Clock, Eye, ThumbsUp, MessageSquare, Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import { tasksApi, clientsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Modal, Input, Select, Textarea, SearchInput, PageLoader, EmptyState, Avatar, ConfirmDialog, CheckboxMultiSelect } from '../../components/ui';
import { formatDate, statusColors, priorityColors, slugToLabel, isOverdue, timeAgo } from '../../utils/helpers';
import { getSocket, connectSocket } from '../../services/socket';

export function isTaskReviewer(task, userId) {
  if (!task || !userId) return false;
  const uid = String(userId);
  const fromList = (task.reviewerIds || []).map((r) => String(r._id || r));
  if (fromList.includes(uid)) return true;
  if (task.reviewerId && String(task.reviewerId._id || task.reviewerId) === uid) return true;
  return false;
}

/** Whether the logged-in user is an assignee and/or Two-Eye reviewer on this task */
export function userRolesOnTask(task, userId) {
  if (!task || !userId) return { isAssignee: false, isReviewer: false };
  const uid = String(userId);
  const isAssignee =
    String(task.assigneeId?._id || task.assigneeId || '') === uid ||
    (task.assigneeIds || []).some((a) => String(a?._id || a) === uid);
  const isReviewer = isTaskReviewer(task, userId);
  return { isAssignee, isReviewer };
}

const STATUSES = ['todo', 'in_progress', 'review', 'approved', 'done', 'blocked'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUS_COLORS = {
  todo: 'bg-gray-100', in_progress: 'bg-blue-50 border-blue-200',
  review: 'bg-amber-50 border-amber-200', approved: 'bg-green-50 border-green-200',
  done: 'bg-green-50', blocked: 'bg-red-50 border-red-200'
};
const STATUS_DOT = {
  todo: 'bg-gray-400', in_progress: 'bg-blue-500', review: 'bg-amber-500',
  approved: 'bg-green-500', done: 'bg-green-600', blocked: 'bg-red-500'
};
const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'done', label: 'Done' },
  { key: 'blocked', label: 'Blocked' }
];

function mapExistingSubtask(s) {
  const due = s.dueDate
    ? (typeof s.dueDate === 'string' ? s.dueDate.slice(0, 10) : new Date(s.dueDate).toISOString().slice(0, 10))
    : '';
  return {
    _id: s._id,
    title: s.title || '',
    description: s.description || '',
    projectId: s.projectId?._id || s.projectId || '',
    clientId: s.clientId?._id || s.clientId || '',
    departmentId: s.departmentId?._id || s.departmentId || '',
    assigneeId: s.assigneeId?._id || s.assigneeId || '',
    assigneeIds: s.assigneeIds?.map((a) => a?._id || a).filter(Boolean) || [],
    reviewerId: s.reviewerId?._id || s.reviewerId || '',
    status: s.status || 'todo',
    priority: s.priority || 'medium',
    dueDate: due,
    estimatedHours: s.estimatedHours != null && s.estimatedHours !== '' ? String(s.estimatedHours) : '',
    completed: !!s.completed
  };
}

function defaultSubtaskFromParent(form) {
  return {
    title: '',
    description: '',
    projectId: form.projectId || '',
    clientId: form.clientId || '',
    departmentId: form.departmentId || '',
    assigneeId: '',
    assigneeIds: [],
    reviewerId: '',
    status: 'todo',
    priority: 'medium',
    dueDate: '',
    estimatedHours: '',
    completed: false
  };
}

function buildTaskPayload(data) {
  const subtasks = (data.subtasks || [])
    .filter((st) => st.title?.trim())
    .map((st) => ({
      ...(st._id && { _id: st._id }),
      title: st.title.trim(),
      description: st.description || '',
      projectId: st.projectId || data.projectId,
      clientId: st.clientId || data.clientId,
      departmentId: st.departmentId || data.departmentId,
      assigneeId: st.assigneeId || undefined,
      reviewerId: st.reviewerId || undefined,
      status: st.status || 'todo',
      priority: st.priority || 'medium',
      dueDate: st.dueDate || undefined,
      estimatedHours: st.estimatedHours === '' ? 0 : Number(st.estimatedHours) || 0,
      completed: !!st.completed || ['done', 'approved'].includes(st.status || '')
    }));
  return {
    title: data.title,
    description: data.description,
    projectId: data.projectId,
    clientId: data.clientId,
    departmentId: data.departmentId,
    assigneeIds: (data.assigneeIds || []).filter(Boolean),
    assigneeId: (data.assigneeIds || []).filter(Boolean)[0] || data.assigneeId || undefined,
    reviewerIds: (data.reviewerIds || []).filter(Boolean),
    status: data.status,
    priority: data.priority,
    dueDate: data.dueDate || undefined,
    estimatedHours: data.estimatedHours === '' ? 0 : Number(data.estimatedHours) || 0,
    subtasks
  };
}

function SubtaskEditor({ st, index, onChange, onRemove, projects, departments, users }) {
  const set = (patch) => onChange(index, { ...st, ...patch });
  const handleProjectChange = (pid) => {
    const proj = projects.find((p) => p._id === pid);
    onChange(index, {
      ...st,
      projectId: pid,
      clientId: proj?.clientId?._id || '',
      departmentId: proj?.departmentId?._id || ''
    });
  };
  return (
    <div className="border border-gray-200 rounded-xl p-3 space-y-3 bg-surface-secondary/40">
      <div className="flex justify-between items-center gap-2">
        <span className="text-xs font-semibold text-brand-navy">Subtask {index + 1}</span>
        <button type="button" onClick={onRemove} className="text-xs text-red-600 hover:underline">Remove</button>
      </div>
      <Input label="Subtask title *" value={st.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Draft outline" />
      <Textarea label="Description" value={st.description} onChange={(e) => set({ description: e.target.value })} rows={2} />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Project" value={st.projectId} onChange={(e) => handleProjectChange(e.target.value)}
          options={[{ value: '', label: 'Same as parent…' }, ...projects.map((p) => ({ value: p._id, label: p.title }))]} />
        <Select label="Department" value={st.departmentId} onChange={(e) => set({ departmentId: e.target.value })}
          options={[{ value: '', label: 'Select dept…' }, ...departments.map((d) => ({ value: d._id, label: d.name }))]} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Assignee" value={st.assigneeId} onChange={(e) => set({ assigneeId: e.target.value })}
          options={[{ value: '', label: 'Unassigned' }, ...users.map((u) => ({ value: u._id, label: u.name }))]} />
        <Select label="Reviewer (Two-Eye)" value={st.reviewerId} onChange={(e) => set({ reviewerId: e.target.value })}
          options={[{ value: '', label: 'No reviewer' }, ...users.filter((u) => u._id !== st.assigneeId).map((u) => ({ value: u._id, label: u.name }))]} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Select label="Status" value={st.status} onChange={(e) => set({ status: e.target.value })}
          options={STATUSES.map((s) => ({ value: s, label: slugToLabel(s) }))} />
        <Select label="Priority" value={st.priority} onChange={(e) => set({ priority: e.target.value })}
          options={PRIORITIES.map((p) => ({ value: p, label: slugToLabel(p) }))} />
        <Input label="Est. Hours" type="number" value={st.estimatedHours} onChange={(e) => set({ estimatedHours: e.target.value })} />
      </div>
      <Input label="Due date" type="date" value={st.dueDate} onChange={(e) => set({ dueDate: e.target.value })} />
      <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
        <input type="checkbox" checked={st.completed} onChange={(e) => set({ completed: e.target.checked })} className="rounded text-brand-navy" />
        Mark completed
      </label>
    </div>
  );
}

export function TaskForm({ onClose, existing, defaultProjectId }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: metaData } = useQuery({
    queryKey: ['tasks-meta', 'task-form-v2'],
    queryFn: () => tasksApi.meta().then(r => r.data),
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const projects = metaData?.projects || [];
  const users = metaData?.users || [];
  const departments = metaData?.departments || [];

  const selectedProject = projects.find(p => p._id === (existing?.projectId?._id || defaultProjectId));

  const initialReviewerIds = existing?.reviewerIds?.length
    ? existing.reviewerIds.map((r) => r._id || r)
    : existing?.reviewerId?._id
      ? [existing.reviewerId._id]
      : [];

  const [form, setForm] = useState({
    title: existing?.title || '', description: existing?.description || '',
    projectId: existing?.projectId?._id || defaultProjectId || '',
    clientId: existing?.clientId?._id || selectedProject?.clientId?._id || '',
    departmentId: existing?.departmentId?._id || selectedProject?.departmentId?._id || '',
    assigneeIds: existing?.assigneeIds?.length
      ? existing.assigneeIds.map((a) => a._id || a).filter(Boolean)
      : (existing?.assigneeId?._id ? [existing.assigneeId._id] : []),
    assigneeId: existing?.assigneeId?._id || '',
    reviewerIds: initialReviewerIds,
    status: existing?.status || 'todo', priority: existing?.priority || 'medium',
    dueDate: existing?.dueDate ? existing.dueDate.slice(0, 10) : '',
    estimatedHours: existing?.estimatedHours || '',
    subtasks: existing?.subtasks?.map(mapExistingSubtask) || []
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Auto-fill client/dept from project selection
  const handleProjectChange = (pid) => {
    const proj = projects.find(p => p._id === pid);
    set('projectId', pid);
    if (proj) { set('clientId', proj.clientId?._id || ''); set('departmentId', proj.departmentId?._id || ''); }
  };

  const handleAssigneeChange = (assigneeIds) => {
    setForm((p) => ({
      ...p,
      assigneeIds,
      assigneeId: assigneeIds[0] || '',
      reviewerIds: p.reviewerIds.filter((id) => !assigneeIds.includes(id))
    }));
  };

  const addSubtask = () => {
    setForm((p) => ({ ...p, subtasks: [...p.subtasks, defaultSubtaskFromParent(p)] }));
  };

  const updateSubtask = (index, next) => {
    setForm((p) => ({
      ...p,
      subtasks: p.subtasks.map((s, i) => (i === index ? next : s))
    }));
  };

  const removeSubtask = (index) => {
    setForm((p) => ({ ...p, subtasks: p.subtasks.filter((_, i) => i !== index) }));
  };

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = buildTaskPayload(data);
      return existing ? tasksApi.update(existing._id, payload) : tasksApi.create(payload);
    },
    onSuccess: () => {
      toast.success(existing ? 'Task updated' : 'Task created');
      qc.invalidateQueries(['tasks']);
      if (existing?._id) qc.invalidateQueries(['task', existing._id]);
      onClose();
    }
  });

  return (
    <div className="space-y-4">
      <Input label="Task Title *" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Write October blog posts" />
      <Textarea label="Description" value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Project *" value={form.projectId} onChange={e => handleProjectChange(e.target.value)}
          options={[{ value: '', label: 'Select project...' }, ...projects.map(p => ({ value: p._id, label: p.title }))]} />
        <Select label="Department" value={form.departmentId} onChange={e => set('departmentId', e.target.value)}
          options={[{ value: '', label: 'Select dept...' }, ...departments.map(d => ({ value: d._id, label: d.name }))]} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <CheckboxMultiSelect
          label="Assignees"
          placeholder="Select assignees…"
          emptyMessage="No users available"
          value={form.assigneeIds}
          onChange={handleAssigneeChange}
          options={users.map((u) => ({ value: u._id, label: u.name }))}
        />
        <CheckboxMultiSelect
          label="Reviewers (Two-Eye)"
          placeholder="Select reviewers…"
          emptyMessage="No users available"
          value={form.reviewerIds}
          onChange={(next) => set('reviewerIds', next)}
          options={users
            .filter((u) => !(form.assigneeIds || []).includes(u._id))
            .map((u) => ({ value: u._id, label: u.name }))}
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)}
          options={STATUSES.map(s => ({ value: s, label: slugToLabel(s) }))} />
        <Select label="Priority" value={form.priority} onChange={e => set('priority', e.target.value)}
          options={PRIORITIES.map(p => ({ value: p, label: slugToLabel(p) }))} />
        <Input label="Est. Hours" type="number" value={form.estimatedHours} onChange={e => set('estimatedHours', e.target.value)} />
      </div>
      <Input label="Due Date" type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
      {/* Subtasks — same fields as parent task */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <label className="label mb-0">Subtasks</label>
          <button type="button" onClick={addSubtask} className="btn-secondary py-1 px-3 text-xs">+ Add subtask</button>
        </div>
        <p className="text-[11px] text-gray-500">
          Each subtask can have its own project, department, assignee, reviewer, status, priority, hours, and due date.
          Leave project blank to inherit from the main task.
        </p>
        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {form.subtasks.map((st, i) => (
            <SubtaskEditor
              key={st._id || `new-${i}`}
              st={st}
              index={i}
              onChange={updateSubtask}
              onRemove={() => removeSubtask(i)}
              projects={projects}
              departments={departments}
              users={users}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => mutation.mutate(form)} disabled={mutation.isPending || !form.title || !form.projectId}>
          {mutation.isPending ? 'Saving...' : existing ? 'Update Task' : 'Create Task'}
        </button>
      </div>
    </div>
  );
}

function TaskCard({ task, onEdit, onApprove, onTrash, canTrash }) {
  const { user } = useAuth();
  const overdue = isOverdue(task.dueDate) && !['done', 'approved'].includes(task.status);
  const canApprove =
    task.status === 'review' &&
    isTaskReviewer(task, user._id) &&
    task.assigneeId?._id !== user._id;

  return (
    <div className={`border rounded-xl p-3 bg-white hover:shadow-card transition-all ${overdue ? 'border-red-200' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            task.priority === 'critical' ? 'bg-red-500' : task.priority === 'high' ? 'bg-orange-500' :
            task.priority === 'medium' ? 'bg-yellow-500' : 'bg-gray-400'
          }`} />
          <Link to={`/tasks/${task._id}`} className="text-sm font-medium text-gray-800 hover:text-brand-navy line-clamp-2">{task.title}</Link>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-2 truncate">{task.clientId?.company}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.assigneeId && <Avatar user={task.assigneeId} size="xs" />}
          {task.dueDate && (
            <span className={`text-xs flex items-center gap-0.5 ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              <Clock size={10} /> {formatDate(task.dueDate, 'dd MMM')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {task.subtasks?.length > 0 && (
            <span className="text-xs text-gray-400">
              {task.subtasks.filter(s => s.completed || ['done', 'approved'].includes(s.status)).length}/{task.subtasks.length}
            </span>
          )}
          {task.comments?.length > 0 && (
            <span className="text-xs text-gray-400 flex items-center gap-0.5"><MessageSquare size={10} /> {task.comments.length}</span>
          )}
          {canApprove && (
            <button onClick={() => onApprove(task._id)} className="ml-1 p-1 bg-green-100 text-green-600 rounded hover:bg-green-200" title="Two-Eye Approve">
              <ThumbsUp size={11} />
            </button>
          )}
          <button type="button" onClick={() => onEdit(task)} className="p-1 text-gray-400 hover:text-brand-navy rounded"><Eye size={11} /></button>
          {canTrash && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onTrash(task); }}
              className="p-1 text-amber-600 hover:bg-amber-50 rounded"
              title="Move to trash"
            >
              <Archive size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { user, canModule } = useAuth();
  const canCreateTask = canModule('tasks', 'create');
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [delayed, setDelayed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [taskTrashTarget, setTaskTrashTarget] = useState(null);
  const canTrashTask = canModule('tasks', 'delete');

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', { search, filterStatus, filterPriority, delayed }],
    queryFn: () => tasksApi.list({ search, status: filterStatus, priority: filterPriority, delayed: delayed || undefined, limit: 100 }).then(r => r.data),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const socket = getSocket() ?? connectSocket();
    if (!socket) return undefined;
    const refresh = () => qc.invalidateQueries({ queryKey: ['tasks'] });
    socket.on('task:created', refresh);
    socket.on('task:updated', refresh);
    return () => {
      socket.off('task:created', refresh);
      socket.off('task:updated', refresh);
    };
  }, [qc]);

  const approveMutation = useMutation({
    mutationFn: (id) => tasksApi.twoEyeApprove(id),
    onSuccess: () => { toast.success('Task approved ✓'); qc.invalidateQueries(['tasks']); }
  });

  const taskTrashMutation = useMutation({
    mutationFn: (id) => tasksApi.delete(id),
    onSuccess: () => {
      toast.success('Task moved to trash');
      qc.invalidateQueries(['tasks']);
      qc.invalidateQueries(['trash']);
      setTaskTrashTarget(null);
    },
  });

  const tasks = data?.tasks || [];
  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Tasks</h2>
          <p className="text-sm text-gray-500">{tasks.length} tasks · {tasks.filter(t => t.isDelayed).length} delayed</p>
        </div>
        <div className="flex items-center gap-2">
          {canCreateTask && (
            <button className="btn-primary" onClick={() => { setEditTask(null); setModalOpen(true); }}>
              <Plus size={16} /> New Task
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." className="flex-1 min-w-48" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input w-36">
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{slugToLabel(s)}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="input w-36">
          <option value="">All Priority</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{slugToLabel(p)}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={delayed} onChange={e => setDelayed(e.target.checked)} className="rounded text-brand-navy" />
          Delayed only
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s.key || 'all'}
            type="button"
            onClick={() => setFilterStatus(s.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filterStatus === s.key
                ? 'bg-brand-navy text-white border-brand-navy'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-navy/40'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {tasks.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No tasks found" description="Create a task or adjust filters" />
      ) : (
        /* LIST VIEW */
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Client</th>
                <th>Assignee</th>
                <th>Your role</th>
                <th className="whitespace-nowrap">Priority</th>
                <th className="whitespace-nowrap">Due date</th>
                <th className="whitespace-nowrap min-w-[7.5rem]">Status</th>
                <th className="text-right whitespace-nowrap w-[1%] pl-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={task._id}>
                  <td>
                    <Link to={`/tasks/${task._id}`} className="text-sm font-medium text-gray-900 hover:text-brand-navy">
                      {task.title}
                    </Link>
                    {task.subtasks?.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {task.subtasks.filter(s => s.completed || ['done', 'approved'].includes(s.status)).length}/{task.subtasks.length} subtasks
                      </p>
                    )}
                  </td>
                  <td><span className="text-xs text-gray-600">{task.clientId?.company || '—'}</span></td>
                  <td>{task.assigneeId ? <div className="flex items-center gap-1.5"><Avatar user={task.assigneeId} size="xs" /><span className="text-xs">{task.assigneeId.name?.split(' ')[0]}</span></div> : '—'}</td>
                  <td>
                    {(() => {
                      const { isAssignee, isReviewer } = userRolesOnTask(task, user?._id);
                      if (!isAssignee && !isReviewer) {
                        return <span className="text-xs text-gray-400">—</span>;
                      }
                      return (
                        <div className="flex flex-wrap gap-1">
                          {isAssignee && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-100">Assignee</span>
                          )}
                          {isReviewer && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-100">Reviewer</span>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="align-middle whitespace-nowrap">
                    <span className={priorityColors[task.priority] || 'badge-gray'}>{task.priority}</span>
                  </td>
                  <td className="align-middle whitespace-nowrap text-xs">
                    {task.dueDate ? (
                      <span className={isOverdue(task.dueDate) && !['done','approved'].includes(task.status) ? 'text-red-500 font-medium' : 'text-gray-500'}>
                        {formatDate(task.dueDate)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="align-middle whitespace-nowrap">
                    <span className={statusColors[task.status] || 'badge-gray'}>{slugToLabel(task.status)}</span>
                  </td>
                  <td className="align-middle text-right">
                    <div className="inline-flex flex-nowrap items-center justify-end gap-1.5">
                      <Link to={`/tasks/${task._id}`} className="btn-table">
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setEditTask(task);
                          setModalOpen(true);
                        }}
                        className="btn-table"
                      >
                        Edit
                      </button>
                      {canTrashTask && (
                        <button
                          type="button"
                          onClick={() => setTaskTrashTarget(task)}
                          className="btn-table btn-table-amber"
                          title="Move to trash"
                        >
                          <Archive size={12} className="shrink-0" aria-hidden />
                          Trash
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditTask(null); }}
        title={editTask ? `Edit Task` : 'New Task'} size="lg">
        <TaskForm onClose={() => { setModalOpen(false); setEditTask(null); }} existing={editTask} />
      </Modal>

      <ConfirmDialog
        open={!!taskTrashTarget}
        onClose={() => setTaskTrashTarget(null)}
        onConfirm={() => taskTrashMutation.mutate(taskTrashTarget._id)}
        loading={taskTrashMutation.isPending}
        title="Move task to trash"
        confirmLabel="Move to trash"
        danger
        message={`Move "${taskTrashTarget?.title}" to trash? It will disappear from boards and lists; restore it from Trash if needed.`}
      />
    </div>
  );
}
