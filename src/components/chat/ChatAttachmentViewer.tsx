'use client';

import { useEffect, useState } from 'react';
import { Download, Eye, FileText, Image as ImageIcon, Loader2, X } from 'lucide-react';

type ChatAttachmentViewerProps = {
  url: string;
  name?: string;
  mimeType?: string;
  size?: number;
  mine?: boolean;
  thumbnail?: boolean;
};

function isImage(mimeType?: string, name?: string) {
  return Boolean((mimeType || '').toLowerCase().startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(name || ''));
}
function isPdf(mimeType?: string, name?: string) {
  return (mimeType || '').toLowerCase() === 'application/pdf' || /\.pdf$/i.test(name || '');
}
function isOfficeDocument(mimeType?: string, name?: string) {
  return /\.(docx?|xlsx?|pptx?)$/i.test(name || '') ||
    /wordprocessingml|msword|spreadsheetml|presentationml|excel|powerpoint/i.test(mimeType || '');
}
function isTextDocument(mimeType?: string, name?: string) {
  return (mimeType || '').toLowerCase().startsWith('text/') || /\.(txt|md|csv|json|log)$/i.test(name || '');
}
function attachmentDownloadUrl(url: string) {
  // Cloudinary's fl_attachment response header triggers a real download instead of opening the asset.
  if (/res\.cloudinary\.com\//i.test(url) && url.includes('/upload/') && !url.includes('/fl_attachment/')) {
    return url.replace('/upload/', '/upload/fl_attachment/');
  }
  return url;
}

