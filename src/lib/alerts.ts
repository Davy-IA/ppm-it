import { AppData, CapacityAlert, MONTHS_2026_2028 } from '@/types';

export function computeAlerts(data: AppData): CapacityAlert[] {
  const alerts: CapacityAlert[] = [];
  const { staff, workloads, allocations } = data;

  // Per staff member: compute allocated vs capacity per month
  for (const s of staff) {
    for (const month of MONTHS_2026_2028) {
      const cap = s.capacity[month] ?? 0;
      if (cap === 0) continue;

      const allocated = allocations
        .filter(a => a.staffId === s.id)
        .reduce((sum, a) => sum + (a.monthly[month] ?? 0), 0);

      if (allocated > cap) {
        alerts.push({
          type: 'overcapacity',
          staffId: s.id,
          staffName: s.name,
          month,
          value: allocated - cap,
          capacity: cap,
          allocated,
        });
      }
    }
  }

  // Per project workload: check coverage (allocated vs workload)
  for (const w of workloads) {
    for (const month of MONTHS_2026_2028) {
      const needed = w.monthly[month] ?? 0;
      if (needed === 0) continue;

      const covered = allocations
        .filter(a => a.projectId === w.projectId && a.profile === w.profile)
        .reduce((sum, a) => sum + (a.monthly[month] ?? 0), 0);

      if (covered < needed) {
        alerts.push({
          type: 'uncovered',
          projectId: w.projectId,
          projectName: w.projectName,
          profile: w.profile,
          month,
          value: needed - covered,
          workload: needed,
          allocated: covered,
        });
      }
    }
  }

  return alerts;
}

export function getStaffUtilization(data: AppData, staffId: string, month: string): {
  capacity: number; allocated: number; utilization: number; status: 'ok' | 'over' | 'under' | 'zero';
} {
  const s = data.staff.find(x => x.id === staffId);
  if (!s) return { capacity: 0, allocated: 0, utilization: 0, status: 'zero' };

  const cap = s.capacity[month] ?? 0;
  const allocated = data.allocations
    .filter(a => a.staffId === staffId)
    .reduce((sum, a) => sum + (a.monthly[month] ?? 0), 0);

  if (cap === 0) return { capacity: 0, allocated, utilization: 0, status: 'zero' };
  const utilization = (allocated / cap) * 100;
  const status = allocated > cap ? 'over' : utilization < 50 && allocated > 0 ? 'under' : allocated === 0 ? 'zero' : 'ok';
  return { capacity: cap, allocated, utilization, status };
}
