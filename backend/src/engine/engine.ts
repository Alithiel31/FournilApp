/**
 * Moteur de formules Excel — TypeScript pur, zéro dépendance.
 *
 * Rôle dans l'architecture : ce moteur N'EST PAS utilisé au runtime de l'app
 * (les calculs métier vivent dans src/lib/domain, en TS testé). Il sert de
 * VALIDATEUR D'IMPORT : à l'injection d'un classeur, on exécute ses vraies
 * formules et on vérifie que nos calculs TS reproduisent les valeurs Excel.
 * Voir src/lib/import/validate.ts.
 *
 * Couverture : arithmétique, %, ^, comparaisons, concaténation &,
 * références inter-feuilles ('Poids patons unité'!B4, Levain!$B$8),
 * plages, SUM/SOMME, AVERAGE/MOYENNE, MIN, MAX, ABS, COUNT/NB,
 * ROUND/ARRONDI, CEILING(.MATH)/PLAFOND, FLOOR(.MATH)/PLANCHER,
 * IF/SI, IFERROR/SIERREUR, MATCH/EQUIV, INDEX, VLOOKUP/RECHERCHEV.
 */

/* ---------------- Types ---------------- */

export type CellValue = number | string | boolean | null | undefined;

export interface Cell {
  v?: CellValue; // valeur (ou valeur en cache pour une formule)
  f?: string;    // texte de la formule, sans le "=" initial
}

/** Cellules du classeur, indexées par "NomFeuille!A1". */
export type CellMap = Record<string, Cell>;

type Token =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'ref'; sheet: string; addr: string }
  | { t: 'func'; v: string }
  | { t: 'op'; v: string };

export type Ast =
  | { type: 'num'; v: number }
  | { type: 'str'; v: string }
  | { type: 'ref'; key: string }
  | { type: 'range'; grid: string[][] }
  | { type: 'neg'; arg: Ast }
  | { type: 'pct'; arg: Ast }
  | { type: 'concat'; left: Ast; right: Ast }
  | { type: 'bin'; op: '+' | '-' | '*' | '/' | '^'; left: Ast; right: Ast }
  | { type: 'cmp'; op: '=' | '<>' | '<' | '>' | '<=' | '>='; left: Ast; right: Ast }
  | { type: 'call'; name: string; args: Ast[] };

export type GetVal = (key: string) => CellValue;

/* ---------------- Adresses ---------------- */

export function colToNum(col: string): number {
  let n = 0;
  for (const c of col.toUpperCase()) n = n * 26 + (c.charCodeAt(0) - 64);
  return n;
}

export function numToCol(n: number): string {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function parseAddr(addr: string): { col: number; row: number } {
  const m = addr.replace(/\$/g, '').toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!m) throw new Error(`Adresse invalide : ${addr}`);
  return { col: colToNum(m[1]), row: parseInt(m[2], 10) };
}

export function makeKey(sheet: string, addr: string): string {
  return sheet + '!' + addr.replace(/\$/g, '').toUpperCase();
}

export function splitKey(key: string): { sheet: string; addr: string } {
  const i = key.indexOf('!');
  return { sheet: key.slice(0, i), addr: key.slice(i + 1) };
}

/* ---------------- Tokenizer ---------------- */

