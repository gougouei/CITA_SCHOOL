"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Worker PDF.js servi depuis /public (toujours la bonne version, pas de CDN)
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface Props {
  url: string;
}

export function PdfReader({ url }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs     = useRef<Record<number, HTMLDivElement | null>>({});

  const [numPages,    setNumPages]    = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale,       setScale]       = useState<number>(1);
  const [fitWidth,    setFitWidth]    = useState<boolean>(true);
  const [pageWidth,   setPageWidth]   = useState<number>(800);
  const [error,       setError]       = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);

  // Adapter la largeur de la page au conteneur
  useEffect(() => {
    function updateWidth() {
      if (containerRef.current) {
        setPageWidth(Math.min(containerRef.current.clientWidth - 48, 1200));
      }
    }
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  function onDocumentLoadError(err: Error) {
    setError(err.message);
    setLoading(false);
  }

  function zoomIn()      { setFitWidth(false); setScale((s) => Math.min(3, s + 0.25)); }
  function zoomOut()     { setFitWidth(false); setScale((s) => Math.max(0.5, s - 0.25)); }
  function resetZoom()   { setScale(1); setFitWidth(false); }
  function toggleFitWidth() { setFitWidth(true); setScale(1); }

  function scrollToPage(page: number) {
    const target = pageRefs.current[page];
    if (target && containerRef.current) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // Raccourcis clavier (+ / -)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "+" || e.key === "=") zoomIn();
      if (e.key === "-")                  zoomOut();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Suivre la page actuellement la plus visible avec IntersectionObserver
  useEffect(() => {
    if (numPages === 0 || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Trouve la page avec le plus de visibilité
        let maxRatio = 0;
        let mostVisible = currentPage;
        for (const entry of entries) {
          if (entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            const pageStr = entry.target.getAttribute("data-page");
            if (pageStr) mostVisible = parseInt(pageStr, 10);
          }
        }
        if (maxRatio > 0) setCurrentPage(mostVisible);
      },
      {
        root: containerRef.current,
        threshold: [0.25, 0.5, 0.75],
      }
    );

    // Observer toutes les pages
    Object.values(pageRefs.current).forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numPages]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <svg className="w-12 h-12 text-[hsl(0,84%,65%)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <circle cx={12} cy={12} r={10}/><line x1={12} y1={8} x2={12} y2={12}/><line x1={12} y1={16} x2={12.01} y2={16}/>
        </svg>
        <p className="text-white/80 text-sm">Impossible d&apos;afficher ce PDF : {error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#1a1a1a]">

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-black/40 border-b border-white/10 flex-shrink-0 flex-wrap">
        {/* Indicateur + saut à la page */}
        <div className="flex items-center gap-2">
          <span className="text-white/60 text-sm hidden sm:inline">Page</span>
          <input
            type="number"
            min={1}
            max={numPages || 1}
            value={currentPage}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (!isNaN(v) && v >= 1 && v <= numPages) {
                setCurrentPage(v);
                scrollToPage(v);
              }
            }}
            className="w-14 text-center bg-white/10 text-white text-sm rounded px-1 py-0.5 border border-white/10 focus:border-white/30 outline-none"
          />
          <span className="text-white/50 text-sm">/ {numPages || "…"}</span>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            disabled={!fitWidth && scale <= 0.5}
            className="w-8 h-8 flex items-center justify-center rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
            title="Zoom −"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx={11} cy={11} r={8}/><line x1={21} y1={21} x2={16.65} y2={16.65}/><line x1={8} y1={11} x2={14} y2={11}/>
            </svg>
          </button>
          <span className="text-white/70 text-xs min-w-[3rem] text-center">
            {fitWidth ? "Auto" : `${Math.round(scale * 100)}%`}
          </span>
          <button
            onClick={zoomIn}
            disabled={!fitWidth && scale >= 3}
            className="w-8 h-8 flex items-center justify-center rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
            title="Zoom +"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx={11} cy={11} r={8}/><line x1={21} y1={21} x2={16.65} y2={16.65}/>
              <line x1={11} y1={8} x2={11} y2={14}/><line x1={8} y1={11} x2={14} y2={11}/>
            </svg>
          </button>
          <button
            onClick={toggleFitWidth}
            className={`px-2 h-8 rounded-md text-xs font-semibold transition-colors ${
              fitWidth ? "bg-white/15 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
            title="Ajuster à la largeur"
          >
            Largeur
          </button>
          <button
            onClick={resetZoom}
            className="px-2 h-8 rounded-md text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10"
            title="Zoom 100%"
          >
            100%
          </button>
        </div>
      </div>

      {/* Viewer scroll continu */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-[#2a2a2a]"
        onContextMenu={(e) => e.preventDefault()}
      >
        {loading && (
          <p className="text-white/60 text-sm text-center pt-20">Chargement du PDF…</p>
        )}
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
          className="flex flex-col items-center gap-4 py-6"
        >
          {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
            <div
              key={page}
              ref={(el) => { pageRefs.current[page] = el; }}
              data-page={page}
              className="relative shadow-2xl"
            >
              {/* Numéro de page en overlay */}
              <span className="absolute -top-2 left-2 z-10 bg-black/70 text-white text-[0.65rem] font-semibold px-2 py-0.5 rounded-full backdrop-blur">
                {page}
              </span>
              <Page
                pageNumber={page}
                width={fitWidth ? pageWidth : undefined}
                scale={fitWidth ? undefined : scale}
                renderAnnotationLayer={false}
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}
