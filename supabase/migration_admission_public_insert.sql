-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : autoriser le formulaire public d'admission à insérer une demande
-- À exécuter dans le SQL Editor de Supabase
-- ─────────────────────────────────────────────────────────────────────────────

-- Autorise toute personne (visiteur anonyme ou utilisateur connecté)
-- à soumettre une demande d'admission. Le status est forcé à 'pending'
-- pour éviter qu'un visiteur s'auto-approuve.
DROP POLICY IF EXISTS "public_can_submit_admission" ON public.admission_requests;
CREATE POLICY "public_can_submit_admission"
  ON public.admission_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending');

-- Vérification : lister toutes les policies sur admission_requests pour confirmer
-- (à exécuter séparément si tu veux vérifier)
-- SELECT policyname, cmd, roles, with_check FROM pg_policies WHERE tablename = 'admission_requests';
