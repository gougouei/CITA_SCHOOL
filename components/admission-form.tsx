"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";

interface FormData {
  last_name:            string;
  first_name:           string;
  email:                string;
  date_of_birth:        string;
  country_of_birth:     string;
  country_of_residence: string;
  marital_status:       string;
  number_of_children:   string;
  occupation:           string;
  how_discovered:       string;
  motivation:           string;
}

const INITIAL: FormData = {
  last_name:            "",
  first_name:           "",
  email:                "",
  date_of_birth:        "",
  country_of_birth:     "",
  country_of_residence: "",
  marital_status:       "",
  number_of_children:   "",
  occupation:           "",
  how_discovered:       "",
  motivation:           "",
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES  = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const COUNTRIES = [
  "Bénin",
  "Burkina Faso",
  "Cameroun",
  "Congo",
  "Côte d'Ivoire",
  "France",
  "Gabon",
  "Ghana",
  "Mali",
  "Niger",
  "Nigéria",
  "République Démocratique du Congo",
  "Sénégal",
  "Togo",
  "Autre",
];

export function AdmissionForm() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form,        setForm]        = useState<FormData>(INITIAL);
  const [photoFile,   setPhotoFile]   = useState<File | null>(null);
  const [photoPreview,setPhotoPreview]= useState<string | null>(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [submitted,   setSubmitted]   = useState(false);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) { setPhotoFile(null); setPhotoPreview(null); return; }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Format invalide. Utilisez JPG, PNG ou WEBP.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("La photo doit faire moins de 5 MB.");
      e.target.value = "";
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function removePhoto() {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!photoFile) {
      setError("Veuillez ajouter une photo d'identité.");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Upload de la photo dans le bucket public admission-photos
      const ext = photoFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("admission-photos")
        .upload(path, photoFile, {
          contentType: photoFile.type,
          upsert: false,
        });
      if (uploadError) throw new Error(`Échec de l'envoi de la photo : ${uploadError.message}`);

      // 2. Récupérer l'URL publique
      const { data: urlData } = supabase.storage
        .from("admission-photos")
        .getPublicUrl(path);

      // 3. Soumettre la demande avec le lien de la photo
      const res = await fetch("/api/admission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          number_of_children: parseInt(form.number_of_children, 10),
          photo_url: urlData.publicUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const parts = [data.error, data.details, data.hint, data.code].filter(Boolean);
        throw new Error(parts.join(" · ") || "Erreur lors de la soumission");
      }

      setSubmitted(true);
      setForm(INITIAL);
      removePhoto();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de réseau");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Écran de succès ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center py-8 sm:py-12">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[hsla(142,60%,45%,0.12)] flex items-center justify-center mb-5">
          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-[hsl(142,60%,35%)]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h3 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414] mb-3">
          Demande envoyée avec succès
        </h3>
        <p className="text-sm sm:text-base text-muted-fg max-w-[500px] mb-6">
          Votre demande d&apos;admission a bien été reçue. L&apos;administration de CITSA examinera votre candidature
          et vous contactera prochainement. Conservez précieusement vos identifiants une fois reçus.
        </p>
        <Button variant="outline" onClick={() => setSubmitted(false)}>
          Soumettre une autre demande
        </Button>
      </div>
    );
  }

  // ── Formulaire ──────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.25)] text-citsa-red-hex text-sm">
          {error}
        </div>
      )}

      {/* Photo d'identité — pleine largeur, en haut */}
      <div className="mb-6">
        <label className="text-[0.8rem] font-medium block mb-2">
          Photo d&apos;identité <span className="text-citsa-red-hex">*</span>
          <span className="ml-1 text-[0.7rem] font-normal text-muted-fg">
            (JPG, PNG ou WEBP — max 5 MB)
          </span>
        </label>

        {!photoPreview ? (
          <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl px-6 py-8 cursor-pointer hover:border-citsa-red-hex hover:bg-[hsla(0,75%,45%,0.02)] transition-all">
            <div className="w-12 h-12 rounded-full bg-muted-bg flex items-center justify-center">
              <svg className="w-5 h-5 text-muted-fg" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1={12} y1={3} x2={12} y2={15}/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[#141414]">Cliquez pour ajouter une photo</p>
              <p className="text-[0.72rem] text-muted-fg mt-0.5">JPG · PNG · WEBP — 5 MB max</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handlePhotoChange}
              required
              className="hidden"
            />
          </label>
        ) : (
          <div className="flex items-center gap-4 border border-border rounded-xl p-4 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoPreview}
              alt="Aperçu"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#141414] truncate">{photoFile?.name}</p>
              <p className="text-[0.72rem] text-muted-fg mt-0.5">
                {photoFile && `${(photoFile.size / 1024).toFixed(0)} KB · ${photoFile.type.split("/")[1].toUpperCase()}`}
              </p>
              <button
                type="button"
                onClick={removePhoto}
                className="mt-2 text-[0.72rem] font-semibold text-citsa-red-hex hover:underline"
              >
                Changer de photo
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">

        {/* Nom */}
        <Field label="Nom" required>
          <input
            type="text"
            value={form.last_name}
            onChange={(e) => update("last_name", e.target.value)}
            placeholder="Votre nom"
            required
            className={inputCls}
          />
        </Field>

        {/* Prénoms */}
        <Field label="Prénoms" required>
          <input
            type="text"
            value={form.first_name}
            onChange={(e) => update("first_name", e.target.value)}
            placeholder="Vos prénoms"
            required
            className={inputCls}
          />
        </Field>

        {/* Email — pleine largeur */}
        <div className="sm:col-span-2 flex flex-col gap-[0.4rem]">
          <label className="text-[0.8rem] font-medium">
            Adresse email <span className="text-citsa-red-hex">*</span>
            <span className="ml-1 text-[0.7rem] font-normal text-muted-fg">
              (utilisée pour vous transmettre vos identifiants si votre demande est acceptée)
            </span>
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="votre@email.com"
            required
            autoComplete="email"
            className={inputCls}
          />
        </div>

        {/* Date de naissance — 3 sélecteurs (plus fiables que le date picker natif) */}
        <Field label="Date de naissance" required>
          <DateOfBirthPicker
            value={form.date_of_birth}
            onChange={(iso) => update("date_of_birth", iso)}
          />
        </Field>

        {/* Pays de naissance */}
        <Field label="Pays de naissance" required>
          <select
            value={form.country_of_birth}
            onChange={(e) => update("country_of_birth", e.target.value)}
            required
            className={inputCls}
          >
            <option value="">Sélectionnez</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        {/* Pays de résidence */}
        <Field label="Pays de résidence" required>
          <select
            value={form.country_of_residence}
            onChange={(e) => update("country_of_residence", e.target.value)}
            required
            className={inputCls}
          >
            <option value="">Sélectionnez</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        {/* Situation matrimoniale */}
        <Field label="Situation matrimoniale" required>
          <select
            value={form.marital_status}
            onChange={(e) => update("marital_status", e.target.value)}
            required
            className={inputCls}
          >
            <option value="">Sélectionnez</option>
            <option value="single">Célibataire</option>
            <option value="married">Marié(e)</option>
            <option value="divorced">Divorcé(e)</option>
            <option value="widowed">Veuf/Veuve</option>
          </select>
        </Field>

        {/* Nombre d'enfants */}
        <Field label="Nombre d'enfants" required>
          <input
            type="number"
            value={form.number_of_children}
            onChange={(e) => update("number_of_children", e.target.value)}
            placeholder="0"
            min={0}
            max={30}
            required
            className={inputCls}
          />
        </Field>

        {/* Profession */}
        <Field label="Profession" required>
          <input
            type="text"
            value={form.occupation}
            onChange={(e) => update("occupation", e.target.value)}
            placeholder="Votre profession"
            required
            className={inputCls}
          />
        </Field>

        {/* Comment nous avez-vous connus */}
        <Field label="Comment nous avez-vous connus ?" hint="(optionnel)">
          <input
            type="text"
            value={form.how_discovered}
            onChange={(e) => update("how_discovered", e.target.value)}
            placeholder="Ex : recommandation, réseaux sociaux…"
            className={inputCls}
          />
        </Field>

        {/* Motivation */}
        <div className="sm:col-span-2 flex flex-col gap-[0.4rem]">
          <label className="text-[0.8rem] font-medium">
            Motivation <span className="text-citsa-red-hex">*</span>
          </label>
          <textarea
            value={form.motivation}
            onChange={(e) => update("motivation", e.target.value)}
            placeholder="Pourquoi souhaitez-vous rejoindre CITSA ?"
            required
            rows={5}
            className="font-sans text-sm bg-white border border-border rounded-md px-[0.875rem] py-[0.625rem] min-h-[100px] resize-y outline-none focus:border-citsa-red-hex focus:shadow-[0_0_0_2px_rgba(201,29,29,0.15)] transition-all"
          />
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Button type="submit" variant="accent" size="lg" disabled={submitting}>
          {submitting ? "Envoi en cours…" : "Soumettre ma demande"}
        </Button>
      </div>
    </form>
  );
}

