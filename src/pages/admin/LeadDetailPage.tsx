import { type FC, useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Lead, LeadNote, LeadStatus } from '@/types/crm';
import { leadsApi } from '@/lib/api';
import { exportToPDF } from '@/lib/export';
import { statusLabels, statuses } from '@/data/leadStatuses';
import { parseLeadAttachments } from '@/lib/leadAttachments';
import { normalizeToWaNumber } from '@/lib/constants';

export const LeadDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(Boolean(id));
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [error, setError] = useState<string | null>(id ? null : 'Lead introuvable.');
  /** Mutation failures are shown inline — they must not replace the page. */
  const [actionError, setActionError] = useState<string | null>(null);

  // Effect-driven initial load — state updates live in promise callbacks
  // (react-hooks/set-state-in-effect). `loadData` remains for manual retries
  // and post-mutation refreshes.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    leadsApi
      .get(id)
      .then(({ lead, notes }) => {
        if (!cancelled) {
          setLead(lead);
          setNotes(notes);
        }
      })
      .catch((err) => {
        console.error('Failed to load lead detail:', err);
        if (!cancelled) {
          setLead(null);
          setNotes([]);
          setError('Impossible de charger ce lead.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const { lead, notes } = await leadsApi.get(id);
      setLead(lead);
      setNotes(notes);
      setError(null);
      setActionError(null);
    } catch (err) {
      console.error('Failed to load lead detail:', err);
      setLead(null);
      setNotes([]);
      setError('Impossible de charger ce lead.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const addNote = async () => {
    if (!newNote.trim() || !id || isSavingNote) return;
    setIsSavingNote(true);
    setActionError(null);
    try {
      await leadsApi.addNote(id, newNote.trim());
      setNewNote('');
      await loadData();
    } catch (err) {
      console.error('Failed to add lead note:', err);
      setActionError("Impossible d'ajouter la note.");
    } finally {
      setIsSavingNote(false);
    }
  };

  const updateStatus = async (status: LeadStatus) => {
    if (!id || !lead) return;
    const previousStatus = lead.status;
    if (previousStatus === status) return;

    // Optimistic update — revert if the server rejects it.
    setLead({ ...lead, status });
    setActionError(null);
    try {
      await leadsApi.update(id, { status });
    } catch (err) {
      console.error('Failed to update lead status:', err);
      setLead((current) => (current ? { ...current, status: previousStatus } : current));
      setActionError('Impossible de modifier le statut du lead.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl space-y-4" aria-hidden="true">
        <div className="h-8 w-1/3 animate-pulse rounded-lg bg-surface-hover" />
        <div className="h-48 animate-pulse rounded-xl bg-surface-hover" />
        <div className="h-32 animate-pulse rounded-xl bg-surface-hover" />
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-error/30 bg-error/10 p-6 text-center">
        <p className="text-sm font-medium text-error">{error}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void loadData();
          }}
          className="mt-4 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 cursor-pointer"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!lead) return <div className="text-center py-12 text-text-muted">Lead non trouvé</div>;

  const formatEstimate = (l: Lead): string => {
    if (l.estimate_low == null) return 'Non calculée';
    const currency = l.currency ?? 'DZD';
    const low = l.estimate_low.toLocaleString('fr-FR');
    const high = l.estimate_high != null ? ` - ${l.estimate_high.toLocaleString('fr-FR')}` : '';
    return `${low}${high} ${currency}`;
  };

  const details = [
    { label: 'Nom', value: lead.name },
    { label: 'Téléphone', value: lead.phone },
    { label: 'Email', value: lead.email || 'Non renseigné' },
    { label: 'Wilaya', value: lead.wilaya },
    { label: 'Matériau', value: lead.material || 'Non renseigné' },
    { label: 'Quincaillerie', value: lead.hardware || 'Non renseigné' },
    { label: 'Mesures', value: lead.measures || 'Non renseigné' },
    { label: 'Colonne four', value: lead.oven_column || 'Non' },
    { label: 'Lave-vaisselle', value: lead.dishwasher || 'Non' },
    { label: 'Machine à laver', value: lead.washing_machine || 'Non' },
    { label: 'Tiroirs', value: lead.drawers?.toString() || '0' },
    { label: 'Colonnes', value: lead.columns?.toString() || '0' },
    { label: 'Placards muraux', value: lead.wall_cabinets?.toString() || '0' },
    { label: 'Accessoires', value: lead.accessories || 'Aucun' },
    { label: 'Estimation', value: formatEstimate(lead) },
    { label: 'Source', value: lead.source },
    { label: 'Date', value: new Date(lead.created_at).toLocaleString('fr-FR') },
  ];
  const attachments = parseLeadAttachments(lead.attachments);
  const whatsappHref = `https://wa.me/${normalizeToWaNumber(lead.phone) ?? ''}`;

  return (
    <div className="max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <button
            type="button"
            onClick={() => navigate('/admin/leads')}
            className="mb-2 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            ← Retour aux leads
          </button>
          <h1 className="text-2xl font-bold text-text-primary">{lead.name}</h1>
          <p className="text-text-secondary text-sm mt-1">{lead.phone} • {lead.wilaya}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportToPDF}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface text-sm font-medium text-text-secondary hover:text-text-primary hover:border-primary-300 transition-colors cursor-pointer"
          >
            <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            PDF
          </button>
          <label className="sr-only" htmlFor="lead-status">Statut du lead</label>
          <select
            id="lead-status"
            value={lead.status}
            onChange={(e) => void updateStatus(e.target.value as LeadStatus)}
            className="px-4 py-2.5 rounded-xl border border-border bg-surface text-sm font-medium cursor-pointer"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>{statusLabels[s]}</option>
            ))}
          </select>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="mb-4 rounded-xl bg-error/10 px-4 py-3 text-sm text-error">
          {actionError}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Détails du projet</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {details.map((d) => (
              <div key={d.label}>
                <dt className="text-xs text-text-muted uppercase tracking-wider">{d.label}</dt>
                <dd className="text-sm font-medium text-text-primary mt-0.5 whitespace-pre-wrap">{d.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="bg-surface rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Actions rapides</h3>
            <div className="space-y-2">
              <a
                href={`tel:${lead.phone}`}
                className="block w-full text-center py-2.5 rounded-lg bg-primary-50 text-primary-600 text-sm font-medium hover:bg-primary-100 transition-colors cursor-pointer"
              >
                Appeler
              </a>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Contacter ${lead.name} sur WhatsApp`}
                className="block w-full text-center py-2.5 rounded-lg bg-green-50 text-green-600 text-sm font-medium hover:bg-green-100 transition-colors cursor-pointer"
              >
                WhatsApp
              </a>
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="block w-full text-center py-2.5 rounded-lg bg-blue-50 text-blue-600 text-sm font-medium hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  Email
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="mt-6 bg-surface rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Fichiers joints</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 list-none p-0 m-0">
            {attachments.map((attachment, i) => {
              const isVideo = /\.(mp4|webm)$/i.test(attachment.href ?? '');
              const content = attachment.isImage && attachment.href ? (
                <img src={attachment.href} alt={attachment.label} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              ) : isVideo && attachment.href ? (
                <video src={attachment.href} preload="metadata" muted className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-text-muted">
                  <svg aria-hidden="true" className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span className="text-xs px-2 text-center truncate w-full">{attachment.label}</span>
                  {!attachment.isAvailable && <span className="mt-1 text-[10px] text-text-muted">Non disponible</span>}
                </div>
              );

              if (!attachment.href) {
                return (
                  <li
                    key={`${attachment.label}-${i}`}
                    className="relative aspect-square rounded-xl overflow-hidden border border-border bg-surface-hover"
                  >
                    {content}
                  </li>
                );
              }

              return (
                <li key={`${attachment.href}-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-surface-hover focus-within:ring-2 focus-within:ring-primary-500">
                  <a
                    href={attachment.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Ouvrir le fichier ${attachment.label}`}
                    className="group absolute inset-0 block"
                  >
                    {content}
                    <span className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded-lg">
                        Voir
                      </span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Notes */}
      <div className="mt-6 bg-surface rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Notes</h2>

        <form
          className="flex gap-2 mb-4"
          onSubmit={(e) => {
            e.preventDefault();
            void addNote();
          }}
        >
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Ajouter une note..."
            aria-label="Nouvelle note"
            className="flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text-primary outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={!newNote.trim() || isSavingNote}
            className="px-4 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSavingNote ? 'Ajout…' : 'Ajouter'}
          </button>
        </form>

        <div className="space-y-3">
          {notes.length === 0 && (
            <p className="text-sm text-text-muted text-center py-4">Aucune note</p>
          )}
          {notes.map((note) => (
            <div key={note.id} className="bg-surface-hover rounded-lg p-3">
              <p className="text-sm text-text-primary whitespace-pre-wrap">{note.content}</p>
              <p className="text-xs text-text-muted mt-1">
                {new Date(note.created_at).toLocaleString('fr-FR')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
