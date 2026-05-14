"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";

interface ClassOption { id: string; name: string }

interface Props {
  libraryId:       string;
  fileName:        string;
  classes:         ClassOption[];
  initialClassIds: string[];
  onClose:         () => void;
  onSaved:         () => void;
}

export function ClassAssignmentModal({
  libraryId, fileName, classes, initialClassIds, onClose, onSaved,
}: Props) {
  const supabase = createClient();

  const [classIds, setClassIds] = useState<string[]>(initialClassIds);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => { setClassIds(initialClassIds); }, [initialClassIds]);

  function toggleClass(id: string) {
    setClassIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const toAdd    = classIds.filter((id) => !initialClassIds.includes(id));
      const toRemove = initialClassIds.filter((id) => !classIds.includes(id));

      if (toRemove.length > 0) {
        const { error: delErr } = await supabase
          .from("library_classes")
          .delete()
          .eq("library_id", libraryId)
          .in("class_id", toRemove);
        if (delErr) throw new Error(delErr.message);
      }

      if (toAdd.length > 0) {
        const { error: insErr } = await supabase
          .from("library_classes")
          .insert(toAdd.map((cid) => ({ library_id: libraryId, class_id: cid })));
        if (insErr) throw new Error(insErr.message);
      }

      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" onClick={saving ? undefined : onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-[420px] bg-white shadow-elevated z-50 flex flex-col">

        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="font-serif text-[1.1rem] font-semibold">Gérer les classes</h2>
            <p className="text-[0.75rem] text-muted-fg mt-0.5 truncate">{fileName}</p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-muted-fg hover:text-[#141414] w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted-bg disabled:opacity-50 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {error && (
            <div className="px-3 py-2 rounded-md bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.25)] text-citsa-red-hex text-[0.8rem]">
              {error}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[0.78rem] font-semibold">
                Classes ayant accès
              </label>
              {classes.length > 0 && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    if (classIds.length === classes.length) setClassIds([]);
                    else                                     setClassIds(classes.map((c) => c.id));
                  }}
                  className="text-[0.7rem] text-citsa-red-hex hover:underline"
                >
                  {classIds.length === classes.length ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
              )}
            </div>

            {classes.length === 0 ? (
              <p className="text-[0.78rem] text-muted-fg italic">Aucune classe disponible.</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto">
                {classes.map((c) => {
                  const checked = classIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={saving}
                      onClick={() => toggleClass(c.id)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all disabled:opacity-50 ${
                        checked
                          ? "border-citsa-red-hex bg-[hsla(0,75%,45%,0.04)]"
                          : "border-border hover:border-[#c0c0c0]"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                        checked ? "bg-citsa-red-hex border-citsa-red-hex" : "border-border bg-white"
                      }`}>
                        {checked && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-[#141414]">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-[0.72rem] text-muted-fg mt-2">
              {classIds.length === 0
                ? "Aucune classe — ce fichier ne sera visible par personne."
                : `${classIds.length} classe${classIds.length > 1 ? "s" : ""} sélectionnée${classIds.length > 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
          <Button variant="accent" onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </>
  );
}
