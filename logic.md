# CITSA OCCULTE SCHOOL INTERNATIONAL — Spécification Logique Applicative

> **Document de référence pour Claude Code.**
> Ce fichier décrit la logique métier, les services, les API routes, l'authentification et les flux fonctionnels à implémenter.
> L'interface graphique est déjà générée. La base de données est décrite dans `database.md`. Ce fichier ne concerne que la couche logique.

---

## 1. Stack technique attendue

- **Frontend** : déjà généré (React / Next.js ou équivalent)
- **Backend / BaaS** : Supabase (Auth, Database, Storage, Realtime, Edge Functions)
- **Client Supabase** : `@supabase/supabase-js`
- **Temps réel** : Supabase Realtime (subscriptions)
- **Live / Vidéo** : intégration d'un service tiers (ex : LiveKit, Agora, Daily.co, ou Jitsi)
- **Langage** : TypeScript

---

## 2. Authentification & Gestion des sessions

### 2.1 Flux de connexion

- L'utilisateur (professeur ou étudiant) se connecte via la page `/connexion` avec son **username** et **mot de passe**.
- Utiliser `supabase.auth.signInWithPassword({ email, password })`.
- Convention : le username est converti en email fictif interne pour Supabase Auth — ex : `username@citsa.internal`. L'utilisateur ne voit et n'utilise que son username.
- Après connexion, récupérer le profil depuis la table `profiles` pour déterminer le `role` et rediriger vers l'interface correspondante.

### 2.2 Redirection par rôle

```
Si role === 'admin'      → /admin (Dashboard)
Si role === 'professor'  → /professeur/:id (Espace Professeur)
Si role === 'student'    → /etudiant/:id (Espace Étudiant)
```

### 2.3 Vérification du compte actif

- Après récupération du profil, vérifier `is_active === true`.
- Si `is_active === false` : déconnecter l'utilisateur immédiatement et afficher un message "Votre compte est désactivé. Contactez l'administration."

### 2.4 Mot de passe oublié

- Implémenter un flux de réinitialisation via `supabase.auth.resetPasswordForEmail()`.
- Comme les usernames sont mappés en emails fictifs (`@citsa.internal`), prévoir un mécanisme alternatif : l'admin peut manuellement réinitialiser le mot de passe d'un utilisateur depuis le Dashboard.

### 2.5 Protection des routes

- Chaque route protégée vérifie :
  1. L'utilisateur est authentifié (`supabase.auth.getSession()`)
  2. Son profil existe et `is_active === true`
  3. Son `role` correspond à l'interface demandée
- Middleware ou guard côté client et/ou serveur.

---

## 3. Services métier

Organiser la logique en **services** réutilisables. Chaque service encapsule les appels Supabase pour un domaine fonctionnel.

### 3.1 Service `AuthService`

| Méthode | Description |
|---------|-------------|
| `signIn(username, password)` | Connexion avec conversion username → email fictif |
| `signOut()` | Déconnexion |
| `getCurrentUser()` | Retourne le user auth + profil |
| `resetPassword(username)` | Déclenche le flux de réinitialisation |
| `onAuthStateChange(callback)` | Écoute les changements de session |

### 3.2 Service `AdminService`

Accessible uniquement par le rôle `admin`.

| Méthode | Description |
|---------|-------------|
| **Gestion des utilisateurs** | |
| `createUser(data, role)` | Crée un user dans Supabase Auth + profil. Génère un username unique et un mot de passe aléatoire. Retourne les credentials. |
| `deleteUser(userId)` | Supprime le user de Supabase Auth (cascade vers profiles) |
| `toggleUserActive(userId, isActive)` | Active/désactive un compte |
| `listUsers(role?, filters?)` | Liste les utilisateurs avec pagination, filtres par rôle, statut, recherche |
| `getUserById(userId)` | Détail d'un utilisateur |
| **Gestion des classes** | |
| `createClass(name, description)` | Crée une classe |
| `deleteClass(classId)` | Supprime une classe (cascade) |
| `addMembersToClass(classId, userIds, role)` | Ajoute des professeurs ou étudiants à une classe |
| `removeMemberFromClass(classId, userId)` | Retire un membre d'une classe |
| `listClasses(filters?)` | Liste des classes avec nombre de membres |
| `getClassDetails(classId)` | Détail d'une classe avec ses membres |
| **Gestion des bibliothèques** | |
| `createLibrary(name, description)` | Crée une bibliothèque |
| `deleteLibrary(libraryId)` | Supprime une bibliothèque et ses fichiers du Storage |
| `uploadFileToLibrary(libraryId, file)` | Upload un fichier dans le bucket `library-files` et crée l'entrée dans `library_files` |
| `deleteFileFromLibrary(fileId)` | Supprime le fichier du Storage et de la table |
| `assignLibraryToClass(libraryId, classId)` | Donne accès à une classe |
| `removeLibraryFromClass(libraryId, classId)` | Retire l'accès |
| **Gestion des admissions** | |
| `listAdmissionRequests(status?)` | Liste les demandes d'admission |
| `reviewAdmission(requestId, status)` | Approuve ou rejette une demande |
| **Broadcasting** | |
| `startBroadcast(title)` | Crée une `live_session` de type `broadcast`, initie le flux vidéo |
| `endBroadcast(sessionId)` | Termine le broadcast, sauvegarde l'enregistrement |

