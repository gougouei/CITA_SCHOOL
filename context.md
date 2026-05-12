# CITSA OCCULTE SCHOOL INTERNATIONAL — Contexte Projet

> Fichier de référence complet. Redonner ce fichier à Claude Code en début de session pour restaurer tout le contexte.
> **Dernière mise à jour : v0.2.0**

---

## 1. Présentation du projet

Application web pour **CITSA Occulte School International**, une école mystico négro-africaine.
Elle permet de gérer les étudiants, professeurs, classes, bibliothèques numériques, cours live, exercices, admissions et calendrier d'événements.

**Repo GitHub :** https://github.com/gougouei/CITA_SCHOOL
**Répertoire local :** `/Users/mac/Documents/cita_school`
**Branche principale :** `main`
**Dernière version taguée :** `v0.2.0`

---

## 2. Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 15 (App Router) |
| Style | TailwindCSS 3 + design tokens CITSA |
| Langage | TypeScript (strict) |
| Base de données | **Supabase configuré ✅** (Auth + PostgreSQL + Storage + Realtime) |
| Composants | CVA (class-variance-authority) |
| Icons | lucide-react |

### Projet Supabase
- **Nom :** CITA_SCHOOL
- **ID :** `qaudfykhzhpthwhynewz`
- **URL :** `https://qaudfykhzhpthwhynewz.supabase.co`
- **Région :** eu-central-1
- **Dashboard :** https://supabase.com/dashboard/project/qaudfykhzhpthwhynewz

### MCP Supabase dans Claude Code
- Installé via : `claude mcp add supabase -e SUPABASE_ACCESS_TOKEN=<token> -- npx -y @supabase/mcp-server-supabase@latest`
- Le token expire après chaque session — il faut le régénérer pour les sessions futures
- Permet d'exécuter du SQL directement depuis Claude Code

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
- **Middleware** : **réactivé ✅** — vérifie auth + rôle + statut actif sur toutes les routes protégées
- **Déconnexion** : depuis la sidebar, appelle `supabase.auth.signOut()` et redirige vers `/connexion`

### Compte admin initial
- Username : `admin`
- Email interne : `admin@citsa.internal`
- Password : `Yk7#Mq3pNv9$xL2R` *(à changer en production)*

---

## 5. Base de données — Schéma actuel

### Tables
| Table | Description |
|-------|-------------|
| `profiles` | Liée à `auth.users` · username, full_name, role, is_active, avatar_url |
| `classes` | Nom, description, created_by |
| `class_members` | Lien classe ↔ user (role professor/student) |
| `libraries` + `library_classes` + `library_files` | Bibliothèques de fichiers par classe |
| `admission_requests` | Demandes d'admission (toutes les infos du formulaire + photo) |
| `live_sessions` + `live_session_classes` | Cours en direct |
| `exercises` + `exercise_questions` + `exercise_submissions` | Exercices/QCM avec soumissions |
| `chat_channels` + `chat_channel_members` + `chat_messages` | Messagerie temps réel |
| `notifications` | Notifications utilisateur |
| `calendar_events` | **Nouveau** — événements calendrier par classe |

### Types enum
- `user_role` : admin, professor, student
- `file_type` : pdf, video, audio, pptx, other
- `marital_status` : single, married, divorced, widowed
- `admission_status` : pending, approved, rejected
- `session_type` : class_live, broadcast
- `session_status` : scheduled, live, ended
- `exercise_type` : pdf, quiz, qcm
- `question_type` : single_choice, multiple_choice, open
- `channel_type` : class, direct, general_students
- `notification_type` : live_started, exercise_posted, new_message, file_uploaded, admission_update, general
- `event_type` : cours_live, examen, ceremonie, reunion, autre

### Triggers
- `handle_new_user` → crée automatiquement le profil après inscription Supabase Auth (lit `raw_user_meta_data`)
- `set_updated_at` (générique) → applique `updated_at = now()` sur UPDATE pour profiles, classes, libraries, exercises, calendar_events
- `create_class_chat_channel` → crée un channel de chat à la création d'une classe
- `sync_class_member_to_chat` → ajoute un membre au channel quand on l'ajoute à une classe
- `remove_class_member_from_chat` → retire du channel quand on retire de la classe
- `prevent_self_role_change` → empêche un user de changer son propre rôle (sauf admin)

