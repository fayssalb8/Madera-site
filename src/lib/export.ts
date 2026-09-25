import type { Lead } from '@/types/crm';

/**
 * Neutralize spreadsheet formula injection (OWASP): cells starting with
 * =, +, -, @, Tab or CR get a leading apostrophe so Excel/Sheets treat them
 * as text instead of executing formulas.
 */
function escapeCSV(val: string): string {
  if (/^[=+\-@\t\r]/.test(val)) {
    return `'${val}`;
  }
  return val;
}

function exportToCSV(data: Record<string, string | number | null>[], filename: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = escapeCSV(String(row[h] ?? ''));
          const str = val.replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportLeadsToCSV(leads: Lead[]) {
  const data = leads.map((l) => ({
    Nom: l.name,
    Téléphone: l.phone,
    Email: l.email || '',
    Wilaya: l.wilaya,
    Matériau: l.material || '',
    Quincaillerie: l.hardware || '',
    Mesures: l.measures || '',
    Estimation_Bas: l.estimate_low ?? '',
    Estimation_Haut: l.estimate_high ?? '',
    Statut: l.status,
    Date: new Date(l.created_at).toLocaleDateString('fr-FR'),
  }));
  exportToCSV(data, 'leads');
}

export function exportToPDF() {
  window.print();
}
