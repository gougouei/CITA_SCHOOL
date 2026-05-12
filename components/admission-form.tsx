"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface FormData {
  last_name:            string;
  first_name:           string;
  email:                string;
  date_of_birth:        string;
  country_of_birth:     string;
  country_of_residence: string;
  marital_status:       string;
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
  occupation:           "",
  how_discovered:       "",
  motivation:           "",
};

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
  const [form,       setForm]       = useState<FormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [submitted,  setSubmitted]  = useState(false);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la soumission");
      setSubmitted(true);
      setForm(INITIAL);
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

        {/* Date de naissance */}
        <Field label="Date de naissance" required>
          <input
            type="date"
            value={form.date_of_birth}
            onChange={(e) => update("date_of_birth", e.target.value)}
            required
            max={new Date().toISOString().split("T")[0]}
            className={inputCls}
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