### Fonctions helper (security definer pour éviter récursion RLS)
- `current_role()` → retourne le rôle du user connecté
- `is_admin()` → true si user connecté est admin actif
- `is_class_member(class_id)` → true si user connecté est membre de la classe
- `is_class_professor(class_id)` → true si user connecté est prof de la classe

### Storage buckets
| Bucket | Public ? | Description |
|--------|----------|-------------|
| `admission-photos` | ✅ Public | Photos uploadées dans le formulaire d'admission (5 MB max) |
| `avatars` | ✅ Public | Avatars utilisateurs · chemin `{user_id}/avatar-{timestamp}.{ext}` (3 MB max) |
| `library-files` | ❌ Privé | Fichiers de bibliothèque — URLs signées · accès via class membership (500 MB max) |

### RLS Policies — résumé
- **profiles** : lecture par soi + class members + admin · update son propre profil (sauf role)
- **classes** : lecture par membres + admin · CRUD admin
- **class_members** : lecture par soi/membres · CRUD admin
- **libraries / library_files** : lecture si membre d'une classe assignée · CRUD admin
- **admission_requests** : insert public (formulaire) · CRUD admin
- **live_sessions** : lecture par membres concernés · prof crée pour ses classes · admin tout
- **exercises** : lecture par membres de classe · CRUD par prof de la classe
- **exercise_submissions** : student crée la sienne · prof voit/note celles de ses classes
- **chat_channels / messages** : lecture/écriture par membres
- **notifications** : lecture/update par destinataire
- **calendar_events** : lecture tous · création prof (pour ses classes) ou admin

---

## 6. Structure des fichiers