const inputCls = "font-sans text-sm bg-white border border-border rounded-md px-[0.875rem] h-10 outline-none focus:border-citsa-red-hex focus:shadow-[0_0_0_2px_rgba(201,29,29,0.15)] transition-all";

// ─── Sélecteur de date 3 colonnes (Jour / Mois / Année) ─────────────────────
const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function DateOfBirthPicker({
  value, onChange,
}: {
  value: string;             // ISO YYYY-MM-DD
  onChange: (iso: string) => void;
}) {
  const [y, m, d] = value
    ? value.split("-").map((p) => p.padStart(2, "0"))
    : ["", "", ""];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const days  = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, "0"));

  function update(part: "y" | "m" | "d", v: string) {
    const next = { y, m, d, [part]: v };
    if (next.y && next.m && next.d) {
      onChange(`${next.y}-${next.m}-${next.d}`);
    } else {
      onChange("");
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <select
        value={d}
        onChange={(e) => update("d", e.target.value)}
        required
        aria-label="Jour"
        className={inputCls}
      >
        <option value="">Jour</option>
        {days.map((dd) => <option key={dd} value={dd}>{dd}</option>)}
      </select>
      <select
        value={m}
        onChange={(e) => update("m", e.target.value)}
        required
        aria-label="Mois"
        className={inputCls}
      >
        <option value="">Mois</option>
        {MONTHS_FR.map((label, i) => (
          <option key={label} value={(i + 1).toString().padStart(2, "0")}>{label}</option>
        ))}
      </select>
      <select
        value={y}
        onChange={(e) => update("y", e.target.value)}
        required
        aria-label="Année"
        className={inputCls}
      >
        <option value="">Année</option>
        {years.map((yr) => <option key={yr} value={yr.toString()}>{yr}</option>)}
      </select>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[0.4rem]">
      <label className="text-[0.8rem] font-medium">
        {label}
        {required  && <span className="text-citsa-red-hex"> *</span>}
        {hint      && <span className="ml-1 text-[0.7rem] font-normal text-muted-fg">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
