import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { darBaixaDevolucao, fmt, registrarSaidas, useDB } from "@/lib/store";
import { Historico } from "@/components/Historico";

export const Route = createFileRoute("/saida")({
  head: () => ({
    meta: [
      { title: "Saída · Controle de Estoque" },
      { name: "description", content: "Registre saídas de itens, devoluções e consulte o histórico." },
      { property: "og:title", content: "Saída · Controle de Estoque" },
      { property: "og:description", content: "Registre saídas de itens, devoluções e consulte o histórico." },
    ],
  }),
  component: SaidaPage,
});

function SaidaPage() {
  const db = useDB();
  const [f, setF] = useState({ itemId: "", qtd: "", func: "", setor: "" });
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const item = (id: string) => db.itens.find((i) => i.id === id);
  const func = (id: string) => db.funcionarios.find((i) => i.id === id)?.nome ?? "-";
  const setor = (id: string) => db.setores.find((i) => i.id === id)?.nome ?? "-";
  const pendentes = db.saidas.filter((s) => s.retorno && !s.devolvidoEm).sort((a, b) => b.data.localeCompare(a.data));

  return (
    <div className="space-y-6">
      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="panel-title">Saída Individual</h2>
          <Link to="/saida-varios" className="btn btn-primary">Saída de Vários Itens</Link>
        </div>
        <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" onSubmit={(e) => {
          e.preventDefault();
          const q = Number(f.qtd);
          if (!f.itemId || !(q > 0) || !f.func || !f.setor) return setMsg({ ok: false, t: "Preencha todos os campos." });
          const err = registrarSaidas([{ itemId: f.itemId, quantidade: q }], f.func, f.setor);
          if (err) return setMsg({ ok: false, t: err });
          setMsg({ ok: true, t: `Saída de ${q} × ${item(f.itemId)?.descricao} registrada.` });
          setF({ ...f, itemId: "", qtd: "" });
        }}>
          <label className="field lg:col-span-2">Item
            <select className="input" value={f.itemId} onChange={(e) => setF({ ...f, itemId: e.target.value })}>
              <option value="">Selecione…</option>
              {db.itens.map((i) => <option key={i.id} value={i.id}>{i.codigo} — {i.descricao} (disp. {i.quantidade})</option>)}
            </select>
          </label>
          <label className="field">Quantidade<input type="number" min="1" className="input" value={f.qtd} onChange={(e) => setF({ ...f, qtd: e.target.value })} /></label>
          <label className="field">Quem retirou
            <select className="input" value={f.func} onChange={(e) => setF({ ...f, func: e.target.value })}>
              <option value="">Selecione…</option>
              {db.funcionarios.map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>)}
            </select>
          </label>
          <label className="field">Setor
            <select className="input" value={f.setor} onChange={(e) => setF({ ...f, setor: e.target.value })}>
              <option value="">Selecione…</option>
              {db.setores.map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>)}
            </select>
          </label>
          <div className="lg:col-span-5"><button className="btn btn-primary">Registrar Saída</button></div>
        </form>
        {msg && <p className={`mt-2 text-sm font-medium ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.t}</p>}
      </section>

      <section className="panel">
        <h2 className="panel-title">Pendentes de Retorno</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Saída</th><th>Item</th><th>Qtd.</th><th>Quem retirou</th><th>Setor</th><th></th></tr></thead>
            <tbody>
              {pendentes.length === 0 && <tr><td colSpan={6} className="text-muted-foreground">Nenhum item pendente.</td></tr>}
              {pendentes.map((s) => (
                <tr key={s.id}>
                  <td>{fmt(s.data)}</td><td>{item(s.itemId)?.descricao ?? "(removido)"}</td><td>{s.quantidade}</td><td>{func(s.funcionarioId)}</td><td>{setor(s.setorId)}</td>
                  <td className="text-right"><button className="btn btn-success" onClick={() => darBaixaDevolucao(s.id)}>Dar Baixa de Devolução</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Historico
        titulo="Histórico de Saídas"
        botao="Histórico de Saídas"
        head={["Data/Hora", "Código", "Item", "Qtd.", "Quem retirou", "Setor", "Devolução"]}
        rows={db.saidas.map((s) => ({ data: s.data, cells: [fmt(s.data), item(s.itemId)?.codigo ?? "-", item(s.itemId)?.descricao ?? "(removido)", s.quantidade, func(s.funcionarioId), setor(s.setorId), s.retorno ? (s.devolvidoEm ? fmt(s.devolvidoEm) : "Pendente") : "—"] }))}
      />
    </div>
  );
}
