import { beforeEach, describe, expect, it, vi } from "vitest";
import { adicionarSolicitacao, copiarSolicitacao, darBaixaDevolucoes, editarSolicitacao, excluirSolicitacao, normalizarSolicitacoes, podeAlterarSolicitacao, registrarSaidas, statusDe, update, type DB, type LinhaCompra } from "@/lib/store";

const linha: LinhaCompra = { quantidade: 4, unidade: "UNIDADE", descricao: "Papel", direcionamento: "MATERIAL DE EXPEDIENTE", setor: "Secretaria", urgencia: 2 };
const vazio = (): DB => ({ itens: [], funcionarios: [], setores: [], fornecedores: [], entradas: [], saidas: [], unidades: [], solicitacoes: [] });
const ler = (): DB => JSON.parse(localStorage.getItem("estoque-db-v1") ?? "{}");

beforeEach(() => { vi.useRealTimers(); update(() => vazio()); });

describe("Solicitações de compra", () => {
  it("gera #261002 na segunda solicitação de outubro de 2026", () => {
    const primeira = adicionarSolicitacao(vazio(), [linha], "2026-10-15T12:00:00", "a");
    expect(adicionarSolicitacao(primeira.db, [linha], "2026-10-15T13:00:00", "b").solicitacao.codigo).toBe("261002");
  });
  it("reinicia sequência no novo mês", () => {
    const primeira = adicionarSolicitacao(vazio(), [linha], "2026-10-15T12:00:00", "a");
    expect(adicionarSolicitacao(primeira.db, [linha], "2026-11-01T12:00:00", "b").solicitacao.codigo).toBe("261101");
  });
  it("atualiza o prefixo para 27 no ano seguinte", () => {
    expect(adicionarSolicitacao(vazio(), [linha], "2027-01-01T12:00:00", "a").solicitacao.codigo).toBe("270101");
  });
  it("permite alterações até 5 horas e recusa após o prazo", () => {
    const s = { id: "a", data: "2026-10-15T12:00:00Z", linhas: [linha] };
    expect(podeAlterarSolicitacao(s, Date.parse(s.data) + 5 * 60 * 60 * 1000)).toBe(true);
    expect(podeAlterarSolicitacao(s, Date.parse(s.data) + 5 * 60 * 60 * 1000 + 1)).toBe(false);
  });
  it("edição mantém código e horário original", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-15T13:00:00Z"));
    const inicial = adicionarSolicitacao(vazio(), [linha], "2026-10-15T12:00:00Z", "a"); update(() => inicial.db);
    expect(editarSolicitacao("a", [{ ...linha, quantidade: 8 }])).toBeNull();
    expect(ler().solicitacoes[0]).toMatchObject({ codigo: "261001", data: "2026-10-15T12:00:00Z", linhas: [{ ...linha, quantidade: 8 }] });
  });
  it("recusa editar e excluir solicitações expiradas", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-15T18:00:00Z"));
    update(() => adicionarSolicitacao(vazio(), [linha], "2026-10-15T12:00:00Z", "a").db);
    expect(editarSolicitacao("a", [])).not.toBeNull(); expect(excluirSolicitacao("a")).not.toBeNull(); expect(ler().solicitacoes).toHaveLength(1);
  });
  it("não reutiliza código após excluir", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-15T13:00:00Z"));
    update(() => adicionarSolicitacao(vazio(), [linha], "2026-10-15T12:00:00Z", "a").db);
    expect(excluirSolicitacao("a")).toBeNull();
    expect(adicionarSolicitacao(ler(), [linha], "2026-10-15T13:00:00Z", "b").solicitacao.codigo).toBe("261002");
  });
  it("cópia preserva todos os dados e abre novo prazo com código atual", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-15T12:00:00Z"));
    update(() => adicionarSolicitacao(vazio(), [linha], "2026-10-15T12:00:00Z", "a").db);
    const copia = copiarSolicitacao("a"); expect(copia?.codigo).toBe("261101"); expect(copia?.linhas).toEqual([linha]); expect(copia?.id).not.toBe("a");
    expect(copia && podeAlterarSolicitacao(copia)).toBe(true);
  });
  it("atribui códigos estáveis a solicitações antigas", () => {
    const db = vazio(); db.solicitacoes = [{ id: "a", data: "2026-10-15T12:00:00", linhas: [linha] }];
    const normal = normalizarSolicitacoes(db); expect(normal.solicitacoes[0]?.codigo).toBe("261001"); expect(normalizarSolicitacoes(normal)).toEqual(normal);
  });
});

describe("Saldo e devoluções", () => {
  const estoque = () => { const db = vazio(); db.itens = [{ id: "i", codigo: "1", descricao: "Tesoura", minimo: 1, quantidade: 5, categoria: "Retorno" }]; return db; };
  it("bloqueia saída individual maior que o saldo", () => {
    update(() => estoque()); expect(registrarSaidas([{ itemId: "i", quantidade: 6 }], "f", "s")).toBe("Saldo insuficiente! Estoque atual disponível: 5"); expect(ler().itens[0]?.quantidade).toBe(5); expect(ler().saidas).toHaveLength(0);
  });
  it("bloqueia lote cuja soma do mesmo item ultrapassa o saldo", () => {
    update(() => estoque()); expect(registrarSaidas([{ itemId: "i", quantidade: 3 }, { itemId: "i", quantidade: 3 }], "f", "s")).toBe("Saldo insuficiente! Estoque atual disponível: 5"); expect(ler().itens[0]?.quantidade).toBe(5);
  });
  it("permite retirada exatamente igual ao saldo", () => {
    update(() => estoque()); expect(registrarSaidas([{ itemId: "i", quantidade: 5 }], "f", "s")).toBeNull(); expect(ler().itens[0]?.quantidade).toBe(0);
  });
  it("devolve lote com as datas reais e não repete créditos", () => {
    const db = estoque(); db.itens[0] = { ...db.itens[0], id: "i", codigo: "1", descricao: "Tesoura", minimo: 1, categoria: "Retorno", quantidade: 0 };
    db.saidas = ["a", "b"].map((id) => ({ id, itemId: "i", quantidade: 2, funcionarioId: "f", setorId: "s", data: "2026-10-01T12:00:00Z", retorno: true })); update(() => db);
    const devolucoes = [{ saidaId: "a", dataDevolucao: "2026-10-15" }, { saidaId: "b", dataDevolucao: "2026-10-16" }];
    expect(darBaixaDevolucoes(devolucoes)).toBeNull(); expect(ler().itens[0]?.quantidade).toBe(4);
    expect(ler().saidas.map((s) => s.devolvidoEm)).toEqual(["2026-10-15T00:00:00", "2026-10-16T00:00:00"]);
    darBaixaDevolucoes(devolucoes); expect(ler().itens[0]?.quantidade).toBe(4);
  });
});

describe("Status do estoque (tela Estoque Atual)", () => {
  const item = (quantidade: number, minimo: number) => ({ id: "x", codigo: "1", descricao: "Item", minimo, quantidade, categoria: "Consumível" as const });
  it("preto quando a quantidade é 0", () => expect(statusDe(item(0, 10))).toBe("zerado"));
  it("vermelho quando está acima de 0 mas abaixo do mínimo", () => expect(statusDe(item(9, 10))).toBe("critico"));
  it("amarelo entre o mínimo e mínimo + 20%", () => {
    expect(statusDe(item(10, 10))).toBe("atencao");
    expect(statusDe(item(12, 10))).toBe("atencao");
  });
  it("verde acima do mínimo + 20%", () => expect(statusDe(item(13, 10))).toBe("ok"));
});