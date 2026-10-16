import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { fmt, registrarSolicitacao, unidadesDe, useDB, type DB, type Direcionamento, type LinhaCompra, type Solicitacao } from "@/lib/store";
import { exportarPDF } from "@/lib/pdf";

export const Route = createFileRoute("/compra")({
  head: () => ({
    meta: [
      { title: "Solicitar Compra · Controle de Estoque" },
      { name: "description", content: "Crie solicitações de compra em lote e consulte o histórico." },
      { property: "og:title", content: "Solicitar Compra · Controle de Estoque" },
      { property: "og:description", content: "Crie solicitações de compra em lote e consulte o histórico." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompraPage,
});

const DIRS: Direcionamento[] = ["MATERIAL DE EXPEDIENTE", "MATERIAL EDUCACIONAL"];
const toInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

function pdfSolicitacao(db: DB, s: Solicitacao) {
  const nome = (id?: string) => (id ? db.funcionarios.find((f) => f.id === id)?.nome ?? "-" : "-");
  exportarPDF("Solicitação de Compra", `Registrada em ${fmt(s.data)}`,
    ["Qnt.", "Un.", "Descrição", "Direcionamento", "Setor", "Solicitado por", "Urg."],
    s.linhas.map((l) => [l.quantidade, l.unidade, l.descricao, l.direcionamento, l.setor || "-", nome(l.solicitanteId), l.urgencia]));
}

function CompraPage() {
  const db = useDB();
  const [nova, setNova] = useState(false);
  const [gerada, setGerada] = useState<Solicitacao | null>(null);
  return (
    <div className="space-y-6">
      <Historico db={db} />
      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="panel-title">Nova Solicitação de Compra</h2>
          {!nova && <button className="btn btn-success h-10 text-sm" onClick={() => setNova(true)}>Nova Solicitação de Compra</button>}
        </div>
        {nova && <Formulario db={db} onCancel={() => setNova(false)} onDone={(s) => { setNova(false); setGerada(s); }} />}
      </section>
      {gerada && (
        <div className="modal-bg" role="dialog" aria-modal="true">
          <div className="modal">
            <h3 className="text-lg font-bold">✅ Solicitação gerada com sucesso</h3>
            <p className="mt-2 text-sm text-muted-foreground">{gerada.linhas.length} item(ns) · {fmt(gerada.data)}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => pdfSolicitacao(db, gerada)}>Exportar em PDF</button>
              <button className="btn btn-primary" onClick={() => setGerada(null)}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type Linha = { qtd: string; unidade: string; descricao: string; direcionamento: Direcionamento; setor: string; temSolic: boolean; solicitanteId: string; urg: string };

function Formulario({ db, onCancel, onDone }: { db: DB; onCancel: () => void; onDone: (s: Solicitacao) => void }) {
  const unidades = unidadesDe(db);
  const vazia = (): Linha => ({ qtd: "", unidade: unidades[0], descricao: "", direcionamento: DIRS[0], setor: "", temSolic: false, solicitanteId: "", urg: "" });
  const [linhas, setLinhas] = useState<Linha[]>([vazia()]);
  const [erro, setErro] = useState("");
  const set = (i: number, p: Partial<Linha>) => setLinhas(linhas.map((l, j) => (j === i ? { ...l, ...p } : l)));
  const rotulo = (i: DB["itens"][number]) => `${i.codigo} — ${i.descricao}`;

  const escolherDescricao = (i: number, v: string) => {
    const it = db.itens.find((x) => rotulo(x) === v);
    set(i, it ? { descricao: it.descricao, unidade: it.unidade ?? linhas[i].unidade } : { descricao: v });
  };

  const registrar = () => {
    const validas = linhas.filter((l) => l.descricao.trim() || l.qtd);
    if (validas.length === 0) return setErro("Adicione ao menos uma linha.");
    for (const l of validas) {
      if (!(Number(l.qtd) > 0) || !l.descricao.trim()) return setErro("Cada linha precisa de quantidade e descrição.");
      if (!["1", "2", "3"].includes(l.urg)) return setErro("Urgência deve ser 1, 2 ou 3.");
    }
    const out: LinhaCompra[] = validas.map((l) => ({
      quantidade: Number(l.qtd), unidade: l.unidade, descricao: l.descricao.trim(),
      itemId: db.itens.find((x) => x.descricao === l.descricao.trim())?.id,
      direcionamento: l.direcionamento, setor: l.setor.trim(),
      solicitanteId: l.temSolic && l.solicitanteId ? l.solicitanteId : undefined,
      urgencia: Number(l.urg) as 1 | 2 | 3,
    }));
    onDone(registrarSolicitacao(out));
  };

  return (
    <div className="mt-4">
      <datalist id="itens-compra">{db.itens.map((i) => <option key={i.id} value={rotulo(i)} />)}</datalist>
      <div className="overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Qnt.</th><th>Un.</th><th>Descrição</th><th>Direcionamento</th><th>Setor</th><th>Solicitado por</th><th>Urg.</th><th></th><th></th></tr></thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={i}>
                <td><input type="number" min="1" className="input w-20" value={l.qtd} onChange={(e) => set(i, { qtd: e.target.value })} /></td>
                <td><select className="input" value={l.unidade} onChange={(e) => set(i, { unidade: e.target.value })}>{unidades.map((u) => <option key={u}>{u}</option>)}</select></td>
                <td><input className="input min-w-56" list="itens-compra" placeholder="Buscar item ou digitar novo…" value={l.descricao} onChange={(e) => escolherDescricao(i, e.target.value)} /></td>
                <td><select className="input" value={l.direcionamento} onChange={(e) => set(i, { direcionamento: e.target.value as Direcionamento })}>{DIRS.map((d) => <option key={d}>{d}</option>)}</select></td>
                <td><input className="input w-36" value={l.setor} onChange={(e) => set(i, { setor: e.target.value })} /></td>
                <td>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={l.temSolic} onChange={(e) => set(i, { temSolic: e.target.checked })} aria-label="Informar solicitante" />
                    {l.temSolic && (
                      <select className="input" value={l.solicitanteId} onChange={(e) => set(i, { solicitanteId: e.target.value })}>
                        <option value="">Selecione…</option>
                        {db.funcionarios.map((f) => <option key={f.id} value={f.id}>{f.codigo} — {f.nome}</option>)}
                      </select>
                    )}
                  </div>
                </td>
                <td><input className="input w-14" inputMode="numeric" maxLength={1} value={l.urg} onChange={(e) => set(i, { urg: e.target.value.replace(/[^123]/g, "") })} /></td>
                <td>{["1", "2", "3"].includes(l.urg) ? <span className={`urg urg-${l.urg}`} title={`Urgência ${l.urg}`} /> : <span className="urg" />}</td>
                <td>{linhas.length > 1 && <button className="link link-danger" onClick={() => setLinhas(linhas.filter((_, j) => j !== i))}>Remover</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn btn-ghost" onClick={() => setLinhas([...linhas, vazia()])}>+ Adicionar linha</button>
        <button className="btn btn-primary" onClick={registrar}>Registrar Solicitação de Compra</button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
      {erro && <p className="mt-2 text-sm font-medium text-destructive">{erro}</p>}
    </div>
  );
}

function Historico({ db }: { db: DB }) {
  const [aberto, setAberto] = useState(false);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [ver, setVer] = useState<string | null>(null);
  const nome = (id?: string) => (id ? db.funcionarios.find((f) => f.id === id)?.nome ?? "-" : "-");
  const lista = useMemo(() => {
    const s = [...db.solicitacoes].sort((a, b) => b.data.localeCompare(a.data));
    if (!aberto) return s.slice(0, 5);
    const ini = de ? new Date(de + "T00:00:00").getTime() : -Infinity;
    const fim = ate ? new Date(ate + "T23:59:59.999").getTime() : Infinity;
    return s.filter((x) => { const t = new Date(x.data).getTime(); return t >= ini && t <= fim; });
  }, [db.solicitacoes, aberto, de, ate]);
  const abrir = () => {
    if (aberto) return setAberto(false);
    const h = new Date(); setAte(toInput(h)); setDe(toInput(new Date(h.getTime() - 30 * 864e5))); setAberto(true);
  };
  const maxUrg = (s: Solicitacao) => Math.max(...s.linhas.map((l) => l.urgencia));

  return (
    <section className="panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="panel-title">Histórico de Solicitações</h2>
        <button className="btn btn-ghost" onClick={abrir}>{aberto ? "Mostrar só últimas 5" : "Histórico de Compras"}</button>
      </div>
      {aberto && (
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="field">De:<input type="date" className="input" value={de} onChange={(e) => setDe(e.target.value)} /></label>
          <label className="field">Até:<input type="date" className="input" value={ate} onChange={(e) => setAte(e.target.value)} /></label>
        </div>
      )}
      <p className="mt-3 text-sm text-muted-foreground">{aberto ? "Período filtrado" : "Últimas 5 solicitações"} · {lista.length} registro(s)</p>
      <div className="mt-3 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Data/Hora</th><th>Itens</th><th>Maior urgência</th><th></th></tr></thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan={4} className="text-muted-foreground">Nenhuma solicitação.</td></tr>}
            {lista.map((s) => (
              <Fragment key={s.id}>
                <tr>
                  <td>{fmt(s.data)}</td><td>{s.linhas.length}</td>
                  <td><span className={`urg urg-${maxUrg(s)} align-middle`} /> {maxUrg(s)}</td>
                  <td className="whitespace-nowrap text-right">
                    <button className="link" onClick={() => setVer(ver === s.id ? null : s.id)}>{ver === s.id ? "Ocultar" : "Ver Mais"}</button>
                    <button className="link ml-3" onClick={() => pdfSolicitacao(db, s)}>Exportar PDF</button>
                  </td>
                </tr>
                {ver === s.id && (
                  <tr><td colSpan={4}>
                    <table className="tbl">
                      <thead><tr><th>Qnt.</th><th>Un.</th><th>Descrição</th><th>Direcionamento</th><th>Setor</th><th>Solicitado por</th><th>Urg.</th></tr></thead>
                      <tbody>{s.linhas.map((l, i) => (
                        <tr key={i}><td>{l.quantidade}</td><td>{l.unidade}</td><td>{l.descricao}</td><td>{l.direcionamento}</td><td>{l.setor || "-"}</td><td>{nome(l.solicitanteId)}</td>
                          <td><span className={`urg urg-${l.urgencia} align-middle`} /> {l.urgencia}</td></tr>
                      ))}</tbody>
                    </table>
                  </td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