### 3.3 Service `ProfessorService`

Accessible uniquement par le rôle `professor` (et `admin`).

| Méthode | Description |
|---------|-------------|
| `getMyClasses()` | Retourne les classes où le professeur est assigné |
| `startLive(title, classIds)` | Crée une `live_session` de type `class_live`, lie les classes, initie le flux vidéo |
| `endLive(sessionId)` | Termine le live, sauvegarde l'enregistrement |
| `getMyLiveHistory()` | Liste des lives passés du professeur |
| `createExercise(data)` | Crée un exercice (PDF upload ou quiz/QCM inline) pour une classe |
| `deleteExercise(exerciseId)` | Supprime un exercice |
| `addQuestionToExercise(exerciseId, questionData)` | Ajoute une question à un quiz/QCM |
| `updateQuestion(questionId, data)` | Modifie une question |
| `deleteQuestion(questionId)` | Supprime une question |
| `getExerciseSubmissions(exerciseId)` | Récupère toutes les soumissions d'un exercice |
| `gradeSubmission(submissionId, score)` | Note une soumission (pour les exercices ouverts) |
| `getClassStudents(classId)` | Liste les étudiants d'une classe |

### 3.4 Service `StudentService`

Accessible uniquement par le rôle `student` (et `admin`).

| Méthode | Description |
|---------|-------------|
| `getMyClasses()` | Retourne les classes de l'étudiant |
| `getActiveLives()` | Retourne les lives en cours pour les classes de l'étudiant |
| `getLiveRecordings(classId?)` | Liste les enregistrements accessibles |
| `getExercises(classId?)` | Liste les exercices assignés |
| `getExerciseDetail(exerciseId)` | Détail d'un exercice avec questions |
| `submitExercise(exerciseId, answers)` | Soumet les réponses. Si QCM/quiz → correction automatique avec calcul du score |
| `getMySubmissions()` | Historique des soumissions de l'étudiant |
| `getAccessibleLibraries()` | Liste les bibliothèques accessibles via les classes de l'étudiant |
| `getLibraryFiles(libraryId)` | Liste les fichiers d'une bibliothèque |
| `getFileDownloadUrl(fileId)` | Génère une URL signée pour télécharger/streamer un fichier |

### 3.5 Service `ChatService`

Accessible par tous les utilisateurs authentifiés.

| Méthode | Description |
|---------|-------------|
| `getMyChannels()` | Liste les channels dont l'utilisateur est membre |
| `getChannelMessages(channelId, pagination)` | Messages d'un channel avec pagination (les plus récents d'abord) |
| `sendMessage(channelId, content)` | Envoie un message |
| `subscribeToChannel(channelId, callback)` | S'abonne aux nouveaux messages en temps réel via Supabase Realtime |
| `unsubscribeFromChannel(channelId)` | Se désabonne |
| `getOrCreateDirectChannel(userId)` | Récupère ou crée un channel direct entre le user courant et un autre |

### 3.6 Service `NotificationService`

| Méthode | Description |
|---------|-------------|
| `getMyNotifications(unreadOnly?)` | Liste les notifications de l'utilisateur |
| `markAsRead(notificationId)` | Marque une notification comme lue |
| `markAllAsRead()` | Marque toutes les notifications comme lues |
| `getUnreadCount()` | Nombre de notifications non lues |
| `subscribeToNotifications(callback)` | Écoute les nouvelles notifications en temps réel |
| `createNotification(userId, data)` | Crée une notification (appelé côté serveur / Edge Function) |
| `notifyClass(classId, data)` | Envoie une notification à tous les membres d'une classe |
| `notifyAllStudents(data)` | Envoie une notification à tous les étudiants (pour les broadcasts) |

### 3.7 Service `AdmissionService`

