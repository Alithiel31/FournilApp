<script lang="ts">
  let { data } = $props();
  const fmt = (v: number) => Math.round(v).toLocaleString('fr-CA');
  const sansPoids = $derived(data.produits.filter((p) => p.poidsPate === null));
</script>

<h1>Poids unitaires</h1>
<div class="table">
  <div class="head"><span>Produit</span><span>Pâte</span><span>Garniture</span></div>
  {#each data.produits.filter((p) => p.poidsPate !== null) as p (p.id)}
    <div class="row">
      <span class="nom">{p.nom}</span>
      <span class="num">{fmt(p.poidsPate ?? 0)} g</span>
      <span class="num garniture" class:vide={!p.garniture}>
        {p.garniture ? `+${fmt(p.garniture)} g` : '—'}
      </span>
    </div>
  {/each}
</div>
{#if sansPoids.length}
  <div class="alerte">
    Sans poids rapproché : {sansPoids.map((p) => p.nom).join(', ')}. Vérifie l'orthographe dans la
    feuille des poids puis réimporte.
  </div>
{/if}

<style>
  h1 {
    font-family: Georgia, serif;
    font-size: 24px;
    margin: 0 0 10px;
  }
  .table {
    background: #fff;
    border: 1px solid #e5dfd2;
    border-radius: 16px;
    overflow: hidden;
  }
  .head,
  .row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    padding: 10px 16px;
    gap: 12px;
  }
  .head {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #8a8271;
    font-weight: 700;
    border-bottom: 1px solid #e5dfd2;
    background: #f7f4ee;
  }
  .row {
    border-bottom: 1px dashed #e5dfd2;
    font-size: 14px;
    align-items: baseline;
  }
  .nom {
    font-weight: 600;
  }
  .num {
    font-family: 'Courier New', monospace;
    font-weight: 700;
  }
  .garniture {
    color: #c4771c;
    min-width: 52px;
    text-align: right;
  }
  .garniture.vide {
    color: #8a8271;
  }
  .alerte {
    margin-top: 12px;
    background: #faedea;
    border: 1px solid #a33224;
    border-radius: 12px;
    padding: 12px;
    font-size: 13px;
    color: #a33224;
  }
</style>