export default function ChatAttachmentViewer({ url, name, mimeType, size, mine = false, thumbnail = false }: ChatAttachmentViewerProps) {
  const [open, setOpen] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textError, setTextError] = useState(false);
  const [loadingText, setLoadingText] = useState(false);
  const image = isImage(mimeType, name);
  const pdf = isPdf(mimeType, name);
  const officeDocument = isOfficeDocument(mimeType, name);
  const textDocument = isTextDocument(mimeType, name);
  const officePreviewUrl = officeDocument ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}` : '';

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !textDocument) return;
    let cancelled = false;
    setLoadingText(true);
    setTextError(false);
    fetch(url)
      .then((response) => { if (!response.ok) throw new Error('Unable to read document'); return response.text(); })
      .then((content) => { if (!cancelled) setTextContent(content); })
      .catch(() => { if (!cancelled) setTextError(true); })
      .finally(() => { if (!cancelled) setLoadingText(false); });
    return () => { cancelled = true; };
  }, [open, textDocument, url]);

  const sizeLabel = typeof size === 'number' && size > 0
    ? size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`
    : '';
  const downloadUrl = attachmentDownloadUrl(url);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Preview ${name || (image ? 'image' : 'attachment')}`}
        className={`${thumbnail && image ? 'block aspect-square w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-[#d8ebe6] bg-[#f4faf8]' : 'mt-2 block w-full max-w-[min(78vw,360px)] overflow-hidden rounded-xl border sm:max-w-[360px]'} text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1b7b68] ${mine ? 'border-white/20 bg-white/10' : 'border-[#d8ebe6] bg-[#f4faf8]'}`}
      >
        {image ? (
          <div className={`relative flex items-center justify-center overflow-hidden bg-[#e8f4f0] ${thumbnail ? 'h-full w-full' : 'max-h-[min(52vh,360px)] min-h-24'}`}>
            <img src={url} alt={name || 'Image attachment'} loading="lazy" className={`block w-full ${thumbnail ? 'h-full object-cover' : 'max-h-[min(52vh,360px)] object-contain'}`} />
            <span className="absolute inset-0 flex items-center justify-center bg-[#0b5145]/0 transition-colors hover:bg-[#0b5145]/15">
              <span className={`flex items-center justify-center rounded-full border border-white bg-[#1b7b68]/95 text-white shadow-lg ${thumbnail ? 'h-8 w-8' : 'h-12 w-12'}`}><Eye className={thumbnail ? 'h-4 w-4' : 'h-5 w-5'} /></span>
            </span>
          </div>
        ) : (
          <span className="flex min-w-0 items-center gap-3 px-3 py-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${mine ? 'bg-white/15 text-white' : 'bg-[#dcefe9] text-[#1b7b68]'}`}>
              {pdf || officeDocument || textDocument ? <FileText className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block break-all text-xs font-semibold">{name || 'Attachment'}</span>
              <span className={`mt-0.5 block text-[10px] ${mine ? 'text-white/75' : 'text-slate-500'}`}>{sizeLabel ? `${sizeLabel} · ` : ''}Tap to preview</span>
            </span>
            <Eye className="h-4 w-4 shrink-0 opacity-75" />
          </span>
        )}
        {image && !thumbnail && <span className={`block truncate px-2 py-1 text-[10px] ${mine ? 'bg-[#0b5145]/50 text-white' : 'bg-[#e1f1ec] text-[#14594e]'}`}>{name || 'Image'}</span>}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/25 p-2 backdrop-blur-sm sm:p-5"
          role="dialog" aria-modal="true" aria-label={`Preview ${name || 'attachment'}`}
          onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <section className="relative flex max-h-[96dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[93dvh]">
            <header className="flex min-w-0 items-center gap-3 border-b border-slate-200 bg-white px-3 py-3 text-slate-800 sm:px-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#1b7b68]"><FileText className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold sm:text-sm">{name || (image ? 'Image preview' : 'Document preview')}</span>
                <span className="mt-0.5 block text-[10px] text-slate-500">MedXVerse secure media viewer{sizeLabel ? ` · ${sizeLabel}` : ''}</span>
              </span>
              <a href={downloadUrl} download={name || (image ? 'medxverse-image' : 'medxverse-attachment')} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1b7b68] sm:px-3">
                <Download className="h-4 w-4" /><span className="hidden sm:inline">Download</span>
              </a>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close preview" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1b7b68]"><X className="h-5 w-5" /></button>
            </header>

            <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-2 sm:p-6">
              {image ? (
                <div className="flex min-h-full items-center justify-center rounded-xl border border-[#d3e5dd] bg-white p-2 shadow-sm sm:p-5">
                  <img src={url} alt={name || 'Image attachment'} className="max-h-[calc(96dvh-115px)] max-w-full object-contain sm:max-h-[calc(93dvh-145px)]" />
                </div>
              ) : pdf ? (
                <div className="mx-auto min-h-[70dvh] max-w-5xl overflow-hidden rounded-xl border border-[#d2e3dc] bg-white shadow-md">
                  <div className="flex items-center gap-2 border-b border-[#e0ece7] bg-white px-4 py-2.5 text-xs font-semibold text-[#1b7b68]"><FileText className="h-4 w-4" /> PDF document preview</div>
                  <iframe title={name || 'PDF preview'} src={url} className="h-[78dvh] w-full bg-white sm:h-[80dvh]" />
                </div>
              ) : officeDocument ? (
                <div className="mx-auto min-h-[70dvh] max-w-5xl overflow-hidden rounded-xl border border-[#cfdfd8] bg-white shadow-md">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#d8e8e1] bg-white px-4 py-3 text-xs text-slate-600">
                    <span className="font-bold text-[#1b7b68]">MedXVerse Docs</span><span className="h-4 w-px bg-slate-200" /><span className="font-semibold">{name || 'Office document'}</span><span className="ml-auto rounded-md bg-[#e8f4f0] px-2 py-1 text-[10px] font-semibold text-[#1b7b68]">Document preview</span>
                  </div>
                  <iframe title={name || 'Office document preview'} src={officePreviewUrl} className="h-[78dvh] w-full bg-white sm:h-[80dvh]" />
                </div>
              ) : textDocument ? (
                <div className="mx-auto min-h-[70dvh] max-w-4xl rounded-xl border border-[#d1e1da] bg-white shadow-md">
                  <div className="flex items-center gap-2 border-b border-[#e0ece7] px-6 py-4 text-xs font-semibold text-[#1b7b68]"><FileText className="h-4 w-4" /> Document · {name || 'Text file'}</div>
                  <div className="min-h-[60dvh] px-5 py-8 sm:px-12 sm:py-12">
                    {loadingText ? <div className="flex items-center justify-center gap-2 py-20 text-sm text-[#1b7b68]"><Loader2 className="h-5 w-5 animate-spin" />Opening document…</div> : textError ? <p className="py-12 text-center text-sm text-slate-500">This document could not be rendered in the preview. Use Download to save a copy.</p> : <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-700">{textContent || ''}</pre>}
                  </div>
                </div>
              ) : (
                <div className="mx-auto flex min-h-[55dvh] max-w-md flex-col items-center justify-center rounded-xl border border-[#d2e5dd] bg-white px-6 py-12 text-center shadow-sm">
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e2f2ec] text-[#1b7b68]"><FileText className="h-8 w-8" /></span>
                  <p className="mt-4 break-words text-sm font-semibold text-slate-800">{name || 'This attachment'}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">Preview is not available for this file type. You can download it using the button above.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