Public (pas d'authentification requise).

| Méthode | Description |
|---------|-------------|
| `submitAdmission(formData)` | Soumet le formulaire d'admission depuis la landing page |

---

## 4. Logique métier — Règles critiques

### 4.1 Génération des credentials

À la création d'un utilisateur (étudiant ou professeur) par l'admin :
1. Générer un **username** unique — format suggéré : `prenom.nom` ou `prenom.nom.XXX` (suffixe aléatoire si doublon)
2. Générer un **mot de passe** aléatoire sécurisé (min 12 caractères, mix majuscules/minuscules/chiffres/spéciaux)
3. Créer l'utilisateur dans Supabase Auth avec l'email fictif `{username}@citsa.internal`
4. Le profil est créé automatiquement via le trigger `handle_new_user`
5. Retourner les credentials à l'admin pour transmission à l'utilisateur

### 4.2 Suppression d'un utilisateur

1. Supprimer l'utilisateur de `auth.users` (nécessite le service role de Supabase / Edge Function)
2. La cascade supprime le profil et toutes les données liées (class_members, messages, soumissions, etc.)
3. Révoquer toute session active

### 4.3 Activation / Désactivation

- Désactiver : mettre `profiles.is_active = false`. Le middleware de protection des routes empêchera l'accès.
- Activer : remettre `is_active = true`.
- Ne **pas** supprimer le user de `auth.users` lors d'une désactivation.

### 4.4 Gestion des classes

- Un professeur est assigné à des classes **après** sa création.
- Un étudiant peut être ajouté à plusieurs classes.
- Lorsqu'un membre est ajouté à une classe, il est automatiquement ajouté au chat de cette classe (trigger SQL).
- Lorsqu'un membre est retiré d'une classe, le retirer aussi du chat de la classe.

### 4.5 Correction automatique des QCM/Quiz

Lors de la soumission d'un exercice de type `quiz` ou `qcm` :
1. Récupérer les questions et leurs `correct_answer`
2. Comparer avec les réponses de l'étudiant (`answers` en JSONB)
3. Calculer le score : `(nombre de bonnes réponses / nombre total de questions) * 100`
4. Enregistrer le score et marquer `is_graded = true`
5. Créer une notification pour le professeur

### 4.6 Lives et enregistrements

- Quand un professeur lance un live :
  1. Créer la `live_session` avec `status = 'live'`
  2. Lier les classes sélectionnées dans `live_session_classes`
  3. Envoyer une notification à tous les étudiants des classes concernées
  4. Initier le flux vidéo via le service tiers
- Quand le live se termine :
  1. Mettre `status = 'ended'` et `ended_at = now()`
  2. Sauvegarder l'enregistrement dans le bucket `live-recordings`
  3. Mettre à jour `recording_url` et `recording_storage_path`

- Quand l'admin lance un broadcast :
  1. Même logique mais `session_type = 'broadcast'`
  2. Notification envoyée à **tous** les étudiants sans exception

### 4.7 Bibliothèques numériques

- Les fichiers sont stockés dans le bucket Supabase Storage `library-files`
- Chemin de stockage suggéré : `{library_id}/{file_id}_{filename}`
- Les étudiants n'accèdent qu'aux bibliothèques assignées aux classes dont ils sont membres
- Pour les vidéos et audios : utiliser des URLs signées temporaires pour le streaming

### 4.8 Chat

- À la création d'une classe → un channel `class` est créé automatiquement (trigger)
- Un channel `general_students` unique regroupe tous les étudiants
- Les channels `direct` sont créés à la demande (premier message)
- Les messages sont envoyés et reçus en temps réel via Supabase Realtime
- Chaque nouveau message déclenche une notification pour les membres du channel (sauf l'expéditeur)

---

## 5. Supabase Edge Functions

Certaines opérations nécessitent des permissions élevées (`service_role` key) et doivent être exécutées côté serveur via des Edge Functions.

### 5.1 `create-user`

```
POST /functions/v1/create-user
Headers: Authorization: Bearer <admin_jwt>
Body: { full_name, role, class_ids? }
Response: { user_id, username, password }
```

Logique :
1. Vérifier que l'appelant est admin
2. Générer username + password
3. `supabase.auth.admin.createUser(...)` avec le service_role
4. Si `class_ids` fournis, assigner aux classes
5. Retourner les credentials

### 5.2 `delete-user`

```
POST /functions/v1/delete-user
Headers: Authorization: Bearer <admin_jwt>
Body: { user_id }
Response: { success: true }
```

Logique :
1. Vérifier que l'appelant est admin
2. `supabase.auth.admin.deleteUser(user_id)` avec le service_role

### 5.3 `reset-user-password`

```
POST /functions/v1/reset-user-password
Headers: Authorization: Bearer <admin_jwt>
Body: { user_id }
Response: { new_password }
```

Logique :
1. Vérifier que l'appelant est admin
2. Générer un nouveau mot de passe
3. `supabase.auth.admin.updateUserById(user_id, { password })` avec le service_role
4. Retourner le nouveau mot de passe

### 5.4 `auto-grade-submission`

```
POST /functions/v1/auto-grade-submission
Headers: Authorization: Bearer <student_jwt>
Body: { exercise_id, answers }
Response: { submission_id, score, is_graded }
```

Logique :
1. Récupérer les questions et correct_answer
2. Comparer, calculer le score
3. Insérer la soumission
4. Notifier le professeur

### 5.5 `notify-class`

```
POST /functions/v1/notify-class
Headers: Authorization: Bearer <professor_or_admin_jwt>
Body: { class_id?, notification_type, title, message, reference_id? }
Response: { count: <nombre de notifications créées> }
```

Logique :
1. Si `class_id` : récupérer tous les membres de la classe
2. Sinon (broadcast) : récupérer tous les étudiants
3. Insérer une notification par utilisateur

---

## 6. Subscriptions Realtime côté client

### 6.1 Chat en temps réel

```typescript
supabase
  .channel(`chat:${channelId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages',
    filter: `channel_id=eq.${channelId}`
  }, (payload) => {
    // Ajouter le nouveau message à l'UI
  })
  .subscribe();
```

### 6.2 Notifications en temps réel

```typescript
supabase
  .channel(`notifications:${userId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    // Afficher la notification, incrémenter le badge
  })
  .subscribe();
```

### 6.3 Statut des lives

```typescript
supabase
  .channel('live-status')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'live_sessions',
    filter: `status=eq.live`
  }, (payload) => {
    // Afficher l'indicateur "Live en cours"
  })
  .subscribe();
```

---

## 7. Structure des fichiers suggérée

```
src/
├── lib/
│   └── supabase.ts              # Client Supabase initialisé
├── services/
│   ├── auth.service.ts
│   ├── admin.service.ts
│   ├── professor.service.ts
│   ├── student.service.ts
│   ├── chat.service.ts
│   ├── notification.service.ts
│   └── admission.service.ts
├── hooks/
│   ├── useAuth.ts                # Hook d'authentification
│   ├── useRealtimeChat.ts        # Hook pour le chat temps réel
│   ├── useNotifications.ts       # Hook pour les notifications
│   └── useLiveStatus.ts          # Hook pour le statut des lives
├── guards/
│   └── roleGuard.ts              # Protection des routes par rôle
├── types/
│   └── index.ts                  # Types TypeScript (Profile, Class, Exercise, etc.)
└── utils/
    ├── credentials.ts            # Génération username + password
    └── grading.ts                # Logique de correction auto
```

---

## 8. Types TypeScript principaux

```typescript
type UserRole = 'admin' | 'professor' | 'student';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface Class {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  members_count?: number;
}

interface AdmissionRequest {
  id: string;
  last_name: string;
  first_name: string;
  date_of_birth: string;
  age: number;
  country_of_birth: string;
  country_of_residence: string;
  marital_status: 'single' | 'married' | 'divorced' | 'widowed';
  occupation: string;
  how_discovered: string;
  motivation: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  created_at: string;
}

interface LiveSession {
  id: string;
  title: string;
  host_id: string;
  session_type: 'class_live' | 'broadcast';
  status: 'scheduled' | 'live' | 'ended';
  recording_url: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

interface Exercise {
  id: string;
  title: string;
  description: string | null;
  exercise_type: 'pdf' | 'quiz' | 'qcm';
  class_id: string;
  professor_id: string;
  file_url: string | null;
  created_at: string;
  questions?: ExerciseQuestion[];
}

interface ExerciseQuestion {
  id: string;
  exercise_id: string;
  question_text: string;
  question_order: number;
  question_type: 'single_choice' | 'multiple_choice' | 'open';
  options: string[] | null;
  correct_answer: any;
  points: number;
}

interface ExerciseSubmission {
  id: string;
  exercise_id: string;
  student_id: string;
  answers: Record<string, any>;
  score: number | null;
  is_graded: boolean;
  submitted_at: string;
}

interface ChatChannel {
  id: string;
  name: string | null;
  channel_type: 'class' | 'direct' | 'general_students';
  class_id: string | null;
}

interface ChatMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Profile;
}

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: 'live_started' | 'exercise_posted' | 'new_message' | 'file_uploaded' | 'admission_update' | 'general';
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

interface Library {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  files_count?: number;
}

interface LibraryFile {
  id: string;
  library_id: string;
  file_name: string;
  file_type: 'pdf' | 'video' | 'audio' | 'pptx' | 'other';
  file_url: string;
  file_size: number | null;
  storage_path: string;
  created_at: string;
}
```
