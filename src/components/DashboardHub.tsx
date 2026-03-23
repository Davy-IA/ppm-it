'use client';
import { AppData } from '@/types';
import { View } from './App';
import AlertsView from './AlertsView';

interface Props { data: AppData; setView: (v: View) => void; }

export default function DashboardHub({ data, setView }: Props) {
  return (
    <div className="animate-in">
      <AlertsView data={data} />
    </div>
  );
}
