'use client';
import { useState, useEffect, useCallback } from 'react';
import { AppData } from '@/types';
import { INITIAL_DATA } from '@/lib/data';
import { useAuth } from '@/lib/auth-context';
import LoginScreen from './LoginScreen';
import GlobalPortfolio from './GlobalPortfolio';
import TopNav from './TopNav';
import DashboardHub from './DashboardHub';
import ProjectsView from './ProjectsView';
import StaffView from './StaffView';
import WorkloadView from './WorkloadView';
import GanttView from './GanttView';
import SettingsView from './SettingsView';

export type View = 'dashboard' | 'projects' | 'gantt' | 'staff' | 'workload' | 'settings';

interface Space { id: string; name: string; description: string; color: string; icon: string; active?: boolean; }

export default function App() {
  const { user, loading: authLoading, token } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [currentSpace, setCurrentSpace] = useState<Space | null>(null);
  const [view, setView] = useState<View>('projects');
  const [data, setData] = useState<AppData>({ ...INITIAL_DATA, projects: [], staff: [], workloads: [], allocations: [], ganttPhases: [] });
  const [saving, setSaving] = useState(false);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [spacesReady, setSpacesReady] = useState(false);

  // Bootstrap DB on first load
  useEffect(() => {
    fetch('/api/init').catch(() => {});
  }, []);

  // Fetch spaces from API
  const fetchSpaces = useCallback(async () => {
    if (!user || !token) return;
    setSpacesLoading(true);
    try {
      const r = await fetch('/api/spaces', { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); if (d?.spaces) setSpaces(d.spaces); }
    } finally {
      setSpacesLoading(false);
      setSpacesReady(true);
    }
  }, [user, token]);

  useEffect(() => { fetchSpaces(); }, [fetchSpaces]);

  // Auto-select space after spaces load — ALL hooks must be before any conditional return
  useEffect(() => {
    if (!spacesReady || currentSpace || spaces.length === 0) return;
    const lastSpaceId = typeof window !== 'undefined' ? localStorage.getItem('ppm-last-space') : null;
    const lastSpace = lastSpaceId ? spaces.find(s => s.id === lastSpaceId) : null;
    setCurrentSpace(lastSpace || spaces[0]);
  }, [spacesReady, spaces, currentSpace]);

  // Save last used space
  useEffect(() => {
    if (currentSpace && currentSpace.id !== '__global__') {
      localStorage.setItem('ppm-last-space', currentSpace.id);
    }
  }, [currentSpace]);

  // Load space data when space selected
  useEffect(() => {
    if (!currentSpace || currentSpace.id === '__global__' || !token) return;
    fetch(`/api/spaces/${currentSpace.id}/data`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); });
  }, [currentSpace, token]);

  const saveData = useCallback(async (newData: AppData) => {
    if (!currentSpace || currentSpace.id === '__global__' || !token) return;
    setSaving(true);
    try {
      await fetch(`/api/spaces/${currentSpace.id}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newData),
      });
    } finally {
      setTimeout(() => setSaving(false), 600);
    }
  }, [currentSpace, token]);

  const updateData = useCallback((newData: AppData) => {
    setData(newData);
    saveData(newData);
  }, [saveData]);

  // ── Conditional returns AFTER all hooks ──
  if (authLoading) {
    return <div style={{ height: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14 }}>⏳ Loading…</div>;
  }

  if (!user) return <LoginScreen />;

  if (!currentSpace) {
    return <div style={{ height: '100vh', background: 'var(--bg-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: 14 }}>⏳ Chargement…</div>;
  }

  if (currentSpace.id === '__global__') {
    return <GlobalPortfolio spaces={spaces} onBack={() => setCurrentSpace(null)} />;
  }

  return (
    <div className="app-shell">
      <TopNav
        view={view} setView={setView}
        saving={saving} data={data}
        currentSpace={currentSpace}
        onChangeSpace={() => setCurrentSpace(null)}
        spaces={spaces}
        onSelectSpace={(space) => setCurrentSpace(space as any)}
      />
      <main className="app-content">
        {view === 'dashboard' && <DashboardHub data={data} setView={setView} />}
        {view === 'projects' && <ProjectsView data={data} updateData={updateData} />}
        {view === 'gantt' && <GanttView data={data} updateData={updateData} />}
        {view === 'staff' && <StaffView data={data} updateData={updateData} />}
        {view === 'workload' && <WorkloadView data={data} updateData={updateData} />}
        {view === 'settings' && <SettingsView data={data} updateData={updateData} spaces={spaces as any} onRefreshSpaces={fetchSpaces} />}
      </main>
    </div>
  );
}
