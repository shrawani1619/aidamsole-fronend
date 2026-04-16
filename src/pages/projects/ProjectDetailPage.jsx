import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Users, Building2, Briefcase, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PageLoader, EmptyState, ProgressBar, ConfirmDialog } from '../../components/ui';
import { formatDate, formatINR, isOverdue, slugToLabel } from '../../utils/helpers';

function normalizeServicesFromProject(s) {
  if (Array.isArray(s) && s.length) return s;
  if (typeof s === 'string' && s) {
    const parts = s.split(',').map((x) => x.trim()).filter(Boolean);
    return parts.length ? parts : [s];
  }
  return [];
}

function formatServiceLabel(service, serviceOtherDetail) {
  if (service === 'Other' && typeof serviceOtherDetail === 'string' && serviceOtherDetail.trim()) {
    return `Other (${serviceOtherDetail.trim()})`;
  }
  return service;
}

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { canModule } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId).then((r) => r.data),
    enabled: !!projectId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => projectsApi.delete(projectId),
    onSuccess: (res) => {
      toast.success(res?.data?.message || 'Project deleted');
      qc.invalidateQueries(['projects']);
      qc.removeQueries({ queryKey: ['project', projectId] });
      setDeleteOpen(false);
      navigate('/projects');
    },
  });

  if (isLoading) return <PageLoader />;

  if (isError || !data?.project) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-brand-navy hover:underline">
          <ArrowLeft size={16} /> Back to projects
        </Link>
        <EmptyState
          title="Project not found"
          description={error?.response?.data?.message || 'This project may have been removed or you may not have access.'}
        />
      </div>
    );
  }

  const project = data.project;
  const overdue = project.dueDate && project.status !== 'completed' && isOverdue(project.dueDate);
  const services = normalizeServicesFromProject(project.service);

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-brand-navy hover:underline">
        <ArrowLeft size={16} /> Back to projects
      </Link>

      <div className="card space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{project.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{project.description || 'No description added.'}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canModule('projects', 'delete') && (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="btn-secondary py-1.5 px-2.5 text-xs text-red-600 hover:bg-red-50 inline-flex items-center gap-1"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
            <span className="text-xs badge-blue">{slugToLabel(project.status || 'planning')}</span>
          </div>
        </div>

        <ProgressBar value={project.progress || 0} showLabel />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Briefcase size={15} className="text-gray-400" />
            <span className="text-gray-600">Client:</span>
            <span className="font-medium text-gray-900">{project.clientId?.company || project.clientId?.name || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 size={15} className="text-gray-400" />
            <span className="text-gray-600">Department:</span>
            <span className="font-medium text-gray-900">{project.departmentId?.name || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-gray-400" />
            <span className="text-gray-600">Start:</span>
            <span className="font-medium text-gray-900">{project.startDate ? formatDate(project.startDate, 'dd MMM yyyy') : '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-gray-400" />
            <span className="text-gray-600">Due:</span>
            <span className={`font-medium ${overdue ? 'text-red-600' : 'text-gray-900'}`}>
              {project.dueDate ? formatDate(project.dueDate, 'dd MMM yyyy') : '—'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={15} className="text-gray-400" />
            <span className="text-gray-600">Manager:</span>
            <span className="font-medium text-gray-900">{project.managerId?.name || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Budget:</span>
            <span className="font-medium text-gray-900">{formatINR(project.budget || 0)}</span>
          </div>
        </div>

        {project.team?.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Team members</h3>
            <div className="flex flex-wrap gap-2">
              {project.team.map((m) => (
                <span key={m._id} className="badge-gray text-xs">{m.name}</span>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Services</h3>
          {services.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {services.map((svc) => (
                <span key={svc} className="badge-blue text-xs">
                  {formatServiceLabel(svc, project.serviceOtherDetail)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No services selected</p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title="Delete project"
        confirmLabel="Delete project"
        danger
        message={`Delete "${project.title}" permanently? This cannot be undone. If it has active tasks, delete or move those tasks first.`}
      />
    </div>
  );
}
