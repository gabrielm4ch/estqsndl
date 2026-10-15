import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { fmt, registrarEntrada, useDB } from "@/lib/store";
import { Historico } from "@/components/Historico";

export const Route = createFileRoute("/entrada")({
  head: () => ({
    meta: [
      { title: "Entrada · Controle de Estoque" },
      { name: "description", content: "Registre entradas de itens no estoque do almoxarifado." },
      { property: "og:title", content: "Entrada · Controle de Estoque" },
      { property: "og:description", content: "Registre entradas de itens no estoque do almoxarifado." },
    ],
  }),
  component: EntradaPage,
});

function EntradaPage() {
  const db = useDB();
  const [itemId, setItemId] = useState("");
  const [qtd, setQtd] = useState("");
  const [msg, setMsg] = useState("");
  const item = (id: string) => db.itens.find((i) => i.id === id);

  return (
    <div className="space-y-6">
      <section className="panel">
        <h2 className="panel-title">Registrar Entrada</h2>
        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(e) => {
          e.preventDefault();
          const q = Number(qtd);
          if (!itemId || !(q > 0)) return setMsg("Selecione o item e uma quantidade válida.");
          registrarEntrada(itemId, q);
          setMsg(`Entrada de ${q} × ${item(itemId)?.descricao} registrada.`);
          setQtd("");
        }}>
          <label className="field min-w-64 flex-1">Item
            <select className="input" value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">Selecione…</option>
              {db.itens.map((i) => <option key={i.id} value={i.id}>{i.codigo} — {i.descricao} (atual {i.quantidade})</option>)}
            </select>
          </label>
          <label className="field w-36">Quantidade<input type="number" min="1" className="input" value={qtd} onChange={(e) => setQtd(e.target.value)} /></label>
          <button className="btn btn-primary">Salvar Entrada</button>
        </form>
        <p className="mt-2 text-sm text-muted-foreground">Fornecedor: Almoxarifado · data e hora gravadas automaticamente.</p>
        {msg && <p className="mt-2 text-sm font-medium text-success">{msg}</p>}
      </section>

      <Historico
        titulo="Histórico de Entradas"
        botao="Histórico de Entradas"
        head={["Data/Hora", "Código", "Item", "Qtd.", "Fornecedor"]}
        rows={db.entradas.map((e) => ({ data: e.data, cells: [fmt(e.data), item(e.itemId)?.codigo ?? "-", item(e.itemId)?.descricao ?? "(removido)", e.quantidade, e.fornecedor] }))}
      />
    </div>
  );
}
