<script lang="ts">
  import type { ActionData } from './$types';
  let { form }: { form: ActionData } = $props();
</script>

<div class="login">
  <img src="/logo-mark.svg" alt="" class="mark" width="56" height="56" />
  <h1>Fournil</h1>
  <form method="POST">
    <label>
      Email
      <input type="email" name="email" required autocomplete="username" />
    </label>
    <label>
      Mot de passe
      <input type="password" name="password" required autocomplete="current-password" />
    </label>
    {#if form?.error}
      <p class="error">{form.error}</p>
    {/if}
    <button type="submit">Se connecter</button>
  </form>
</div>

<style>
  .login {
    max-width: 320px;
    margin: 15vh auto;
    padding: 0 16px;
    text-align: center;
    font-family: 'Segoe UI', system-ui, sans-serif;
  }
  .mark {
    display: block;
    margin: 0 auto 8px;
  }
  h1 {
    color: #c4771c;
    margin-bottom: 24px;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    text-align: left;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
    color: #8a8271;
  }
  input {
    padding: 10px;
    border: 1px solid #e5dfd2;
    border-radius: 6px;
    font-size: 15px;
  }
  button {
    margin-top: 8px;
    padding: 10px;
    border: none;
    border-radius: 6px;
    background: #c4771c;
    color: #fff;
    font-weight: 700;
    cursor: pointer;
  }
  .error {
    color: #b3261e;
    font-size: 13px;
    margin: 0;
  }
</style>
