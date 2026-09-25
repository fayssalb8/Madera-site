import { type FC, useCallback, useEffect, useState } from 'react';
import type { Lead, LeadStatus } from '@/types/crm';
import { Link } from 'react-router-dom';
import { exportLeadsToCSV, exportToPDF } from '@/lib/export';
import { statusLabels, statuses } from '@/data/leadStatuses';
import { leadsApi, type LeadStats } from '@/lib/api';

const SEARCH_DEBOUNCE_MS = 350;

const statusColors: Record<LeadStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-purple-100 text-purple-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
};

/** Mini bar chart of leads per day over the last 14 days. */
const DailyChart: FC<{ daily: Array<{ date: string; count: number }> }> = ({ daily }) => {
  const countByDate = new Map(daily.map((d) => [d.date, d.count]));
  const days = Array.from({ length: 14 }, (_, i) =>
    new Date(Date.now() - (13 - i) * 86_400_000).toISOString().slice(0, 10)
  );
  const maxCount = Math.max(1, ...days.map((d) => countByDate.get(d) ?? 0));

  return (
    <div className="flex items-end gap-1 h-20" role="img" aria-label="Nombre de leads par jour sur les 14 derniers jours">
      {days.map((date) => {
        const count = countByDate.get(date) ?? 0;
        return (
          <div
            key={date}
            title={`${date} : ${count} lead${count > 1 ? 's' : ''}`}
            className="flex-1 rounded-t bg-primary-500/80 hover:bg-primary-600 transition-colors"
            style={{ height: `${Math.max(4, (count / maxCount) * 100)}%` }}
          />
        );
      })}
    </div>
  );
};

