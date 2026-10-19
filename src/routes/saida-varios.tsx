import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { registrarSaidas, useDB } from "@/lib/store";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/saida-varios")({
  head: () => ({
    meta: [
      { title: "Saída de Vários Itens · Controle de Estoque" },
      { name: "description", content: "Registre a saída de vários itens de uma só vez." },
      { property: "og:title", content: "Saída de Vários Itens · Controle de Estoque" },
      { property: "og:description", content: "Registre a saída de vários itens de uma só vez." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SaidaVarios,
});

function SaidaVarios() {
  const db = useDB();
  const nav = useNavigate();
  const [func, setFunc] = useState("");
  const [setor, setSetor] = useState("");
  const [linhas, setLinhas] = useState([{ itemId: "", qtd: "" }]);
  const [erro, setErro] = useState("");

  const set = (i: number, k: "itemId" | "qtd", v: string) => setLinhas(linhas.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  const salvar = () => {
    const preenchidas = linhas.filter((l) => l.itemId || l.qtd);
    if (preenchidas.some((l) => !l.itemId || !Number.isFinite(Number(l.qtd)) || Number(l.qtd) <= 0)) return setErro("Informe um item e uma quantidade válida em cada linha.");
    const validas = preenchidas.map((l) => ({ itemId: l.itemId, quantidade: Number(l.qtd) }));
    if (!func || !setor) return setErro("Selecione quem retirou e o setor.");
    if (validas.length === 0) return setErro("Adicione ao menos um item com quantidade.");
    const err = registrarSaidas(validas, func, setor);
    if (err) return setErro(err);
    nav({ to: "/saida" });
  };

  return (
    <div className="space-y-6">
      <Link to="/saida" className="link">← Voltar para Saída</Link>
      <section className="panel">
        <h2 className="panel-title">Saída de Vários Itens</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="field">Quem retirou
            <select className="input" value={func} onChange={(e) => setFunc(e.target.value)}>
              <option value="">Selecione…</option>
              {db.funcionarios.map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>)}
            </select>
          </label>
          <label className="field">Setor
            <select className="input" value={setor} onChange={(e) => setSetor(e.target.value)}>
              <option value="">Selecione…</option>
              {db.setores.map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>)}
            </select>
          </label>
        </div>
        <label className="mt-5 flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" disabled={!db.itens.length} checked={db.itens.length > 0 && db.itens.every((it) => linhas.some((l) => l.itemId === it.id))} onChange={(e) => {
            if (!e.target.checked) return setLinhas([{ itemId: "", qtd: "" }]);
            setLinhas(db.itens.map((it) => ({ itemId: it.id, qtd: linhas.find((l) => l.itemId === it.id)?.qtd || "1" })));
          }} /> Selecionar Todos
        </label>
        <div className="mt-6 space-y-3">
          {linhas.map((l, i) => (
            <div key={i} className="flex flex-wrap items-end gap-3">
              <span className="w-6 pb-2 text-sm text-muted-foreground">{i + 1}.</span>
              <label className="field min-w-64 flex-1">Item
                <select className="input" value={l.itemId} onChange={(e) => set(i, "itemId", e.target.value)}>
                  <option value="">Selecione…</option>
                  {db.itens.map((it) => <option key={it.id} value={it.id}>{it.codigo} — {it.descricao} (disp. {it.quantidade})</option>)}
                </select>
              </label>
              <label className="field w-32">Quantidade<input type="number" min="1" className="input" value={l.qtd} onChange={(e) => set(i, "qtd", e.target.value)} /></label>
              <Button className="btn btn-ghost" disabled={linhas.length === 1} onClick={() => setLinhas(linhas.filter((_, j) => j !== i))}>Remover</Button>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button className="btn btn-ghost" onClick={() => setLinhas([...linhas, { itemId: "", qtd: "" }])}>+ Adicionar linha</Button>
          <Button className="btn btn-primary" onClick={salvar}>Registrar Saídas</Button>
        </div>
        {erro && <p className="mt-2 text-sm font-medium text-destructive">{erro}</p>}
      </section>
    </div>
  );
}
