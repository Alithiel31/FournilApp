/// <reference types="vite-plugin-pwa/svelte" />
/// <reference types="vite-plugin-pwa/client" />

declare global {
  namespace App {
    interface Locals {
      user: { id: number; nom: string } | null;
    }
  }
}
export {};
