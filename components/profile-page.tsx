"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase";

interface Profile {
  id:         string;
  full_name:  string;
  username:   string;
  role:       "admin" | "professor" | "student";
  avatar_url: string | null;
  is_active:  boolean;
  created_at: string;
}

const MAX_AVATAR_BYTES = 3 * 1024 * 1024; // 3 MB
const ACCEPTED_TYPES   = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const ROLE_LABEL: Record<Profile["role"], string> = {
  admin:     "Administrateur",
  professor: "Professeur",
  student:   "Étudiant",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function computeInitials(name: string) {
  return name
    .replace(/^Prof\.\s*/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function ProfilePage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile,    setProfile]    = useState<Profile | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [success,    setSuccess]    = useState<string | null>(null);
  const [uploading,  setUploading]  = useState(false);
  const [fullName,   setFullName]   = useState("");
  const [saving,     setSaving]     = useState(false);

  async function loadProfile() {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, role, avatar_url, is_active, created_at")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setFullName(data.full_name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Extrait un message d'erreur lisible depuis n'importe quel type d'erreur
  function extractError(e: unknown, fallback = "Erreur inconnue"): string {
    if (!e) return fallback;
    if (e instanceof Error) return e.message;
    if (typeof e === "string") return e;
    if (typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") {
      return (e as { message: string }).message;
    }
    return fallback;
  }

  // Émet un événement pour que la sidebar (et autres composants) se rafraîchissent
  function notifyProfileUpdated(updates: { avatarUrl?: string | null; fullName?: string }) {
    window.dispatchEvent(new CustomEvent("profile-updated", { detail: updates }));
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setSuccess(null);
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Format invalide. Utilisez JPG, PNG ou WEBP.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("La photo doit faire moins de 3 MB.");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${profile.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", profile.id);
      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: urlData.publicUrl });
      notifyProfileUpdated({ avatarUrl: urlData.publicUrl });
      setSuccess("Photo de profil mise à jour avec succès.");
    } catch (e) {
      setError(extractError(e, "Erreur lors de l'upload"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveAvatar() {
    if (!profile || !profile.avatar_url) return;
    if (!confirm("Supprimer votre photo de profil ?")) return;

    setError(null);
    setSuccess(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", profile.id);
      if (error) throw error;

      setProfile({ ...profile, avatar_url: null });
      notifyProfileUpdated({ avatarUrl: null });
      setSuccess("Photo de profil supprimée.");
    } catch (e) {
      setError(extractError(e));
    }
  }

  async function handleSaveName() {
    if (!profile || !fullName.trim() || fullName === profile.full_name) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() })
        .eq("id", profile.id);
      if (error) throw error;
      setProfile({ ...profile, full_name: fullName.trim() });
      notifyProfileUpdated({ fullName: fullName.trim() });
      setSuccess("Nom mis à jour.");
    } catch (e) {
      setError(extractError(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5">
          <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Mon profil</h1>
        </header>
        <div className="p-4 sm:p-6 lg:p-8 text-center text-muted-fg text-sm py-20">
          Chargement…
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5">
          <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Mon profil</h1>
        </header>
        <div className="p-4 sm:p-6 lg:p-8 text-center text-muted-fg text-sm py-20">
          {error ?? "Profil introuvable"}
        </div>
      </>
    );
  }

  return (
    <>
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5">
        <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Mon profil</h1>
        <p className="text-sm text-muted-fg mt-0.5">Gérez votre photo et vos informations personnelles</p>
      </header>

      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto flex flex-col gap-6">

        {success && (
          <div className="px-4 py-3 rounded-lg bg-[hsla(142,60%,45%,0.1)] border border-[hsla(142,60%,45%,0.25)] text-[hsl(142,60%,30%)] text-sm">
            {success}
          </div>
        )}
        {error && (
          <div className="px-4 py-3 rounded-lg bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.25)] text-citsa-red-hex text-sm">
            {error}
          </div>
        )}

        {/* Photo de profil */}
        <Card>
          <div className="px-6 py-5 border-b border-border">
            <h2 className="font-serif text-base font-semibold">Photo de profil</h2>
            <p className="text-[0.78rem] text-muted-fg mt-0.5">
              JPG, PNG ou WEBP — 3 MB max
            </p>
          </div>
          <div className="px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border border-border flex-shrink-0"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-citsa-red-light to-citsa-red flex items-center justify-center text-white text-2xl sm:text-3xl font-bold flex-shrink-0">
                {computeInitials(profile.full_name)}
              </div>
            )}

            <div className="flex-1 flex flex-col gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleAvatarUpload}
                disabled={uploading}
                className="hidden"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Envoi…" : profile.avatar_url ? "Changer la photo" : "Ajouter une photo"}
                </Button>
                {profile.avatar_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    disabled={uploading}
                  >
                    Supprimer
                  </Button>
                )}
              </div>
              <p className="text-[0.72rem] text-muted-fg">
                Votre photo sera visible par les autres membres de votre classe et l&apos;administration.
              </p>
            </div>
          </div>
        </Card>

        {/* Informations */}
        <Card>
          <div className="px-6 py-5 border-b border-border">
            <h2 className="font-serif text-base font-semibold">Informations personnelles</h2>
          </div>
          <div className="px-6 py-6 flex flex-col gap-5">

            {/* Nom complet — éditable */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.78rem] font-semibold text-[#141414]">Nom complet</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="flex-1 font-sans text-sm bg-white border border-border rounded-md px-3 h-10 outline-none focus:border-citsa-red-hex transition-colors"
                />
                <Button
                  variant="accent"
                  size="sm"
                  onClick={handleSaveName}
                  disabled={saving || !fullName.trim() || fullName === profile.full_name}
                >
                  {saving ? "…" : "Enregistrer"}
                </Button>
              </div>
            </div>

            {/* Username — lecture seule */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <label className="text-[0.78rem] font-semibold text-[#141414]">Nom d&apos;utilisateur</label>
                <span className="text-[0.6rem] font-bold uppercase tracking-wider bg-muted-bg text-muted-fg px-2 py-0.5 rounded">
                  lecture seule
                </span>
              </div>
              <input
                type="text"
                value={profile.username}
                readOnly
                className="font-sans text-sm bg-muted-bg border border-border rounded-md px-3 h-10 text-muted-fg cursor-not-allowed outline-none"
              />
            </div>

            {/* Rôle */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.78rem] font-semibold text-[#141414]">Rôle</label>
              <div>
                <Badge variant={profile.role === "admin" ? "destructive" : profile.role === "professor" ? "warning" : "muted"}>
                  {ROLE_LABEL[profile.role]}
                </Badge>
              </div>
            </div>

            {/* Date d'inscription */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.78rem] font-semibold text-[#141414]">Membre depuis</label>
              <p className="text-sm text-muted-fg">{formatDate(profile.created_at)}</p>
            </div>
          </div>
        </Card>

        <div className="bg-muted-bg rounded-xl px-4 py-3 flex items-start gap-2">
          <svg className="w-4 h-4 text-muted-fg flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx={12} cy={12} r={10}/><line x1={12} y1={8} x2={12} y2={12}/><line x1={12} y1={16} x2={12.01} y2={16}/>
          </svg>
          <p className="text-[0.78rem] text-muted-fg">
            Pour modifier votre mot de passe ou désactiver votre compte, contactez l&apos;administration de CITSA.
          </p>
        </div>
      </div>
    </>
  );
}