```
cita_school/
├── app/
│   ├── page.tsx                              # Landing page + formulaire admission
│   ├── connexion/page.tsx                    # Page de connexion
│   ├── admin/
│   │   ├── layout.tsx                        # Sidebar admin + AdminDataProvider
│   │   ├── page.tsx                          # Vue d'ensemble (KPIs réels, dernières admissions)
│   │   ├── etudiants/page.tsx                # CRUD étudiants connecté à Supabase
│   │   ├── professeurs/page.tsx              # CRUD professeurs connecté à Supabase
│   │   ├── classes/page.tsx                  # CRUD classes connecté à Supabase
│   │   ├── bibliotheques/page.tsx            # Bibliothèques (par classe + type)
│   │   ├── admissions/page.tsx               # Liste demandes + modal détails + approuver/rejeter
│   │   ├── broadcast/page.tsx                # Interface broadcast
│   │   ├── profil/page.tsx                   # Page profil admin
│   │   └── calendrier/page.tsx               # Calendrier admin
│   ├── professeur/
│   │   ├── layout.tsx
│   │   ├── page.tsx                          # Mes classes (chargées depuis Supabase)
│   │   ├── live/page.tsx                     # État vide (à venir)
│   │   ├── exercices/page.tsx                # État vide (à venir)
│   │   ├── bibliotheques/page.tsx            # Filtre par classe + lecteurs
│   │   ├── messagerie/page.tsx               # État vide (à venir)
│   │   ├── profil/page.tsx                   # Page profil prof
│   │   └── calendrier/page.tsx               # Calendrier prof
│   ├── etudiant/
│   │   ├── layout.tsx
│   │   ├── page.tsx                          # Dashboard (vraies classes)
│   │   ├── live/page.tsx                     # État vide (à venir)
│   │   ├── exercices/page.tsx                # État vide (à venir)
│   │   ├── bibliotheques/page.tsx            # Lecteurs intégrés + état vide
│   │   ├── messagerie/page.tsx               # État vide (à venir)
│   │   ├── profil/page.tsx                   # Page profil étudiant
│   │   └── calendrier/page.tsx               # Calendrier étudiant
│   └── api/
│       ├── auth/login/route.ts               # POST login (username → email interne)
│       ├── auth/logout/route.ts              # POST logout
│       ├── admission/route.ts                # POST formulaire admission (avec photo)
│       ├── admin/create-user/                # POST créer utilisateur manuellement
│       ├── admin/approve-admission/          # POST approuver + créer compte automatiquement
│       ├── admin/delete-user/                # POST supprimer utilisateur
│       ├── admin/reset-password/             # POST réinitialiser mot de passe
│       └── student/submit-exercise/          # POST soumettre exercice
│
├── components/
│   ├── admission-form.tsx                    # Formulaire d'admission (client component complet)
│   ├── profile-page.tsx                      # Page profil partagée (upload avatar + nom)
│   ├── calendar/
│   │   ├── types.ts                          # Types & config des event_types
│   │   ├── calendar-page.tsx                 # Vue mensuelle partagée
│   │   ├── event-form-modal.tsx              # Création/édition (admin + prof)
│   │   └── event-detail-modal.tsx            # Détails événement (lecture pour étudiant)
│   ├── layout/
│   │   ├── dashboard-layout.tsx              # Charge le profil user + écoute événements
│   │   ├── sidebar.tsx                       # Avec avatar dynamique + lien profil + déconnexion
│   │   ├── navbar.tsx                        # Navbar landing page
│   │   └── footer.tsx                        # Footer landing page
│   └── ui/
│       ├── button.tsx                        # Variants CVA
│       ├── badge.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── alert.tsx
│
├── contexts/
│   └── admin-data.tsx                        # Context classes partagé (utilisation décroissante)
│
├── services/                                 # Services (la plupart maintenant inline dans les pages)
│   ├── auth.service.ts
│   ├── admin.service.ts
│   ├── professor.service.ts
│   ├── student.service.ts
│   ├── chat.service.ts
│   ├── notification.service.ts
│   └── admission.service.ts
│
├── hooks/                                    # Hooks (réservés pour la suite)
│   ├── use-auth.ts
│   ├── use-realtime-chat.ts
│   ├── use-notifications.ts
│   └── use-live-status.ts
│
├── lib/
│   ├── supabase.ts                           # Client Supabase browser
│   ├── supabase-server.ts                    # Client Supabase server/SSR
│   └── utils.ts                              # cn() helper
│
├── types/index.ts                            # AdmissionRequest, Profile, Class, etc.
├── utils/
│   ├── credentials.ts                        # generateUsername + generatePassword
│   └── grading.ts                            # autoGrade(questions, answers)
│
├── middleware.ts                             # Réactivé — protection par rôle
├── tailwind.config.ts
├── next.config.ts
├── .env.local                                # Clés Supabase configurées
├── .env.local.example
├── logic.md                                  # Spec logique métier
└── context.md                                # CE FICHIER
```

---

## 7. Fonctionnalités implémentées

### 🛡️ Espace Admin (`/admin`)
| Page | État | Fonctionnalités |
|------|------|-----------------|
| Vue d'ensemble | ✅ Supabase | KPIs réels (étudiants, profs, classes, bibliothèques) · Dernières admissions cliquables |
| Étudiants | ✅ Supabase | Table avec avatars · Modal édition (infos, classes, sécurité) · Modal création (génère credentials via API) · Toggle actif/inactif |
| Professeurs | ✅ Supabase | Idem étudiants pour les profs |
| Classes | ✅ Supabase | Cards avec profs assignés · Modal création/édition · Suppression |
| Bibliothèques | ✅ Supabase | Filtre classe + type · État vide propre · Upload à brancher |
| Admissions | ✅ Supabase | Liste filtrée · Modal détails complet · **Approuver = crée auto le compte étudiant + retourne credentials** |
| Calendrier | ✅ Supabase | Vue mensuelle · Création événements (avec ou sans classe) · Modal détails |
| Profil | ✅ Supabase | Upload avatar · Édition nom complet |
| Broadcast | ⏳ Mockup | Interface UI, pas encore branché |