export function tokenize(
  formula: string,
  defaultSheet: string,
  resolveSheet: (raw: string) => string
): Token[] {
  const src = formula;
  const tokens: Token[] = [];
  let i = 0;

  const readAddr = (): string => {
    let j = i;
    while (j < src.length && /[$A-Za-z0-9]/.test(src[j])) j++;
    const raw = src.slice(i, j);
    i = j;
    return raw;
  };

  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }

    // 'Nom de feuille'!B4
    if (ch === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== "'") j++;
      const sheetRaw = src.slice(i + 1, j);
      i = j + 1;
      if (src[i] === '!') {
        i++;
        tokens.push({ t: 'ref', sheet: resolveSheet(sheetRaw), addr: readAddr() });
        continue;
      }
      tokens.push({ t: 'str', v: sheetRaw });
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      tokens.push({ t: 'num', v: parseFloat(src.slice(i, j)) });
      i = j;
      continue;
    }

    if (/[A-Za-z_$À-ÿ]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_$.À-ÿ]/.test(src[j])) j++;
      const word = src.slice(i, j);
      i = j;
      // Feuille!B4 sans apostrophes
      if (src[i] === '!') {
        i++;
        tokens.push({ t: 'ref', sheet: resolveSheet(word.replace(/\$/g, '')), addr: readAddr() });
        continue;
      }
      const clean = word.replace(/\$/g, '').toUpperCase();
      if (/^[A-Z]{1,3}\d+$/.test(clean)) tokens.push({ t: 'ref', sheet: defaultSheet, addr: clean });
      else tokens.push({ t: 'func', v: clean });
      continue;
    }

    if (ch === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== '"') j++;
      tokens.push({ t: 'str', v: src.slice(i + 1, j) });
      i = j + 1;
      continue;
    }
    if (ch === '<' && (src[i + 1] === '=' || src[i + 1] === '>')) {
      tokens.push({ t: 'op', v: src[i + 1] === '=' ? '<=' : '<>' });
      i += 2;
      continue;
    }
    if (ch === '>' && src[i + 1] === '=') { tokens.push({ t: 'op', v: '>=' }); i += 2; continue; }
    if ('+-*/^%(),:=<>&'.includes(ch)) { tokens.push({ t: 'op', v: ch }); i++; continue; }
    throw new Error(`Caractère inconnu : ${ch}`);
  }
  return tokens;
}

/* ---------------- Parseur ---------------- */

export function parseFormula(tokens: Token[]): Ast {
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function comparison(): Ast {
    let left = concat();
    while (peek()?.t === 'op' && ['=', '<', '>', '<=', '>=', '<>'].includes((peek() as any).v)) {
      const op = (next() as any).v;
      left = { type: 'cmp', op, left, right: concat() };
    }
    return left;
  }
  function concat(): Ast {
    let left = additive();
    while (peek()?.t === 'op' && (peek() as any).v === '&') {
      next();
      left = { type: 'concat', left, right: additive() };
    }
    return left;
  }
  function additive(): Ast {
    let left = multiplicative();
    while (peek()?.t === 'op' && ['+', '-'].includes((peek() as any).v)) {
      const op = (next() as any).v;
      left = { type: 'bin', op, left, right: multiplicative() };
    }
    return left;
  }
  function multiplicative(): Ast {
    let left = power();
    while (peek()?.t === 'op' && ['*', '/'].includes((peek() as any).v)) {
      const op = (next() as any).v;
      left = { type: 'bin', op, left, right: power() };
    }
    return left;
  }
  function power(): Ast {
    const left = unary();
    if (peek()?.t === 'op' && (peek() as any).v === '^') {
      next();
      return { type: 'bin', op: '^', left, right: power() };
    }
    return left;
  }
  function unary(): Ast {
    if (peek()?.t === 'op' && (peek() as any).v === '-') { next(); return { type: 'neg', arg: unary() }; }
    if (peek()?.t === 'op' && (peek() as any).v === '+') { next(); return unary(); }
    return postfix();
  }
  function postfix(): Ast {
    let node = primary();
    while (peek()?.t === 'op' && (peek() as any).v === '%') { next(); node = { type: 'pct', arg: node }; }
    return node;
  }
  function refNode(tok: Extract<Token, { t: 'ref' }>): Ast {
    if (peek()?.t === 'op' && (peek() as any).v === ':') {
      next();
      const end = next();
      if (!end || end.t !== 'ref') throw new Error('Fin de plage attendue');
      const a = parseAddr(tok.addr), b = parseAddr(end.addr);
      const grid: string[][] = [];
      for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++) {
        const line: string[] = [];
        for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++) {
          line.push(makeKey(tok.sheet, numToCol(c) + r));
        }
        grid.push(line);
      }
      return { type: 'range', grid };
    }
    return { type: 'ref', key: makeKey(tok.sheet, tok.addr) };
  }
  function primary(): Ast {
    const tok = next();
    if (!tok) throw new Error('Formule incomplète');
    if (tok.t === 'num') return { type: 'num', v: tok.v };
    if (tok.t === 'str') return { type: 'str', v: tok.v };
    if (tok.t === 'ref') return refNode(tok);
    if (tok.t === 'func') {
      if (peek()?.t === 'op' && (peek() as any).v === '(') {
        next();
        const args: Ast[] = [];
        if (!(peek() && (peek() as any).v === ')')) {
          args.push(comparison());
          while (peek() && (peek() as any).v === ',') { next(); args.push(comparison()); }
        }
        next(); // )
        return { type: 'call', name: tok.v, args };
      }
      throw new Error(`Nom inconnu : ${tok.v}`);
    }
    if (tok.t === 'op' && tok.v === '(') {
      const inner = comparison();
      next(); // )
      return inner;
    }
    throw new Error(`Jeton inattendu : ${'v' in tok ? tok.v : tok.t}`);
  }

  return comparison();
}

