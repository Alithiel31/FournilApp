import { fail } from '@sveltejs/kit';
import { api, API_BASE } from '$lib/api';
import type { Actions, PageServerLoad } from './$types';

interface ImportRapport {
  id: number;
  fileName: string;
  importedAt: string;
  rapport: {
    ok?: string[];
    warn?: string[];
    validation?: { evaluated: number; matches: number };
  };
}

export const load: PageServerLoad = async () => {
  let imports: ImportRapport[] = [];
  try {
    imports = await api<ImportRapport[]>('/api/imports');
  } catch {
    // historique indisponible : pas bloquant pour la page
  }
  return { imports };
};

export const actions: Actions = {
  default: async ({ request }) => {
    const form = await request.formData();
    const file = form.get('file');

    if (!(file instanceof File) || !file.size) {
      return fail(400, { error: "Choisis un fichier .xlsx avant d'importer." });
    }
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      return fail(400, { error: 'Le fichier doit être un classeur .xlsx.' });
    }

    const upstream = new FormData();
    upstream.append('file', file, file.name);

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/import`, { method: 'POST', body: upstream });
    } catch {
      return fail(502, { error: 'API indisponible.' });
    }

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      return fail(res.status, {
        error: json?.error ?? `Échec de l'import (${res.status}).`,
        validation: json?.validation,
      });
    }

    return {
      success: true as const,
      importId: json.importId,
      report: json.report as { ok: string[]; warn: string[] },
      validation: json.validation as { evaluated: number; matches: number },
    };
  },
};
