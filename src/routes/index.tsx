import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { abaixoMinimo, fmt, fmtDia, notasFiscais, update, uid, useDB, type Categoria, type DB } from "@/lib/store";
import { exportarPDF } from "@/lib/pdf";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Banco de Dados · Controle de Estoque" },
      { name: "description", content: "Cadastro de itens, funcionários e setores do almoxarifado." },
      { property: "og:title", content: "Banco de Dados · Controle de Estoque" },
      { property: "og:description", content: "Cadastro de itens, funcionários e setores do almoxarifado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BancoDados,
});

function BancoDados() {
  const db = useDB();
  const [aba, setAba] = useState<Aba>("itens");
  const comprar = abaixoMinimo(db);

  const pdfEstoque = () =>
    exportarPDF("Relatório de Estoque", "Estoque atual completo", ["Código", "Descrição", "Categoria", "Mínimo", "Atual", "Status"],
      db.itens.map((i) => [i.codigo, i.descricao, i.categoria, i.minimo, i.quantidade, i.quantidade < i.minimo ? "COMPRAR" : "OK"]));

  return (
    <div className="space-y-6">
      <section className="alert-panel">
        <h2 className="text-xl font-bold">⚠️ Para Comprar Hoje</h2>
        {comprar.length === 0 ? <p className="mt-2 opacity-90">Nenhum item abaixo do estoque mínimo.</p> : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {comprar.map((i) => (
              <li key={i.id} className="alert-item">
                <b>{i.codigo}</b> — {i.descricao}<br />
                <span className="text-sm">Atual {i.quantidade} / Mín. {i.minimo} · comprar {i.minimo - i.quantidade}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="tabs">
          {(Object.keys(ABAS) as Aba[]).map((t) => (
            <button key={t} className={aba === t ? "tab tab-active" : "tab"} onClick={() => setAba(t)}>{ABAS[t]}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={pdfEstoque}>Exportar PDF do Estoque</button>
      </div>

      {aba === "itens" ? <Itens db={db} /> : aba === "fornecedores" ? <Fornecedores db={db} /> : aba === "notas" ? <Notas db={db} /> : <Pessoas db={db} tipo={aba} />}
    </div>
  );
}

const ABAS = { itens: "Itens", funcionarios: "Funcionários", setores: "Setores", fornecedores: "Fornecedores", notas: "Notas Fiscais de Entrada" } as const;
type Aba = keyof typeof ABAS;

function Fornecedores({ db }: { db: DB }) {
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  return (
    <section className="panel">
      <h2 className="panel-title">Cadastrar Fornecedor</h2>
      <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(e) => {
        e.preventDefault(); if (!nome || !cnpj) return;
        update((d) => ({ ...d, fornecedores: [...d.fornecedores, { id: uid(), nome, cnpj }] }));
        setNome(""); setCnpj("");
      }}>
        <label className="field min-w-64 flex-1">Nome<input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required /></label>
        <label className="field">CNPJ<input className="input" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" required /></label>
        <button className="btn btn-primary">Adicionar</button>
      </form>
      <div className="mt-6 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Nome</th><th>CNPJ</th><th></th></tr></thead>
          <tbody>
            {db.fornecedores.length === 0 && <tr><td colSpan={3} className="text-muted-foreground">Nenhum fornecedor cadastrado.</td></tr>}
            {db.fornecedores.map((f) => (
              <tr key={f.id}><td>{f.nome}</td><td>{f.cnpj}</td>
                <td className="text-right"><button className="link link-danger" onClick={() => confirm("Excluir fornecedor?") && update((d) => ({ ...d, fornecedores: d.fornecedores.filter((x) => x.id !== f.id) }))}>Excluir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Notas({ db }: { db: DB }) {
  const [aberta, setAberta] = useState<string | null>(null);
  const notas = notasFiscais(db);
  const item = (id: string) => db.itens.find((i) => i.id === id);
  return (
    <section className="panel">
      <h2 className="panel-title">Notas Fiscais de Entrada</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Nº Nota Fiscal</th><th>Data de Recebimento</th><th>Fornecedor</th><th>CNPJ</th><th></th></tr></thead>
          <tbody>
            {notas.length === 0 && <tr><td colSpan={5} className="text-muted-foreground">Nenhuma nota cadastrada.</td></tr>}
            {notas.map((n) => (
              <Fragment key={n.chave}>
                <tr><td><b>{n.nota}</b></td><td>{fmtDia(n.recebidoEm)}</td><td>{n.fornecedor}</td><td>{n.cnpj}</td>
                  <td className="text-right"><button className="link" onClick={() => setAberta(aberta === n.chave ? null : n.chave)}>{aberta === n.chave ? "Ocultar Itens" : "Visualizar Itens"}</button></td>
                </tr>
                {aberta === n.chave && (
                  <tr><td colSpan={5}>
                    <table className="tbl">
                      <thead><tr><th>Código</th><th>Item</th><th>Descrição Personalizada</th><th>Qtd.</th><th>Data de Cadastro</th></tr></thead>
                      <tbody>{n.entradas.map((e) => (
                        <tr key={e.id}><td>{item(e.itemId)?.codigo ?? "-"}</td><td>{item(e.itemId)?.descricao ?? "(removido)"}</td><td>{e.descricaoPersonalizada ?? "-"}</td><td>{e.quantidade}</td><td>{fmt(e.data)}</td></tr>
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

function Itens({ db }: { db: DB }) {
  const blank = { codigo: "", descricao: "", minimo: "", quantidade: "", categoria: "Consumível" as Categoria };
  const [f, setF] = useState(blank);
  const [edit, setEdit] = useState<string | null>(null);

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.codigo || !f.descricao) return;
    const dados = { codigo: f.codigo, descricao: f.descricao, minimo: Number(f.minimo) || 0, quantidade: Number(f.quantidade) || 0, categoria: f.categoria };
    update((d) => ({ ...d, itens: edit ? d.itens.map((i) => (i.id === edit ? { ...i, ...dados } : i)) : [...d.itens, { id: uid(), ...dados }] }));
    setF(blank); setEdit(null);
  };

  return (
    <section className="panel">
      <h2 className="panel-title">{edit ? "Editar Item" : "Cadastrar Item"}</h2>
      <form onSubmit={salvar} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <label className="field">Código Interno<input className="input" value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })} required /></label>
        <label className="field lg:col-span-2">Descrição<input className="input" value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} required /></label>
        <label className="field">Estoque Mínimo<input type="number" min="0" className="input" value={f.minimo} onChange={(e) => setF({ ...f, minimo: e.target.value })} /></label>
        <label className="field">Quantidade Atual<input type="number" min="0" className="input" value={f.quantidade} onChange={(e) => setF({ ...f, quantidade: e.target.value })} /></label>
        <label className="field">Categoria
          <select className="input" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value as Categoria })}>
            <option>Consumível</option><option>Retorno</option>
          </select>
        </label>
        <div className="flex gap-2 lg:col-span-6">
          <button className="btn btn-primary">{edit ? "Salvar alterações" : "Adicionar"}</button>
          {edit && <button type="button" className="btn btn-ghost" onClick={() => { setEdit(null); setF(blank); }}>Cancelar</button>}
        </div>
      </form>
      <div className="mt-6 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Código</th><th>Descrição</th><th>Mín.</th><th>Atual</th><th>Categoria</th><th></th></tr></thead>
          <tbody>
            {db.itens.length === 0 && <tr><td colSpan={6} className="text-muted-foreground">Nenhum item cadastrado.</td></tr>}
            {db.itens.map((i) => (
              <tr key={i.id} className={i.quantidade < i.minimo ? "row-low" : ""}>
                <td>{i.codigo}</td><td>{i.descricao}</td><td>{i.minimo}</td><td><b>{i.quantidade}</b></td>
                <td><span className={i.categoria === "Retorno" ? "badge badge-ret" : "badge"}>{i.categoria}</span></td>
                <td className="whitespace-nowrap text-right">
                  <button className="link" onClick={() => { setEdit(i.id); setF({ codigo: i.codigo, descricao: i.descricao, minimo: String(i.minimo), quantidade: String(i.quantidade), categoria: i.categoria }); }}>Editar</button>
                  <button className="link link-danger ml-3" onClick={() => confirm("Excluir item?") && update((d) => ({ ...d, itens: d.itens.filter((x) => x.id !== i.id) }))}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Pessoas({ db, tipo }: { db: DB; tipo: "funcionarios" | "setores" }) {
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const lista = db[tipo];
  const label = tipo === "funcionarios" ? "Funcionário" : "Setor";
  return (
    <section className="panel">
      <h2 className="panel-title">Cadastrar {label}</h2>
      <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(e) => {
        e.preventDefault(); if (!codigo || !nome) return;
        update((d) => ({ ...d, [tipo]: [...d[tipo], { id: uid(), codigo, nome }] }));
        setCodigo(""); setNome("");
      }}>
        <label className="field">Código Interno<input className="input" value={codigo} onChange={(e) => setCodigo(e.target.value)} required /></label>
        <label className="field min-w-64 flex-1">Nome<input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required /></label>
        <button className="btn btn-primary">Adicionar</button>
      </form>
      <div className="mt-6 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Código</th><th>Nome</th><th></th></tr></thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan={3} className="text-muted-foreground">Nenhum cadastro.</td></tr>}
            {lista.map((p) => (
              <tr key={p.id}><td>{p.codigo}</td><td>{p.nome}</td>
                <td className="text-right"><button className="link link-danger" onClick={() => confirm("Excluir?") && update((d) => ({ ...d, [tipo]: d[tipo].filter((x) => x.id !== p.id) }))}>Excluir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
