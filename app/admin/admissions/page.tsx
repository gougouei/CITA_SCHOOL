"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase";
import { useSortableData, SortableTh, type SortColumn } from "@/components/ui/sortable-table";

type Status = "pending" | "approved" | "rejected";
type MaritalStatus = "single" | "married" | "divorced" | "widowed";

interface Admission {
  id:                   string;
  first_name:           string;
  last_name:            string;
  email:                string;
  date_of_birth:        string;
  country_of_birth:     string;
  country_of_residence: string;
  marital_status:       MaritalStatus;
  number_of_children:   number;
  occupation:           string;
  how_discovered:       string | null;
  motivation:           string;
  photo_url:            string;
  status:               Status;
  created_at:           string;
  reviewed_at:          string | null;
}

const MARITAL_LABEL: Record<MaritalStatus, string> = {
  single:   "Célibataire",
  married:  "Marié(e)",
  divorced: "Divorcé(e)",
  widowed:  "Veuf/Veuve",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

// Colonnes du tableau (triables via clic sur l'en-tête ; « Actions » non triable)
const ADMISSION_COLUMNS: SortColumn<Admission>[] = [
  { key: "name",    label: "Nom complet", sortValue: (a) => `${a.first_name} ${a.last_name}` },
  { key: "email",   label: "Email",       sortValue: (a) => a.email },
  { key: "country", label: "Pays",        sortValue: (a) => a.country_of_residence },
  { key: "created", label: "Date",        sortValue: (a) => a.created_at },
  { key: "status",  label: "Statut",      sortValue: (a) => a.status },
  { key: "actions", label: "Actions" },
];

function calculateAge(dob: string) {
  const birth = new Date(dob);
  const now   = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

interface ApprovalResult {
  full_name: string;
  username:  string;
  password:  string;
}

export default function AdminAdmissionsPage() {
  const supabase = createClient();
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [filter,     setFilter]     = useState<Status | "all">("all");
  const [detail,     setDetail]     = useState<Admission | null>(null);
  const [approving,  setApproving]  = useState<string | null>(null);
  const [approval,   setApproval]   = useState<ApprovalResult | null>(null);

  async function loadAdmissions() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("admission_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAdmissions((data as Admission[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateStatus(id: string, status: "approved" | "rejected") {
    setError(null);

    if (status === "approved") {
      // Approbation → crée automatiquement le compte étudiant
      setApproving(id);
      try {
        const res = await fetch("/api/admin/approve-admission", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ admission_id: id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erreur lors de l'approbation");

        setDetail(null);
        setApproval({
          full_name: data.full_name,
          username:  data.username,
          password:  data.password,
        });
        await loadAdmissions();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        setApproving(null);
      }
      return;
    }

    // Rejet → simple update direct
    try {
      const { error } = await supabase
        .from("admission_requests")
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      setDetail(null);
      await loadAdmissions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  const filtered = filter === "all" ? admissions : admissions.filter((a) => a.status === filter);

  // Tri du tableau (par défaut : les demandes les plus récentes en premier)
  const { sorted, sortKey, direction, requestSort } =
    useSortableData(filtered, ADMISSION_COLUMNS, { key: "created", direction: "desc" });

  const counts = {
    all:      admissions.length,
    pending:  admissions.filter((a) => a.status === "pending").length,
    approved: admissions.filter((a) => a.status === "approved").length,
    rejected: admissions.filter((a) => a.status === "rejected").length,
  };

  return (
    <>
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5 flex justify-between items-center gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Demandes d&apos;Admission</h1>
          <p className="text-sm text-muted-fg mt-0.5">
            {counts.pending} en attente · {counts.approved} approuvée{counts.approved !== 1 ? "s" : ""}
          </p>
        </div>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.25)] text-citsa-red-hex text-sm">
            {error}
          </div>
        )}

        {/* Filtres */}
        <div className="flex flex-wrap gap-2 mb-6">
          {([
            { key: "all",      label: "Toutes",       count: counts.all },
            { key: "pending",  label: "En attente",   count: counts.pending },
            { key: "approved", label: "Approuvées",   count: counts.approved },
            { key: "rejected", label: "Rejetées",     count: counts.rejected },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as Status | "all")}
              className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border text-sm font-medium transition-all ${
                filter === f.key
                  ? "bg-citsa-red-hex text-white border-citsa-red-hex"
                  : "bg-white text-muted-fg border-border hover:text-[#141414] hover:border-[#c0c0c0]"
              }`}
            >
              {f.label}
              <span className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full ${
                filter === f.key ? "bg-white/20 text-white" : "bg-muted-bg text-muted-fg"
              }`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-fg text-sm">Chargement des demandes…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-fg text-sm">
            {filter === "all" ? "Aucune demande d'admission reçue pour le moment." : "Aucune demande dans cette catégorie."}
          </div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {ADMISSION_COLUMNS.map((col) => (
                      <SortableTh key={col.key} column={col} sortKey={sortKey} direction={direction} onSort={requestSort} />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((a) => (
                    <tr key={a.id} className="hover:bg-muted-bg border-b border-border last:border-0">
                      <td className="px-6 py-[0.875rem] text-sm font-semibold">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={a.photo_url}
                            alt={`${a.first_name} ${a.last_name}`}
                            className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-border"
                          />
                          <span>{a.first_name} {a.last_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-[0.875rem] text-sm">
                        <a href={`mailto:${a.email}`} className="text-citsa-red-hex hover:underline">
                          {a.email}
                        </a>
                      </td>
                      <td className="px-6 py-[0.875rem] text-sm text-muted-fg">{a.country_of_residence}</td>
                      <td className="px-6 py-[0.875rem] text-sm text-muted-fg">{formatDate(a.created_at)}</td>
                      <td className="px-6 py-[0.875rem] text-sm">
                        {a.status === "pending"  && <Badge variant="warning">En attente</Badge>}
                        {a.status === "approved" && <Badge variant="success">Approuvé</Badge>}
                        {a.status === "rejected" && <Badge variant="destructive">Rejeté</Badge>}
                      </td>
                      <td className="px-6 py-[0.875rem] text-sm">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setDetail(a)}>
                            Détails
                          </Button>
                          {a.status === "pending" && (
                            <>
                              <Button
                                variant="accent"
                                size="sm"
                                disabled={approving === a.id}
                                onClick={() => updateStatus(a.id, "approved")}
                              >
                                {approving === a.id ? "Création…" : "Approuver"}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={approving === a.id}
                                onClick={() => updateStatus(a.id, "rejected")}
                              >
                                Rejeter
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Modal détails */}
      {detail && (
        <AdmissionDetailModal
          admission={detail}
          onClose={() => setDetail(null)}
          onApprove={() => updateStatus(detail.id, "approved")}
          onReject={() => updateStatus(detail.id, "rejected")}
        />
      )}

      {/* Modal credentials générés */}
      {approval && (
        <CredentialsModal result={approval} onClose={() => setApproval(null)} />
      )}
    </>
  );
}

// ─── Modal détails ─────────────────────────────────────────────────────────────
function AdmissionDetailModal({
  admission, onClose, onApprove, onReject,
}: {
  admission: Admission;
  onClose: () => void;
  onApprove: () => void | Promise<void>;
  onReject:  () => void | Promise<void>;
}) {
  const age = calculateAge(admission.date_of_birth);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-[520px] bg-white shadow-elevated z-50 flex flex-col">

        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <a href={admission.photo_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={admission.photo_url}
                alt={`${admission.first_name} ${admission.last_name}`}
                className="w-16 h-16 rounded-xl object-cover border border-border hover:opacity-80 transition-opacity"
              />
            </a>
            <div className="min-w-0">
              <h2 className="font-serif text-[1.1rem] font-semibold text-[#141414] truncate">
                {admission.first_name} {admission.last_name}
              </h2>
              <p className="text-[0.72rem] text-muted-fg mt-0.5">
                Demande reçue le {formatDate(admission.created_at)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-fg hover:text-[#141414] transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted-bg flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Statut */}
        <div className="px-6 py-3 border-b border-border bg-secondary flex items-center justify-between">
          <span className="text-[0.72rem] font-semibold text-muted-fg uppercase tracking-[0.08em]">Statut</span>
          {admission.status === "pending"  && <Badge variant="warning">En attente</Badge>}
          {admission.status === "approved" && <Badge variant="success">Approuvé</Badge>}
          {admission.status === "rejected" && <Badge variant="destructive">Rejeté</Badge>}
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* Identité */}
          <Section title="Identité">
            <Detail label="Nom"       value={admission.last_name}  />
            <Detail label="Prénoms"   value={admission.first_name} />
            <DetailEmail label="Email" email={admission.email} />
            <Detail label="Naissance" value={`${formatDate(admission.date_of_birth)} (${age} ans)`} />
            <Detail label="Pays de naissance" value={admission.country_of_birth} />
          </Section>

          {/* Résidence & vie */}
          <Section title="Profil">
            <Detail label="Pays de résidence"  value={admission.country_of_residence} />
            <Detail label="Situation matrimoniale" value={MARITAL_LABEL[admission.marital_status]} />
            <Detail
              label="Nombre d'enfants"
              value={
                admission.number_of_children === 0
                  ? "Aucun"
                  : `${admission.number_of_children} enfant${admission.number_of_children > 1 ? "s" : ""}`
              }
            />
            <Detail label="Profession"         value={admission.occupation} />
            {admission.how_discovered && (
              <Detail label="A connu CITSA via" value={admission.how_discovered} />
            )}
          </Section>

          {/* Motivation */}
          <Section title="Motivation">
            <div className="bg-muted-bg rounded-lg px-4 py-3 text-sm text-[#141414] whitespace-pre-wrap leading-relaxed">
              {admission.motivation}
            </div>
          </Section>

          {admission.reviewed_at && (
            <p className="text-[0.72rem] text-muted-fg italic">
              Examinée le {formatDate(admission.reviewed_at)}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          {admission.status === "pending" ? (
            <>
              <Button variant="destructive" onClick={onReject}>Rejeter</Button>
              <Button variant="accent" onClick={onApprove}>
                Approuver &amp; créer le compte
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={onClose}>Fermer</Button>
          )}
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-muted-fg mb-2">
        {title}
      </p>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-fg">{label}</span>
      <span className="text-[#141414] font-medium text-right">{value}</span>
    </div>
  );
}

function DetailEmail({ label, email }: { label: string; email: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-fg">{label}</span>
      <a href={`mailto:${email}`} className="text-citsa-red-hex hover:underline font-medium text-right truncate">
        {email}
      </a>
    </div>
  );
}

// ─── Modal Credentials (après approbation) ────────────────────────────────────
function CredentialsModal({
  result, onClose,
}: {
  result: ApprovalResult;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<"user" | "pwd" | null>(null);

  function copyText(text: string, which: "user" | "pwd") {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-[480px] bg-white z-[201] flex flex-col shadow-elevated">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="font-serif text-lg font-semibold text-[#141414]">Compte étudiant créé</h2>
            <p className="text-xs text-muted-fg mt-0.5">
              Transmettez ces accès à l&apos;étudiant — ils ne seront plus affichés.
            </p>
          </div>
          <button onClick={onClose} className="text-muted-fg hover:text-[#141414] transition-colors p-1 rounded-md hover:bg-muted-bg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">

          {/* Succès */}
          <div className="flex items-center gap-3 bg-[hsla(142,60%,45%,0.08)] border border-[hsla(142,60%,45%,0.25)] rounded-xl px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-[hsla(142,60%,45%,0.15)] flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-[hsl(142,60%,35%)]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[hsl(142,60%,28%)]">
                {result.full_name} a maintenant un compte étudiant
              </p>
              <p className="text-[0.72rem] text-[hsl(142,50%,35%)]">
                L&apos;admission est marquée comme approuvée.
              </p>
            </div>
          </div>

          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.78rem] font-semibold text-[#141414]">Nom d&apos;utilisateur</label>
            <div className="flex items-center gap-2 bg-muted-bg border border-border rounded-md px-3 h-10">
              <code className="flex-1 text-sm font-mono text-[#141414]">{result.username}</code>
              <button
                onClick={() => copyText(result.username, "user")}
                className="text-[0.72rem] font-semibold text-citsa-red-hex hover:opacity-75 transition-opacity flex-shrink-0"
              >
                {copied === "user" ? "✓ Copié" : "Copier"}
              </button>
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.78rem] font-semibold text-[#141414]">Mot de passe</label>
            <div className="flex items-center gap-2 bg-muted-bg border border-border rounded-md px-3 h-10">
              <code className="flex-1 text-sm font-mono tracking-wide text-[#141414]">{result.password}</code>
              <button
                onClick={() => copyText(result.password, "pwd")}
                className="text-[0.72rem] font-semibold text-citsa-red-hex hover:opacity-75 transition-opacity flex-shrink-0"
              >
                {copied === "pwd" ? "✓ Copié" : "Copier"}
              </button>
            </div>
          </div>

          {/* Avertissement */}
          <div className="flex items-start gap-2 bg-[hsla(35,90%,50%,0.08)] border border-[hsla(35,90%,50%,0.25)] rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-[hsl(35,90%,35%)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1={12} y1={9} x2={12} y2={13}/><line x1={12} y1={17} x2={12.01} y2={17}/>
            </svg>
            <p className="text-[0.72rem] text-[hsl(35,80%,30%)]">
              Le mot de passe ne sera plus jamais affiché après fermeture. Copiez-le maintenant
              avant de transmettre les accès à l&apos;étudiant.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-secondary flex items-center justify-end gap-3">
          <Button variant="accent" onClick={onClose}>Terminer</Button>
        </div>
      </div>
    </>
  );
}
