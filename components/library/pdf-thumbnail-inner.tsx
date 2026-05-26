"use client";

import { Document, Page, pdfjs } from "react-pdf";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

interface Props {
  url: string;
}

export function PdfThumbnailInner({ url }: Props) {
  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden bg-white">
      <Document
        file={url}
        loading={null}
        error={
          <div className="w-full h-full flex items-center justify-center bg-[hsla(0,70%,50%,0.15)]">
            <span className="text-5xl">📄</span>
          </div>
        }
      >
        <Page
          pageNumber={1}
          width={400}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          loading={null}
        />
      </Document>
    </div>
  );
}
