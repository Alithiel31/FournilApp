<script lang="ts">
  import { enhance } from '$app/forms';
  let { data, form } = $props();

  let uploading = $state(false);
  let fileName = $state('');

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' });

  const pct = (v?: { evaluated: number; matches: number }) =>
    v && v.evaluated ? Math.round((v.matches / v.evaluated) * 100) : 100;
</script>

<h1>Import</h1>
<p class="intro">
  Injecte le classeur Excel (commandes, recettes, poids). Chaque import remplace entièrement
  le référentiel.
</p>

<form
  method="POST"
  enctype="multipart/form-data"
  use:enhance={() => {
    uploading = true;
    return async ({ update }) => {
      await update();
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
  <button class="submit" type="submit" disabled={uploading}>
    {uploading ? 'Import en cours…' : 'Importer'}
  </button>
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
          <span class="date">{fmtDate(imp.importedAt)}</span>
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
  .submit {
    padding: 12px; border-radius: 12px; border: none; background: #c4771c; color: #fff;
    font-weight: 700; font-size: 15px; cursor: pointer;
  }
  .submit:disabled { opacity: 0.6; cursor: default; }

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
</style>
