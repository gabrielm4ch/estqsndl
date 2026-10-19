import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState } from "react";
import { abaixoMinimo, copiarSolicitacao, editarSolicitacao, excluirSolicitacao, fmt, podeAlterarSolicitacao, registrarSolicitacao, unidadesDe, useDB, type DB, type Direcionamento, type LinhaCompra, type Solicitacao } from "@/lib/store";
import { exportarPDF } from "@/lib/pdf";
import { Button } from "@/components/ui/button";

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
  exportarPDF("Solicitação de Compra", `Solicitação #${s.codigo} · ${new Date(s.data).toLocaleDateString("pt-BR")}`,
    ["Qnt.", "Un.", "Descrição", "Direcionamento", "Setor", "Solicitado por", "Urg."],
    s.linhas.map((l) => [l.quantidade, l.unidade, l.descricao, l.direcionamento, l.setor || "-", nome(l.solicitanteId), l.urgencia]));
}

function CompraPage() {
  const db = useDB();
  const [nova, setNova] = useState(false);
  const [editando, setEditando] = useState<Solicitacao | null>(null);
  const comprar = abaixoMinimo(db);
  const [gerada, setGerada] = useState<Solicitacao | null>(null);
  return (
    <div className="space-y-6">
      <section className="alert-panel">
        <h2 className="text-xl font-bold">⚠️ Para Comprar Hoje</h2>
        {comprar.length === 0 ? <p className="mt-2 opacity-90">Nenhum item abaixo do estoque mínimo.</p> : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {comprar.map((i) => <li key={i.id} className="alert-item"><b>{i.codigo}</b> — {i.descricao}<br /><span className="text-sm">Atual {i.quantidade} / Mín. {i.minimo} · comprar {i.minimo - i.quantidade}</span></li>)}
          </ul>
        )}
      </section>
      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="panel-title">{editando ? `Editar Solicitação #${editando.codigo}` : "Nova Solicitação de Compra"}</h2>
          {!nova && <Button className="btn btn-success h-10 text-sm" onClick={() => setNova(true)}>Nova Solicitação de Compra</Button>}
        </div>
        {nova && <Formulario key={editando?.id ?? "nova"} db={db} inicial={editando} onCancel={() => { setNova(false); setEditando(null); }} onDone={(s) => { setNova(false); setEditando(null); setGerada(s); }} />}
      </section>
      <Historico db={db} onEditar={(s) => { setEditando(s); setNova(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} onCopiar={(s) => { setEditando(s); setNova(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
      {gerada && (
        <div className="modal-bg" role="dialog" aria-modal="true">
          <div className="modal">
            <h3 className="text-lg font-bold">✅ Solicitação salva com sucesso</h3>
            <p className="mt-2 text-sm text-muted-foreground">Solicitação #{gerada.codigo} · {gerada.linhas.length} item(ns)</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button className="btn btn-ghost" onClick={() => pdfSolicitacao(db, gerada)}>Exportar em PDF</Button>
              <Button className="btn btn-primary" onClick={() => setGerada(null)}>OK</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type Linha = { qtd: string; unidade: string; descricao: string; direcionamento: Direcionamento; setor: string; temSolic: boolean; solicitanteId: string; urg: string };

function Formulario({ db, inicial, onCancel, onDone }: { db: DB; inicial: Solicitacao | null; onCancel: () => void; onDone: (s: Solicitacao) => void }) {
  const unidades = unidadesDe(db);
  const vazia = (): Linha => ({ qtd: "", unidade: unidades[0] ?? "UNIDADE", descricao: "", direcionamento: "MATERIAL DE EXPEDIENTE", setor: "", temSolic: false, solicitanteId: "", urg: "" });
  const [linhas, setLinhas] = useState<Linha[]>(inicial ? inicial.linhas.map((l) => ({ qtd: String(l.quantidade), unidade: l.unidade, descricao: l.descricao, direcionamento: l.direcionamento, setor: l.setor, temSolic: Boolean(l.solicitanteId), solicitanteId: l.solicitanteId ?? "", urg: String(l.urgencia) })) : [vazia()]);
  const [erro, setErro] = useState("");
  const set = (i: number, p: Partial<Linha>) => setLinhas(linhas.map((l, j) => (j === i ? { ...l, ...p } : l)));
  const rotulo = (i: DB["itens"][number]) => `${i.codigo} — ${i.descricao}`;

  const escolherDescricao = (i: number, v: string) => {
    const it = db.itens.find((x) => rotulo(x) === v);
    set(i, it ? { descricao: it.descricao, unidade: it.unidade ?? linhas[i]?.unidade ?? "UNIDADE" } : { descricao: v });
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
    if (inicial) {
      const erroEdicao = editarSolicitacao(inicial.id, out);
      if (erroEdicao) return setErro(erroEdicao);
      onDone({ ...inicial, linhas: out });
    } else onDone(registrarSolicitacao(out));
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
                <td>{linhas.length > 1 && <Button className="link link-danger" onClick={() => setLinhas(linhas.filter((_, j) => j !== i))}>Remover</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button className="btn btn-ghost" onClick={() => setLinhas([...linhas, vazia()])}>+ Adicionar linha</Button>
        <Button className="btn btn-primary" onClick={registrar}>{inicial ? "Salvar alterações" : "Registrar Solicitação de Compra"}</Button>
        <Button className="btn btn-ghost" onClick={onCancel}>Cancelar</Button>
      </div>
      {erro && <p className="mt-2 text-sm font-medium text-destructive">{erro}</p>}
    </div>
  );
}

function Historico({ db, onEditar, onCopiar }: { db: DB; onEditar: (s: Solicitacao) => void; onCopiar: (s: Solicitacao) => void }) {
  const [aberto, setAberto] = useState(false);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [ver, setVer] = useState<string | null>(null);
  const [excluir, setExcluir] = useState<Solicitacao | null>(null);
  const [erro, setErro] = useState("");
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    const atualizar = () => setAgora(Date.now());
    const timer = window.setInterval(atualizar, 1000);
    window.addEventListener("focus", atualizar);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", atualizar); };
  }, []);
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
  return (
    <section className="panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="panel-title">Histórico de Solicitações</h2>
        <Button variant="outline" className="btn btn-ghost" onClick={abrir}>{aberto ? "Mostrar só últimas 5" : "Histórico de Compras"}</Button>
      </div>
      {aberto && <div className="mt-4 flex flex-wrap gap-4">
        <label className="field">De:<input type="date" className="input" value={de} onChange={(e) => setDe(e.target.value)} /></label>
        <label className="field">Até:<input type="date" className="input" value={ate} onChange={(e) => setAte(e.target.value)} /></label>
      </div>}
      <p className="mt-3 text-sm text-muted-foreground">{aberto ? "Período filtrado" : "Últimas 5 solicitações"} · {lista.length} registro(s)</p>
      {erro && <p role="alert" className="mt-2 text-sm text-destructive">{erro}</p>}
      <div className="mt-3 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Solicitação</th><th>Data</th><th>Itens</th><th>Ações</th></tr></thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan={4} className="text-muted-foreground">Nenhuma solicitação.</td></tr>}
            {lista.map((s) => (
              <Fragment key={s.id}>
                <tr>
                  <td className="whitespace-nowrap">Solicitação #{s.codigo}</td><td className="whitespace-nowrap">{new Date(s.data).toLocaleDateString("pt-BR")}</td><td className="whitespace-nowrap">{s.linhas.length} itens</td>
                  <td><div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <Button variant="link" className="link h-auto p-0" onClick={() => setVer(ver === s.id ? null : s.id)}>{ver === s.id ? "Ocultar" : "Ver Mais"}</Button>
                    <Button variant="link" className="link h-auto p-0" onClick={() => pdfSolicitacao(db, s)}>Exportar PDF</Button>
                    {podeAlterarSolicitacao(s, agora) ? <>
                      <Button variant="link" className="link h-auto p-0" onClick={() => onEditar(s)}>Editar</Button>
                      <Button variant="link" className="link link-danger h-auto p-0" onClick={() => { setErro(""); setExcluir(s); }}>Excluir</Button>
                    </> : <Button variant="link" className="link h-auto p-0" onClick={() => { const copia = copiarSolicitacao(s.id); if (copia) onCopiar(copia); }}>Criar Cópia</Button>}
                  </div></td>
                </tr>
                {ver === s.id && <tr><td colSpan={4}>
                  <p className="mb-3 text-sm text-muted-foreground">Criada em {fmt(s.data)}</p>
                  <table className="tbl">
                    <thead><tr><th>Qnt.</th><th>Un.</th><th>Descrição</th><th>Direcionamento</th><th>Setor</th><th>Solicitado por</th><th>Urg.</th></tr></thead>
                    <tbody>{s.linhas.map((l, i) => <tr key={i}><td>{l.quantidade}</td><td>{l.unidade}</td><td>{l.descricao}</td><td>{l.direcionamento}</td><td>{l.setor || "-"}</td><td>{nome(l.solicitanteId)}</td><td><span className={`urg urg-${l.urgencia} align-middle`} /> {l.urgencia}</td></tr>)}</tbody>
                  </table>
                </td></tr>}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {excluir && <div className="modal-bg" role="dialog" aria-modal="true" aria-labelledby="confirmar-exclusao">
        <div className="modal">
          <h3 id="confirmar-exclusao" className="text-lg font-bold">Tem certeza de que deseja excluir esta solicitação?</h3>
          <p className="mt-2 text-sm text-muted-foreground">Solicitação #{excluir.codigo}</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setExcluir(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => { const e = excluirSolicitacao(excluir.id); if (e) setErro(e); setExcluir(null); }}>Excluir</Button>
          </div>
        </div>
      </div>}
    </section>
  );
}