### 👨‍🏫 Espace Professeur (`/professeur`)
| Page | État | Fonctionnalités |
|------|------|-----------------|
| Mes Classes | ✅ Supabase | Charge les vraies classes assignées avec compteur étudiants |
| Cours Live | ⏳ État vide | "Disponible prochainement" |
| Exercices | ⏳ État vide | Bouton "+ Créer" désactivé |
| Bibliothèques | ✅ Supabase | Filtre par classe · Lecteurs intégrés (video/audio/PDF/PPTX) · Pas de téléchargement |
| Messagerie | ⏳ État vide | "Vous serez ajouté aux canaux des classes assignées" |
| Calendrier | ✅ Supabase | Création limitée aux classes assignées du prof |
| Profil | ✅ Supabase | Upload avatar · Édition nom complet |

### 🎓 Espace Étudiant (`/etudiant`)
| Page | État | Fonctionnalités |
|------|------|-----------------|
| Tableau de bord | ✅ Supabase | Vraies classes de l'étudiant · État vide notifications |
| Cours Live | ⏳ État vide | "Aucun cours en direct" |
| Exercices | ⏳ État vide | "Aucun exercice disponible" |
| Bibliothèques | ✅ Supabase | Fichiers groupés par classe · Lecteurs intégrés · Non téléchargeable |
| Messagerie | ⏳ État vide | "Aucune conversation" |
| Calendrier | ✅ Supabase | **Lecture seule** — pas de bouton "Nouvel événement" |
| Profil | ✅ Supabase | Upload avatar · Édition nom complet |

---

## 8. Flow d'admission complet

1. **Visiteur** sur la landing → remplit le formulaire d'admission
   - 11 champs obligatoires + 1 optionnel : nom, prénoms, email, date naissance, pays naissance, pays résidence, situation matrimoniale, nombre d'enfants, profession, motivation, **photo d'identité** (JPG/PNG/WEBP, 5 MB max)
   - La photo est uploadée dans le bucket `admission-photos` avec un nom UUID
   - La demande est insérée dans `admission_requests` avec `photo_url` publique
   - Email obligatoire et unique
2. **Admin** consulte `/admin/admissions` → voit la liste avec vignettes photo
3. Admin clique **"Détails"** → panneau slide-in avec toutes les infos + grande photo
4. Admin clique **"Approuver & créer le compte"** → route `/api/admin/approve-admission`
   - Génère un username unique (`prenom.nom` ou `prenom.nom2`...) + mot de passe sécurisé
   - Crée l'auth user via service_role (`adminClient.auth.admin.createUser`)
   - Le trigger `handle_new_user` crée le profil
   - Copie `admission.photo_url` → `profile.avatar_url`
   - Marque l'admission `approved` avec `reviewed_by` et `reviewed_at`
5. Modal "Compte créé" s'affiche avec username + mot de passe **copiables**
6. L'étudiant apparaît automatiquement dans `/admin/etudiants` (puisque c'est juste un `SELECT WHERE role='student'`)

> La création **manuelle** d'étudiants est toujours possible via `/admin/etudiants` → bouton "+ Créer un compte"

---

## 9. Page profil — Upload avatar

Composant partagé : `components/profile-page.tsx`, rendu par les 3 pages `/admin/profil`, `/professeur/profil`, `/etudiant/profil`.

- Chemin de stockage : `avatars/{user_id}/avatar-{timestamp}.{ext}`
- RLS sur storage : seul l'user peut écrire dans son propre dossier (`storage.foldername(name))[1] = auth.uid()`
- Validation côté client : JPG/PNG/WEBP, 3 MB max
- Après upload : `profiles.avatar_url` est mis à jour
- **Synchronisation sidebar** : un `CustomEvent("profile-updated")` est émis et le DashboardLayout écoute → l'avatar dans la sidebar se met à jour **instantanément** sans recharger la page

---

## 10. Système calendrier

