declare global {
  namespace App {
    interface Locals {
      user: { id: number; nom: string } | null;
    }
  }
}
export {};
