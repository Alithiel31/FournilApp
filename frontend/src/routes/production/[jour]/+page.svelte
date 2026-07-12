<script lang="ts">
  let { data } = $props();

  // état local de la checklist de pesée (Svelte 5 runes)
  let peses = $state<Record<string, boolean>>({});
  const toggle = (k: string) => (peses[k] = !peses[k]);
  const fmt = (v: number) => Math.round(v).toLocaleString('fr-CA');
</script>

<header>
  <h1>Production</h1>
  <div class="jours">
    {#each data.jours as j (j)}
      <a href="/production/{j}" class:active={j === data.jour}>{j.slice(0, 3)}</a>
    {/each}
  </div>
</header>

{#each data.fiches as fiche (fiche.pate)}
  <section class="carte">
    <div class="entete">
      <span class="pate">Pâte {fiche.pate}</span>
      <span class="total">
        {fmt(fiche.totalPate)} g{#if fiche.coef !== null}&nbsp;· coef {fiche.coef.toFixed(2)}{/if}
      </span>
    </div>
    <div class="detail">
      {#each fiche.detail as d (d.nom)}
        <div class="ligne-detail">
          <span>{d.quantite} × {d.nom}</span>
          <span class="num">{fmt(d.totalPate)} g</span>
        </div>
      {/each}
    </div>
    {#if fiche.pesee.length}
      <div class="pesee">
        <div class="titre-pesee">Pesée du jour</div>
        {#each fiche.pesee as l (l.ingredient)}
          {@const k = `${data.jour}-${fiche.pate}-${l.ingredient}`}
          <button class="item" class:fait={peses[k]} onclick={() => toggle(k)}>
            <span class="case">{peses[k] ? '✓' : ''}</span>
            <span class="nom">{l.ingredient}</span>
            <span class="grammes">{fmt(l.grammes)} g</span>
          </button>
        {/each}
      </div>
    {/if}
  </section>
{:else}
  <p class="vide">Aucune commande pour {data.jour}.</p>
{/each}

<style>
  h1 { font-family: Georgia, serif; font-size: 24px; margin: 0 0 10px; }
  .jours { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; margin-bottom: 16px; }
  .jours a {
    padding: 9px 0; border-radius: 10px; font-size: 12px; font-weight: 700;
    text-align: center; text-decoration: none;
    border: 1px solid #e5dfd2; background: #fff; color: #8a8271;
  }
  .jours a.active { background: #c4771c; border-color: #c4771c; color: #fff; }
  .carte {
    background: #fff; border: 1px solid #e5dfd2; border-radius: 16px;
    margin-bottom: 14px; overflow: hidden;
  }
  .entete {
    padding: 12px 16px; display: flex; justify-content: space-between;
    align-items: baseline; border-bottom: 1px solid #e5dfd2; background: #edf2f8;
  }
  .pate { font-family: Georgia, serif; font-size: 17px; font-weight: 700; }
  .total, .num, .grammes { font-family: 'Courier New', monospace; font-weight: 700; }
  .total { font-size: 14px; color: #274c77; }
  .detail { padding: 8px 16px; border-bottom: 1px solid #e5dfd2; }
  .ligne-detail {
    display: flex; justify-content: space-between;
    font-size: 13px; padding: 3px 0; color: #8a8271;
  }
  .pesee { padding: 10px 16px 14px; }
  .titre-pesee {
    font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px;
    color: #8a8271; margin-bottom: 8px; font-weight: 700;
  }
  .item {
    display: flex; align-items: center; gap: 10px; width: 100%;
    padding: 9px 10px; margin-bottom: 5px; border-radius: 10px;
    border: 1px solid #e5dfd2; background: #f7f4ee; cursor: pointer; text-align: left;
  }
  .item.fait { border-color: #4a7c59; background: #edf5ef; }
  .case {
    width: 20px; height: 20px; border-radius: 6px; flex-shrink: 0;
    border: 1.5px solid #8a8271; color: #fff; font-size: 13px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .fait .case { background: #4a7c59; border-color: #4a7c59; }
  .nom { flex: 1; font-size: 14px; font-weight: 600; }
  .fait .nom { text-decoration: line-through; color: #8a8271; }
  .grammes { font-size: 16px; color: #274c77; }
  .fait .grammes { color: #8a8271; }
  .vide { text-align: center; color: #8a8271; margin-top: 30px; }
</style>