### Composant : `components/calendar/`
- **types.ts** : 5 types d'événements avec couleurs (cours_live, examen, ceremonie, reunion, autre)
- **calendar-page.tsx** : grille mensuelle 7×6, navigation prev/next/today, sidebar "Prochains événements" + légende
- **event-form-modal.tsx** : création/édition (admin + prof seulement)
- **event-detail-modal.tsx** : détails (read-only pour étudiant)

### Logique d'accès
- **Tout le monde lit** tous les événements
- **Admin** : peut créer pour n'importe quelle classe OU sans classe (général)
- **Prof** : doit obligatoirement choisir une classe parmi celles qu'il enseigne
- **Étudiant** : pas de bouton "Nouvel événement", clic sur événement = modal détails read-only

---

## 11. Bibliothèques — logique d'accès

- Chaque fichier appartient à une **bibliothèque** qui est liée à une ou plusieurs **classes** via `library_classes`
- Les étudiants ne voient que les fichiers des classes où ils sont inscrits (RLS automatique)
- Les professeurs voient les fichiers de leurs classes assignées
- L'admin voit tout
- Les fichiers sont **consultables en ligne uniquement** :
  - Vidéo : `controlsList="nodownload"`, `disablePictureInPicture`, clic droit désactivé
  - Audio : lecteur HTML5 personnalisé
  - PDF : iframe avec `#toolbar=0&navpanes=0`
  - PPTX : Google Docs viewer
- En production : URLs signées temporaires via Supabase Storage
- ⏳ Le bouton "+ Ajouter un fichier" (admin) est désactivé — upload à brancher

---

## 12. Génération des credentials

Fonction `generateUsername(fullName, existingUsernames[])` dans `utils/credentials.ts` :
- Format : `prenom.nom` (accents supprimés, minuscules)
- Si doublon : `prenom.nom2`, `prenom.nom3`, etc.

Fonction `generatePassword()` :
- 14 caractères, garantit : majuscule + minuscule + chiffre + caractère spécial

---

## 13. Responsive design

- **Mobile (`< lg` / `< 1024px`)** : sidebar cachée, accessible via bouton hamburger (overlay)
- **Desktop (`lg+`)** : sidebar fixe 260px, `main` avec `ml-[260px]`
- Headers des pages : `px-4 py-4 sm:px-8 sm:py-5`
- Contenu : `p-4 sm:p-6 lg:p-8`
- Grilles : `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` selon le contexte
- Calendrier : sidebar "Prochains événements" passe en bas sur mobile

---

## 14. Ce qui reste à faire

