import { useSyncExternalStore } from "react";

export type Categoria = "Consumível" | "Retorno";
export interface Item { id: string; codigo: string; descricao: string; minimo: number; quantidade: number; categoria: Categoria; unidade?: string | undefined }
export type TipoPessoa = "Professor" | "Funcionário";
export interface Pessoa { id: string; codigo: string; nome: string; tipo?: TipoPessoa | undefined }
export interface Fornecedor { id: string; nome: string; cnpj: string }
export interface Entrada { id: string; itemId: string; quantidade: number; fornecedor: string; data: string; fornecedorId?: string; nota?: string; recebidoEm?: string; descricaoPersonalizada?: string | undefined }
export interface Saida { id: string; itemId: string; quantidade: number; funcionarioId: string; setorId: string; data: string; retorno: boolean; devolvidoEm?: string }
export type Direcionamento = "MATERIAL DE EXPEDIENTE" | "MATERIAL EDUCACIONAL";
export interface LinhaCompra { quantidade: number; unidade: string; descricao: string; itemId?: string | undefined; direcionamento: Direcionamento; setor: string; solicitanteId?: string | undefined; urgencia: 1 | 2 | 3 }
export interface Solicitacao { id: string; codigo?: string; data: string; linhas: LinhaCompra[] }
export interface DB { itens: Item[]; funcionarios: Pessoa[]; setores: Pessoa[]; fornecedores: Fornecedor[]; entradas: Entrada[]; saidas: Saida[]; unidades: string[]; solicitacoes: Solicitacao[]; solicitacaoSequencias?: Record<string, number> }

export const UNIDADES_PADRAO = ["UNIDADE", "ROLO", "FOLHA", "PACOTE", "CARTELA"];
export const unidadesDe = (db: DB) => [...UNIDADES_PADRAO, ...db.unidades.filter((u) => !UNIDADES_PADRAO.includes(u))];
export const porCodigo = <T extends { codigo: string }>(l: T[]) => [...l].sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true, sensitivity: "base" }));
export function proximoCodigo(lista: Pessoa[], tipo: TipoPessoa) {
  const pre = tipo === "Professor" ? "PR-" : "FU-";
  const max = lista.reduce((m, p) => (p.codigo.startsWith(pre) ? Math.max(m, Number(p.codigo.slice(3)) || 0) : m), 0);
  return pre + String(max + 1).padStart(3, "0");
}
export const PRAZO_SOLICITACAO_MS = 5 * 60 * 60 * 1000;
export const podeAlterarSolicitacao = (s: Solicitacao, agora = Date.now()) => {
  const idade = agora - new Date(s.data).getTime();
  return idade >= 0 && idade <= PRAZO_SOLICITACAO_MS;
};
export const mesSolicitacao = (data: string) => {
  const d = new Date(data);
  return String(d.getFullYear()).slice(-2) + String(d.getMonth() + 1).padStart(2, "0");
};
export function normalizarSolicitacoes(db: DB): DB {
  const sequencias = { ...db.solicitacaoSequencias };
  const codigos = new Map<string, string>();
  for (const s of db.solicitacoes) {
    if (!s.codigo) continue;
    const mes = s.codigo.slice(0, 4);
    sequencias[mes] = Math.max(sequencias[mes] ?? 0, Number(s.codigo.slice(4)) || 0);
  }
  for (const s of [...db.solicitacoes].sort((a, b) => a.data.localeCompare(b.data))) {
    if (s.codigo) continue;
    const mes = mesSolicitacao(s.data);
    sequencias[mes] = (sequencias[mes] ?? 0) + 1;
    codigos.set(s.id, mes + String(sequencias[mes]).padStart(2, "0"));
  }
  return { ...db, solicitacaoSequencias: sequencias, solicitacoes: db.solicitacoes.map((s) => ({ ...s, codigo: s.codigo ?? codigos.get(s.id) ?? "" })) };
}
export function adicionarSolicitacao(db: DB, linhas: LinhaCompra[], data: string, id: string): { db: DB; solicitacao: Solicitacao } {
  const normalizado = normalizarSolicitacoes(db);
  const mes = mesSolicitacao(data);
  const numero = (normalizado.solicitacaoSequencias?.[mes] ?? 0) + 1;
  const solicitacao = { id, data, codigo: mes + String(numero).padStart(2, "0"), linhas: linhas.map((l) => ({ ...l })) };
  return { solicitacao, db: { ...normalizado, solicitacaoSequencias: { ...normalizado.solicitacaoSequencias, [mes]: numero }, solicitacoes: [...normalizado.solicitacoes, solicitacao] } };
}
export function registrarSolicitacao(linhas: LinhaCompra[]): Solicitacao {
  const data = nowISO();
  const id = uid();
  let resultado: Solicitacao = { id, data, linhas };
  update((db) => { const novo = adicionarSolicitacao(db, linhas, data, id); resultado = novo.solicitacao; return novo.db; });
  return resultado;
}
export function editarSolicitacao(id: string, linhas: LinhaCompra[]): string | null {
  let erro: string | null = null;
  update((db) => {
    const s = db.solicitacoes.find((x) => x.id === id);
    if (!s || !podeAlterarSolicitacao(s)) { erro = "O prazo de 5 horas para editar esta solicitação expirou."; return db; }
    return { ...db, solicitacoes: db.solicitacoes.map((x) => x.id === id ? { ...x, linhas: linhas.map((l) => ({ ...l })) } : x) };
  });
  return erro;
}
export function excluirSolicitacao(id: string): string | null {
  let erro: string | null = null;
  update((db) => {
    const s = db.solicitacoes.find((x) => x.id === id);
    if (!s || !podeAlterarSolicitacao(s)) { erro = "O prazo de 5 horas para excluir esta solicitação expirou."; return db; }
    return { ...db, solicitacoes: db.solicitacoes.filter((x) => x.id !== id) };
  });
  return erro;
}
export function copiarSolicitacao(id: string): Solicitacao | null {
  let resultado: Solicitacao | null = null;
  update((db) => {
    const s = db.solicitacoes.find((x) => x.id === id);
    if (!s || podeAlterarSolicitacao(s)) return db;
    const novo = adicionarSolicitacao(db, s.linhas, nowISO(), uid());
    resultado = novo.solicitacao;
    return novo.db;
  });
  return resultado;
}

