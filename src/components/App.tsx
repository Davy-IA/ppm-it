'use client';
import { useState, useEffect, useCallback } from 'react';
import { AppData } from '@/types';
import { INITIAL_DATA } from '@/lib/data';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import ProjectsView from './ProjectsView';
import StaffView from './StaffView';
import WorkloadView from './WorkloadView';
import CapacityView from './CapacityView';
import AlertsView from './AlertsView';
import GanttView from './GanttView';

export type View = 'dashboard' | 'projects' | 'gantt' | 'staff' | 'workload' | 'capacity' | 'alerts';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then((d: AppData) => setData(d)).catch(() => {});
  }, []);

  const saveData = useCallback(async (newData: AppData) => {
    setSaving(true);
    try {
      await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData) });
    } finally {
      setTimeout(() => setSaving(false), 800);
    }
  }, []);

  const updateData = useCallback((newData: AppData) => {
    setData(newData);
    saveData(newData);
  }, [saveData]);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar view={view} setView={setView} open={sidebarOpen} setOpen={setSidebarOpen} saving={saving} data={data} />
      <main style={{ flex: 1, overflow: 'auto', padding: '24px 28px', background: 'var(--bg)' }}>
        {view === 'dashboard' && <Dashboard data={data} setView={setView} />}
        {view === 'projects' && <ProjectsView data={data} updateData={updateData} />}
        {view === 'gantt' && <GanttView data={data} updateData={updateData} />}
        {view === 'staff' && <StaffView data={data} updateData={updateData} />}
        {view === 'workload' && <WorkloadView data={data} updateData={updateData} />}
        {view === 'capacity' && <CapacityView data={data} updateData={updateData} />}
        {view === 'alerts' && <AlertsView data={data} />}
      </main>
    </div>
  );
}
