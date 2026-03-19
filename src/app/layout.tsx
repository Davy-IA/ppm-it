import type { Metadata } from 'next';
import './globals.css';
import { SettingsProvider } from '@/lib/context';

export const metadata: Metadata = {
  title: 'PPM — Portfolio & Capacity Management',
  description: 'IT Project Portfolio & Resource Capacity Planning',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <SettingsProvider>{children}</SettingsProvider>
      </body>
    </html>
  );
}
