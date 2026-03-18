# PPM·IT — Portfolio & Capacity Management

Application web de gestion de portefeuille projet IT et planification de la capacité des ressources.

## Fonctionnalités

- **Tableau de bord** : vue synthétique avec graphiques (capacité vs charge, statuts projets, alertes)
- **Portefeuille projets** : CRUD complet, filtres, statuts, sponsor, chef de projet, priorité, complexité
- **Ressources** : gestion de la disponibilité mensuelle par ressource (interne/externe) avec grille de capacité
- **Charge & Staffing** : saisie des besoins en jours par profil/projet/mois + affectation des ressources
- **Plan de capacité** : analyse en 3 vues (par ressource, par projet, par profil) avec code couleur
- **Alertes** : détection automatique des surcharges, sous-utilisations et couvertures incomplètes

## Déploiement sur Vercel

### Option 1 — Via GitHub (recommandé)

1. Créer un dépôt GitHub et pousser ce code
2. Aller sur [vercel.com](https://vercel.com) → "New Project" → importer le dépôt
3. Vercel détecte automatiquement Next.js — cliquer "Deploy"

### Option 2 — Via CLI Vercel

```bash
npm install -g vercel
cd ppm-webapp
vercel
```

### Option 3 — Drag & Drop

Zipper le dossier `ppm-webapp` et le déposer sur vercel.com/new

## Persistance des données

> ⚠️ Par défaut, les données sont stockées en mémoire serveur (reset au redémarrage).

Pour une persistance multi-utilisateurs réelle sur Vercel, connecter une base de données :

### Vercel KV (Redis) — recommandé pour démarrer rapidement

```bash
npm install @vercel/kv
vercel env pull
```

Modifier `src/app/api/data/route.ts` :
```typescript
import { kv } from '@vercel/kv';

export async function GET() {
  const data = await kv.get('ppm-data') ?? INITIAL_DATA;
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  await kv.set('ppm-data', body);
  return NextResponse.json({ ok: true });
}
```

### Alternatives

- **Vercel Postgres** (Neon) pour des données structurées relationnelles
- **PlanetScale / Supabase** pour plus de contrôle
- **MongoDB Atlas** + Mongoose

## Développement local

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Structure

```
src/
├── app/
│   ├── api/data/route.ts    # API REST (GET/POST données)
│   ├── globals.css          # Design system (dark theme)
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── App.tsx              # Root — navigation + état global
│   ├── Sidebar.tsx          # Navigation latérale
│   ├── Dashboard.tsx        # Tableau de bord
│   ├── ProjectsView.tsx     # Gestion projets
│   ├── StaffView.tsx        # Gestion ressources
│   ├── WorkloadView.tsx     # Charge & Staffing
│   ├── CapacityView.tsx     # Plan de capacité
│   └── AlertsView.tsx       # Alertes & Analyse
├── lib/
│   ├── alerts.ts            # Calcul alertes capacité
│   └── data.ts              # Données initiales (depuis Excel)
└── types/
    └── index.ts             # Types TypeScript
```

## Technologies

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Recharts (graphiques)
- DM Sans + DM Mono (typographie)
