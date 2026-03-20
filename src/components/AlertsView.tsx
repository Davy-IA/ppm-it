'use client';
import { useState } from 'react';
import { formatMonth, formatDate, formatDateTime } from '@/lib/locale-utils';
import { useSettings } from '@/lib/context';
import { AppData, MONTHS_2026_2028 } from '@/types';
import { computeAlerts, getStaffUtilization } from '@/lib/alerts';

interface Props { data: AppData; }

export default function AlertsView({ data }: Props) {
  const { t, settings } = useSettings();
  const locale = settings.locale ?? 'fr';
  const [filter, setFilter] = useState<'all' | 'overcapacity' | 'uncovered'>('all');
  const [yearFilter, setYearFilter] = useState('2026');

  const allAlerts = computeAlerts(data)
    .filter(a => a.month.startsWith(yearFilter));

  const filtered = filter === 'all' ? allAlerts : allAlerts.filter(a => a.type === filter);

  const overCount = allAlerts.filter(a => a.type === 'overcapacity').length;
  const uncovCount = allAlerts.filter(a => a.type === 'uncovered').length;

  // Staff utilization summary
  const months2026 = MONTHS_2026_2028.filter(m => m.startsWith(yearFilter));
  const staffSummary = data.staff.map(s => {
    const totalCap = months2026.reduce((sum, m) => sum + (s.capacity[m] ?? 0), 0);
    let alloc = 0;
    for (const a of data.allocations.filter(a => a.staffId === s.id)) {
      for (const m of months2026) {
        alloc += a.monthly[m] ?? 0;
      }
    }
    const pct = totalCap > 0 ? Math.round((alloc / totalCap) * 100) : 0;
    return { ...s, totalCap, totalAlloc: alloc, pct };
  }).sort((a, b) => b.pct - a.pct);

  const overloaded = staffSummary.filter(s => s.pct > 100);
  const underused = staffSummary.filter(s => s.pct < 40 && s.totalCap > 0);

  return (
    <div className="animate-in">
      {/* Summary banners */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div className="card" style={{ borderLeft: `3px solid ${overCount > 0 ? 'var(--danger)' : 'var(--success)'}` }}>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: overCount > 0 ? 'var(--danger)' : 'var(--success)' }}>{overCount}</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{t('overloads_detected')}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t('overload_desc')}</div>
        </div>
        <div className="card" style={{ borderLeft: `3px solid ${uncovCount > 0 ? 'var(--warning)' : 'var(--success)'}` }}>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: uncovCount > 0 ? 'var(--warning)' : 'var(--success)' }}>{uncovCount}</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{t('incomplete_coverage')}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t('coverage_desc')}</div>
        </div>
        <div className="card" style={{ borderLeft: `3px solid ${overloaded.length > 0 ? 'var(--danger)' : 'var(--success)'}` }}>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: overloaded.length > 0 ? 'var(--danger)' : 'var(--success)' }}>{overloaded.length}</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{t('overloaded_resources')}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t('overloaded_desc').replace('{year}', yearFilter)}</div>
        </div>
        <div className="card" style={{ borderLeft: `3px solid ${underused.length > 0 ? 'var(--warning)' : 'var(--success)'}` }}>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: underused.length > 0 ? 'var(--warning)' : 'var(--success)' }}>{underused.length}</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{t('underused_resources')}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t('underused_desc').replace('{year}', yearFilter)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        {/* Alert list */}
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
            <select className="input" value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={{ maxWidth: 100 }}>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
              <option value="2028">2028</option>
            </select>
            <div style={{ display: 'flex', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, padding: 3, gap: 3 }}>
              <button className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('all')}>{t('all_filter').replace('{n}', String(allAlerts.length))}</button>
              <button className={`btn btn-sm ${filter === 'overcapacity' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('overcapacity')}>{t('overload_filter_btn').replace('{n}', String(overCount))}</button>
              <button className={`btn btn-sm ${filter === 'uncovered' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('uncovered')}>{t('uncovered_filter_btn').replace('{n}', String(uncovCount))}</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--success)' }}>
                {t('no_alerts_msg')}
              </div>
            )}
            {filtered.map((a, i) => {
              const isOver = a.type === 'overcapacity';
              const color = isOver ? 'var(--danger)' : 'var(--warning)';
              const bg = isOver ? 'var(--danger-subtle)' : 'var(--warning-subtle)';
              const monthFmt = formatMonth(a.month, locale, { month: 'long', year: 'numeric' });
              return (
                <div key={i} className="alert-card" style={{ background: bg, borderColor: color }}>
                  <span style={{ fontSize: 18 }}>{isOver ? '⚡' : '⚠'}</span>
                  <div style={{ flex: 1 }}>
                    {isOver ? (
                      <>
                        <div style={{ fontWeight: 600, color, fontSize: 13 }}>{t('overload_alert').replace('{name}', a.staffName??'')}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                          {t('in_month')} <strong>{monthFmt}</strong> : {a.allocated}{t('days')} / {a.capacity}{t('days')}
                          <span style={{ color, fontWeight: 600 }}> (+{a.value?.toFixed(1)}j)</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontWeight: 600, color, fontSize: 13 }}>{t('coverage_alert').replace('{project}', a.projectName??'')}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                          {t('in_month')} <strong>{monthFmt}</strong> · {t('profile')} <strong>{a.profile}</strong> : {a.allocated}{t('days')} / {a.workload}{t('days')}
                          <span style={{ color, fontWeight: 600 }}> (-{a.value?.toFixed(1)}{t('days')})</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
                    {a.month}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Staff utilization panel */}
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>{t('util_rate_title').replace('{year}', yearFilter)}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {staffSummary.map(s => {
                const color = s.pct > 100 ? 'var(--danger)' : s.pct >= 70 ? 'var(--success)' : s.pct > 0 ? 'var(--warning)' : 'var(--text-faint)';
                return (
                  <div key={s.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{s.name}</span>
                      <span style={{ color, fontWeight: 700, fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>{s.pct}%</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${Math.min(s.pct, 100)}%`, background: color, borderRadius: 3, transition: 'width 0.5s' }} />
                    </div>
                    {s.pct > 100 && (
                      <div style={{ height: 3, background: 'var(--danger)', opacity: 0.5, borderRadius: 3, marginTop: 2, width: `${Math.min(s.pct - 100, 100)}%` }} />
                    )}
                    <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>
                      {s.totalAlloc}j / {s.totalCap}j · <span className="badge badge-blue" style={{ fontSize: 9, padding: '1px 4px' }}>{s.profile}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overloaded alert box */}
          {overloaded.length > 0 && (
            <div className="card" style={{ borderColor: 'var(--danger)', borderLeft: '3px solid var(--danger)' }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--danger)', marginBottom: 10 }}>{t('overloaded_box')}</div>
              {overloaded.map(s => (
                <div key={s.id} style={{ fontSize: 12, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text)' }}>{s.name}</span>
                  <span style={{ color: 'var(--danger)', fontWeight: 700, fontFamily: 'DM Mono' }}>{s.pct}%</span>
                </div>
              ))}
            </div>
          )}

          {/* Underused box */}
          {underused.length > 0 && (
            <div className="card" style={{ marginTop: 12, borderColor: 'var(--warning)', borderLeft: '3px solid var(--warning)' }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--warning)', marginBottom: 10 }}>{t('underused_box')}</div>
              {underused.map(s => (
                <div key={s.id} style={{ fontSize: 12, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text)' }}>{s.name}</span>
                  <span style={{ color: 'var(--warning)', fontWeight: 700, fontFamily: 'DM Mono' }}>{s.pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
