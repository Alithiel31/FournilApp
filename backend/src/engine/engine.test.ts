/**
 * Tests du moteur de formules.
 * Le vrai stress test : `validateImport` sur le classeur du fournil
 * (place un classeur dans fixtures/ et décommente le bloc en bas).
 */
import { describe, it, expect } from 'vitest';
import { analyzeWorkbook, computeAll, ceilTo, type CellMap } from './engine';

function calc(cells: CellMap, sheets = ['F']) {
  const a = analyzeWorkbook(cells, sheets);
  expect(Object.keys(a.errors)).toHaveLength(0);
  return computeAll(cells, a.formulas).results;
}

describe('arithmétique et fonctions de base', () => {
  it('évalue les opérations et priorités', () => {
    const r = calc({ 'F!A1': { v: 10 }, 'F!B1': { f: 'A1*2+5' }, 'F!C1': { f: '(A1+2)*3' } });
    expect(r['F!B1']).toBe(25);
    expect(r['F!C1']).toBe(36);
  });

  it('SUM sur plage et CEILING', () => {
    const r = calc({
      'F!A1': { v: 100 }, 'F!A2': { v: 200 }, 'F!A3': { v: 33 },
      'F!B1': { f: 'SUM(A1:A3)' },
      'F!B2': { f: 'CEILING(B1,50)' }
    });
    expect(r['F!B1']).toBe(333);
    expect(r['F!B2']).toBe(350);
  });

  it('ceilTo est stable face aux erreurs flottantes', () => {
    expect(ceilTo(10.000000001, 50)).toBe(50);
    expect(ceilTo(6955, 50)).toBe(7000);
    expect(ceilTo(100, 50)).toBe(100);
  });
});

describe('références inter-feuilles et INDEX/MATCH', () => {
  it('résout une référence vers une autre feuille (nom avec espace)', () => {
    const cells: CellMap = {
      'Poids patons unité!B2': { v: 350 },
      'Jour!A1': { f: "'Poids patons unité'!B2*3" }
    };
    const a = analyzeWorkbook(cells, ['Poids patons unité', 'Jour']);
    const r = computeAll(cells, a.formulas).results;
    expect(r['Jour!A1']).toBe(1050);
  });

  it('INDEX/MATCH insensible à la casse (Gros campagne vs Gros Campagne)', () => {
    const cells: CellMap = {
      'C!A1': { v: 'Baguette' }, 'C!B1': { v: 12 },
      'C!A2': { v: 'Gros Campagne' }, 'C!B2': { v: 7 },
      'J!A1': { f: "INDEX(C!B1:B2,MATCH(\"gros campagne\",C!A1:A2,0))" }
    };
    const a = analyzeWorkbook(cells, ['C', 'J']);
    const r = computeAll(cells, a.formulas).results;
    expect(r['J!A1']).toBe(7);
  });
});

// describe('validation sur le classeur réel', async () => {
//   const XLSX = await import('xlsx');
//   const { validateImport } = await import('../import/extract');
//   it('reproduit ~100 % des formules du classeur', () => {
//     const wb = XLSX.readFile('fixtures/Tableau_commandes.xlsx', { cellFormula: true });
//     const v = validateImport(wb);
//     expect(v.matches / v.evaluated).toBeGreaterThan(0.95);
//   });
// });
