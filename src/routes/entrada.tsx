import { ApagarHistorico } from "@/components/ApagarHistorico";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { fmtDia, registrarEntradas, useDB, type DB } from "@/lib/store";
import { Historico } from "@/components/Historico";

export const Route = createFileRoute("/entrada")({
  head: () => ({
    meta: [
      { title: "Entrada · Controle de Estoque" },
      { name: "description", content: "Registre entradas de itens no estoque do almoxarifado." },
      { property: "og:title", content: "Entrada · Controle de Estoque" },
      { property: "og:description", content: "Registre entradas de itens no estoque do almoxarifado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EntradaPage,
});

const hoje = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
type Linha = { itemId: string; qtd: string; usarDesc: boolean; desc: string };
const novaLinha = (): Linha => ({ itemId: "", qtd: "", usarDesc: false, desc: "" });

function EntradaPage() {
  const db = useDB();
  const [lote, setLote] = useState(false);
  const [nota, setNota] = useState("");
  const [fornId, setFornId] = useState("");
  const [receb, setReceb] = useState(hoje());
  const [linhas, setLinhas] = useState<Linha[]>([novaLinha()]);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const item = (id: string) => db.itens.find((i) => i.id === id);
  const set = (i: number, p: Partial<Linha>) => setLinhas(linhas.map((l, j) => (j === i ? { ...l, ...p } : l)));

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nota.trim() || !fornId || !receb) return setMsg({ ok: false, t: "Preencha Nota Fiscal, Fornecedor e Data de Recebimento." });
    const usadas = lote ? linhas : linhas.slice(0, 1);
    const validas = usadas.filter((l) => l.itemId && Number(l.qtd) > 0);
    if (validas.length === 0 || validas.length !== usadas.filter((l) => l.itemId || l.qtd).length)
      return setMsg({ ok: false, t: "Selecione o item e uma quantidade válida em cada linha." });
    registrarEntradas(validas.map((l) => ({ itemId: l.itemId, quantidade: Number(l.qtd), descricaoPersonalizada: l.usarDesc ? l.desc : undefined })), { nota: nota.trim(), fornecedorId: fornId, recebidoEm: receb });
    setMsg({ ok: true, t: `Entrada de ${validas.length} item(ns) da NF ${nota.trim()} registrada.` });
    setLinhas([novaLinha()]);
    if (lote) setNota("");
  };

  const mostradas = lote ? linhas : linhas.slice(0, 1);

  return (
    <div className="space-y-6">
      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="panel-title">{lote ? "Entrada em Lote" : "Registrar Entrada"}</h2>
          <button type="button" className="btn btn-ghost" onClick={() => { setLote(!lote); setMsg(null); }}>{lote ? "Voltar para Entrada Individual" : "Entrada em Lote"}</button>
        </div>
        {db.fornecedores.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Cadastre fornecedores na aba "Fornecedores" do Banco de Dados.</p>}
        <form className="mt-4 space-y-4" onSubmit={salvar}>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="field">Fornecedor
              <select className="input" value={fornId} onChange={(e) => setFornId(e.target.value)}>
                <option value="">Selecione…</option>
                {db.fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome} — {f.cnpj}</option>)}
              </select>
            </label>
            <label className="field">Número da Nota Fiscal<input className="input" value={nota} onChange={(e) => setNota(e.target.value)} /></label>
            <label className="field">Data de Recebimento<input type="date" className="input" value={receb} onChange={(e) => setReceb(e.target.value)} /></label>
          </div>
          {mostradas.map((l, i) => (
            <LinhaItem key={i} db={db} l={l} onChange={(p) => set(i, p)} onRemove={lote && linhas.length > 1 ? () => setLinhas(linhas.filter((_, j) => j !== i)) : undefined} />
          ))}
          <div className="flex flex-wrap gap-2">
            {lote && <button type="button" className="btn btn-ghost" onClick={() => setLinhas([...linhas, novaLinha()])}>+ Adicionar linha</button>}
            <button className="btn btn-primary">{lote ? "Salvar Lote" : "Salvar Entrada"}</button>
          </div>
        </form>
        <p className="mt-2 text-sm text-muted-foreground">Data e hora do registro gravadas automaticamente.</p>
        {msg && <p className={`mt-2 text-sm font-medium ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.t}</p>}
      </section>

      <Historico
        titulo="Histórico de Entradas"
        botao="Histórico de Entradas"
        head={["Data de Recebimento", "NF", "Fornecedor", "Código", "Item", "Desc. Personalizada", "Qtd."]}
        rows={db.entradas.map((e) => { const rec = e.recebidoEm || e.data.slice(0, 10); return { data: rec, cells: [fmtDia(rec), e.nota ?? "-", e.fornecedor, item(e.itemId)?.codigo ?? "-", item(e.itemId)?.descricao ?? "(removido)", e.descricaoPersonalizada ?? "-", e.quantidade] }; })}

      />
      <ApagarHistorico colecao="entradas" registros={db.entradas.map((e) => { const rec = e.recebidoEm || e.data.slice(0, 10); return { id: e.id, data: rec, label: `${fmtDia(rec)} · NF ${e.nota ?? "-"} · ${e.quantidade} × ${item(e.itemId)?.descricao ?? "(removido)"}` }; })} />
    </div>
  );
}

function LinhaItem({ db, l, onChange, onRemove }: { db: DB; l: Linha; onChange: (p: Partial<Linha>) => void; onRemove?: (() => void) | undefined }) {
  return (
    <div className="flex flex-wrap items-end gap-3 border-t pt-3">
      <label className="field min-w-64 flex-1">Item
        <select className="input" value={l.itemId} onChange={(e) => onChange({ itemId: e.target.value })}>
          <option value="">Selecione…</option>
          {db.itens.map((i) => <option key={i.id} value={i.id}>{i.codigo} — {i.descricao} (atual {i.quantidade})</option>)}
        </select>
      </label>
      <label className="field w-32">Quantidade<input type="number" min="1" className="input" value={l.qtd} onChange={(e) => onChange({ qtd: e.target.value })} /></label>
      <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={l.usarDesc} onChange={(e) => onChange({ usarDesc: e.target.checked })} />Descrição Personalizada</label>
      {l.usarDesc && <label className="field min-w-56 flex-1">Descrição Personalizada (opcional)<input className="input" value={l.desc} onChange={(e) => onChange({ desc: e.target.value })} /></label>}
      {onRemove && <button type="button" className="link link-danger pb-2" onClick={onRemove}>Remover</button>}
    </div>
  );
}
