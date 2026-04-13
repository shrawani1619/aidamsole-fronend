import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckSquare,
  Clock,
  MessageSquare,
  ThumbsUp,
  Archive,
  Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { tasksApi, usersApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Modal, PageLoader, Avatar, ConfirmDialog, Select, CheckboxMultiSelect } from '../../components/ui';
import { formatDate, statusColors, priorityColors, slugToLabel, isOverdue } from '../../utils/helpers';
import { TaskForm, isTaskReviewer } from './TasksPage';

export default function TaskDetailPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, canModule } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignForm, setReassignForm] = useState({ assigneeId: '', reviewerIds: [] });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => tasksApi.get(taskId).then((r) => r.data.task),
    enabled: !!taskId,
  });

  const { data: uData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data),
    enabled: reassignOpen,
  });
  const reassignUsers = uData?.users || [];

  const approveMutation = useMutation({
    mutationFn: () => tasksApi.twoEyeApprove(taskId),
    onSuccess: () => {
      toast.success('Task approved ✓');
      qc.invalidateQueries(['task', taskId]);
      qc.invalidateQueries(['tasks']);
    },
  });

  const reassignMutation = useMutation({
    mutationFn: (body) => tasksApi.reassign(taskId, body),
    onSuccess: () => {
      toast.success('Task reassigned');
      qc.invalidateQueries(['task', taskId]);
      qc.invalidateQueries(['tasks']);
      setReassignOpen(false);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Could not reassign');
    },
  });

  const trashMutation = useMutation({
    mutationFn: () => tasksApi.delete(taskId),
    onSuccess: () => {
      toast.success('Task moved to trash');
      qc.invalidateQueries(['tasks']);
      qc.invalidateQueries(['trash']);
      navigate('/tasks', { replace: true });
    },
  });

  if (isLoading) return <PageLoader />;
  if (isError || !data) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Link to="/tasks" className="inline-flex items-center gap-1.5 text-sm text-brand-navy hover:underline">
          <ArrowLeft size={16} /> Back to tasks
        </Link>
        <div className="card p-8 text-center">
          <p className="text-sm text-red-600">{error?.response?.data?.message || 'Task not found'}</p>
        </div>
      </div>
    );
  }

  const task = data;
  const overdue = isOverdue(task.dueDate) && !['done', 'approved'].includes(task.status);
  const canApprove =
    task.status === 'review' &&
    isTaskReviewer(task, user?._id) &&
    task.assigneeId?._id !== user?._id;
  const canReassign = isTaskReviewer(task, user?._id);
  const canTrash = canModule('tasks', 'delete');

  const openReassign = () => {
    const rids = task.reviewerIds?.length
      ? task.reviewerIds.map((r) => r._id || r)
      : task.reviewerId?._id
        ? [task.reviewerId._id]
        : [];
    setReassignForm({
      assigneeId: task.assigneeId?._id || '',
      reviewerIds: rids,
    });
    setReassignOpen(true);
  };

  const submitReassign = () => {
    const body = {};
    if (reassignForm.assigneeId !== (task.assigneeId?._id || '')) {
      body.assigneeId = reassignForm.assigneeId || null;
    }
    const prevR = task.reviewerIds?.length
      ? task.reviewerIds.map((r) => String(r._id || r)).sort().join(',')
      : task.reviewerId?._id
        ? String(task.reviewerId._id)
        : '';
    const nextR = [...reassignForm.reviewerIds].sort().join(',');
    if (prevR !== nextR) body.reviewerIds = reassignForm.reviewerIds;
    if (!Object.keys(body).length) {
      toast.error('Change assignee or reviewers first');
      return;
    }
    reassignMutation.mutate(body);
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link to="/tasks" className="inline-flex items-center gap-1.5 text-sm text-brand-navy hover:underline">
          <ArrowLeft size={16} /> Back to tasks
        </Link>
        <div className="flex flex-wrap gap-2">
          {canApprove && (
            <button
              type="button"
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="btn-primary py-1.5 px-3 text-xs inline-flex items-center gap-1"
            >
              <ThumbsUp size={14} /> Approve
            </button>
          )}
          {canReassign && (
            <button
              type="button"
              onClick={openReassign}
              className="btn-secondary py-1.5 px-3 text-xs inline-flex items-center gap-1"
            >
              Reassign
            </button>
          )}
          {canModule('tasks', 'edit') && (
            <button type="button" onClick={() => setEditOpen(true)} className="btn-secondary py-1.5 px-3 text-xs inline-flex items-center gap-1">
              <Pencil size={14} /> Edit
            </button>
          )}
          {canTrash && (
            <button
              type="button"
              onClick={() => setTrashOpen(true)}
              className="btn-secondary py-1.5 px-3 text-xs text-amber-700 hover:bg-amber-50 inline-flex items-center gap-1"
            >
              <Archive size={14} /> Move to trash
            </button>
          )}
        </div>
      </div>

      <div className="card space-y-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-brand-navy/8 text-brand-navy">
            <CheckSquare size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-gray-900">{task.title}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`text-xs ${statusColors[task.status] || 'badge-gray'}`}>{slugToLabel(task.status)}</span>
              <span className={`text-xs ${priorityColors[task.priority] || 'badge-gray'}`}>{task.priority}</span>
              {task.isDelayed && <span className="badge-amber text-xs">Delayed</span>}
              {overdue && <span className="badge-red text-xs">Overdue</span>}
            </div>
          </div>
        </div>

        {task.description ? (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500">Client</p>
            <p className="font-medium text-gray-900">{task.clientId?.company || task.clientId?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Project</p>
            <p className="font-medium text-gray-900">{task.projectId?.title || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Department</p>
            <p className="font-medium text-gray-900">{task.departmentId?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Due date</p>
            <p className={`font-medium flex items-center gap-1 ${overdue ? 'text-red-600' : 'text-gray-900'}`}>
              <Clock size={14} className="opacity-60" />
              {task.dueDate ? formatDate(task.dueDate, 'dd MMM yyyy') : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Assignee</p>
            {task.assigneeId ? (
              <div className="flex items-center gap-2 mt-0.5">
                <Avatar user={task.assigneeId} size="sm" />
                <span className="font-medium text-gray-900">{task.assigneeId.name}</span>
              </div>
            ) : (
              <p className="font-medium text-gray-400">Unassigned</p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500">Reviewers</p>
            {(() => {
              const list = task.reviewerIds?.length
                ? task.reviewerIds
                : task.reviewerId
                  ? [task.reviewerId]
                  : [];
              return list.length ? (
                <ul className="mt-1 space-y-1.5">
                  {list.map((r) => (
                    <li key={r._id || r} className="flex items-center gap-2">
                      <Avatar user={r} size="sm" />
                      <span className="font-medium text-gray-900">{r.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="font-medium text-gray-400">—</p>
              );
            })()}
          </div>
          <div>
            <p className="text-xs text-gray-500">Estimated hours</p>
            <p className="font-medium text-gray-900">{task.estimatedHours ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Actual hours</p>
            <p className="font-medium text-gray-900">{task.actualHours ?? '—'}</p>
          </div>
        </div>

        {task.subtasks?.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Subtasks</h3>
            <ul className="space-y-2">
              {task.subtasks.map((s) => (
                <li key={s._id || s.title} className="flex items-start gap-2 text-sm border border-gray-100 rounded-lg p-2.5">
                  <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${s.completed || ['done', 'approved'].includes(s.status) ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800">{s.title}</p>
                    {s.description && <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>}
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-[10px] text-gray-400">{slugToLabel(s.status || 'todo')}</span>
                      {s.dueDate && <span className="text-[10px] text-gray-400">{formatDate(s.dueDate, 'dd MMM')}</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {task.comments?.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <MessageSquare size={12} /> Comments
            </h3>
            <ul className="space-y-2">
              {task.comments.map((c, i) => (
                <li key={c._id || i} className="text-sm border border-gray-50 rounded-lg p-2 bg-surface-secondary/50">
                  <p className="text-xs text-gray-500 mb-1">{c.userId?.name || 'User'}</p>
                  <p className="text-gray-800">{c.text}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {task.timeLogs?.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Time logged</h3>
            <ul className="text-sm space-y-1">
              {task.timeLogs.map((log, i) => (
                <li key={log._id || i} className="flex justify-between gap-2 text-gray-700">
                  <span>{log.userId?.name || 'User'}</span>
                  <span className="text-gray-500">
                    {log.duration != null ? `${(log.duration / 60).toFixed(1)} h` : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Task" size="lg">
        <TaskForm
          existing={task}
          onClose={() => {
            setEditOpen(false);
            qc.invalidateQueries(['task', taskId]);
          }}
        />
      </Modal>

      <Modal open={reassignOpen} onClose={() => setReassignOpen(false)} title="Reassign task" size="md">
        <div className="space-y-4">
          <Select
            label="Assignee"
            value={reassignForm.assigneeId}
            onChange={(e) =>
              setReassignForm((p) => ({
                ...p,
                assigneeId: e.target.value,
                reviewerIds: p.reviewerIds.filter((id) => id !== e.target.value),
              }))
            }
            options={[{ value: '', label: 'Unassigned' }, ...reassignUsers.map((u) => ({ value: u._id, label: u.name }))]}
          />
          <CheckboxMultiSelect
            label="Reviewers"
            placeholder="Select reviewers…"
            emptyMessage="No users available"
            value={reassignForm.reviewerIds}
            onChange={(next) => setReassignForm((p) => ({ ...p, reviewerIds: next }))}
            options={reassignUsers
              .filter((u) => !reassignForm.assigneeId || u._id !== reassignForm.assigneeId)
              .map((u) => ({ value: u._id, label: u.name }))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setReassignOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={reassignMutation.isPending}
              onClick={submitReassign}
            >
              {reassignMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={trashOpen}
        onClose={() => setTrashOpen(false)}
        onConfirm={() => trashMutation.mutate()}
        loading={trashMutation.isPending}
        title="Move task to trash"
        confirmLabel="Move to trash"
        danger
        message={`Move "${task.title}" to trash?`}
      />
    </div>
  );
}
