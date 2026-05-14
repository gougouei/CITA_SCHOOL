-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : autoriser les professeurs à téléverser leurs enregistrements
-- de cours live (bibliothèque, fichiers, liens classe, stockage)
-- À exécuter dans le SQL Editor de Supabase
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. libraries : un prof peut INSERT une bibliothèque qu'il possède
DROP POLICY IF EXISTS "professors_can_insert_own_libraries" ON public.libraries;
CREATE POLICY "professors_can_insert_own_libraries"
  ON public.libraries
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('professor', 'admin')
        AND is_active = true
    )
  );

-- 2. libraries : un prof peut SUPPRIMER une bibliothèque qu'il possède
--    (utile pour le rollback automatique en cas d'erreur d'upload)
DROP POLICY IF EXISTS "professors_can_delete_own_libraries" ON public.libraries;
CREATE POLICY "professors_can_delete_own_libraries"
  ON public.libraries
  FOR DELETE
  USING (auth.uid() = created_by);

-- 3. library_classes : un prof peut INSERT des liens vers ses propres
--    bibliothèques (vers n'importe quelle classe — l'API contrôle déjà
--    quelles classes sont passées : ce sont celles du live)
DROP POLICY IF EXISTS "professors_can_link_own_libraries_to_classes" ON public.library_classes;
CREATE POLICY "professors_can_link_own_libraries_to_classes"
  ON public.library_classes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.libraries lib
      WHERE lib.id = library_classes.library_id
        AND lib.created_by = auth.uid()
    )
  );

-- 4. library_files : un prof peut INSERT un fichier dans une bibliothèque
--    qu'il possède
DROP POLICY IF EXISTS "professors_can_insert_files_in_own_libraries" ON public.library_files;
CREATE POLICY "professors_can_insert_files_in_own_libraries"
  ON public.library_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.libraries lib
      WHERE lib.id = library_files.library_id
        AND lib.created_by = auth.uid()
    )
  );

-- 5. Storage : permettre à un prof d'uploader dans le bucket library-files
--    sous le dossier d'une bibliothèque qu'il possède.
--    Le storage_path est de la forme `{library_id}/{uuid}.{ext}`,
--    donc on extrait le 1er segment du nom du fichier.
DROP POLICY IF EXISTS "professors_can_upload_to_own_libraries" ON storage.objects;
CREATE POLICY "professors_can_upload_to_own_libraries"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'library-files'
    AND EXISTS (
      SELECT 1 FROM public.libraries lib
      WHERE lib.id::text = (storage.foldername(name))[1]
        AND lib.created_by = auth.uid()
    )
  );

-- 6. Storage : permettre au prof de SUPPRIMER ses propres uploads
--    (pour le rollback en cas d'erreur)
DROP POLICY IF EXISTS "professors_can_delete_own_uploads" ON storage.objects;
CREATE POLICY "professors_can_delete_own_uploads"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'library-files'
    AND EXISTS (
      SELECT 1 FROM public.libraries lib
      WHERE lib.id::text = (storage.foldername(name))[1]
        AND lib.created_by = auth.uid()
    )
  );
