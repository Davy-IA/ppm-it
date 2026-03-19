import { supabaseAdmin } from './supabase';
import { hashPassword } from './auth';

export async function initDatabase() {
  try {
    // Check if already initialized
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);

    if (existing && existing.length > 0) return { ok: true, message: 'Already initialized' };

    // Create default spaces
    const { data: spaces } = await supabaseAdmin
      .from('spaces')
      .insert([
        { name: 'IT Capacity Planning', description: 'Gestion de la capacité IT', color: '#6366f1', icon: '◈' },
        { name: 'Retail', description: 'Projets ouverture boutiques', color: '#10b981', icon: '🏪' },
      ])
      .select();

    // Create superadmin user
    const hash = await hashPassword('Admin2026!');
    const { data: adminUser } = await supabaseAdmin
      .from('users')
      .insert({
        email: 'admin@veja.fr',
        password_hash: hash,
        first_name: 'Super',
        last_name: 'Admin',
        role: 'superadmin',
      })
      .select()
      .single();

    // Create default app settings
    await supabaseAdmin.from('app_settings').upsert([
      { key: 'general', value: { appName: 'VEJA Project Management', locale: 'fr', colorTheme: 'indigo', logo: null } },
      { key: 'lists', value: {
        domains: ['APPLI', 'INFRA', 'INNOV', 'DATA'],
        profiles: ['PM', 'FUNC', 'DEV', 'INFRA', 'DATA', 'QA', 'DESIGN'],
        statuses: ['1-To arbitrate', '2-Validated', '3-In progress', '4-Frozen', '5-Completed', '6-Aborted'],
        departments: ['DIRECTION', 'WHOLESALE', 'WEB', 'RETAIL', 'OMNICHANNEL', 'STUDIO', 'FINANCE', 'SUPPLY CHAIN', 'HR', 'IT', 'I&C / SOURCING', 'COMMUNICATION'],
        countries: ['FR', 'BR', 'DE', 'DK', 'ES', 'PT', 'SK', 'UK', 'US'],
        requestTypes: ['IT Project', 'Digital project', 'Infrastructure project', 'Security project', 'Data project', 'AI / Automation initiative', 'Support', 'Maintenance'],
        sponsors: ['Damien LABRY', 'Grégoire CHEVALIER', 'Anne-Sophie DROIT', 'François Ghislain MORILLION', 'Sebastien KOPP'],
      }},
    ], { onConflict: 'key' });

    // Initialize space data with sample data
    if (spaces && spaces.length > 0) {
      const itSpace = spaces[0];
      await supabaseAdmin.from('space_data').insert({
        space_id: itSpace.id,
        data: {
          projects: [],
          staff: [],
          workloads: [],
          allocations: [],
          ganttPhases: [],
        }
      });
    }

    return {
      ok: true,
      message: 'Database initialized',
      credentials: { email: 'admin@veja.fr', password: 'Admin2026!' }
    };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
