'use client';
import { useState, useEffect, useCallback } from 'react';
import { AppData } from '@/types';
import { INITIAL_DATA } from '@/lib/data';
import { useAuth } from '@/lib/auth-context';
import LoginScreen from './LoginScreen';
import SpaceSelector from './SpaceSelector';
import GlobalPortfolio from './GlobalPortfolio';
import Sidebar from './Sidebar';
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

  // Load spaces once logged in
  useEffect(() => {
    if (!user || !token) return;
    setSpacesLoading(true);
    fetch('/api/spaces', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.spaces) setSpaces(d.spaces); })
      .finally(() => setSpacesLoading(false));
  }, [user, token]);

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

  if (!currentSpace) {
    return <SpaceSelector spaces={spaces} onSelect={setCurrentSpace} appName="VEJA Project Management" />;
  }

  if (currentSpace.id === '__global__') {
    return <GlobalPortfolio spaces={spaces} onBack={() => setCurrentSpace(null)} />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        view={view} setView={setView}
        open={sidebarOpen} setOpen={setSidebarOpen}
        saving={saving} data={data}
        currentSpace={currentSpace}
        onChangeSpace={() => setCurrentSpace(null)}
      />
      <main style={{ flex: 1, overflow: 'auto', padding: '24px 28px', background: 'var(--bg)' }}>
        {view === 'dashboard' && <Dashboard data={data} setView={setView} />}
        {view === 'projects' && <ProjectsView data={data} updateData={updateData} />}
        {view === 'gantt' && <GanttView data={data} updateData={updateData} />}
        {view === 'staff' && <StaffView data={data} updateData={updateData} />}
        {view === 'workload' && <WorkloadView data={data} updateData={updateData} />}
        {view === 'capacity' && <CapacityView data={data} updateData={updateData} />}
        {view === 'alerts' && <AlertsView data={data} />}
        {view === 'settings' && <SettingsView data={data} updateData={updateData} spaces={spaces as any} />}
      </main>
    </div>
  );
}