### Priorité haute (fonctionnalités métier)
- [ ] **Live vidéo** — intégration LiveKit / Agora / Daily.co pour `live_sessions`
- [ ] **Chat temps réel** — brancher `chat_messages` sur Supabase Realtime + UI complète
- [ ] **Exercices** — UI complète : création par prof (QCM/quiz/PDF), passage par étudiant, correction auto, notation manuelle
- [ ] **Upload fichiers bibliothèque** — UI admin pour uploader vers bucket `library-files` + assignation classes
- [ ] **Page mot de passe oublié** — `/mot-de-passe-oublie` (Supabase ne peut pas faire de reset email sur emails fictifs, donc reset par l'admin)
- [ ] **Notifications** — UI dans la sidebar (badge dynamique) + page dédiée

### Priorité moyenne
- [ ] **Bouton "Réinitialiser mot de passe"** dans le modal admin étudiant/prof (route API existe déjà)
- [ ] **Bouton "Supprimer compte"** dans le modal admin (route API existe déjà)
- [ ] **Broadcast** — brancher l'UI sur `live_sessions` avec `session_type='broadcast'`
- [ ] **Email transactionnel** quand l'admin approuve une admission (Resend ou alternative)

### Priorité basse / améliorations
- [ ] Notifications push browser
- [ ] Export PDF des soumissions d'exercices
- [ ] Statistiques détaillées admin (graphiques)
- [ ] Recherche globale dans le dashboard

---

## 15. Variables d'environnement (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://qaudfykhzhpthwhynewz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

⚠️ Le `SUPABASE_SERVICE_ROLE_KEY` est utilisé par les routes API `/admin/create-user` et `/admin/approve-admission` pour bypasser RLS. Ne jamais l'exposer côté client.

---

## 16. Commandes utiles

```bash
# Lancer le serveur de développement
npm run dev        # → http://localhost:3000

# Build de production
npm run build

# Git — pousser les modifications
git add .
git commit -m "description"
git push

# Tag de version
git tag -a v0.X.0 -m "description"
git push origin v0.X.0

# Réparer permissions npm (si "EACCES" dans node_modules)
sudo chown -R $(whoami):staff /Users/mac/Documents/cita_school

# Re-ajouter Supabase MCP (token expire — régénérer sur supabase.com/dashboard/account/tokens)
claude mcp add supabase -e SUPABASE_ACCESS_TOKEN=<token> -- npx -y @supabase/mcp-server-supabase@latest
```

---

## 17. Convention de code

- **Composants UI** : CVA (class-variance-authority) pour les variants
- **Client components** : `"use client"` en haut du fichier quand `useState`, `useEffect`, event handlers
- **Server components** : par défaut (pas de directive)
- **Modals** : pattern slide-in depuis la droite (`fixed right-0 top-0 h-full max-w-[480px]`) avec backdrop blur
- **Pas de commentaires** sauf si le WHY est non-évident
- **Pas de téléchargement** sur les fichiers de bibliothèque
- **Erreurs** : extraire via une fonction qui sait lire les erreurs Supabase (qui ne sont pas des `Error` JS standards) — voir `extractError` dans `profile-page.tsx`
- **RLS** : éviter les sous-requêtes auto-référencées dans les policies → utiliser des fonctions `security definer` à la place (récursion infinie sinon)

---

## 18. Historique des versions

### v0.2.0 — Calendar, profile, admission flow, space cleanup *(actuelle)*

**Nouvelles fonctionnalités**
- ✅ Système de calendrier complet (admin/prof/étudiant) avec table `calendar_events` + RLS
- ✅ Pages profil partagées avec upload avatar (bucket `avatars` + policies)
- ✅ Approbation d'admission → création auto du compte étudiant + credentials retournés
- ✅ Routes API : `/api/admin/approve-admission` (création + maj statut)

**Nettoyage**
- ✅ Retrait de tous les badges hardcodés (sidebars étudiant/prof)
- ✅ Tableau de bord étudiant : vraies classes au lieu de mocks
- ✅ Pages messagerie/exercices/live (prof + étudiant) : états vides
- ✅ Mes Classes professeur : charge vraiment depuis Supabase

**Corrections**
- ✅ Déconnexion fonctionnelle (`supabase.auth.signOut()` + redirection)
- ✅ Récursion infinie RLS sur `profiles_update_own` → simplifiée + trigger pour protéger le rôle
- ✅ Sidebar dynamique : avatar et nom chargés depuis Supabase + mise à jour temps réel via `CustomEvent`

### v0.1.0 — Premier scaffold

**Sessions cumulées**
| Date | Travaux effectués |
|------|------------------|
| Session 1 | Analyse des fichiers HTML/CSS source · Création du scaffold complet Next.js |
| Session 2 | Page bibliothèques admin redesignée · Modal édition étudiants/professeurs |
| Session 3 | Filtre bibliothèques par classe · Page classes avec modal création · Contexte partagé |
| Session 4 | Modal création compte étudiant (génération username+password en 2 étapes) |
| Session 5 | Bibliothèque étudiant : lecteurs intégrés (video/audio/PDF/PPTX), non téléchargeable |
| Session 6 | Responsive complet (sidebar hamburger mobile, padding adaptatif, grilles responsive) |
| Session 7 | Menu + page bibliothèques professeur · Premier push GitHub |
| Session 8 | Configuration Supabase + 14 migrations SQL · Schéma + triggers + RLS · Compte admin initial |
| Session 9 | Connexion à Supabase des pages admin (overview, classes, étudiants, professeurs, bibliothèques, admissions) · Middleware réactivé |
| Session 10 | Formulaire admission complet (email, nombre d'enfants, photo identité) · Modal détails admin · Push v0.1.0 |