export function collectRefs(node: Ast, out = new Set<string>()): Set<string> {
  if (!node) return out;
  if (node.type === 'ref') out.add(node.key);
  if (node.type === 'range') node.grid.flat().forEach((k) => out.add(k));
  if ('left' in node) collectRefs(node.left, out);
  if ('right' in node) collectRefs(node.right, out);
  if ('arg' in node) collectRefs(node.arg, out);
  if ('args' in node) node.args.forEach((a) => collectRefs(a, out));
  return out;
}

/* ---------------- Évaluateur ---------------- */

const normText = (v: CellValue) => String(v).trim().toLowerCase();

export function ceilTo(v: number, sig: number): number {
  if (!sig) return 0;
  return Math.ceil(v / sig - 1e-9) * sig;
}

function toNum(v: CellValue): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v === null || v === undefined || v === '') return 0;
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

function flattenArg(node: Ast, getVal: GetVal): CellValue[] {
  if (node.type === 'range') return node.grid.flat().map(getVal);
  return [evalNode(node, getVal)];
}

export function evalNode(node: Ast, getVal: GetVal): CellValue {
  switch (node.type) {
    case 'num': return node.v;
    case 'str': return node.v;
    case 'ref': return getVal(node.key);
    case 'range': throw new Error('Plage hors fonction');
    case 'neg': return -toNum(evalNode(node.arg, getVal));
    case 'pct': return toNum(evalNode(node.arg, getVal)) / 100;
    case 'concat':
      return String(evalNode(node.left, getVal) ?? '') + String(evalNode(node.right, getVal) ?? '');
    case 'bin': {
      const l = toNum(evalNode(node.left, getVal));
      const r = toNum(evalNode(node.right, getVal));
      switch (node.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return r === 0 ? NaN : l / r;
        case '^': return Math.pow(l, r);
      }
      break;
    }
    case 'cmp': {
      let l = evalNode(node.left, getVal);
      let r = evalNode(node.right, getVal);
      if (typeof l === 'string' || typeof r === 'string') { l = normText(l); r = normText(r); }
      switch (node.op) {
        case '=': return l === r;
        case '<>': return l !== r;
        case '<': return (l as any) < (r as any);
        case '>': return (l as any) > (r as any);
        case '<=': return (l as any) <= (r as any);
        case '>=': return (l as any) >= (r as any);
      }
      break;
    }
    case 'call': return evalCall(node, getVal);
  }
  throw new Error('Nœud inconnu');
}

