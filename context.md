# CITSA OCCULTE SCHOOL INTERNATIONAL — Contexte Projet

> Fichier de référence complet. Redonner ce fichier à Claude Code en début de session pour restaurer tout le contexte.

---

## 1. Présentation du projet

Application web pour **CITSA Occulte School International**, une école mystico négro-africaine.  
Elle permet de gérer les étudiants, professeurs, classes, bibliothèques numériques, cours live et exercices.

**Repo GitHub :** https://github.com/gougouei/CITA_SCHOOL  
**Répertoire local :** `/Users/mac/Documents/cita_school`  
**Branche principale :** `main`

---

## 2. Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 15 (App Router) |
| Style | TailwindCSS 3 + design tokens CITSA |
| Langage | TypeScript (strict) |
| Base de données | Supabase (Auth + PostgreSQL + Storage + Realtime) — **non encore configuré** |
| Composants | CVA (class-variance-authority) |
| Icons | lucide-react |

---

## 3. Design system

### Couleurs
```
CITSA Black      : #141414
CITSA Red        : #C91D1D  (citsa-red-hex)
CITSA Red Light  : #DD3C3C  (citsa-red-light)
CITSA Red Dark   : #A11212  (citsa-red-dark)
Cream            : #F9F7F6
Border           : #E0E0E0
Muted BG         : #F2F2F2
Muted FG         : #666666
Secondary        : #F5F5F5
```

### Typographie
```
Serif  (titres)  : Playfair Display  → classe Tailwind : font-serif
Sans   (corps)   : Plus Jakarta Sans → classe Tailwind : font-sans
```

### Ombres
```
shadow-card     : 0 4px 24px -4px rgba(0,0,0,.08)
shadow-elevated : 0 12px 40px -8px rgba(0,0,0,.15)
```

---

## 4. Authentification

- **Convention username → email** : le username est converti en `username@citsa.internal` pour Supabase Auth. L'utilisateur ne voit jamais l'email.
- **Connexion** : `/connexion` avec username + mot de passe
- **Redirection par rôle** :
  - `admin`     → `/admin`
  - `professor` → `/professeur`
  - `student`   → `/etudiant`
- **Middleware** : actuellement en mode preview (toutes routes accessibles). Fichier : `middleware.ts`. À réactiver avec la vraie logique quand Supabase est configuré.

---

## 5. Structure des fichiers