/** Ranked list with proportional bars. */
const RankingList: FC<{
  title: string;
  items: Array<{ name: string; count: number }>;
  emptyText: string;
}> = ({ title, items, emptyText }) => {
  const maxCount = Math.max(1, ...items.map((i) => i.count));
  return (
    <div>
      <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-text-muted">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.name}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-text-primary capitalize truncate">{item.name || '—'}</span>
                <span className="text-text-muted">{item.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-hover overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary-500"
                  style={{ width: `${(item.count / maxCount) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const LeadsPage: FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  // Unfiltered snapshot used for the global stat cards.
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<LeadStats | null>(null);

  // Debounce the search input so we don't hammer the API per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // All state updates occur in promise callbacks — keeps the effect free of
  // synchronous setState (react-hooks/set-state-in-effect).
  useEffect(() => {
    let cancelled = false;
    leadsApi
      .list({ status: filterStatus, search })
      .then(({ leads }) => {
        if (!cancelled) setLeads(leads);
      })
      .catch((err) => {
        console.error('Failed to load leads:', err);
        if (!cancelled) {
          setLeads([]);
          setError('Impossible de charger les leads.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filterStatus, search]);

  /** Retry entry point (event handler) — shows the skeleton while refetching. */
  const reloadWithSpinner = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { leads } = await leadsApi.list({ status: filterStatus, search });
      setLeads(leads);
      setError(null);
    } catch (err) {
      console.error('Failed to load leads:', err);
      setLeads([]);
      setError('Impossible de charger les leads.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

  // Global stats need the full dataset — refresh alongside mutations.
  const loadStats = useCallback(async () => {
    try {
      const { leads } = await leadsApi.list({ status: 'all' });
      setAllLeads(leads);
    } catch (err) {
      console.error('Failed to load lead stats:', err);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    leadsApi
      .list({ status: 'all' })
      .then(({ leads }) => {
        if (!cancelled) setAllLeads(leads);
      })
      .catch((err) => {
        console.error('Failed to load lead stats:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Refresh the analytics panel (server-aggregated, cheap). */
  const loadAnalytics = useCallback(async () => {
    try {
      setAnalytics(await leadsApi.stats());
    } catch (err) {
      console.error('Failed to load lead analytics:', err);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    leadsApi
      .stats()
      .then((s) => {
        if (!cancelled) setAnalytics(s);
      })
      .catch((err) => {
        console.error('Failed to load lead analytics:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateStatus = async (id: string, status: LeadStatus) => {
    if (pendingId) return;
    const previous = leads;
    const previousAll = allLeads;

    // Optimistic update — revert if the server rejects it.
    setLeads((current) =>
      current.map((lead) => (lead.id === id ? { ...lead, status } : lead))
    );
    setAllLeads((current) =>
      current.map((lead) => (lead.id === id ? { ...lead, status } : lead))
    );
    setPendingId(id);
    setError(null);

    try {
      await leadsApi.update(id, { status });
      void loadStats();
      void loadAnalytics();
    } catch (err) {
      console.error('Failed to update lead status:', err);
      setLeads(previous);
      setAllLeads(previousAll);
      setError("Impossible de modifier le statut du lead.");
    } finally {
      setPendingId(null);
    }
  };

  const stats = {
    total: allLeads.length,
    new: allLeads.filter((l) => l.status === 'new').length,
    contacted: allLeads.filter((l) => l.status === 'contacted').length,
    won: allLeads.filter((l) => l.status === 'won').length,
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Leads</h1>
          <p className="text-text-secondary text-sm mt-1">Gérez vos prospects et demandes de devis</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => exportLeadsToCSV(leads)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface text-sm font-medium text-text-secondary hover:text-text-primary hover:border-primary-300 transition-colors cursor-pointer"
          >
            <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CSV
          </button>
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
        </div>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-text-primary' },
          { label: 'Nouveaux', value: stats.new, color: 'text-blue-600' },
          { label: 'Contactés', value: stats.contacted, color: 'text-yellow-600' },
          { label: 'Gagnés', value: stats.won, color: 'text-green-600' },
        ].map((s) => (
          <div key={s.label} className="bg-surface rounded-xl border border-border p-4">
            <p className="text-xs text-text-muted uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Analytics dashboard */}
      {analytics && (
        <div className="bg-surface rounded-xl border border-border p-5 mb-6">
          <div className="grid grid-cols-3 gap-4 mb-5">
            {[
              { label: '7 derniers jours', value: analytics.last7Days },
              { label: '30 derniers jours', value: analytics.last30Days },
              { label: 'Taux de conversion', value: `${analytics.conversionRate}%` },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-xs text-text-muted uppercase tracking-wider">{s.label}</p>
                <p className="text-xl font-bold text-text-primary mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily leads — last 14 days */}
            <div className="lg:col-span-1">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Leads par jour (14 j)</p>
              <DailyChart daily={analytics.daily} />
            </div>

            <RankingList title="Top wilayas" items={analytics.topWilayas} emptyText="Aucun lead pour le moment." />
            <RankingList title="Matériaux demandés" items={analytics.topMaterials} emptyText="Aucun matériau renseigné." />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="search"
          placeholder="Rechercher (nom, téléphone, wilaya...)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="Rechercher un lead"
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text-primary outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-500"
        />
        <div className="flex gap-2 flex-wrap" role="group" aria-label="Filtrer par statut">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            aria-pressed={filterStatus === 'all'}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              filterStatus === 'all' ? 'bg-primary-50 text-primary-600' : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            Tous
          </button>
          {statuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              aria-pressed={filterStatus === s}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                filterStatus === s ? 'bg-primary-50 text-primary-600' : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {statusLabels[s]}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-error/30 bg-error/10 p-6 text-center mb-6">
          <p className="text-sm font-medium text-error">{error}</p>
          <button
            type="button"
            onClick={() => void reloadWithSpinner()}
            className="mt-4 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-2" aria-hidden="true">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-hover" />
          ))}
        </div>
      ) : !error && leads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
          <p className="text-sm font-medium text-text-primary mb-1">Aucun lead trouvé</p>
          <p className="text-xs text-text-muted">
            {search || filterStatus !== 'all'
              ? 'Essayez de modifier votre recherche ou vos filtres.'
              : 'Les nouvelles demandes de devis apparaîtront ici.'}
          </p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-hover text-text-muted text-xs uppercase tracking-wider">
                <tr>
                  <th scope="col" className="text-left px-4 py-3">Nom</th>
                  <th scope="col" className="text-left px-4 py-3">Téléphone</th>
                  <th scope="col" className="text-left px-4 py-3">Wilaya</th>
                  <th scope="col" className="text-left px-4 py-3">Matériau</th>
                  <th scope="col" className="text-left px-4 py-3">Estimation</th>
                  <th scope="col" className="text-left px-4 py-3">Statut</th>
                  <th scope="col" className="text-left px-4 py-3">Date</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leads.map((lead) => (
                  <tr key={lead.id} className={`transition-colors ${pendingId === lead.id ? 'opacity-60' : 'hover:bg-surface-hover/50'}`}>
                    <td className="px-4 py-3 font-medium text-text-primary">{lead.name}</td>
                    <td className="px-4 py-3 text-text-secondary">
                      <a href={`tel:${lead.phone}`} className="hover:text-primary-500">{lead.phone}</a>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{lead.wilaya}</td>
                    <td className="px-4 py-3 text-text-secondary capitalize">{lead.material || '-'}</td>
                    <td className="px-4 py-3 text-text-secondary">
                      {lead.estimate_low != null && lead.currency
                        ? `${lead.estimate_low.toLocaleString('fr-FR')} - ${lead.estimate_high?.toLocaleString('fr-FR')} ${lead.currency}`
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <label className="sr-only" htmlFor={`status-${lead.id}`}>Statut de {lead.name}</label>
                      <select
                        id={`status-${lead.id}`}
                        value={lead.status}
                        disabled={pendingId === lead.id}
                        onChange={(e) => void updateStatus(lead.id, e.target.value as LeadStatus)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer disabled:cursor-wait ${statusColors[lead.status]}`}
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>{statusLabels[s]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs">
                      {new Date(lead.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/leads/${lead.id}`}
                        className="text-primary-500 hover:text-primary-600 text-xs font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-primary-500 rounded"
                      >
                        Détails →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-border">
            {leads.map((lead) => (
              <div key={lead.id} className={`p-4 ${pendingId === lead.id ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-text-primary">{lead.name}</p>
                    <p className="text-sm text-text-secondary">{lead.phone}</p>
                  </div>
                  <label className="sr-only" htmlFor={`status-mobile-${lead.id}`}>Statut de {lead.name}</label>
                  <select
                    id={`status-mobile-${lead.id}`}
                    value={lead.status}
                    disabled={pendingId === lead.id}
                    onChange={(e) => void updateStatus(lead.id, e.target.value as LeadStatus)}
                    className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer disabled:cursor-wait ${statusColors[lead.status]}`}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>{statusLabels[s]}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>{lead.wilaya} {lead.material ? `• ${lead.material}` : ''}</span>
                  <Link to={`/admin/leads/${lead.id}`} className="text-primary-500 font-medium cursor-pointer">
                    Détails →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
