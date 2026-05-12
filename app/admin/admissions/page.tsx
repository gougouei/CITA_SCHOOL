"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase";

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
  occupation:           string;
  how_discovered:       string | null;
  motivation:           string;
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

function calculateAge(dob: string) {
  const birth = new Date(dob);
  const now   = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export default function AdminAdmissionsPage() {
  const supabase = createClient();
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [filter,     setFilter]     = useState<Status | "all">("all");
  const [detail,     setDetail]     = useState<Admission | null>(null);

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
                    {["Nom complet", "Email", "Pays", "Date", "Statut", "Actions"].map((h) => (
                      <th key={h} className="text-left px-6 py-3 text-[0.7rem] font-bold tracking-[0.08em] uppercase text-muted-fg bg-secondary border-b border-border">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id} className="hover:bg-muted-bg border-b border-border last:border-0">
                      <td className="px-6 py-[0.875rem] text-sm font-semibold">
                        {a.first_name} {a.last_name}
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
                              <Button variant="accent"  size="sm" onClick={() => updateStatus(a.id, "approved")}>
                                Approuver
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => updateStatus(a.id, "rejected")}>
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
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-serif text-[1.1rem] font-semibold text-[#141414]">
              {admission.first_name} {admission.last_name}
            </h2>
            <p className="text-[0.72rem] text-muted-fg mt-0.5">
              Demande reçue le {formatDate(admission.created_at)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-fg hover:text-[#141414] transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted-bg"
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
              <Button variant="accent" onClick={onApprove}>Approuver</Button>
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
