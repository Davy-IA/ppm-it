import { Locale } from './i18n';

export const COLOR_THEMES = [
  {
    id: 'indigo',
    name: 'Indigo Pro',
    preview: ['#6366f1', '#8b5cf6', '#f0f0f7'],
    vars: {
      '--accent': '#6366f1', '--accent2': '#8b5cf6', '--accent-hover': '#4f46e5',
      '--accent-gradient': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      '--accent-subtle': 'rgba(99,102,241,0.10)',
      '--bg': '#F5F5F7', '--bg2': '#FFFFFF', '--bg3': '#EFEFF2', '--border': '#EAE8F5',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    preview: ['#0ea5e9', '#06b6d4', '#f0f7ff'],
    vars: {
      '--accent': '#0ea5e9', '--accent2': '#06b6d4', '--accent-hover': '#0284c7',
      '--accent-gradient': 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
      '--accent-subtle': 'rgba(14,165,233,0.10)',
      '--bg': '#F5F5F7', '--bg2': '#FFFFFF', '--bg3': '#EFEFF2', '--border': '#DFF0FA',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald Forest',
    preview: ['#10b981', '#059669', '#f0fdf4'],
    vars: {
      '--accent': '#10b981', '--accent2': '#059669', '--accent-hover': '#047857',
      '--accent-gradient': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      '--accent-subtle': 'rgba(16,185,129,0.10)',
      '--bg': '#F5F5F7', '--bg2': '#FFFFFF', '--bg3': '#EFEFF2', '--border': '#D0EDDF',
    },
  },
  {
    id: 'rose',
    name: 'Rose Gold',
    preview: ['#f43f5e', '#e11d48', '#fff0f3'],
    vars: {
      '--accent': '#f43f5e', '--accent2': '#e11d48', '--accent-hover': '#be123c',
      '--accent-gradient': 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
      '--accent-subtle': 'rgba(244,63,94,0.10)',
      '--bg': '#F5F5F7', '--bg2': '#FFFFFF', '--bg3': '#EFEFF2', '--border': '#F8D9E2',
    },
  },
  {
    id: 'amber',
    name: 'Amber Warm',
    preview: ['#f59e0b', '#d97706', '#fffbf0'],
    vars: {
      '--accent': '#f59e0b', '--accent2': '#d97706', '--accent-hover': '#b45309',
      '--accent-gradient': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      '--accent-subtle': 'rgba(245,158,11,0.10)',
      '--bg': '#F5F5F7', '--bg2': '#FFFFFF', '--bg3': '#EFEFF2', '--border': '#F5E8C8',
    },
  },
  {
    id: 'slate',
    name: 'Slate Dark',
    preview: ['#475569', '#334155', '#f1f5f9'],
    vars: {
      '--accent': '#475569', '--accent2': '#334155', '--accent-hover': '#1e293b',
      '--accent-gradient': 'linear-gradient(135deg, #475569 0%, #334155 100%)',
      '--accent-subtle': 'rgba(71,85,105,0.10)',
      '--bg': '#F5F5F7', '--bg2': '#FFFFFF', '--bg3': '#EFEFF2', '--border': '#E4E8EE',
    },
  },
];

export interface AppSettings {
  locale: Locale;
  colorTheme: string;
  logo: string | null;      // logo mode jour (base64 ou null)
  logoDark: string | null;  // logo mode nuit (base64 ou null) — optionnel
  appName: string;
  budgetUrl: string;
  // Editable lists
  domains: string[];
  profiles: string[];
  statuses: string[];
  departments: string[];
  countries: string[];
  requestTypes: string[];
  sponsors: string[];
  milestoneTypes: string[];
  partnerTypes: string[];
  tableFontSize: number; // 11, 12, 13 (default), 14
  startYear?: number;
  endYear?: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  locale: 'fr',
  colorTheme: 'indigo',
  tableFontSize: 12,
  logo: null,
  logoDark: null,
  appName: 'PPM',
  budgetUrl: 'https://www.sapanalytics.cloud',
  domains: ['APPLI', 'INFRA', 'INNOV', 'DATA'],
  profiles: ['PM', 'FUNC', 'DEV', 'INFRA', 'DATA', 'QA', 'DESIGN'],
  statuses: ['1-To arbitrate', '2-Validated', '3-In progress', '4-Frozen', '5-Completed', '6-Aborted'],
  departments: ['DIRECTION', 'WHOLESALE', 'WEB', 'RETAIL', 'OMNICHANNEL', 'STUDIO', 'FINANCE', 'SUPPLY CHAIN', 'HR', 'IT', 'I&C / SOURCING', 'COMMUNICATION', 'DEV / PRODUCTION', 'VEJA VENTURES'],
  countries: ['FR', 'BR', 'DE', 'DK', 'ES', 'PT', 'SK', 'UK', 'US'],
  requestTypes: ['IT Project', 'Digital project', 'Infrastructure project', 'Security project', 'Data project', 'AI / Automation initiative', 'Support', 'Maintenance'],
  milestoneTypes: ['Go-Live', 'Kick-off', 'UAT', 'Hypercare End', 'Go-No-Go', 'Steering Committee'],
  partnerTypes: ['Consulting', 'Agency', 'Freelance', 'Software', 'Other'],
  sponsors: ['Damien LABRY', 'Grégoire CHEVALIER', 'Anne-Sophie DROIT', 'Caroline BULLIOT KRIVANECK', 'François Ghislain MORILLION', 'Sebastien KOPP'],
};

export function applyColorTheme(themeId: string) {
  const theme = COLOR_THEMES.find(t => t.id === themeId);
  if (!theme) return;
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
}