function evalCall(node: Extract<Ast, { type: 'call' }>, getVal: GetVal): CellValue {
  const { name, args } = node;
  const nums = () =>
    args
      .flatMap((a) => flattenArg(a, getVal))
      .filter((v): v is number => typeof v === 'number' && !isNaN(v));

  switch (name) {
    case 'SUM': case 'SOMME':
      return nums().reduce((a, b) => a + b, 0);
    case 'AVERAGE': case 'MOYENNE': {
      const n = nums();
      return n.length ? n.reduce((a, b) => a + b, 0) / n.length : 0;
    }
    case 'MIN': return Math.min(...nums());
    case 'MAX': return Math.max(...nums());
    case 'ABS': return Math.abs(toNum(evalNode(args[0], getVal)));
    case 'COUNT': case 'NB': return nums().length;
    case 'ROUND': case 'ARRONDI': {
      const v = toNum(evalNode(args[0], getVal));
      const d = args[1] ? toNum(evalNode(args[1], getVal)) : 0;
      const f = Math.pow(10, d);
      return Math.round(v * f) / f;
    }
    case 'CEILING': case 'CEILING.MATH': case 'PLAFOND': case 'PLAFOND.MATH': {
      const v = toNum(evalNode(args[0], getVal));
      const sig = args[1] ? toNum(evalNode(args[1], getVal)) : 1;
      return ceilTo(v, sig);
    }
    case 'FLOOR': case 'FLOOR.MATH': case 'PLANCHER': {
      const v = toNum(evalNode(args[0], getVal));
      const sig = args[1] ? toNum(evalNode(args[1], getVal)) : 1;
      return sig ? Math.floor(v / sig + 1e-9) * sig : 0;
    }
    case 'IF': case 'SI':
      return evalNode(args[0], getVal)
        ? evalNode(args[1], getVal)
        : args[2] ? evalNode(args[2], getVal) : false;
    case 'IFERROR': case 'SIERREUR': {
      try {
        const v = evalNode(args[0], getVal);
        return typeof v === 'number' && isNaN(v) ? evalNode(args[1], getVal) : v;
      } catch {
        return evalNode(args[1], getVal);
      }
    }
    case 'MATCH': case 'EQUIV': {
      const target = evalNode(args[0], getVal);
      if (args[1].type !== 'range') throw new Error('MATCH attend une plage');
      const grid = args[1].grid;
      const keys = grid.length === 1 ? grid[0] : grid.map((r) => r[0]);
      const tNorm = typeof target === 'string' ? normText(target) : target;
      for (let idx = 0; idx < keys.length; idx++) {
        let v = getVal(keys[idx]);
        if (typeof v === 'string') v = normText(v);
        if (v === tNorm) return idx + 1;
      }
      return NaN; // #N/A
    }
    case 'INDEX': {
      if (args[0].type !== 'range') throw new Error('INDEX attend une plage');
      const grid = args[0].grid;
      const row = Math.round(toNum(evalNode(args[1], getVal)));
      const col = args[2] ? Math.round(toNum(evalNode(args[2], getVal))) : 1;
      if (isNaN(row) || isNaN(col)) return NaN;
      const r = grid.length === 1 ? 0 : row - 1;
      const c = grid.length === 1 ? row - 1 : col - 1;
      if (!grid[r] || grid[r][c] === undefined) return NaN;
      return getVal(grid[r][c]);
    }
    case 'VLOOKUP': case 'RECHERCHEV': {
      const target = evalNode(args[0], getVal);
      if (args[1].type !== 'range') throw new Error('VLOOKUP attend une plage');
      const grid = args[1].grid;
      const colIdx = Math.round(toNum(evalNode(args[2], getVal))) - 1;
      const tNorm = typeof target === 'string' ? normText(target) : target;
      for (const line of grid) {
        let v = getVal(line[0]);
        if (typeof v === 'string') v = normText(v);
        if (v === tNorm) return getVal(line[colIdx]);
      }
      return NaN;
    }
    default:
      throw new Error(`Fonction non gérée : ${name}`);
  }
}

/* ---------------- Analyse et calcul d'un classeur ---------------- */

export interface Analysis {
  formulas: Record<string, { ast: Ast; raw: string }>;
  errors: Record<string, string>;
}

export function analyzeWorkbook(cells: CellMap, sheetNames: string[]): Analysis {
  const resolveSheet = (raw: string): string => {
    if (sheetNames.includes(raw)) return raw;
    return sheetNames.find((s) => s.trim() === raw.trim()) ?? raw;
  };
  const formulas: Analysis['formulas'] = {};
  const errors: Analysis['errors'] = {};
  for (const [key, cell] of Object.entries(cells)) {
    if (!cell.f) continue;
    const { sheet } = splitKey(key);
    try {
      const ast = parseFormula(tokenize(cell.f, sheet, resolveSheet));
      formulas[key] = { ast, raw: cell.f.replace(/\s+/g, ' ') };
    } catch (e) {
      errors[key] = e instanceof Error ? e.message : String(e);
    }
  }
  return { formulas, errors };
}

export function computeAll(
  cells: CellMap,
  formulas: Analysis['formulas'],
  overrides: Record<string, number> = {}
): { results: Record<string, CellValue>; getVal: GetVal } {
  const memo: Record<string, CellValue> = {};
  const visiting = new Set<string>();

  const getVal: GetVal = (key) => {
    if (key in memo) return memo[key];
    if (visiting.has(key)) { memo[key] = NaN; return NaN; }
    visiting.add(key);
    let val: CellValue;
    if (formulas[key]) {
      try { val = evalNode(formulas[key].ast, getVal); } catch { val = NaN; }
    } else if (key in overrides) {
      val = overrides[key];
    } else {
      val = cells[key]?.v ?? '';
    }
    visiting.delete(key);
    memo[key] = val;
    return val;
  };

  const results: Record<string, CellValue> = {};
  for (const key of Object.keys(formulas)) results[key] = getVal(key);
  return { results, getVal };
}