```
cita_school/
├── app/
│   ├── page.tsx                        # Landing page + formulaire admission
│   ├── connexion/page.tsx              # Page de connexion
│   ├── admin/
│   │   ├── layout.tsx                  # Layout admin (sidebar + AdminDataProvider)
│   │   ├── page.tsx                    # Vue d'ensemble (KPIs, activité récente)
│   │   ├── etudiants/page.tsx          # Gestion étudiants (table + modal édition + modal création)
│   │   ├── professeurs/page.tsx        # Gestion professeurs (table + modal édition)
│   │   ├── classes/page.tsx            # Gestion classes (cards + modal création/édition)
│   │   ├── bibliotheques/page.tsx      # Bibliothèques (filtre par classe + filtre par type)
│   │   ├── admissions/page.tsx         # Demandes d'admission (liste + actions)
│   │   └── broadcast/page.tsx          # Broadcast live
│   ├── professeur/
│   │   ├── layout.tsx                  # Layout professeur
│   │   ├── page.tsx                    # Mes classes
│   │   ├── live/page.tsx               # Cours live
│   │   ├── exercices/page.tsx          # Exercices
│   │   ├── bibliotheques/page.tsx      # Bibliothèques (filtre par classe + lecteurs)
│   │   └── messagerie/page.tsx         # Messagerie
│   ├── etudiant/
│   │   ├── layout.tsx                  # Layout étudiant
│   │   ├── page.tsx                    # Tableau de bord
│   │   ├── live/page.tsx               # Cours live
│   │   ├── exercices/page.tsx          # Exercices / QCM
│   │   ├── bibliotheques/page.tsx      # Bibliothèques (lecteurs audio/video/pdf/pptx)
│   │   └── messagerie/page.tsx         # Messagerie
│   └── api/
│       ├── auth/login/route.ts         # POST login (username → email interne)
│       ├── auth/logout/route.ts        # POST logout
│       ├── admission/route.ts          # POST formulaire admission
│       ├── admin/create-user/          # POST créer utilisateur (service_role)
│       ├── admin/delete-user/          # POST supprimer utilisateur
│       ├── admin/reset-password/       # POST réinitialiser mot de passe
│       └── student/submit-exercise/    # POST soumettre exercice
│
├── components/
│   ├── layout/
│   │   ├── dashboard-layout.tsx        # Layout dashboard (client, gère sidebar mobile)
│   │   ├── sidebar.tsx                 # Sidebar responsive (overlay mobile, fixe desktop)
│   │   ├── navbar.tsx                  # Navbar landing page
│   │   └── footer.tsx                  # Footer landing page
│   └── ui/
│       ├── button.tsx                  # Variants: accent, primary, secondary, outline, ghost, destructive
│       ├── badge.tsx                   # Variants: default, success, warning, destructive, muted
│       ├── card.tsx                    # Card, CardHeader, CardTitle, CardSubtitle, CardBody, CardFooter
│       ├── input.tsx                   # Input stylisé
│       └── alert.tsx                   # Alert avec variants
│
├── contexts/
│   └── admin-data.tsx                  # Context partagé pour les classes (AdminDataProvider + useAdminData)
│
├── services/
│   ├── auth.service.ts                 # signIn, signOut, getCurrentUser, resetPassword
│   ├── admin.service.ts                # CRUD users, classes, bibliothèques, admissions, broadcast
│   ├── professor.service.ts            # Classes prof, lives, exercices, soumissions
│   ├── student.service.ts              # Classes étudiant, lives, exercices, bibliothèques
│   ├── chat.service.ts                 # Channels, messages, temps réel
│   ├── notification.service.ts         # Notifications, temps réel
│   └── admission.service.ts            # Soumission formulaire admission
│
├── hooks/
│   ├── use-auth.ts                     # Hook authentification
│   ├── use-realtime-chat.ts            # Hook chat temps réel Supabase
│   ├── use-notifications.ts            # Hook notifications temps réel
│   └── use-live-status.ts              # Hook statut des lives
│
├── lib/
│   ├── supabase.ts                     # Client Supabase (browser)
│   ├── supabase-server.ts              # Client Supabase (server/SSR)
│   └── utils.ts                        # cn() helper (clsx + tailwind-merge)
│
├── types/
│   └── index.ts                        # Types TS : UserRole, Profile, Class, Exercise, LiveSession, ChatMessage, Notification, Library, LibraryFile…
│
├── utils/
│   ├── credentials.ts                  # generateUsername(fullName, existing[]) + generatePassword()
│   └── grading.ts                      # autoGrade(questions, answers) → {score, correct, total}
│
├── middleware.ts                        # Preview mode (passe-tout). À réactiver avec Supabase.
├── tailwind.config.ts                  # Tokens design CITSA
├── next.config.ts
├── .env.local.example                  # Variables d'env à remplir
├── logic.md                            # Spécification logique métier complète (référence)
└── context.md                          # CE FICHIER
```

---

## 6. Fonctionnalités implémentées

### Espace Admin (`/admin`)
| Page | Fonctionnalités |
|------|----------------|
| Vue d'ensemble | KPIs (étudiants, profs, classes, bibliothèques), activité récente, dernières admissions |
| Étudiants | Table avec avatars, classes, statut · Modal édition (infos, classes, sécurité) · Modal création (génère username + mot de passe) · Toggle actif/inactif |
| Professeurs | Table avec avatars · Modal édition (infos, classes assignées, sécurité) · Toggle actif/inactif |
| Classes | Cards avec profs assignés · Modal création (nom, description, sélection profs) · Modal édition · Suppression |
| Bibliothèques | Filtre par classe/niveau · Filtre par type (PDF/Vidéo/Audio/Présentation) · Stats par type · Cartes fichiers avec actions |
| Admissions | Liste des demandes avec statut |
| Broadcast | Interface de lancement broadcast live |

### Espace Professeur (`/professeur`)
| Page | Fonctionnalités |
|------|----------------|
| Mes Classes | Cards avec actions live et exercices |
| Cours Live | Interface live |
| Exercices | Gestion des exercices |
| Bibliothèques | Filtre par classe · Lecteurs intégrés (video/audio/PDF/PPTX) · Non téléchargeable |
| Messagerie | Interface messagerie |

### Espace Étudiant (`/etudiant`)
| Page | Fonctionnalités |
|------|----------------|
| Tableau de bord | Bannière live en cours, notifications, mes classes |
| Cours Live | Rejoindre un live |
| Exercices | Liste et soumission exercices/QCM |
| Bibliothèques | Fichiers par classe · Lecteurs intégrés · Non téléchargeable |
| Messagerie | Interface messagerie |

---

## 7. Contexte partagé (AdminDataProvider)

Les **classes** sont partagées via `contexts/admin-data.tsx` entre :
- `app/admin/classes/page.tsx` — création/édition/suppression
- `app/admin/etudiants/page.tsx` — assignation aux étudiants
- `app/admin/professeurs/page.tsx` — assignation aux professeurs

