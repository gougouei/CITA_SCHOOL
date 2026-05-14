# CITSA OCCULTE SCHOOL INTERNATIONAL — Contexte Projet

> Fichier de référence complet. Redonner ce fichier à Claude Code en début de session pour restaurer tout le contexte.
> **Dernière mise à jour : v0.8.0**

---

## 1. Présentation du projet

Application web pour **CITSA Occulte School International**, une école mystico négro-africaine.
Elle permet de gérer les étudiants, professeurs, classes, bibliothèques numériques, cours live, exercices, admissions, calendrier d'événements, chat privé et un feed social CitsaOccultBlog.

**Repo GitHub :** https://github.com/gougouei/CITA_SCHOOL
**Répertoire local :** `/Users/mac/Documents/cita_school`
**Branche principale :** `main`
**Dernière version taguée :** `v0.8.0`
**Déploiement :** Vercel (auto-déploie chaque push sur `main`)

---

## 2. Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 15.5+ (App Router) |
| Style | TailwindCSS 3 + design tokens CITSA |
| Langage | TypeScript (strict) |
| Base de données | **Supabase** (Auth + PostgreSQL + Storage + Realtime) |
| Composants | CVA (class-variance-authority) |
| Icons | lucide-react |
| Live vidéo | **Jitsi Meet** (instance publique meet.jit.si) |
| PDF | **react-pdf** (PDF.js worker servi en local) |

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
- **Middleware** : vérifie auth + rôle + statut actif sur toutes les routes protégées
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
| `libraries` + `library_classes` + `library_files` | Bibliothèques de fichiers · 1 lib par fichier liée à N classes |
| `admission_requests` | Demandes d'admission (toutes infos + photo + email + nombre enfants) |
| `live_sessions` + `live_session_classes` | Cours en direct + broadcasts · colonne `recording_file_id` → `library_files` pour replay |
| `exercises` + `exercise_questions` + `exercise_submissions` | Exercices/QCM (schéma prêt, UI à venir) |
| `chat_channels` + `chat_channel_members` + `chat_messages` | Messagerie temps réel · `last_read_at` pour les badges unread |
| `notifications` | Notifications utilisateur (schéma prêt, UI à venir) |
| `calendar_events` | Événements calendrier (par classe ou général) |
| **`blog_posts`** | Publications du feed social · texte + media + repost |
| **`blog_likes`** | Likes (PK composite post_id+user_id) |
| **`blog_comments`** | Commentaires sur les posts |

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
- `set_updated_at` (générique) → applique `updated_at = now()` sur UPDATE pour profiles, classes, libraries, exercises, calendar_events, blog_posts
- `create_class_chat_channel` → crée un channel de chat à la création d'une classe
- `sync_class_member_to_chat` → ajoute un membre au channel quand on l'ajoute à une classe
- `remove_class_member_from_chat` → retire du channel quand on retire de la classe
- `prevent_self_role_change` → empêche un user de changer son propre rôle (sauf admin)

### Fonctions helper (security definer pour éviter récursion RLS)
- `current_role()` → retourne le rôle du user connecté
- `is_admin()` → true si user connecté est admin actif
- `is_class_member(class_id)` → true si user connecté est membre de la classe
- `is_class_professor(class_id)` → true si user connecté est prof de la classe
- `is_live_host(session_id)` → true si user est hôte du live (anti-récursion live_sessions)
- `is_current_user_channel_member(channel_id)` → true si user est membre du channel (anti-récursion chat)
- `find_direct_channel(user_a, user_b)` → retourne l'ID d'un DM existant entre 2 users (sinon null)
- `unread_counts()` → retourne `(channel_id, unread_count)` pour le user courant
- `unread_total()` → retourne le total des messages non lus

