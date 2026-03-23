'use client';
import { useState, useMemo } from 'react';
import { AppData, GanttPhase, GanttSubphase, Staff, Task, SubTask, TaskStatus } from '@/types';
import { useSettings } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import { v4 as uuid } from 'uuid';
import ConfirmDialog from './ConfirmDialog';
import AlertDialog from './AlertDialog';

// ── Helpers ────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function statusOrder(s: TaskStatus): number {
  return { in_progress: 0, todo: 1, blocked: 2, done: 3 }[s] ?? 4;
}

// ── Avatar component ───────────────────────────────────────────────────────
function Avatar({ staff, size = 24 }: { staff: Staff | null | undefined; size?: number }) {
  const ini = staff ? initials(staff.name) : '?';
  const colors = ['#7C5CBF','#3DBE8F','#F4A642','#E96B6B','#5b8dd9','#2eaa6e'];
  const color = staff ? colors[staff.name.charCodeAt(0) % colors.length] : '#B5B0C8';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, flexShrink: 0,
      fontFamily: 'var(--font)', overflow: 'hidden',
      position: 'relative',
    }}
      title={staff?.name ?? ''}
    >
      {(staff as any)?.avatar
        ? <img src={(staff as any).avatar} alt={staff!.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : ini
      }
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────
function StatusBadge({ status, t }: { status: TaskStatus; t: (k: string) => string }) {
  const map: Record<TaskStatus, { label: string; bg: string; color: string }> = {
    todo:        { label: t('task_status_todo'),        bg: 'var(--bg3)',            color: 'var(--text-muted)' },
    in_progress: { label: t('task_status_in_progress'), bg: 'var(--warning-subtle)', color: 'var(--warning)' },
    done:        { label: t('task_status_done'),        bg: 'var(--success-subtle)', color: 'var(--success)' },
    blocked:     { label: t('task_status_blocked'),     bg: 'var(--danger-subtle)',  color: 'var(--danger)' },
  };
  const s = map[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 9px', borderRadius: 99,
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 600, fontFamily: 'var(--font)',
      whiteSpace: 'nowrap',
    }}>{s.label}</span>
  );
}

// ── Modal for creating / editing a task ───────────────────────────────────
interface ModalProps {
  task: Partial<Task> & { id: string };
  isNew: boolean;
  phases: GanttPhase[];
  projects: AppData['projects'];
  staff: Staff[];
  t: (k: string) => string;
  onSave: (task: Task) => void;
  onClose: () => void;
}

