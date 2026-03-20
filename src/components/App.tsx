'use client';
import { useState, useEffect, useCallback } from 'react';
import { AppData } from '@/types';
import { INITIAL_DATA } from '@/lib/data';
import { useAuth } from '@/lib/auth-context';
import LoginScreen from './LoginScreen';
import GlobalPortfolio from './GlobalPortfolio';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import Dashboard from './Dashboard';
import ProjectsView from './ProjectsView';
import StaffView from './StaffView';
import WorkloadView from './WorkloadView';
import CapacityView from './CapacityView';
import AlertsView from './AlertsView';
import GanttView from './GanttView';
import SettingsView from './SettingsView';

export type View = 'dashboard' | 'projects' | 'gantt' | 'staff' | 'workload' | 'capacity' | 'alerts' | 'settings';

interface Space { id: string; name: string; description: string; color: string; icon: string; active?: boolean; }

export default function App() {
  const { user, loading: authLoading, token } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [currentSpace, setCurrentSpace] = useState<Space | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [data, setData] = useState<AppData>({ ...INITIAL_DATA, projects: [], staff: [], workloads: [], allocations: [], ganttPhases: [] });
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Bootstrap DB on first load
  useEffect(() => {
    fetch('/api/init').catch(() => {});
  }, []);

  // Fetch spaces from API — reusable for initial load + after mutations
  const fetchSpaces = useCallback(async () => {
    if (!user || !token) return;
    setSpacesLoading(true);
    try {
      const r = await fetch('/api/spaces', { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); if (d?.spaces) setSpaces(d.spaces); }
    } finally {
      setSpacesLoading(false);
    }
  }, [user, token]);

  // Load spaces once logged in
  useEffect(() => { fetchSpaces(); }, [fetchSpaces]);

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

  if (authLoading) {
    return <div style={{ height: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14 }}>⏳ Loading…</div>;
  }

  if (!user) return <LoginScreen />;

  // Auto-select first space on first load (skip the space selector page)
  useEffect(() => {
    if (!currentSpace && spaces.length > 0 && !spacesLoading && initialized) {
      // Restore last used space from localStorage
      const lastSpaceId = localStorage.getItem('ppm-last-space');
      const lastSpace = lastSpaceId ? spaces.find(s => s.id === lastSpaceId) : null;
      setCurrentSpace(lastSpace || spaces[0]);
    }
  }, [spaces, spacesLoading, initialized, currentSpace]);

  // Save last used space
  useEffect(() => {
    if (currentSpace && currentSpace.id !== '__global__') {
      localStorage.setItem('ppm-last-space', currentSpace.id);
    }
  }, [currentSpace]);

  if (!currentSpace) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: 14 }}>⏳ Chargement…</div>;

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
        onSelectSpace={(space) => {
          if (space.id === '__global__') setCurrentSpace(space as any);
          else setCurrentSpace(space as any);
        }}
      />
      <main className="app-content">
        {view === 'dashboard' && <Dashboard data={data} setView={setView} />}
        {view === 'projects' && <ProjectsView data={data} updateData={updateData} />}
        {view === 'gantt' && <GanttView data={data} updateData={updateData} />}
        {view === 'staff' && <StaffView data={data} updateData={updateData} />}
        {view === 'workload' && <WorkloadView data={data} updateData={updateData} />}
        {view === 'capacity' && <CapacityView data={data} updateData={updateData} />}
        {view === 'alerts' && <AlertsView data={data} />}
        {view === 'settings' && <SettingsView data={data} updateData={updateData} spaces={spaces as any} onRefreshSpaces={fetchSpaces} />}
      </main>
    </div>
  );
}