### Storage buckets
| Bucket | Public ? | Description |
|--------|----------|-------------|
| `admission-photos` | ✅ Public | Photos uploadées dans le formulaire d'admission (5 MB max) |
| `avatars` | ✅ Public | Avatars utilisateurs · chemin `{user_id}/avatar-{timestamp}.{ext}` (3 MB max) |
| `library-files` | ❌ Privé | Fichiers de bibliothèque — URLs signées · accès via class membership (500 MB max) |
| **`blog-media`** | ✅ Public | Photos & vidéos courtes des posts CitsaOccultBlog (100 MB max) |

### RLS Policies — résumé
- **profiles** : lecture par soi + class members + admin · update son propre profil (sauf role)
- **classes** : lecture par membres + admin · CRUD admin
- **class_members** : lecture par soi/membres · CRUD admin
- **libraries / library_files** : admin gère tout · class members lisent
- **admission_requests** : insert public (formulaire) · CRUD admin
- **live_sessions** : lecture par membres concernés (ou tous pour broadcasts) · prof crée pour ses classes · admin tout · hôte peut UPDATE son propre live (pour attacher un enregistrement) · étudiants lisent les lives terminés de leurs classes uniquement s'ils ont un `recording_file_id`
- **exercises** : lecture par membres de classe · CRUD par prof de la classe
- **exercise_submissions** : student crée la sienne · prof voit/note celles de ses classes
- **chat_channels / messages / members** : lecture/écriture par membres · UPDATE de `last_read_at` autorisée sur sa propre ligne
- **notifications** : lecture/update par destinataire
- **calendar_events** : lecture tous · création prof (pour ses classes) ou admin
- **blog_posts / likes / comments** : lecture tous (authentifiés) · écriture sur ses propres lignes · admin peut supprimer pour modération

---

## 6. Structure des fichiers