function TaskModal({ task: initial, isNew, phases, projects, staff, t, onSave, onClose }: ModalProps) {
  const [form, setForm] = useState<Task>({
    id: initial.id,
    projectId: initial.projectId ?? (projects[0]?.id ?? ''),
    phaseId: initial.phaseId ?? (phases[0]?.id ?? ''),
    subphaseId: initial.subphaseId ?? null,
    title: initial.title ?? '',
    ownerId: initial.ownerId ?? null,
    status: initial.status ?? 'todo',
    deadline: initial.deadline ?? null,
    isMilestone: initial.isMilestone ?? false,
    subtasks: initial.subtasks ?? [],
  });

  const subphasesForPhase = phases.find(p => p.id === form.phaseId)?.subphases ?? [];
  const set = (patch: Partial<Task>) => setForm(f => ({ ...f, ...patch }));

  const addSubtask = () => set({ subtasks: [...form.subtasks, { id: uuid(), title: '', ownerId: null, status: 'todo' }] });
  const removeSubtask = (id: string) => set({ subtasks: form.subtasks.filter(s => s.id !== id) });
  const patchSubtask = (id: string, patch: Partial<SubTask>) =>
    set({ subtasks: form.subtasks.map(s => s.id === id ? { ...s, ...patch } : s) });

  const valid = form.title.trim().length > 0 && form.projectId && form.phaseId;

  const STATUS_OPTIONS: TaskStatus[] = ['todo', 'in_progress', 'done', 'blocked'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal animate-in" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font)' }}>
            {isNew ? t('task_new') : t('task_edit')}
          </h2>
          <button className="btn-icon" onClick={onClose} style={{ fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Title */}
          <div>
            <label style={labelStyle}>{t('task_title_label')} *</label>
            <textarea
              className="input"
              rows={2}
              style={{ resize: 'vertical', minHeight: 60 }}
              placeholder={t('task_title_placeholder')}
              value={form.title}
              onChange={e => set({ title: e.target.value })}
            />
          </div>

          {/* Project + Phase row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{t('task_project')} *</label>
              <select className="input" value={form.projectId} onChange={e => set({ projectId: e.target.value, phaseId: '', subphaseId: null })}>
                <option value="">— {t('select_project')} —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t('task_phase')} *</label>
              <select className="input" value={form.phaseId} onChange={e => set({ phaseId: e.target.value, subphaseId: null })}>
                <option value="">— {t('task_select_phase')} —</option>
                {phases.filter(p => !form.projectId || p.projectId === form.projectId).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Subphase (optional) */}
          {subphasesForPhase.length > 0 && (
            <div>
              <label style={labelStyle}>{t('task_subphase')}</label>
              <select className="input" value={form.subphaseId ?? ''} onChange={e => set({ subphaseId: e.target.value || null })}>
                <option value="">— {t('task_none')} —</option>
                {subphasesForPhase.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
              </select>
            </div>
          )}

          {/* Owner + Status row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{t('task_owner')}</label>
              <select className="input" value={form.ownerId ?? ''} onChange={e => set({ ownerId: e.target.value || null })}>
                <option value="">— {t('task_unassigned')} —</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t('status')}</label>
              <select className="input" value={form.status} onChange={e => set({ status: e.target.value as TaskStatus })}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{t(`task_status_${s}`)}</option>)}
              </select>
            </div>
          </div>

          {/* Deadline + Milestone row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{t('task_deadline')}</label>
              <input type="date" className="input" value={form.deadline ?? ''} onChange={e => set({ deadline: e.target.value || null })} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 22 }}>
              <input type="checkbox" id="cb-milestone" checked={form.isMilestone} onChange={e => set({ isMilestone: e.target.checked })}
                style={{ width: 15, height: 15, accentColor: 'var(--warning)', cursor: 'pointer' }} />
              <label htmlFor="cb-milestone" style={{ fontSize: 12.5, color: 'var(--text)', fontFamily: 'var(--font)', cursor: 'pointer', userSelect: 'none' }}>
                {t('task_milestone_label')}
              </label>
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={labelStyle}>{t('task_subtasks')}</label>
              <button className="toolbar-btn" style={{ height: 26, fontSize: 11 }} onClick={addSubtask}>+ {t('task_add_subtask')}</button>
            </div>
            {form.subtasks.map(sub => (
              <div key={sub.id} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>↳</span>
                <input className="input" style={{ flex: 2, height: 32, padding: '0 10px' }}
                  placeholder={t('task_subtask_title_ph')}
                  value={sub.title}
                  onChange={e => patchSubtask(sub.id, { title: e.target.value })} />
                <select className="input" style={{ flex: 1, height: 32, padding: '0 8px' }}
                  value={sub.ownerId ?? ''}
                  onChange={e => patchSubtask(sub.id, { ownerId: e.target.value || null })}>
                  <option value="">—</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select className="input" style={{ width: 110, height: 32, padding: '0 8px' }}
                  value={sub.status}
                  onChange={e => patchSubtask(sub.id, { status: e.target.value as TaskStatus })}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{t(`task_status_${s}`)}</option>)}
                </select>
                <button className="btn-icon" style={{ width: 28, height: 28, flexShrink: 0, fontSize: 13 }}
                  onClick={() => removeSubtask(sub.id)}>✕</button>
              </div>
            ))}
            {form.subtasks.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic' }}>{t('task_no_subtasks')}</p>
            )}
          </div>
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('cancel')}</button>
          <button className="btn btn-primary btn-sm" onClick={() => valid && onSave(form)} disabled={!valid} style={{ opacity: valid ? 1 : 0.5 }}>
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 5,
  fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  fontFamily: 'var(--font)',
};

// ── Main component ─────────────────────────────────────────────────────────
interface Props { data: AppData; updateData: (d: AppData) => void; }

type TabView = 'by_project' | 'by_resource' | 'milestones';

export default function TasksView({ data, updateData }: Props) {
  const { t } = useSettings();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabView>('by_project');

  // Filters
  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  const [mySelfOnly, setMySelfOnly] = useState(false);

  // Task CRUD state
  const [tasks, setTasks] = useState<Task[]>((data as any).tasks ?? []);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const saveTasks = (updated: Task[]) => {
    setTasks(updated);
    updateData({ ...data, tasks: updated } as any);
  };

  const handleSave = (task: Task) => {
    const updated = isNew ? [...tasks, task] : tasks.map(t => t.id === task.id ? task : t);
    saveTasks(updated);
    setEditingTask(null);
  };

  const handleDelete = (id: string) => {
    setConfirmAction(() => () => saveTasks(tasks.filter(t => t.id !== id)));
  };

  const toggleExpand = (id: string) => setExpandedTasks(p => ({ ...p, [id]: !p[id] }));

  const toggleMilestone = (id: string, val: boolean) => {
    saveTasks(tasks.map(t => t.id === id ? { ...t, isMilestone: val } : t));
  };

  // Compute current user's linked staff id
  const currentStaff = useMemo(() =>
    data.staff.find(s => (s as any).userId === user?.id || s.name.toLowerCase() === `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.toLowerCase().trim()),
    [data.staff, user]
  );

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let ts = tasks;
    if (projectFilter.length > 0) ts = ts.filter(t => projectFilter.includes(t.projectId));
    if (mySelfOnly && currentStaff) ts = ts.filter(t => t.ownerId === currentStaff.id || t.subtasks.some(s => s.ownerId === currentStaff.id));
    return ts;
  }, [tasks, projectFilter, mySelfOnly, currentStaff]);

  // ── RENDER HELPERS ──────────────────────────────────────────────────────

  const renderTaskRow = (task: Task, depth = 0, extraCols?: React.ReactNode) => {
    const phase = data.ganttPhases.find(p => p.id === task.phaseId);
    const subphase = phase?.subphases.find(sp => sp.id === task.subphaseId);
    const owner = data.staff.find(s => s.id === task.ownerId);
    const expanded = expandedTasks[task.id];
    const isOverdue = task.deadline && task.status !== 'done' && new Date(task.deadline) < new Date();

    return (
      <>
        <div key={task.id} className="utbl-row" style={{ background: 'var(--bg2)' }}>
          {/* Task name col */}
          <div className="utbl-td" style={{ flex: '0 0 42%', display: 'flex', alignItems: 'center', gap: 0, paddingLeft: depth > 0 ? 32 : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
              <span style={{ color: 'var(--text)', fontSize: 12, flex: 1, whiteSpace: 'normal', lineHeight: 1.4, overflow: 'hidden' }}
                title={task.title}>
                {task.title}
              </span>
              {/* Subtask toggle — right of title */}
              {task.subtasks.length > 0 && (
                <button
                  onClick={() => toggleExpand(task.id)}
                  style={{
                    flexShrink: 0, marginLeft: 4,
                    width: 20, height: 20, borderRadius: 5,
                    border: '1px solid var(--border-light)',
                    background: expanded ? 'var(--accent-subtle)' : 'var(--bg3)',
                    color: expanded ? 'var(--accent)' : 'var(--text-muted)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    fontFamily: 'var(--font)',
                  }}
                  title={expanded ? t('task_collapse') : t('task_expand')}
                >{expanded ? '−' : task.subtasks.length}</button>
              )}
            </div>
          </div>

          {/* Extra cols (phase info for resource view) */}
          {extraCols}

          {/* Owner */}
          <div className="utbl-td" style={{ flex: '0 0 10%', display: 'flex', alignItems: 'center' }}>
            {owner ? (
              <div style={{ position: 'relative', display: 'inline-flex' }} title={owner.name}>
                <Avatar staff={owner} size={22} />
              </div>
            ) : <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>—</span>}
          </div>

          {/* Status */}
          <div className="utbl-td" style={{ flex: '0 0 14%' }}>
            <StatusBadge status={task.status} t={t} />
          </div>

          {/* Deadline */}
          <div className="utbl-td" style={{ flex: '0 0 12%', color: isOverdue ? 'var(--danger)' : 'var(--text)', fontWeight: isOverdue ? 600 : 400, fontSize: 12 }}>
            {task.deadline ? new Date(task.deadline).toLocaleDateString('fr-FR') : '—'}
          </div>

          {/* Milestone checkbox */}
          <div className="utbl-td" style={{ flex: '0 0 12%', textAlign: 'center' }}>
            <input type="checkbox" checked={task.isMilestone} onChange={e => toggleMilestone(task.id, e.target.checked)}
              style={{ width: 15, height: 15, accentColor: 'var(--warning)', cursor: 'pointer' }} />
          </div>

          {/* Actions */}
          <div className="utbl-td" style={{ flex: '0 0 10%', display: 'flex', gap: 4 }}>
            <button className="btn-icon" style={{ width: 26, height: 26, fontSize: 12 }}
              onClick={() => { setEditingTask(task); setIsNew(false); }} title={t('edit')}>✎</button>
            <button className="btn-icon" style={{ width: 26, height: 26, fontSize: 12, color: 'var(--danger)' }}
              onClick={() => handleDelete(task.id)} title={t('delete')}>✕</button>
          </div>
        </div>

        {/* Subtask rows */}
        {expanded && task.subtasks.map(sub => {
          const subOwner = data.staff.find(s => s.id === sub.ownerId);
          return (
            <div key={sub.id} className="utbl-row" style={{ background: 'var(--bg3)' }}>
              <div className="utbl-td" style={{ flex: '0 0 42%', paddingLeft: 48, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--text-faint)', fontSize: 11, flexShrink: 0 }}>↳</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'normal', lineHeight: 1.4 }}>{sub.title || '—'}</span>
              </div>
              {extraCols && <div className="utbl-td" style={{ flex: '0 0 16%' }} />}
              <div className="utbl-td" style={{ flex: '0 0 10%' }}>
                {subOwner ? <Avatar staff={subOwner} size={20} /> : <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>—</span>}
              </div>
              <div className="utbl-td" style={{ flex: '0 0 14%' }}>
                <StatusBadge status={sub.status} t={t} />
              </div>
              <div className="utbl-td" style={{ flex: '0 0 12%' }}>—</div>
              <div className="utbl-td" style={{ flex: '0 0 12%' }} />
              <div className="utbl-td" style={{ flex: '0 0 10%' }} />
            </div>
          );
        })}
      </>
    );
  };

  // ── TABLE HEADER ───────────────────────────────────────────────────────
  const renderTableHead = (withPhaseCol = false) => (
    <div className="utbl-head">
      <div className="utbl-th" style={{ flex: '0 0 42%' }}>{t('task_title_col')}</div>
      {withPhaseCol && <div className="utbl-th" style={{ flex: '0 0 16%' }}>{t('task_phase_col')}</div>}
      <div className="utbl-th" style={{ flex: '0 0 10%' }}>{t('task_owner_col')}</div>
      <div className="utbl-th" style={{ flex: '0 0 14%' }}>{t('status')}</div>
      <div className="utbl-th" style={{ flex: '0 0 12%' }}>{t('task_deadline')}</div>
      <div className="utbl-th" style={{ flex: '0 0 12%', textAlign: 'center' }}>{t('task_milestone_col')}</div>
      <div className="utbl-th" style={{ flex: '0 0 10%' }} />
    </div>
  );

  // ── PHASE HEADER ROW ───────────────────────────────────────────────────
  const renderPhaseRow = (phase: GanttPhase) => (
    <div key={`phase-${phase.id}`} style={{
      background: 'var(--bg3)',
      borderTop: '2px solid var(--border-light)',
      padding: '8px 14px 5px',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: phase.color, flexShrink: 0, display: 'inline-block' }} />
      <span style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12, color: 'var(--text)', letterSpacing: '.01em' }}>{phase.name}</span>
    </div>
  );

  // ── SUB-PHASE HEADER ROW ───────────────────────────────────────────────
  const renderSubphaseRow = (sp: GanttSubphase) => (
    <div key={`sp-${sp.id}`} style={{
      padding: '4px 14px 3px 32px',
      display: 'flex', alignItems: 'center', gap: 6,
      borderTop: '1px solid var(--border)',
      background: 'transparent',
    }}>
      <span style={{ width: 14, height: 1, background: 'var(--border-light)', display: 'inline-block', flexShrink: 0 }} />
      <span style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 11, color: 'var(--text-muted)' }}>{sp.name}</span>
    </div>
  );

  // ── RESOURCE GROUP HEADER ──────────────────────────────────────────────
  const renderResourceRow = (s: Staff) => (
    <div key={`res-${s.id}`} style={{
      background: 'var(--bg3)',
      borderTop: '2px solid var(--border-light)',
      padding: '10px 14px 6px',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <Avatar staff={s} size={26} />
      <span style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{s.name}</span>
      {currentStaff?.id === s.id && (
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '1px 8px', borderRadius: 99,
          background: 'var(--accent-subtle)', color: 'var(--accent)', fontFamily: 'var(--font)',
        }}>{t('task_me_badge')}</span>
      )}
    </div>
  );

  // ── PROJECT BREAK ROW (inside resource view) ───────────────────────────
  const renderProjBreakRow = (projectName: string) => (
    <div style={{
      padding: '6px 14px 4px',
      display: 'flex', alignItems: 'center', gap: 7,
      borderTop: '1px dashed var(--border-light)',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--border-light)', flexShrink: 0, display: 'inline-block' }} />
      <span style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 11, color: 'var(--text-muted)' }}>{projectName}</span>
    </div>
  );

  // ── EMPTY STATE ────────────────────────────────────────────────────────
  const renderEmpty = () => (
    <div style={{ padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
      <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font)', fontSize: 13 }}>{t('task_no_tasks')}</p>
      <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={() => { setEditingTask({ id: uuid(), projectId: data.projects[0]?.id ?? '', phaseId: data.ganttPhases[0]?.id ?? '', subphaseId: null, title: '', ownerId: null, status: 'todo', deadline: null, isMilestone: false, subtasks: [] }); setIsNew(true); }}>
        + {t('task_new')}
      </button>
    </div>
  );

  // ── VIEW: BY PROJECT ───────────────────────────────────────────────────
  const renderByProject = () => {
    // Group tasks by project → phase → subphase
    const tasksByProject = data.projects.reduce<Record<string, Task[]>>((acc, p) => {
      acc[p.id] = filteredTasks.filter(t => t.projectId === p.id);
      return acc;
    }, {});

    const allPhases = data.ganttPhases;

    return (
      <div className="card card-table" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div className="utbl-wrap">
          <div className="utbl-inner">
            {renderTableHead()}
            {filteredTasks.length === 0 ? renderEmpty() : data.projects.filter(proj => (tasksByProject[proj.id] ?? []).length > 0).map(proj => {
              const projTasks = tasksByProject[proj.id] ?? [];
              const phasesForProject = allPhases.filter(p => p.projectId === proj.id);

              return phasesForProject.map(phase => {
                const phaseTasks = projTasks.filter(t => t.phaseId === phase.id && !t.subphaseId);
                const spGroups = phase.subphases.map(sp => ({
                  sp,
                  tasks: projTasks.filter(t => t.phaseId === phase.id && t.subphaseId === sp.id),
                })).filter(g => g.tasks.length > 0);

                if (phaseTasks.length === 0 && spGroups.length === 0) return null;
                return (
                  <div key={phase.id}>
                    {renderPhaseRow(phase)}
                    {phaseTasks.map(task => renderTaskRow(task))}
                    {spGroups.map(({ sp, tasks: spTasks }) => (
                      <div key={sp.id}>
                        {renderSubphaseRow(sp)}
                        {spTasks.map(task => renderTaskRow(task))}
                      </div>
                    ))}
                  </div>
                );
              });
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── VIEW: BY RESOURCE ──────────────────────────────────────────────────
  const renderByResource = () => {
    const staffList = data.staff.filter(s => {
      if (mySelfOnly && currentStaff) return s.id === currentStaff.id;
      return filteredTasks.some(t => t.ownerId === s.id || t.subtasks.some(st => st.ownerId === s.id));
    });

    const sortedStaff = currentStaff
      ? [currentStaff, ...staffList.filter(s => s.id !== currentStaff.id)]
      : staffList;

    return (
      <div className="card card-table" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div className="utbl-wrap">
          <div className="utbl-inner">
            {renderTableHead(true)}
            {filteredTasks.length === 0 ? renderEmpty() : sortedStaff.map(staff => {
              const staffTasks = filteredTasks.filter(t => t.ownerId === staff.id);
              if (staffTasks.length === 0) return null;

              // Group by project → phase
              const projectIds = Array.from(new Set(staffTasks.map(t => t.projectId)));
              return (
                <div key={staff.id}>
                  {renderResourceRow(staff)}
                  {projectIds.map(projId => {
                    const proj = data.projects.find(p => p.id === projId);
                    if (!proj) return null;
                    const projTasks = staffTasks.filter(t => t.projectId === projId);
                    const phaseIds = Array.from(new Set(projTasks.map(t => t.phaseId)));

                    return (
                      <div key={projId}>
                        {renderProjBreakRow(proj.name)}
                        {phaseIds.map(phId => {
                          const phase = data.ganttPhases.find(p => p.id === phId);
                          if (!phase) return null;
                          const phaseTasks = projTasks.filter(t => t.phaseId === phId && !t.subphaseId);
                          const spGroups = phase.subphases.map(sp => ({
                            sp,
                            tasks: projTasks.filter(t => t.phaseId === phId && t.subphaseId === sp.id),
                          })).filter(g => g.tasks.length > 0);

                          const phaseColContent = (
                            <div className="utbl-td" style={{ flex: '0 0 16%', fontSize: 11, color: 'var(--text-muted)' }}>
                              {phase.name}
                            </div>
                          );

                          return (
                            <div key={phId}>
                              {renderPhaseRow(phase)}
                              {phaseTasks.map(task => renderTaskRow(task, 0, phaseColContent))}
                              {spGroups.map(({ sp, tasks: spTasks }) => (
                                <div key={sp.id}>
                                  {renderSubphaseRow(sp)}
                                  {spTasks.map(task => renderTaskRow(task, 0,
                                    <div className="utbl-td" style={{ flex: '0 0 16%', fontSize: 11, color: 'var(--text-muted)' }}>
                                      {phase.name} › {sp.name}
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── VIEW: MILESTONES ───────────────────────────────────────────────────
  const renderMilestones = () => {
    const milestones = filteredTasks.filter(t => t.isMilestone);
    if (milestones.length === 0) {
      return (
        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font)', fontSize: 13 }}>{t('task_no_milestones')}</p>
        </div>
      );
    }

    // Group by phase (stream)
    const phaseGroups = data.ganttPhases.reduce<Record<string, { phase: GanttPhase; tasks: Task[] }>>((acc, phase) => {
      const phaseMilestones = milestones.filter(t => t.phaseId === phase.id);
      if (phaseMilestones.length > 0) acc[phase.id] = { phase, tasks: phaseMilestones };
      return acc;
    }, {});

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
        {Object.values(phaseGroups).map(({ phase, tasks: mTasks }) => (
          <div key={phase.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '9px 14px', background: 'var(--bg3)',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 8,
              fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12,
            }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: phase.color, flexShrink: 0, display: 'inline-block' }} />
              {phase.name}
            </div>
            {mTasks.sort((a, b) => statusOrder(a.status) - statusOrder(b.status)).map(task => {
              const owner = data.staff.find(s => s.id === task.ownerId);
              const isOverdue = task.deadline && task.status !== 'done' && new Date(task.deadline) < new Date();
              return (
                <div key={task.id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12, lineHeight: 1.4, color: 'var(--text)' }}>
                    {task.title}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <StatusBadge status={task.status} t={t} />
                    {owner && <Avatar staff={owner} size={18} />}
                    {task.deadline && (
                      <span style={{ fontSize: 11, color: isOverdue ? 'var(--danger)' : 'var(--text-muted)', fontWeight: isOverdue ? 600 : 400, fontFamily: 'var(--font)' }}>
                        {new Date(task.deadline).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // ── MAIN RENDER ────────────────────────────────────────────────────────
  const allProjects = data.projects;

  return (
    <div className="animate-in">
      {/* Sticky toolbar — same pattern as WorkloadView */}
      <div className="page-sticky-header">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>

          {/* Sub-view tabs */}
          <div style={{ display: 'flex', gap: 2 }}>
            <button className={`toolbar-btn${tab === 'by_project' ? ' primary' : ''}`} onClick={() => setTab('by_project')}>
              {t('task_tab_by_project')}
            </button>
            <button className={`toolbar-btn${tab === 'by_resource' ? ' primary' : ''}`} onClick={() => setTab('by_resource')}>
              {t('task_tab_by_resource')}
            </button>
            <button className={`toolbar-btn${tab === 'milestones' ? ' primary' : ''}`} onClick={() => setTab('milestones')}>
              {t('task_tab_milestones')}
            </button>
          </div>

          {/* Separator */}
          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />

          {/* Project filter */}
          <select className="toolbar-select" style={{ maxWidth: 220 }}
            value={projectFilter.length === 1 ? projectFilter[0] : ''}
            onChange={e => {
              const val = e.target.value;
              setProjectFilter(val ? [val] : []);
            }}>
            <option value="">— {t('all_projects')} —</option>
            {allProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {/* Me filter */}
          {currentStaff && (
            <button
              className={`toolbar-btn${mySelfOnly ? ' active' : ''}`}
              onClick={() => setMySelfOnly(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Avatar staff={currentStaff} size={16} />
              {t('task_filter_me')}
            </button>
          )}

          {/* Clear filters */}
          {(projectFilter.length > 0 || mySelfOnly) && (
            <button style={{ fontSize: 11, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
              onClick={() => { setProjectFilter([]); setMySelfOnly(false); }}>
              ✕ {t('clear_filters')}
            </button>
          )}

          {/* Spacer + Add button */}
          <div style={{ marginLeft: 'auto' }}>
            <button className="toolbar-btn primary" onClick={() => {
              setEditingTask({
                id: uuid(),
                projectId: allProjects[0]?.id ?? '',
                phaseId: data.ganttPhases[0]?.id ?? '',
                subphaseId: null,
                title: '',
                ownerId: currentStaff?.id ?? null,
                status: 'todo',
                deadline: null,
                isMilestone: false,
                subtasks: [],
              });
              setIsNew(true);
            }}>
              + {t('task_new')}
            </button>
          </div>

        </div>
      </div>

      {/* View content */}
      {tab === 'by_project' && renderByProject()}
      {tab === 'by_resource' && renderByResource()}
      {tab === 'milestones' && renderMilestones()}

      {/* Modal */}
      {editingTask && (
        <TaskModal
          task={editingTask}
          isNew={isNew}
          phases={data.ganttPhases}
          projects={data.projects}
          staff={data.staff}
          t={t}
          onSave={handleSave}
          onClose={() => setEditingTask(null)}
        />
      )}

      {!!confirmAction && (
        <ConfirmDialog
          onConfirm={() => { confirmAction?.(); setConfirmAction(null); }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {!!alertMessage && (
        <AlertDialog
          message={alertMessage}
          onClose={() => setAlertMessage(null)}
        />
      )}
    </div>
  );
}