**IDs de classes** (mock) :
```
c1 → Initiation Niveau 1
c2 → Initiation Niveau 2
c3 → Avancé
c4 → Maîtrise
```

Le provider est injecté dans `app/admin/layout.tsx`.

---

## 8. Bibliothèques — logique d'accès

- Chaque fichier appartient à une **classe** (champ `classe`)
- Les étudiants ne voient que les fichiers des classes où ils sont inscrits
- Les professeurs voient tous les fichiers de leurs classes assignées
- Les fichiers sont **consultables en ligne uniquement** (pas de téléchargement) :
  - Vidéo : `controlsList="nodownload"`, `disablePictureInPicture`, clic droit désactivé
  - Audio : lecteur custom HTML5
  - PDF : iframe avec `#toolbar=0&navpanes=0`
  - PPTX : Google Docs viewer (en production)
- En production : URLs signées temporaires via Supabase Storage

---

## 9. Génération des credentials

Fonction `generateUsername(fullName, existingUsernames[])` dans `utils/credentials.ts` :
- Format : `prenom.nom` (accents supprimés, minuscules)
- Si doublon : `prenom.nom2`, `prenom.nom3`, etc.

Fonction `generatePassword()` :
- 14 caractères, garantit : majuscule + minuscule + chiffre + caractère spécial

---

## 10. Responsive design

- **Mobile (`< lg` / `< 1024px`)** : sidebar cachée, accessible via bouton hamburger (overlay)
- **Desktop (`lg+`)** : sidebar fixe 260px, `main` avec `ml-[260px]`
- Headers des pages : `px-4 py-4 sm:px-8 sm:py-5`
- Contenu : `p-4 sm:p-6 lg:p-8`
- Grilles : `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` selon le contexte

---

## 11. Ce qui reste à faire

### Priorité haute
- [ ] **Supabase** — configuration `.env.local` (URL + anon key + service role key)
- [ ] **Schéma SQL** — tables : `profiles`, `classes`, `class_members`, `library_files`, `live_sessions`, `exercises`, `exercise_submissions`, `chat_channels`, `chat_messages`, `notifications`, `admission_requests`
- [ ] **Triggers SQL** :
  - `handle_new_user` → crée le profil dans `profiles` après inscription Supabase Auth
  - Auto-création d'un channel de chat lors de la création d'une classe
- [ ] **RLS Policies** — sécurité par rôle sur toutes les tables
- [ ] **Réactiver le middleware** `middleware.ts` avec protection des routes par rôle

### Priorité moyenne
- [ ] **Intégration vidéo live** — LiveKit, Agora, ou Daily.co
- [ ] **Page mot de passe oublié** — `/mot-de-passe-oublie`
- [ ] **Upload fichiers bibliothèque** — Supabase Storage bucket `library-files`
- [ ] **Chat temps réel** — brancher `useRealtimeChat` et `ChatService` sur Supabase Realtime

### Priorité basse
- [ ] **Page de profil** pour chaque rôle
- [ ] **Notifications push** (browser notifications)

---

## 12. Variables d'environnement (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Le fichier `.env.local.example` existe dans le projet avec ces clés vides.

---

## 13. Commandes utiles

```bash
# Lancer le serveur de développement
npm run dev        # → http://localhost:3000

# Build de production
npm run build

# Git — pousser les modifications
git add .
git commit -m "description"
git push
```

---

## 14. Convention de code

- **Composants UI** : CVA (class-variance-authority) pour les variants
- **Client components** : `"use client"` en haut du fichier quand `useState`, `useEffect`, event handlers
- **Server components** : par défaut (pas de directive)
- **Modals** : pattern slide-in depuis la droite (`fixed right-0 top-0 h-full max-w-[480px]`) avec backdrop blur
- **Pas de commentaires** sauf si le WHY est non-évident
- **Pas de téléchargement** sur les fichiers de bibliothèque

---

## 15. Historique des sessions

| Date | Travaux effectués |
|------|------------------|
| Session 1 | Analyse des fichiers HTML/CSS source · Création du scaffold complet Next.js |
| Session 2 | Page bibliothèques admin redesignée · Modal édition étudiants · Modal édition professeurs |
| Session 3 | Filtre bibliothèques par classe · Page classes avec modal création · Contexte partagé AdminDataProvider |
| Session 4 | Modal création compte étudiant (génération username+password en 2 étapes) |
| Session 5 | Bibliothèque étudiant : lecteurs intégrés (video/audio/PDF/PPTX), non téléchargeable |
| Session 6 | Responsive complet (sidebar hamburger mobile, padding adaptatif, grilles responsive) |
| Session 7 | Menu + page bibliothèques professeur · Premier push GitHub |
