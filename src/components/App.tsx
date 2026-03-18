'use client';
import { useState, useEffect, useCallback } from 'react';
import { AppData, MONTHS_2026_2028 } from '@/types';
import { INITIAL_DATA } from '@/lib/data';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import ProjectsView from './ProjectsView';
import StaffView from './StaffView';
import WorkloadView from './WorkloadView';
import CapacityView from './CapacityView';
import AlertsView from './AlertsView';

export type View = 'dashboard' | 'projects' | 'staff' | 'workload' | 'capacity' | 'alerts';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load data from API on mount
  useEffect(() => {
    fetch('/api/data')
      .then(r => r.json())
      .then((d: AppData) => setData(d))
      .catch(() => {}); // use initial data if fails
  }, []);

  // Save data to API whenever it changes
  const saveData = useCallback(async (newData: AppData) => {
    setSaving(true);
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData),
      });
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
      <Sidebar
        view={view}
        setView={setView}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        saving={saving}
        data={data}
      />
      <main style={{
        flex: 1, overflow: 'auto', padding: '24px',
        background: 'var(--bg)',
        marginLeft: sidebarOpen ? 0 : 0,
      }}>
        {view === 'dashboard' && <Dashboard data={data} setView={setView} />}
        {view === 'projects' && <ProjectsView data={data} updateData={updateData} />}
        {view === 'staff' && <StaffView data={data} updateData={updateData} />}
        {view === 'workload' && <WorkloadView data={data} updateData={updateData} />}
        {view === 'capacity' && <CapacityView data={data} updateData={updateData} />}
        {view === 'alerts' && <AlertsView data={data} />}
      </main>
    </div>
  );
}
