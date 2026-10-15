import { useSyncExternalStore } from "react";

export type Categoria = "Consumível" | "Retorno";
export interface Item { id: string; codigo: string; descricao: string; minimo: number; quantidade: number; categoria: Categoria }
export interface Pessoa { id: string; codigo: string; nome: string }
export interface Fornecedor { id: string; nome: string; cnpj: string }
export interface Entrada { id: string; itemId: string; quantidade: number; fornecedor: string; data: string; fornecedorId?: string; nota?: string; recebidoEm?: string; descricaoPersonalizada?: string | undefined }
export interface Saida { id: string; itemId: string; quantidade: number; funcionarioId: string; setorId: string; data: string; retorno: boolean; devolvidoEm?: string }
export interface DB { itens: Item[]; funcionarios: Pessoa[]; setores: Pessoa[]; fornecedores: Fornecedor[]; entradas: Entrada[]; saidas: Saida[] }

const KEY = "estoque-db-v1";
const empty: DB = { itens: [], funcionarios: [], setores: [], fornecedores: [], entradas: [], saidas: [] };

export interface NotaMeta { nota: string; fornecedorId: string; recebidoEm: string }
export function registrarEntradas(linhas: { itemId: string; quantidade: number; descricaoPersonalizada?: string | undefined }[], meta: NotaMeta) {
  update((db) => {
    const forn = db.fornecedores.find((f) => f.id === meta.fornecedorId);
    const data = nowISO();
    const totals = new Map<string, number>();
    linhas.forEach((l) => totals.set(l.itemId, (totals.get(l.itemId) ?? 0) + l.quantidade));
    return {
      ...db,
      itens: db.itens.map((i) => (totals.has(i.id) ? { ...i, quantidade: i.quantidade + totals.get(i.id)! } : i)),
      entradas: [...db.entradas, ...linhas.map((l) => ({
        id: uid(), itemId: l.itemId, quantidade: l.quantidade, data,
        fornecedor: forn?.nome ?? "-", fornecedorId: meta.fornecedorId, nota: meta.nota, recebidoEm: meta.recebidoEm,
        descricaoPersonalizada: l.descricaoPersonalizada?.trim() || undefined,
      }))],
    };
  });
}

export interface NotaFiscal { chave: string; nota: string; recebidoEm: string; fornecedor: string; cnpj: string; entradas: Entrada[] }
export function notasFiscais(db: DB): NotaFiscal[] {
  const map = new Map<string, NotaFiscal>();
  for (const e of db.entradas) {
    if (!e.nota) continue;
    const chave = `${e.nota}|${e.fornecedorId}`;
    let n = map.get(chave);
    if (!n) {
      const f = db.fornecedores.find((x) => x.id === e.fornecedorId);
      n = { chave, nota: e.nota, recebidoEm: e.recebidoEm ?? "", fornecedor: f?.nome ?? e.fornecedor, cnpj: f?.cnpj ?? "-", entradas: [] };
      map.set(chave, n);
    }
    n.entradas.push(e);
  }
  return [...map.values()].sort((a, b) => b.recebidoEm.localeCompare(a.recebidoEm));
}
export const fmtDia = (d?: string) => (d ? new Date(d + "T00:00").toLocaleDateString("pt-BR") : "-");
let state: DB = empty;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { const raw = localStorage.getItem(KEY); if (raw) state = { ...empty, ...JSON.parse(raw) }; } catch { /* ignore */ }
}

export function update(fn: (db: DB) => DB) {
  load();
  state = fn(state);
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export function useDB(): DB {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => { load(); return state; },
    () => empty,
  );
}

export const uid = () => crypto.randomUUID();
export const nowISO = () => new Date().toISOString();
export const fmt = (iso: string) => new Date(iso).toLocaleString("pt-BR");

export function abaixoMinimo(db: DB) {
  return db.itens.filter((i) => i.quantidade < i.minimo);
}

export function registrarEntrada(itemId: string, quantidade: number) {
  update((db) => ({
    ...db,
    itens: db.itens.map((i) => (i.id === itemId ? { ...i, quantidade: i.quantidade + quantidade } : i)),
    entradas: [...db.entradas, { id: uid(), itemId, quantidade, fornecedor: "Almoxarifado", data: nowISO() }],
  }));
}

export function registrarSaidas(linhas: { itemId: string; quantidade: number }[], funcionarioId: string, setorId: string): string | null {
  let erro: string | null = null;
  update((db) => {
    const totals = new Map<string, number>();
    linhas.forEach((l) => totals.set(l.itemId, (totals.get(l.itemId) ?? 0) + l.quantidade));
    for (const [id, q] of totals) {
      const it = db.itens.find((i) => i.id === id);
      if (!it) { erro = "Item inválido"; return db; }
      if (q > it.quantidade) { erro = `Estoque insuficiente: ${it.descricao} (disponível ${it.quantidade})`; return db; }
    }
    const data = nowISO();
    return {
      ...db,
      itens: db.itens.map((i) => (totals.has(i.id) ? { ...i, quantidade: i.quantidade - totals.get(i.id)! } : i)),
      saidas: [
        ...db.saidas,
        ...linhas.map((l) => ({
          id: uid(), itemId: l.itemId, quantidade: l.quantidade, funcionarioId, setorId, data,
          retorno: db.itens.find((i) => i.id === l.itemId)?.categoria === "Retorno",
        })),
      ],
    };
  });
  return erro;
}

export function darBaixaDevolucao(saidaId: string) {
  update((db) => {
    const s = db.saidas.find((x) => x.id === saidaId);
    if (!s || s.devolvidoEm) return db;
    return {
      ...db,
      itens: db.itens.map((i) => (i.id === s.itemId ? { ...i, quantidade: i.quantidade + s.quantidade } : i)),
      saidas: db.saidas.map((x) => (x.id === saidaId ? { ...x, devolvidoEm: nowISO() } : x)),
    };
  });
}
