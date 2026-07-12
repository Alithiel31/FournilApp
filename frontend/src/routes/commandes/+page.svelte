<script lang="ts">
  import { enhance } from '$app/forms';
  let { data } = $props();
  let jour = $state(0);
  const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const qteDe = (p: { commandes: { jour: number; quantite: number }[] }) =>
    p.commandes.find((c) => c.jour === jour)?.quantite ?? 0;
</script>

<h1>Commandes</h1>
<div class="jours">
  {#each JOURS as j, i}
    <button class:active={i === jour} onclick={() => (jour = i)}>{j}</button>
  {/each}
</div>

{#each data.pates as pate}
  <div class="section">Pâte {pate.nom}</div>
  {#each pate.produits as p}
    <form method="POST" action="?/quantite" use:enhance class="produit">
      <input type="hidden" name="produitId" value={p.id} />
      <input type="hidden" name="jour" value={jour} />
      <span class="nom">{p.nom}</span>
      <input class="qte" type="number" name="quantite" value={qteDe(p)} min="0" />
      <button class="ok" type="submit">✓</button>
    </form>
  {/each}
{/each}

<style>
  h1 { font-family: Georgia, serif; font-size: 24px; margin: 0 0 10px; }
  .jours { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; margin-bottom: 16px; }
  .jours button {
    padding: 9px 0; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer;
    border: 1px solid #e5dfd2; background: #fff; color: #8a8271;
  }
  .jours button.active { background: #c4771c; border-color: #c4771c; color: #fff; }
  .section {
    font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;
    color: #8a8271; font-weight: 700; margin: 14px 0 6px 4px;
  }
  .produit {
    display: flex; align-items: center; gap: 10px;
    background: #fff; border: 1px solid #e5dfd2; border-radius: 14px;
    padding: 10px 12px; margin-bottom: 7px;
  }
  .nom { flex: 1; font-weight: 700; font-size: 14px; }
  .qte {
    width: 60px; text-align: center; font-size: 17px; font-weight: 700;
    font-family: 'Courier New', monospace; border: 1.5px solid #c4771c;
    border-radius: 10px; padding: 7px 2px; background: #fbf3e6;
  }
  .ok {
    width: 38px; height: 38px; border-radius: 12px; cursor: pointer;
    border: 1px solid #e5dfd2; background: #f7f4ee; font-weight: 700;
  }
</style>
