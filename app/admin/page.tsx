"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardBody } from "@/components/ui/card";
import { createClient } from "@/lib/supabase";

interface Kpis {
  students:    number;
  professors:  number;
  classes:     number;
  libraries:   number;
}

interface AdmissionRow {
  id:           string;
  full_name:    string;
  status:       "pending" | "approved" | "rejected";
  created_at:   string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminOverviewPage() {
  const supabase = createClient();
  const [kpis,       setKpis]       = useState<Kpis | null>(null);
  const [admissions, setAdmissions] = useState<AdmissionRow[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      const [studentsRes, profsRes, classesRes, librariesRes, admissionsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "professor"),
        supabase.from("classes").select("id", { count: "exact", head: true }),
        supabase.from("libraries").select("id", { count: "exact", head: true }),
        supabase
          .from("admission_requests")
          .select("id, first_name, last_name, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (cancelled) return;

      setKpis({
        students:   studentsRes.count   ?? 0,
        professors: profsRes.count      ?? 0,
        classes:    classesRes.count    ?? 0,
        libraries:  librariesRes.count  ?? 0,
      });

      setAdmissions(
        (admissionsRes.data ?? []).map((a) => ({
          id:         a.id,
          full_name:  `${a.first_name} ${a.last_name}`,
          status:     a.status,
          created_at: a.created_at,
        }))
      );

      setLoading(false);
    }

    loadAll();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5 flex justify-between items-center gap-3 flex-wrap">
        <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Vue d&apos;ensemble</h1>
        <Link href="/admin/broadcast">
          <Button variant="accent" size="sm">Lancer un broadcast</Button>
        </Link>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8 lg:grid-cols-4">
          <KpiCard label="Étudiants"     value={loading ? "…" : (kpis?.students   ?? 0).toString()} />
          <KpiCard label="Professeurs"   value={loading ? "…" : (kpis?.professors ?? 0).toString()} />
          <KpiCard label="Classes"       value={loading ? "…" : (kpis?.classes    ?? 0).toString()} />
          <KpiCard label="Bibliothèques" value={loading ? "…" : (kpis?.libraries  ?? 0).toString()} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Activité */}
          <Card>
            <div className="px-6 py-5 border-b border-border flex justify-between items-center">
              <CardTitle>Activité récente</CardTitle>
            </div>
            <CardBody className="p-0">
              <div className="px-6 py-10 text-center text-muted-fg text-sm">
                Aucune activité pour le moment.
              </div>
            </CardBody>
          </Card>

          {/* Admissions */}
          <Card>
            <div className="px-6 py-5 border-b border-border flex justify-between items-center">
              <CardTitle>Dernières admissions</CardTitle>
              <Link href="/admin/admissions" className="text-[0.75rem] text-citsa-red-hex hover:underline">
                Voir tout →
              </Link>
            </div>
            {loading ? (
              <div className="px-6 py-10 text-center text-muted-fg text-sm">Chargement…</div>
            ) : admissions.length === 0 ? (
              <div className="px-6 py-10 text-center text-muted-fg text-sm">
                Aucune demande d&apos;admission.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left px-6 py-3 text-[0.7rem] font-bold tracking-[0.08em] uppercase text-muted-fg bg-secondary border-b border-border">Nom</th>
                      <th className="text-left px-6 py-3 text-[0.7rem] font-bold tracking-[0.08em] uppercase text-muted-fg bg-secondary border-b border-border">Statut</th>
                      <th className="text-left px-6 py-3 text-[0.7rem] font-bold tracking-[0.08em] uppercase text-muted-fg bg-secondary border-b border-border">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admissions.map((a) => (
                      <tr key={a.id} className="hover:bg-muted-bg border-b border-border last:border-0">
                        <td className="px-6 py-[0.875rem] text-sm">{a.full_name}</td>
                        <td className="px-6 py-[0.875rem] text-sm">
                          {a.status === "pending"  && <Badge variant="warning">En attente</Badge>}
                          {a.status === "approved" && <Badge variant="success">Approuvé</Badge>}
                          {a.status === "rejected" && <Badge variant="destructive">Rejeté</Badge>}
                        </td>
                        <td className="px-6 py-[0.875rem] text-sm text-muted-fg">{formatDate(a.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl px-5 py-5 sm:px-6 sm:py-6 border border-border">
      <div className="text-[0.7rem] sm:text-[0.75rem] font-semibold tracking-[0.05em] uppercase text-muted-fg mb-2">
        {label}
      </div>
      <div className="font-serif text-[1.75rem] sm:text-[2.25rem] font-semibold text-[#141414] leading-none">
        {value}
      </div>
    </div>
  );
}
