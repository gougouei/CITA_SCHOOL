"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

export type SortDirection = "asc" | "desc";
export type SortValue = string | number | boolean | null | undefined;

export interface SortColumn<T> {
  /** Clé unique de la colonne. */
  key: string;
  /** Libellé affiché dans l'en-tête. */
  label: string;
  /** Valeur comparable pour le tri. Absent ⇒ colonne non triable (ex. « Actions »). */
  sortValue?: (row: T) => SortValue;
  /** Classes utilitaires supplémentaires posées sur le <th>. */
  thClassName?: string;
}

/**
 * Hook générique de tri de tableau piloté par un clic sur les en-têtes.
 * Premier clic sur une colonne ⇒ tri ascendant ; second clic ⇒ descendant.
 * Les colonnes sans `sortValue` ne sont pas cliquables.
 */
export function useSortableData<T>(
  rows: T[],
  columns: SortColumn<T>[],
  initial?: { key: string; direction?: SortDirection },
) {
  const [sortKey,   setSortKey]   = useState<string | null>(initial?.key ?? null);
  const [direction, setDirection] = useState<SortDirection>(initial?.direction ?? "asc");

  function requestSort(key: string) {
    const col = columns.find((c) => c.key === key);
    if (!col?.sortValue) return; // colonne non triable
    if (sortKey === key) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection("asc");
    }
  }

  const sorted = useMemo(() => {
    const col = sortKey ? columns.find((c) => c.key === sortKey) : null;
    if (!col?.sortValue) return rows;
    const getValue = col.sortValue;
    const factor = direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      // Valeurs vides toujours reléguées en fin de liste, quel que soit le sens.
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number"  && typeof vb === "number")  return (va - vb) * factor;
      if (typeof va === "boolean" && typeof vb === "boolean") return (Number(va) - Number(vb)) * factor;
      return String(va).localeCompare(String(vb), "fr", { numeric: true, sensitivity: "base" }) * factor;
    });
    // `columns` est stable (défini au niveau module) ⇒ pas dans les deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortKey, direction]);

  return { sorted, sortKey, direction, requestSort };
}

/** En-tête de colonne cliquable, avec indicateur de sens de tri. */
export function SortableTh<T>({
  column, sortKey, direction, onSort,
}: {
  column: SortColumn<T>;
  sortKey: string | null;
  direction: SortDirection;
  onSort: (key: string) => void;
}) {
  const sortable = !!column.sortValue;
  const active   = sortable && sortKey === column.key;

  return (
    <th
      scope="col"
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined}
      onClick={sortable ? () => onSort(column.key) : undefined}
      className={[
        "text-left px-6 py-3 text-[0.7rem] font-bold tracking-[0.08em] uppercase bg-secondary border-b border-border",
        active ? "text-[#141414]" : "text-muted-fg",
        sortable ? "cursor-pointer select-none hover:text-[#141414] transition-colors" : "",
        column.thClassName ?? "",
      ].join(" ")}
    >
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        {column.label}
        {sortable && (
          active ? (
            direction === "asc"
              ? <ArrowUp   size={12} className="text-citsa-red-hex" />
              : <ArrowDown size={12} className="text-citsa-red-hex" />
          ) : (
            <ChevronsUpDown size={12} className="text-muted-fg/40" />
          )
        )}
      </span>
    </th>
  );
}