```
cita_school/
├── app/
│   ├── page.tsx                              # Landing page + Hero avec image-maitre.png en fond
│   ├── connexion/page.tsx                    # Page de connexion
│   ├── admin/
│   │   ├── layout.tsx                        # Sidebar admin
│   │   ├── page.tsx                          # Vue d'ensemble (KPIs réels)
│   │   ├── etudiants/page.tsx                # CRUD étudiants + modal création/édition
│   │   ├── professeurs/page.tsx              # CRUD professeurs idem
│   │   ├── classes/page.tsx                  # CRUD classes
│   │   ├── bibliotheques/page.tsx            # Upload + lecteurs + filtres
│   │   ├── admissions/page.tsx               # Liste + détails + approuver/rejeter
│   │   ├── broadcast/page.tsx                # Lancer broadcast pour tout le monde
│   │   ├── communaute/page.tsx               # CitsaOccultBlog (admin)
│   │   ├── profil/page.tsx
│   │   └── calendrier/page.tsx
│   ├── professeur/
│   │   ├── layout.tsx
│   │   ├── page.tsx                          # Mes classes
│   │   ├── live/page.tsx                     # Lancer un live + broadcasts visibles
│   │   ├── exercices/page.tsx                # ⏳ État vide
│   │   ├── bibliotheques/page.tsx            # Lecteurs intégrés par classe
│   │   ├── messagerie/page.tsx               # Chat temps réel (ChatPage partagé)
│   │   ├── communaute/page.tsx               # CitsaOccultBlog (prof)
│   │   ├── profil/page.tsx                   # + classes enseignées
│   │   └── calendrier/page.tsx
│   ├── etudiant/
│   │   ├── layout.tsx
│   │   ├── page.tsx                          # Dashboard (vraies classes)
│   │   ├── live/page.tsx                     # Liste lives + broadcasts
│   │   ├── exercices/page.tsx                # ⏳ État vide
│   │   ├── bibliotheques/page.tsx            # Lecteurs intégrés
│   │   ├── messagerie/page.tsx               # Chat temps réel
│   │   ├── communaute/page.tsx               # CitsaOccultBlog (étudiant)
│   │   ├── profil/page.tsx                   # + mes classes
│   │   └── calendrier/page.tsx               # Lecture seule
│   └── api/
│       ├── auth/login/route.ts
│       ├── auth/logout/route.ts
│       ├── admission/route.ts                # POST formulaire admission
│       ├── admin/create-user/
│       ├── admin/approve-admission/
│       ├── admin/delete-user/
│       ├── admin/reset-password/
│       ├── admin/start-broadcast/            # POST broadcast (admin)
│       ├── chat/start-dm/                    # POST créer DM entre 2 users d'une même classe
│       ├── library/signed-url/               # POST génère signed URL pour lecture privée
│       ├── live/access/                      # POST vérifie + retourne room Jitsi
│       ├── professor/start-live/
│       ├── professor/end-live/
│       └── student/submit-exercise/
│
├── components/
│   ├── admission-form.tsx
│   ├── profile-page.tsx                      # Partagée admin/prof/étudiant + classes
│   ├── calendar/                             # Vue mensuelle + modal events
│   ├── live/
│   │   ├── live-room.tsx                     # LiveRoom Jitsi (vidéo)
│   │   └── attach-recording-modal.tsx        # Attacher un enregistrement à un live terminé
│   ├── chat/                                 # ChatPage + ConvList + NewDirectModal
│   ├── blog/                                 # PostComposer + PostCard + Comments
│   ├── library/
│   │   ├── reader-modal.tsx                  # Lecteur unifié (PDF/audio/vidéo/PPTX)
│   │   ├── pdf-reader.tsx                    # Lecteur PDF custom — scroll continu (react-pdf)
│   │   ├── file-thumbnail.tsx                # Miniatures lazy (1ère page PDF, 1ère frame vidéo)
│   │   ├── pdf-thumbnail-inner.tsx           # Inner react-pdf isolé (dynamic ssr:false)
│   │   ├── upload-modal.tsx                  # Upload direct vers Supabase + classes optionnelles
│   │   └── class-assignment-modal.tsx        # Gérer les classes d'un fichier après upload
│   ├── layout/
│   │   ├── dashboard-layout.tsx              # Charge profil + badges dynamiques
│   │   ├── sidebar.tsx
│   │   ├── navbar.tsx
│   │   └── footer.tsx
│   └── ui/
│       ├── button.tsx
│       ├── badge.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── alert.tsx
│
├── contexts/
│   └── admin-data.tsx                        # Context classes partagé (legacy)
│
├── lib/
│   ├── supabase.ts                           # Client browser
│   └── supabase-server.ts                    # Client SSR
│
├── types/index.ts
├── utils/
│   ├── credentials.ts
│   └── grading.ts
│
├── public/
│   ├── image-maitre.png                      # Image fond Hero
│   └── pdf.worker.min.mjs                    # Worker PDF.js (copié au postinstall)
│
├── supabase/
│   └── migration_live_recordings.sql         # Migration recording_file_id + RLS replays
│
├── middleware.ts                             # Protection par rôle
├── next.config.ts                            # Headers Permissions-Policy pour Jitsi
├── tailwind.config.ts
├── package.json                              # Script postinstall copie le worker PDF
├── .env.local
├── .env.local.example
└── context.md                                # CE FICHIER
```

---

## 7. Fonctionnalités implémentées

