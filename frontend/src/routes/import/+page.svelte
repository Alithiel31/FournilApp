<script lang="ts">
  import { enhance } from '$app/forms';
  let { data, form } = $props();

  let uploading = $state(false);
  let analyzing = $state(false);
  let resetting = $state(false);
  let fileName = $state('');
  let commandesSheet = $state('');
  let poidsSheet = $state('');
  let showReset = $state(false);
  let confirmText = $state('');

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' });

  const pct = (v?: { evaluated: number; matches: number }) =>
    v && v.evaluated ? Math.round((v.matches / v.evaluated) * 100) : 100;

  const roleLabel: Record<string, string> = {
    commandes: 'Commandes',
    poids: 'Poids',
    recette: 'Recette',
    autre: 'Autre',
  };
  const confOrder: Record<string, number> = { haute: 0, moyenne: 1, basse: 2 };

  // Préremplit les deux sélecteurs avec la meilleure proposition de l'IA
  // dès qu'une classification arrive.
  $effect(() => {
    const sheets = form?.classification;
    if (!sheets) return;
    const bestFor = (role: string) =>
      [...sheets]
        .filter((s) => s.role === role)
        .sort((a, b) => confOrder[a.confidence] - confOrder[b.confidence])[0]?.name ?? '';
    commandesSheet = bestFor('commandes');
    poidsSheet = bestFor('poids');
  });

  // Repasse la zone de danger en état replié une fois la purge confirmée.
  $effect(() => {
    if (form?.resetDone) {
      showReset = false;
      confirmText = '';
    }
  });
</script>

<h1>Import</h1>
<p class="intro">
  Injecte le classeur Excel (commandes, recettes, poids). Chaque import remplace entièrement
  le référentiel.
</p>

<form
  method="POST"
  enctype="multipart/form-data"
  use:enhance={({ action }) => {
    const isAnalyze = action.search.includes('/analyze');
    if (isAnalyze) analyzing = true;
    else uploading = true;
    return async ({ update }) => {
      await update();
      analyzing = false;
      uploading = false;
    };
  }}
