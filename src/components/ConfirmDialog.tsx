'use client';
import { useSettings } from '@/lib/context';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ onConfirm, onCancel }: Props) {
  const { t } = useSettings();
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,17,30,0.55)', zIndex: 9998 }} onClick={onCancel} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
        zIndex: 9999, padding: '28px 32px', minWidth: 280, textAlign: 'center',
        animation: 'fadeOnly 0.15s ease',
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 22 }}>
          {t('confirm_delete')}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-ghost" style={{ minWidth: 80 }} onClick={onCancel}>
            {t('no')}
          </button>
          <button className="btn btn-danger" style={{ minWidth: 80 }} onClick={onConfirm}>
            {t('yes')}
          </button>
        </div>
      </div>
    </>
  );
}
