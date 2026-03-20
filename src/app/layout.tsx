import type { Metadata } from 'next';
// © VEJA Fair Trade SAS 2026 — Proprietary software. All rights reserved.
import './globals.css';
import { SettingsProvider } from '@/lib/context';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'VEJA Project Management',
  description: 'IT Project Portfolio & Resource Capacity Planning',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider>
          <SettingsProvider>{children}</SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