>
  <label class="dropzone" class:has-file={!!fileName}>
    <input
      type="file"
      name="file"
      accept=".xlsx"
      required
      onchange={(e) => (fileName = e.currentTarget.files?.[0]?.name ?? '')}
    />
    <span class="icon">📄</span>
    <span class="label">{fileName || 'Choisir un classeur .xlsx'}</span>
  </label>

  {#if form?.classification}
    <div class="classification">
      <p class="classification-intro">
        Proposition de l'IA — vérifie et corrige si besoin avant de confirmer.
      </p>
      <label class="champ">
        Feuille des commandes
        <select name="commandesSheet" bind:value={commandesSheet}>
          {#each form.classification as s (s.name)}
            <option value={s.name}>{s.name} — {roleLabel[s.role]} ({s.confidence})</option>
          {/each}
        </select>
      </label>
      <label class="champ">
        Feuille des poids
        <select name="poidsSheet" bind:value={poidsSheet}>
          <option value="">— aucune —</option>
          {#each form.classification as s (s.name)}
            <option value={s.name}>{s.name} — {roleLabel[s.role]} ({s.confidence})</option>
          {/each}
        </select>
      </label>
      <ul class="classification-detail">
        {#each form.classification as s (s.name)}
          <li>
            <strong>{s.name}</strong> → {roleLabel[s.role]} ({s.confidence}){#if s.notes}
              — {s.notes}{/if}
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <div class="actions">
    <button
      class="submit"
      type="submit"
      formaction="?/import"
      disabled={uploading || analyzing}
    >
      {uploading
        ? 'Import en cours…'
        : form?.classification
          ? 'Confirmer et importer'
          : 'Importer'}
    </button>
    {#if form?.needsAiHelp}
      <button class="ai" type="submit" formaction="?/analyze" disabled={uploading || analyzing}>
        {analyzing ? 'Analyse en cours…' : "Essayer l'analyse IA"}
      </button>
    {/if}
  </div>
</form>

{#if form?.error}
  <div class="banner erreur">
    <strong>Échec de l'import</strong>
    <p>{form.error}</p>
    {#if form.validation}
      <p class="detail">
        Moteur : {form.validation.matches}/{form.validation.evaluated} formules reproduites.
      </p>
    {/if}
  </div>
{/if}

{#if form?.success}
  <div class="banner succes">
    <strong>Import réussi</strong>
    {#if form.validation}
      <p class="detail">
        Validation : {form.validation.matches}/{form.validation.evaluated} formules reproduites
        ({pct(form.validation)}%)
      </p>
    {/if}
    {#if form.report?.ok?.length}
      <ul class="ok">
        {#each form.report.ok as line (line)}<li>{line}</li>{/each}
      </ul>
    {/if}
    {#if form.report?.warn?.length}
      <ul class="warn">
        {#each form.report.warn as line (line)}<li>{line}</li>{/each}
      </ul>
    {/if}
  </div>
{/if}

<h2>Historique</h2>
{#if data.imports.length}
  <div class="historique">
    {#each data.imports as imp (imp.id)}
      <div class="ligne">
        <div class="fichier">
          <span class="nom">{imp.fileName}</span>
          <span class="date">
            {fmtDate(imp.importedAt)}{imp.importedBy ? ` · ${imp.importedBy.nom}` : ''}
          </span>
        </div>
        <div class="stats">
          {#if imp.rapport?.warn?.length}
            <span class="badge warn">
              {imp.rapport.warn.length} avertissement{imp.rapport.warn.length > 1 ? 's' : ''}
            </span>
          {:else}
            <span class="badge ok">OK</span>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{:else}
  <p class="vide">Aucun import pour l'instant.</p>
{/if}

<div class="danger-zone">
  <button type="button" class="danger-toggle" onclick={() => (showReset = !showReset)}>
    {showReset ? '▾' : '▸'} Zone de danger
  </button>

  {#if showReset}
    <div class="danger-body">
      <p>
        Vide définitivement les pâtes, recettes, produits et commandes de la base. L'historique
        des imports et les comptes utilisateurs ne sont pas touchés. Cette action est
        irréversible.
      </p>
      <form
        method="POST"
        action="?/resetData"
        use:enhance={() => {
          resetting = true;
          return async ({ update }) => {
            await update();
            resetting = false;
          };
        }}
      >
        <label class="champ">
          Tape <strong>SUPPRIMER</strong> pour confirmer
          <input type="text" name="confirm" bind:value={confirmText} autocomplete="off" />
        </label>
        <button
          type="submit"
          class="danger-submit"
          disabled={confirmText !== 'SUPPRIMER' || resetting}
        >
          {resetting ? 'Purge en cours…' : 'Vider la base de données'}
        </button>
      </form>

      {#if form?.resetError}
        <p class="danger-error">{form.resetError}</p>
      {/if}
      {#if form?.resetDone}
        <p class="danger-success">
          Base vidée : {form.deleted.pates} pâtes, {form.deleted.recettes} recettes,
          {form.deleted.produits} produits, {form.deleted.commandes} commandes supprimés.
        </p>
      {/if}
    </div>
  {/if}
</div>

<style>
  h1 { font-family: Georgia, serif; font-size: 24px; margin: 0 0 6px; }
  h2 { font-family: Georgia, serif; font-size: 18px; margin: 22px 0 10px; }
  .intro { font-size: 13px; color: #8a8271; margin: 0 0 16px; line-height: 1.4; }

  form { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
  .dropzone {
    position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px;
    padding: 28px 16px; border: 2px dashed #e5dfd2; border-radius: 16px; background: #fff;
    cursor: pointer; text-align: center;
  }
  .dropzone.has-file { border-color: #c4771c; background: #fbf3e6; }
  .dropzone input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .dropzone .icon { font-size: 28px; }
  .dropzone .label { font-size: 13px; font-weight: 600; color: #8a8271; }
  .dropzone.has-file .label { color: #c4771c; }

  .actions { display: flex; flex-direction: column; gap: 8px; }
  .submit, .ai {
    padding: 12px; border-radius: 12px; border: none; font-weight: 700; font-size: 15px;
    cursor: pointer;
  }
  .submit { background: #c4771c; color: #fff; }
  .ai { background: #fff; color: #c4771c; border: 1px solid #c4771c; }
  .submit:disabled, .ai:disabled { opacity: 0.6; cursor: default; }

  .classification {
    background: #fbf3e6; border: 1px solid #e9c68f; border-radius: 14px; padding: 12px 14px;
    display: flex; flex-direction: column; gap: 10px; font-size: 13px;
  }
  .classification-intro { margin: 0; color: #8a5a1c; font-weight: 600; }
  .champ { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #8a8271; }
  .champ select, .champ input { padding: 8px; border-radius: 8px; border: 1px solid #e5dfd2; font-size: 13px; }
  .classification-detail { margin: 0; padding-left: 18px; color: #8a8271; }
  .classification-detail li { margin-bottom: 2px; }

  .banner { border-radius: 14px; padding: 12px 14px; margin-bottom: 18px; font-size: 13px; }
  .banner strong { display: block; font-size: 14px; margin-bottom: 4px; }
  .banner p { margin: 0; }
  .banner .detail { margin-top: 4px; }
  .banner.erreur { background: #faedea; border: 1px solid #a33224; color: #a33224; }
  .banner.succes { background: #edf5ef; border: 1px solid #4a7c59; color: #2f5a3d; }
  .banner ul { margin: 6px 0 0; padding-left: 18px; }
  .banner ul.warn li { color: #a3691f; }

  .historique { background: #fff; border: 1px solid #e5dfd2; border-radius: 16px; overflow: hidden; }
  .ligne {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 16px; border-bottom: 1px dashed #e5dfd2; gap: 10px;
  }
  .ligne:last-child { border-bottom: none; }
  .fichier { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .nom { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .date { font-size: 11px; color: #8a8271; }
  .badge { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 8px; white-space: nowrap; }
  .badge.ok { background: #edf5ef; color: #4a7c59; }
  .badge.warn { background: #fbf1e3; color: #a3691f; }
  .vide { text-align: center; color: #8a8271; margin-top: 10px; font-size: 13px; }

  .danger-zone { margin-top: 28px; border-top: 1px dashed #e5dfd2; padding-top: 14px; }
  .danger-toggle {
    background: none; border: none; padding: 0; font-size: 12px; color: #a33224;
    cursor: pointer; font-weight: 700;
  }
  .danger-body {
    margin-top: 10px; background: #faedea; border: 1px solid #e3b3a8; border-radius: 14px;
    padding: 14px; display: flex; flex-direction: column; gap: 10px; font-size: 13px;
  }
  .danger-body p { margin: 0; color: #7a2c1f; line-height: 1.4; }
  .danger-body form { margin: 0; gap: 8px; }
  .danger-body input {
    padding: 8px; border-radius: 8px; border: 1px solid #e3b3a8; font-size: 13px;
  }
  .danger-submit {
    padding: 10px; border-radius: 10px; border: none; background: #a33224; color: #fff;
    font-weight: 700; font-size: 14px; cursor: pointer;
  }
  .danger-submit:disabled { opacity: 0.5; cursor: default; }
  .danger-error { color: #a33224; font-weight: 600; margin: 0; }
  .danger-success { color: #2f5a3d; font-weight: 600; margin: 0; }
</style>
