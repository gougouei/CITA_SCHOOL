-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : enregistrement des lives
-- À exécuter dans le SQL Editor de Supabase
-- Idempotent — peut être re-exécutée sans casser quoi que ce soit
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Colonne : lien vers le fichier vidéo dans library_files
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS recording_file_id uuid
  REFERENCES public.library_files(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_live_sessions_recording_file_id
  ON public.live_sessions(recording_file_id);

-- 2. RLS : le prof hôte peut UPDATE son propre live pour attacher un enregistrement
DROP POLICY IF EXISTS "host_can_attach_recording" ON public.live_sessions;
CREATE POLICY "host_can_attach_recording"
  ON public.live_sessions
  FOR UPDATE
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- 3. RLS : les étudiants peuvent SELECT les lives terminés de leurs classes
--    (séparément de la policy existante "live" qui filtre status = live)
DROP POLICY IF EXISTS "students_can_read_ended_lives" ON public.live_sessions;
CREATE POLICY "students_can_read_ended_lives"
  ON public.live_sessions
  FOR SELECT
  USING (
    status = 'ended'
    AND recording_file_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.live_session_classes lsc
      JOIN public.class_members cm ON cm.class_id = lsc.class_id
      WHERE lsc.live_session_id = live_sessions.id
        AND cm.user_id = auth.uid()
    )
  );

-- 4. RLS : un prof peut SELECT ses propres lives terminés (pour la liste « à enregistrer »)
DROP POLICY IF EXISTS "host_can_read_own_lives" ON public.live_sessions;
CREATE POLICY "host_can_read_own_lives"
  ON public.live_sessions
  FOR SELECT
  USING (auth.uid() = host_id);
