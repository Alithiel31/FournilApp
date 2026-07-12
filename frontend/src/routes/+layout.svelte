<script lang="ts">
  import { page } from '$app/state';
  let { children } = $props();

  const tabs = [
    { href: '/commandes', icon: '✎', label: 'Commandes' },
    { href: '/production/lundi', match: '/production', icon: '🔥', label: 'Production' },
    { href: '/recettes', icon: '📖', label: 'Recettes' },
    { href: '/poids', icon: '⚖', label: 'Poids' },
    { href: '/import', icon: '⬆', label: 'Import' }
  ];
  const isActive = (t: (typeof tabs)[number]) =>
    page.url.pathname.startsWith(t.match ?? t.href);

  const isLogin = $derived(page.url.pathname.startsWith('/login'));
</script>

<div class="app">
  {#if !isLogin}
    <header>
      <form method="POST" action="/logout">
        <button type="submit" class="logout">Déconnexion</button>
      </form>
    </header>
  {/if}
  <main>{@render children()}</main>
  {#if !isLogin}
    <nav>
      {#each tabs as t (t.href)}
        <a href={t.href} class:active={isActive(t)}>
          <span class="icon">{t.icon}</span>
          {t.label}
        </a>
      {/each}
    </nav>
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    background: #f7f4ee;
    color: #26221c;
    font-family: 'Segoe UI', system-ui, sans-serif;
  }
  .app {
    max-width: 560px;
    margin: 0 auto;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 0 40px rgba(38, 34, 28, 0.08);
  }
  header {
    display: flex;
    justify-content: flex-end;
    padding: 8px 16px 0;
  }
  .logout {
    border: none;
    background: none;
    color: #8a8271;
    font-size: 12px;
    cursor: pointer;
    text-decoration: underline;
    padding: 4px;
  }
  main {
    flex: 1;
    padding: 16px 16px 96px;
  }
  nav {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 560px;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    background: #fff;
    border-top: 1px solid #e5dfd2;
    padding-bottom: env(safe-area-inset-bottom);
    z-index: 20;
  }
  nav a {
    padding: 10px 4px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    color: #8a8271;
    text-decoration: none;
    border-top: 2.5px solid transparent;
    margin-top: -1px;
  }
  nav a.active {
    color: #c4771c;
    font-weight: 700;
    border-top-color: #c4771c;
  }
  .icon { font-size: 20px; }
  nav a:not(.active) .icon { filter: grayscale(1) opacity(0.6); }
</style>