### 🛡️ Espace Admin (`/admin`)
| Page | État | Fonctionnalités |
|------|------|-----------------|
| Vue d'ensemble | ✅ Supabase | KPIs réels (étudiants, profs, classes, bibliothèques) · Dernières admissions |
| Étudiants | ✅ Supabase | CRUD complet · Modal création (credentials via API) · Toggle actif |
| Professeurs | ✅ Supabase | Idem étudiants |
| Classes | ✅ Supabase | CRUD + sélection profs |
| Bibliothèques | ✅ **Full** | Upload direct Supabase (classes optionnelles à l'upload) · miniatures (PDF 1ère page, vidéo 1ère frame) · gestion des classes après coup via modal · suppression |
| Admissions | ✅ Supabase | Liste + détails + approuver = crée compte étudiant auto |
| Calendrier | ✅ Supabase | Création événements (global ou par classe) |
| Profil | ✅ Supabase | Upload avatar + édition nom |
| Communauté | ✅ Supabase | CitsaOccultBlog (poster, liker, commenter, repartager) |
| Broadcast | ✅ Supabase | Lancer un broadcast Jitsi visible par tous (admin/prof/étudiant) |

### 👨‍🏫 Espace Professeur (`/professeur`)
| Page | État | Fonctionnalités |
|------|------|-----------------|
| Mes Classes | ✅ Supabase | Classes assignées + compteur étudiants |
| Cours Live | ✅ Jitsi | Lancer un live · voir broadcasts admin · **joindre un enregistrement** à ses cours terminés (pick library ou upload) + replay |
| Exercices | ⏳ État vide | À implémenter |
| Bibliothèques | ✅ Supabase | Lecteurs intégrés avec miniatures (vidéo + vitesse, PDF scroll continu, audio + volume, PPTX) |
| Messagerie | ✅ Realtime | Chat de classe + DMs avec membres des classes (badges unread) |
| Calendrier | ✅ Supabase | Création limitée à ses classes |
| Profil | ✅ Supabase | + section "Classes enseignées" |
| Communauté | ✅ Supabase | CitsaOccultBlog (mêmes droits que tous) |

### 🎓 Espace Étudiant (`/etudiant`)
| Page | État | Fonctionnalités |
|------|------|-----------------|
| Tableau de bord | ✅ Supabase | Vraies classes + état vide notifications |
| Cours Live | ✅ Jitsi | Lives de ses classes + broadcasts (auto-refresh 20s) · section **Cours enregistrés** (replays) |
| Exercices | ⏳ État vide | À implémenter |
| Bibliothèques | ✅ Supabase | Lecteurs intégrés non téléchargeables avec miniatures |
| Messagerie | ✅ Realtime | Chat de classe + DMs avec membres |
| Calendrier | ✅ Supabase | Lecture seule |
| Profil | ✅ Supabase | + section "Mes classes" |
| Communauté | ✅ Supabase | CitsaOccultBlog (poster, liker, commenter, repartager) |

---

## 8. Flow d'admission complet

1. **Visiteur** sur la landing → remplit le formulaire d'admission
   - 11 champs obligatoires + 1 optionnel : nom, prénoms, email, date naissance, pays naissance, pays résidence, situation matrimoniale, nombre d'enfants, profession, motivation, **photo d'identité** (JPG/PNG/WEBP, 5 MB max)
   - La photo est uploadée dans le bucket `admission-photos`
   - Email obligatoire et unique
2. **Admin** consulte `/admin/admissions` → vignettes photo
3. Admin clique **"Détails"** → panneau slide-in
4. Admin clique **"Approuver & créer le compte"** → route `/api/admin/approve-admission`
   - Génère un username unique + mot de passe sécurisé
   - Crée l'auth user via service_role
   - Le trigger `handle_new_user` crée le profil
   - Copie `admission.photo_url` → `profile.avatar_url`
   - Marque l'admission `approved`
5. Modal "Compte créé" avec credentials **copiables**
6. L'étudiant apparaît dans `/admin/etudiants`

---

## 9. Système de cours live — Jitsi Meet

### Architecture
- Provider : **Jitsi Meet** (instance publique `meet.jit.si`)
- Rooms privées avec noms UUID non-devinables (`citsa-{uuid}`)
- Headers `Permissions-Policy` dans `next.config.ts` pour autoriser iframe + Safari/mobile

### Composant : `components/live/live-room.tsx`
- Charge dynamiquement `external_api.js` (avec polling de secours)
- UI Jitsi prebuilt complète (vidéo, audio, screen share, chat, raise hand, recording)
- Toolbar différent pour modérateur vs participant

### Routes API
- `POST /api/professor/start-live` — class_live (1 classe)
- `POST /api/admin/start-broadcast` — broadcast (tous les utilisateurs)
- `POST /api/professor/end-live` — termine la session
- `POST /api/live/access` — vérifie l'accès et retourne room_name

### Sécurité
- L'URL Jitsi n'est jamais exposée publiquement
- Pour un broadcast : tous les authentifiés peuvent rejoindre
- Pour un class_live : seuls membres de la classe + admin

### Badge dynamique "Cours Live"
Le menu **"Cours Live"** affiche un badge avec le nombre de lives actifs visibles (broadcasts + lives de ses classes). Polling 30s + event `lives-changed`.

### Enregistrement des lives (Option A — manuelle)
- Jitsi `meet.jit.si` ne fournit pas d'enregistrement cloud — on suit donc un flow manuel
- Le prof enregistre son cours pendant le live (bouton "Enregistrer" Jitsi → local, OBS, QuickTime, etc.)
- Après le live, sa page `/professeur/live` affiche une section **"Mes cours terminés"** avec badge "À enregistrer" (orange) ou "Enregistré" (vert)
- Bouton **"Joindre un enregistrement"** → modal `AttachRecordingModal` à 2 onglets :
  - **Bibliothèque** : choisir une vidéo déjà uploadée
  - **Uploader une vidéo** : drop direct (1 GB max, MP4/MOV/WebM) — crée `libraries` + `library_files` + lie automatiquement aux classes du cours, puis attache via `recording_file_id`
- Côté étudiant : section **"Cours enregistrés"** sur `/etudiant/live` listant les replays accessibles via RLS (`status='ended'` + `recording_file_id IS NOT NULL` + membre d'une classe liée)
- Click sur un replay → `ReaderModal` en mode vidéo (téléchargement bloqué, signed URL 1h)
- Schéma : voir `supabase/migration_live_recordings.sql`

---

## 10. Système calendrier

### Composant : `components/calendar/`
- 5 types d'événements avec couleurs (cours_live, examen, ceremonie, reunion, autre)
- Vue mensuelle 7×6, navigation prev/next/today
- Sidebar "Prochains événements" + légende

### Logique d'accès
- Tout le monde lit
- Admin : peut créer pour n'importe quelle classe OU sans classe
- Prof : doit choisir une classe parmi celles qu'il enseigne
- Étudiant : lecture seule

### Badge dynamique "Calendrier"
Pour les étudiants/profs : nombre d'événements à venir (`start_at >= now`).

---

## 11. Système de messagerie — Chat temps réel

### Composant : `components/chat/chat-page.tsx` (partagé prof + étudiant)
- Sidebar gauche : conversations (classes + DMs)
- Zone droite : messages + input + bouton "+ Nouvelle conversation"
- Mobile : bascule entre liste et conversation

### Types de channels
- **Class** : créé automatiquement par trigger à la création d'une classe
- **Direct** : entre 2 users — création via `/api/chat/start-dm` qui valide qu'ils partagent au moins une classe
- **General students** : prévu mais pas encore activé

### Realtime
- 2 subscriptions Supabase Realtime :
  - **Active channel** : pour afficher les nouveaux messages
  - **Global** : pour incrémenter les badges unread des autres conversations

### Système unread
- Colonne `last_read_at` sur `chat_channel_members`
- Fonction SQL `unread_counts()` retourne par channel
- Fonction SQL `unread_total()` retourne total
- Badge sidebar **"Messagerie"** se met à jour : polling 15s + event `messages-changed`
- Badge par conversation dans la liste
- Mark-as-read automatique à l'ouverture d'un channel

---

## 12. Système de bibliothèque

### Upload (admin uniquement)
- **Upload direct** Browser → Supabase Storage (bypass Vercel 4.5 MB limit)
- Utilise `createSignedUploadUrl` + `XMLHttpRequest` avec **barre de progression**
- Multi-classes : checkboxes avec "Tout sélectionner" — **classes optionnelles** (peut être assignées plus tard)
- Crée une **bibliothèque par fichier** liée à toutes les classes sélectionnées (ou aucune)
- **Rollback automatique** si une étape échoue
- 500 MB max, formats : PDF, MP4/MOV/WEBM, MP3/WAV/OGG, PPTX/PPT

### Assignation des classes après upload
- Bouton "Gérer les classes" (icône 👥) sur chaque carte admin
- Modal `ClassAssignmentModal` : checkboxes + diff add/remove en une transaction
- Badge orange "Aucune classe" sur les fichiers sans assignation

### Miniatures (`file-thumbnail.tsx`)
- **Lazy load** via `IntersectionObserver` — l'URL signée n'est fetchée que quand la carte entre dans le viewport
- **PDF** : 1ère page rendue via react-pdf (composant `PdfThumbnailInner` chargé en `dynamic(ssr:false)`)
- **Vidéo** : 1ère frame native via `<video preload="metadata">` + overlay ▶
- **Audio / PPTX / Other** : icône stylisée colorée avec nom du fichier en bas
- Badge type (PDF/Vidéo/Audio…) en overlay haut-droit, ratio `aspect-video`

### Lecteurs intégrés (`components/library/reader-modal.tsx`)
Tailles adaptatives :
| Type | Taille |
|------|--------|
| Audio | `max-w-md` — compact |
| Vidéo | `max-w-3xl max-h-[80vh]` |
| PDF | quasi plein écran |
| PPTX | quasi plein écran |

### PDF Reader custom (`pdf-reader.tsx` via react-pdf)
- **Scroll continu** — toutes les pages rendues en colonne verticale
- **Indicateur de page courante** mis à jour par `IntersectionObserver`
- **Input numérique** pour sauter à une page précise (scrollIntoView)
- **Zoom** : -/+ (0.5x à 3x par pas de 0.25) · fit-width auto · reset 100%
- **Clavier** : +/- pour zoom (la navigation par flèche n'est plus nécessaire)
- **PDF.js worker** servi depuis `/public/pdf.worker.min.mjs` (copié au `postinstall`)
- Chargé dynamiquement (`ssr: false`) pour éviter erreurs SSR

### Vidéo — Contrôles de vitesse
- Overlay en haut à droite (toujours visible)
- Boutons rapides **1x · 1.5x · 2x**
- Menu **"⋯"** : 0.5x · 0.75x · 1x · 1.25x · 1.5x · 1.75x · 2x

### Audio — Vitesse + volume
- Pill compact sous les contrôles principaux : 0.5x → 2x
- Contrôle de **volume** avec slider + bouton mute toggle

### Protection anti-download
- Bucket **privé** `library-files`
- URLs signées temporaires (1h) via `/api/library/signed-url`
- `controlsList="nodownload"`, `disablePictureInPicture`, `contextmenu` désactivé
- PDF avec annotations désactivées
- Bandeau "consultation en ligne uniquement"

---

## 13. CitsaOccultBlog — Feed social

### Composant : `components/blog/`
- **PostComposer** : textarea + upload photo/vidéo (100 MB max, JPG/PNG/WEBP/GIF/MP4/WEBM)
- **PostCard** : header (avatar + rôle), média EN HAUT (style Instagram), texte en bas, actions
- **CommentsSection** : commentaires avec avatars
- Repartage avec commentaire optionnel (post original imbriqué)
- Like avec optimistic UI

### Logique
- Tout le monde lit
- Tout le monde peut poster/liker/commenter/repartager
- Admin peut supprimer pour modération

### Storage
- Bucket public `blog-media`
- Chemin : `{user_id}/{uuid}.{ext}`

### Pages
- `/admin/communaute`, `/professeur/communaute`, `/etudiant/communaute` (composant partagé)
- Feed paginé par 10 + bouton "Voir plus"

---

## 14. Profils — Sections classes

### Composant partagé : `components/profile-page.tsx`
- Upload avatar (bucket `avatars`, 3 MB max)
- Édition nom complet
- **Section "Classes" adaptative** :
  - Étudiant : "Mes classes" (classes où inscrit)
  - Professeur : "Classes enseignées" (classes assignées)
  - Admin : section non affichée
- Synchronisation sidebar : `CustomEvent("profile-updated")` met à jour avatar + nom instantanément

---

## 15. Page d'accueil — Hero

- Section Hero avec **image `/public/image-maitre.png` en fond** (cover + center)
- Overlay sombre 55% pour lisibilité
- Vignette rouge radiale + dégradé vers noir en bas
- Pattern losanges subtil (opacité 4%)
- Formulaire d'admission complet dessous

---

## 16. Ce qui reste à faire

### Priorité haute (fonctionnalités métier)
- [ ] **Exercices** — UI complète : création par prof (QCM/quiz/PDF), passage par étudiant, correction auto, notation manuelle
- [ ] **Notifications** — UI dans la sidebar (badge dynamique) + page dédiée
- [ ] **Page mot de passe oublié** — `/mot-de-passe-oublie` (reset par admin)

### Priorité moyenne
- [ ] **Bouton "Réinitialiser mot de passe"** dans le modal admin étudiant/prof (route API existe)
- [ ] **Bouton "Supprimer compte"** dans le modal admin (route API existe)
- [ ] **Email transactionnel** quand l'admin approuve une admission
- [ ] **Recording natif cloud** des lives Jitsi (passer à Daily/LiveKit ou self-host Jibri) — actuellement flow manuel par le prof

### Priorité basse / améliorations
- [ ] Notifications push browser
- [ ] Export PDF des soumissions d'exercices
- [ ] Statistiques détaillées admin (graphiques)
- [ ] Recherche globale dans le dashboard

---

## 17. Variables d'environnement (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://qaudfykhzhpthwhynewz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# Jitsi Meet (cours en direct)
NEXT_PUBLIC_JITSI_DOMAIN=meet.jit.si
```

⚠️ Le `SUPABASE_SERVICE_ROLE_KEY` est utilisé par les routes API admin pour bypasser RLS. Ne jamais l'exposer côté client.

---

## 18. Commandes utiles

```bash
# Dev / Build
npm run dev                       # → http://localhost:3000
npm run build
npm run copy-pdf-worker           # Re-copie le worker PDF dans /public

# Git
git add . && git commit -m "..." && git push
git tag -a v0.X.Y -m "..." && git push origin v0.X.Y

# Permissions npm (si EACCES)
sudo chown -R $(whoami):staff /Users/mac/Documents/cita_school

# MCP Supabase
claude mcp add supabase -e SUPABASE_ACCESS_TOKEN=<token> -- npx -y @supabase/mcp-server-supabase@latest
```

---

## 19. Convention de code

- **Composants UI** : CVA pour les variants
- **Client components** : `"use client"` quand `useState`, `useEffect`, event handlers, hooks
- **Server components** : par défaut
- **Modals** : pattern slide-in depuis la droite (`fixed right-0 top-0 h-full max-w-[480px]`) avec backdrop blur
- **Pas de commentaires** sauf si le WHY est non-évident
- **Pas de téléchargement** sur les fichiers de bibliothèque
- **Erreurs Supabase** : utiliser une fonction qui sait lire les objets non-`Error` (voir `extractError`)
- **RLS** : éviter les sous-requêtes auto-référencées → utiliser des fonctions `security definer`
- **Storage paths** : toujours préfixer par `{user_id}/` pour les buckets avec policies par dossier
- **Upload de gros fichiers** : utiliser `createSignedUploadUrl` côté client pour bypass Vercel
- **Realtime** : utiliser des `CustomEvent` (`profile-updated`, `messages-changed`, `lives-changed`, `calendar-events-changed`) pour rafraîchir les badges instantanément

---

## 20. Historique des versions

### v0.8.0 — Live recordings + library thumbnails *(actuelle)*
- **Enregistrement des lives** (flow manuel Option A) :
  - Colonne `recording_file_id` sur `live_sessions` → FK vers `library_files`
  - RLS : prof UPDATE son live · étudiants SELECT les ended-lives de leurs classes avec recording
  - `AttachRecordingModal` : pick d'une vidéo existante OU upload direct (1 GB max, auto-lié aux classes)
  - Prof : section "Mes cours terminés" avec badges À enregistrer / Enregistré + bouton Voir/Remplacer
  - Étudiant : section "Cours enregistrés" → `ReaderModal` vidéo (non-téléchargeable)
- **Miniatures bibliothèque** : 1ère page PDF (react-pdf), 1ère frame vidéo, icônes pour audio/PPTX — lazy via IntersectionObserver
- **Classes optionnelles à l'upload** + modal "Gérer les classes" (`ClassAssignmentModal`) pour assigner après coup
- Badge orange "Aucune classe" sur les fichiers sans assignation

### v0.7.3 — Audio volume + UX polish
- Contrôle de volume + mute toggle pour le lecteur audio

### v0.7.2 — Audio speeds + continuous PDF scrolling
- Contrôles de vitesse pour l'audio (0.5x → 2x)
- PDF reader refondu : scroll continu de toutes les pages au lieu de navigation par flèches
- IntersectionObserver pour suivre la page courante
- Input numérique pour saut direct (scrollIntoView smooth)

### v0.7.1 — Direct upload + video playback speeds *(remplacée par v0.7.2+)*
- Fix erreur 413 : upload direct Supabase Storage via `createSignedUploadUrl` (bypass Vercel)
- Contrôles de vitesse vidéo (1x, 1.5x, 2x + menu 0.5x→2x) en overlay
- PDF.js worker servi en local depuis `/public` (CDN cdnjs n'avait pas la version)
- Script `postinstall` qui copie le worker à chaque `npm install`
- Image-maître en fond du Hero

### v0.7.0 — Library refinements with custom PDF viewer
- Upload multi-classes (checkboxes au lieu de select)
- Tailles de lecteurs adaptatives (audio compact, vidéo moyen, PDF/PPTX plein écran)
- **Custom PDF viewer** avec react-pdf : navigation, zoom, fit-width, raccourcis clavier
- Dynamic import (`ssr: false`) pour éviter les erreurs SSR

### v0.6.0 — Real library with upload and protected readers
- Upload admin opérationnel
- ReaderModal partagé (PDF/Audio/Vidéo/PPTX) avec protections anti-download
- Signed URLs 1h via `/api/library/signed-url`
- Suppression de fichiers

### v0.5.0 — CitsaOccultBlog (feed social)
- Tables `blog_posts`, `blog_likes`, `blog_comments`
- Bucket `blog-media` (100 MB max)
- PostComposer + PostCard + CommentsSection + repost
- Pages `/communaute` dans chaque espace
- Realtime activé

### v0.4.0 — Broadcast, real-time chat, unread badges
- **Broadcast admin** visible par tous les authentifiés (`session_type='broadcast'`)
- Chat privé temps réel (Supabase Realtime) avec channels de classe + DMs
- DMs validés : les 2 users doivent partager au moins une classe
- Badges unread sur sidebar (total) et par conversation
- Section "Classes" dans les profils étudiant/professeur
- Calendrier compact + badge dynamique

### v0.3.1 — Live courses Safari/mobile compatibility
- Headers `Permissions-Policy` pour iframe Jitsi
- Attribut `sandbox` explicite
- Détection précoce de WebRTC indisponible
- Désactivation explicite du lobby Jitsi

### v0.3.0 — Live courses with Jitsi, profile pages, calendar badge
- Système de cours live via Jitsi Meet (gratuit)
- LiveRoom partagé prof/étudiant
- Badge dynamique sur "Calendrier"

### v0.2.0 — Calendar, profile, admission flow, space cleanup
- Calendrier complet
- Pages profil partagées avec upload avatar
- Approbation d'admission → création auto du compte étudiant

### v0.1.0 — Premier scaffold
- Sessions 1-10 : analyse HTML/CSS, scaffold Next.js, connexion Supabase, formulaire admission complet, etc.
