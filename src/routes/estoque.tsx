import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { porCodigo, statusDe, useDB } from "@/lib/store";

export const Route = createFileRoute("/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque Atual · Controle de Estoque" },
      { name: "description", content: "Consulta rápida do saldo atual do almoxarifado." },
      { property: "og:title", content: "Estoque Atual · Controle de Estoque" },
      { property: "og:description", content: "Consulta rápida do saldo atual do almoxarifado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EstoqueAtual,
});

const ROTULO: Record<Status, string> = {
  zerado: "Zerado",
  critico: "Comprar",
  atencao: "Atenção",
  ok: "OK",
};

function EstoqueAtual() {
  const db = useDB();
  const [busca, setBusca] = useState("");
  const q = busca.trim().toLowerCase();
  const lista = porCodigo(db.itens).filter(
    (i) => !q || i.codigo.toLowerCase().includes(q) || i.descricao.toLowerCase().includes(q),
  );

  return (
    <section className="panel">
      <h2 className="panel-title">Estoque Atual</h2>
      <p className="mt-1 text-muted-foreground text-sm">
        Consulta do saldo do almoxarifado. A cor indica a situação de cada item:
        <span className="st st-black ml-2" title="Zerado" /> zerado,
        <span className="st st-red ml-2" title="Comprar" /> abaixo do mínimo,
        <span className="st st-yellow ml-2" title="Atenção" /> até 20% acima do mínimo,
        <span className="st st-green ml-2" title="OK" /> seguro.
      </p>
      <div className="mt-4">
        <input
          className="input w-full max-w-md"
          placeholder="🔍 Buscar por nome ou código interno…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>Status</th>
              <th>Código Interno</th>
              <th>Nome / Descrição</th>
              <th>Unidade de Medida</th>
              <th>Estoque Mínimo</th>
              <th>Quantidade Atual</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted-foreground">
                  {db.itens.length ? "Nenhum item encontrado." : "Nenhum item cadastrado."}
                </td>
              </tr>
            )}
            {lista.map((i) => {
              const st = statusDe(i);
              return (
                <tr key={i.id}>
                  <td><span className={`st st-${st}`} title={ROTULO[st]} /></td>
                  <td>{i.codigo}</td>
                  <td>{i.descricao}</td>
                  <td>{i.unidade ?? "UNIDADE"}</td>
                  <td>{i.minimo}</td>
                  <td><b>{i.quantidade}</b></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
