'use client';
import { useSettings } from '@/lib/context';

interface Props {
  message: string;
  onClose: () => void;
}

export default function AlertDialog({ message, onClose }: Props) {
  const { t } = useSettings();
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,17,30,0.55)', zIndex: 9998 }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
        zIndex: 9999, padding: '28px 32px', minWidth: 280, maxWidth: 420, textAlign: 'center',
        animation: 'fadeOnly 0.15s ease',
        fontFamily: 'var(--font)',
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 22, lineHeight: 1.5 }}>
          {message}
        </div>
        <button className="btn btn-primary" style={{ minWidth: 80 }} onClick={onClose}>
          {t('ok') as string || 'OK'}
        </button>
      </div>
    </>
  );
}
