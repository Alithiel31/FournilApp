<script lang="ts">
  let { data } = $props();
  let active = $state(0);
  const fmt = (v: number) => Math.round(v).toLocaleString('fr-CA');
</script>

<h1>Recettes</h1>
<div class="pills">
  {#each data.recettes as r, i (r.id)}
    <button class:active={i === active} onclick={() => (active = i)}>{r.pate.nom}</button>
  {/each}
</div>

{#if data.recettes[active]}
  {@const r = data.recettes[active]}
  <div class="carte">
    <div class="entete">
      <span class="titre">{r.pate.nom}</span>
      <span class="meta">base {fmt(r.base)} g · 🔒 lecture seule</span>
    </div>
    <div class="corps">
      {#each r.lignes as l (l.ingredient)}
        <div class="ligne">
          <span>{l.ingredient}</span>
          <span class="num">{fmt(l.quantite)} g</span>
        </div>
      {/each}
    </div>
  </div>
  <p class="note">Pour modifier une recette : corrige le classeur Excel puis réimporte-le.</p>
{/if}

<style>
  h1 {
    font-family: Georgia, serif;
    font-size: 24px;
    margin: 0 0 10px;
  }
  .pills {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }
  .pills button {
    padding: 7px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid #e5dfd2;
    background: #fff;
    color: #8a8271;
  }
  .pills button.active {
    border-color: #c4771c;
    background: #fbf3e6;
    color: #26221c;
  }
  .carte {
    background: #fff;
    border: 1px solid #e5dfd2;
    border-radius: 16px;
    overflow: hidden;
  }
  .entete {
    padding: 13px 16px;
    border-bottom: 1px solid #e5dfd2;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .titre {
    font-family: Georgia, serif;
    font-size: 19px;
    font-weight: 700;
  }
  .meta {
    font-size: 12px;
    color: #8a8271;
  }
  .corps {
    padding: 6px 16px 14px;
  }
  .ligne {
    display: flex;
    justify-content: space-between;
    padding: 9px 0;
    border-bottom: 1px dashed #e5dfd2;
    font-size: 14px;
    font-weight: 600;
  }
  .num {
    font-family: 'Courier New', monospace;
    font-weight: 700;
  }
  .note {
    font-size: 12px;
    color: #8a8271;
    text-align: center;
    margin-top: 12px;
  }
</style>
