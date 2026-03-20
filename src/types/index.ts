export interface Staff {
  id: string;
  name: string;
  type: 'Internal' | 'External';
  department: string;
  entity: string;
  profile: string;
  capacity: Record<string, number>;
}

export interface Project {
  id: string;
  name: string;
  domain: string;
  requestType: string;
  leadDept: string;
  leadCountry: string;
  sponsor: string;
  projectManager: string;
  priority: number | null;
  complexity: number | null;
  roi: string | null;
  status: string | null;
  startDate: string | null;
  goLive: string | null;
  hypercare: string | null;
}

export interface WorkloadEntry {
  id: string;
  projectId: string;
  projectName: string;
  profile: string;
  monthly: Record<string, number>;
}

export interface AllocationEntry {
  id: string;
  projectId: string;
  projectName: string;
  profile: string;
  staffId: string;
  staffName: string;
  monthly: Record<string, number>;
}

export interface GanttSubphase {
  id: string;
  phaseId: string;
  name: string;
  startDate: string;
  duration: number;
  dependsOn: string | null;
}

export interface GanttPhase {
  id: string;
  projectId: string;
  name: string;
  startDate: string;
  duration: number;
  color: string;
  dependsOn: string | null;
  subphases: GanttSubphase[];
  collapsed?: boolean;
}

export interface CapacityAlert {
  type: 'overcapacity' | 'undercapacity' | 'uncovered';
  staffId?: string;
  staffName?: string;
  projectId?: string;
  projectName?: string;
  profile?: string;
  month: string;
  value: number;
  capacity?: number;
  allocated?: number;
  workload?: number;
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  date: string;
  type: string; // from settings milestoneTypes
  isAutoGoLive?: boolean; // if true, date is synced from project.goLive
}

// Per-space overrides for value lists and milestone types
export interface SpaceConfig {
  domains?: string[];
  profiles?: string[];
  statuses?: string[];
  departments?: string[];
  countries?: string[];
  requestTypes?: string[];
  sponsors?: string[];
  milestoneTypes?: string[];
}

export interface AppData {
  spaceConfig?: SpaceConfig;
  staff: Staff[];
  projects: Project[];
  workloads: WorkloadEntry[];
  allocations: AllocationEntry[];
  ganttPhases: GanttPhase[];
  milestones: Milestone[];
}

export const MONTHS_2026_2028 = (() => {
  const months: string[] = [];
  for (let y = 2026; y <= 2028; y++) {
    for (let m = 1; m <= 12; m++) {
      months.push(`${y}-${String(m).padStart(2, '0')}`);
    }
  }
  return months;
})();

export const PROFILES = ['PM', 'FUNC', 'DEV', 'INFRA', 'DATA', 'QA', 'DESIGN'];
export const DOMAINS = ['APPLI', 'INFRA', 'INNOV', 'DATA'];
export const REQUEST_TYPES = ['IT Project', 'Digital project', 'Infrastructure project', 'Security project', 'Data project', 'AI / Automation initiative', 'Support', 'Maintenance'];
export const STATUSES = ['1-To arbitrate', '2-Validated', '3-In progress', '4-Frozen', '5-Completed', '6-Aborted'];
export const DEPARTMENTS = ['DIRECTION', 'WHOLESALE', 'WEB', 'RETAIL', 'OMNICHANNEL', 'STUDIO', 'FINANCE', 'SUPPLY CHAIN', 'HR', 'IT', 'I&C / SOURCING', 'COMMUNICATION', 'DEV / PRODUCTION', 'VEJA VENTURES'];
export const COUNTRIES = ['FR', 'BR', 'DE', 'DK', 'ES', 'PT', 'SK', 'UK', 'US'];
export const SPONSORS = ['Damien LABRY', 'Grégoire CHEVALIER', 'Anne-Sophie DROIT', 'Caroline BULLIOT KRIVANECK', 'François Ghislain MORILLION', 'Sebastien KOPP'];