const KEY = "estoque-db-v1";
const empty: DB = { itens: [], funcionarios: [], setores: [], fornecedores: [], entradas: [], saidas: [], unidades: [], solicitacoes: [] };

export interface NotaMeta { nota: string; fornecedorId: string; recebidoEm: string }
export function registrarEntradas(linhas: { itemId: string; quantidade: number; descricaoPersonalizada?: string | undefined }[], meta: NotaMeta) {
  update((db) => {
    const forn = db.fornecedores.find((f) => f.id === meta.fornecedorId);
    const data = nowISO();
    const totals = new Map<string, number>();
    linhas.forEach((l) => totals.set(l.itemId, (totals.get(l.itemId) ?? 0) + l.quantidade));
    return {
      ...db,
      itens: db.itens.map((i) => (totals.has(i.id) ? { ...i, quantidade: i.quantidade + (totals.get(i.id) ?? 0) } : i)),
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
  try { const raw = localStorage.getItem(KEY); if (raw) { state = normalizarSolicitacoes({ ...empty, ...JSON.parse(raw) }); localStorage.setItem(KEY, JSON.stringify(state)); } } catch { /* ignore */ }
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
    if (linhas.length === 0 || linhas.some((l) => !Number.isFinite(l.quantidade) || l.quantidade <= 0)) { erro = "Informe uma quantidade válida para cada item."; return db; }
    linhas.forEach((l) => totals.set(l.itemId, (totals.get(l.itemId) ?? 0) + l.quantidade));
    for (const [id, q] of totals) {
      const it = db.itens.find((i) => i.id === id);
      if (!it) { erro = "Item inválido"; return db; }
      if (q > it.quantidade) { erro = `Saldo insuficiente! Estoque atual disponível: ${it.quantidade}`; return db; }
    }
    const data = nowISO();
    return {
      ...db,
      itens: db.itens.map((i) => (totals.has(i.id) ? { ...i, quantidade: i.quantidade - (totals.get(i.id) ?? 0) } : i)),
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

export const diaAtual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export function darBaixaDevolucoes(linhas: { saidaId: string; dataDevolucao: string }[]): string | null {
  let erro: string | null = null;
  update((db) => {
    if (linhas.some((l) => !/^\d{4}-\d{2}-\d{2}$/.test(l.dataDevolucao) || !Number.isFinite(new Date(l.dataDevolucao + "T00:00:00").getTime()))) { erro = "Informe a data de devolução de cada item selecionado."; return db; }
    const datas = new Map(linhas.map((l) => [l.saidaId, l.dataDevolucao]));
    const pendentes = db.saidas.filter((s) => s.retorno && !s.devolvidoEm && datas.has(s.id));
    const totals = new Map<string, number>();
    pendentes.forEach((s) => totals.set(s.itemId, (totals.get(s.itemId) ?? 0) + s.quantidade));
    const ids = new Set(pendentes.map((s) => s.id));
    return {
      ...db,
      itens: db.itens.map((i) => ({ ...i, quantidade: i.quantidade + (totals.get(i.id) ?? 0) })),
      saidas: db.saidas.map((s) => ids.has(s.id) ? { ...s, devolvidoEm: datas.get(s.id) + "T00:00:00" } : s),
    };
  });
  return erro;
}
export function darBaixaDevolucao(saidaId: string, dataDevolucao = diaAtual()): string | null {
  return darBaixaDevolucoes([{ saidaId, dataDevolucao }]);
}

/** Apaga registros de histórico (não altera o saldo do estoque). */
export function apagarRegistros(colecao: "entradas" | "saidas" | "solicitacoes", ids: string[]) {
  const set = new Set(ids);
  update((db) => ({ ...db, [colecao]: (db[colecao] as { id: string }[]).filter((r) => !set.has(r.id)) }));
}
