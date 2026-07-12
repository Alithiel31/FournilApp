import { api } from '$lib/api';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => ({
  pates: await api<any[]>('/api/commandes')
});

export const actions: Actions = {
  quantite: async ({ request }) => {
    const data = await request.formData();
    try {
      await api('/api/commandes', {
        method: 'PUT',
        body: JSON.stringify({
          produitId: Number(data.get('produitId')),
          jour: Number(data.get('jour')),
          quantite: Math.max(0, Number(data.get('quantite')) || 0)
        })
      });
      return { ok: true };
    } catch {
      return fail(502, { error: 'API indisponible' });
    }
  }
};
