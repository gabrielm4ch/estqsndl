import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { fmt, fmtDia, notasFiscais, porCodigo, proximoCodigo, unidadesDe, update, uid, useDB, type Categoria, type DB, type TipoPessoa } from "@/lib/store";
import { Pencil } from "lucide-react";
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

  const pdfEstoque = () =>
    exportarPDF("Relatório de Estoque", "Estoque atual completo", ["Código", "Descrição", "Categoria", "Mínimo", "Atual", "Status"],
      db.itens.map((i) => [i.codigo, i.descricao, i.categoria, i.minimo, i.quantidade, i.quantidade < i.minimo ? "COMPRAR" : "OK"]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="tabs">
          {(Object.keys(ABAS) as Aba[]).map((t) => (
            <button key={t} className={aba === t ? "tab tab-active" : "tab"} onClick={() => setAba(t)}>{ABAS[t]}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={pdfEstoque}>Exportar PDF do Estoque</button>
      </div>

      {aba === "itens" ? <Itens db={db} /> : aba === "fornecedores" ? <Fornecedores db={db} /> : aba === "notas" ? <Notas db={db} /> : <Pessoas key={aba} db={db} tipo={aba} />}
    </div>
  );
}

const ABAS = { itens: "Itens", funcionarios: "Funcionários", setores: "Setores", fornecedores: "Fornecedores", notas: "Notas Fiscais de Entrada" } as const;
type Aba = keyof typeof ABAS;

function Fornecedores({ db }: { db: DB }) {
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [edit, setEdit] = useState<string | null>(null);
  const lista = [...db.fornecedores].sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));
  const limpar = () => { setNome(""); setCnpj(""); setEdit(null); };
  return (
    <section className="panel">
      <h2 className="panel-title">{edit ? "Editar Fornecedor" : "Cadastrar Fornecedor"}</h2>
      <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(e) => {
        e.preventDefault(); if (!nome || !cnpj) return;
        update((d) => ({ ...d, fornecedores: edit ? d.fornecedores.map((x) => (x.id === edit ? { ...x, nome, cnpj } : x)) : [...d.fornecedores, { id: uid(), nome, cnpj }] }));
        limpar();
      }}>
        <label className="field min-w-64 flex-1">Nome<input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required /></label>
        <label className="field">CNPJ<input className="input" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" required /></label>
        <button className="btn btn-primary">{edit ? "Salvar alterações" : "Adicionar"}</button>
        {edit && <button type="button" className="btn btn-ghost" onClick={limpar}>Cancelar</button>}
      </form>
      <div className="mt-6 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Nome</th><th>CNPJ</th><th></th></tr></thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan={3} className="text-muted-foreground">Nenhum fornecedor cadastrado.</td></tr>}
            {lista.map((f) => (
              <tr key={f.id}><td>{f.nome}</td><td>{f.cnpj}</td>
                <td className="whitespace-nowrap text-right">
                  <EditBtn onClick={() => { setEdit(f.id); setNome(f.nome); setCnpj(f.cnpj); }} />
                  <button className="link link-danger ml-3" onClick={() => confirm("Excluir fornecedor?") && update((d) => ({ ...d, fornecedores: d.fornecedores.filter((x) => x.id !== f.id) }))}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EditBtn({ onClick }: { onClick: () => void }) {
  return <button className="link inline-flex items-center gap-1" onClick={onClick} title="Editar"><Pencil className="h-3.5 w-3.5" />Editar</button>;
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
  const unidades = unidadesDe(db);
  const blank = { codigo: "", descricao: "", minimo: "", quantidade: "", categoria: "Consumível" as Categoria, unidade: "UNIDADE" };
  const [f, setF] = useState(blank);
  const [edit, setEdit] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [novaUn, setNovaUn] = useState<string | null>(null);

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.codigo || !f.descricao) return;
    const dados = { codigo: f.codigo, descricao: f.descricao, minimo: Number(f.minimo) || 0, quantidade: Number(f.quantidade) || 0, categoria: f.categoria, unidade: f.unidade };
    update((d) => ({ ...d, itens: edit ? d.itens.map((i) => (i.id === edit ? { ...i, ...dados } : i)) : [...d.itens, { id: uid(), ...dados }] }));
    setF(blank); setEdit(null);
  };
  const cadastrarUn = () => {
    const u = (novaUn ?? "").trim().toUpperCase();
    if (!u) return;
    if (!unidades.includes(u)) update((d) => ({ ...d, unidades: [...d.unidades, u] }));
    setF({ ...f, unidade: u }); setNovaUn(null);
  };
  const q = busca.trim().toLowerCase();
  const lista = porCodigo(db.itens).filter((i) => !q || i.codigo.toLowerCase().includes(q) || i.descricao.toLowerCase().includes(q));

  return (
    <section className="panel">
      <h2 className="panel-title">{edit ? "Editar Item" : "Cadastrar Item"}</h2>
      <form onSubmit={salvar} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        <label className="field">Código Interno<input className="input" value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })} required /></label>
        <label className="field lg:col-span-2">Descrição<input className="input" value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} required /></label>
        <label className="field">Unidade de Medida
          <select className="input" value={f.unidade} onChange={(e) => setF({ ...f, unidade: e.target.value })}>
            {unidades.map((u) => <option key={u}>{u}</option>)}
          </select>
        </label>
        <label className="field">Estoque Mínimo<input type="number" min="0" className="input" value={f.minimo} onChange={(e) => setF({ ...f, minimo: e.target.value })} /></label>
        <label className="field">Quantidade Atual<input type="number" min="0" className="input" value={f.quantidade} onChange={(e) => setF({ ...f, quantidade: e.target.value })} /></label>
        <label className="field">Categoria
          <select className="input" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value as Categoria })}>
            <option>Consumível</option><option>Retorno</option>
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-2 lg:col-span-7">
          <button className="btn btn-primary">{edit ? "Salvar alterações" : "Adicionar"}</button>
          {edit && <button type="button" className="btn btn-ghost" onClick={() => { setEdit(null); setF(blank); }}>Cancelar</button>}
          {novaUn === null ? (
            <button type="button" className="btn btn-ghost" onClick={() => setNovaUn("")}>Cadastrar Unidade</button>
          ) : (
            <>
              <label className="field">Nova unidade<input className="input" autoFocus value={novaUn} onChange={(e) => setNovaUn(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); cadastrarUn(); } }} placeholder="Ex.: CAIXA" /></label>
              <button type="button" className="btn btn-primary" onClick={cadastrarUn}>Salvar unidade</button>
              <button type="button" className="btn btn-ghost" onClick={() => setNovaUn(null)}>Cancelar</button>
            </>
          )}
        </div>
      </form>
      <div className="mt-6">
        <input className="input w-full max-w-md" placeholder="🔍 Buscar por nome ou código interno…" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Código</th><th>Descrição</th><th>Un.</th><th>Mín.</th><th>Atual</th><th>Categoria</th><th></th></tr></thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan={7} className="text-muted-foreground">{db.itens.length ? "Nenhum item encontrado." : "Nenhum item cadastrado."}</td></tr>}
            {lista.map((i) => (
              <tr key={i.id} className={i.quantidade < i.minimo ? "row-low" : ""}>
                <td>{i.codigo}</td><td>{i.descricao}</td><td>{i.unidade ?? "UNIDADE"}</td><td>{i.minimo}</td><td><b>{i.quantidade}</b></td>
                <td><span className={i.categoria === "Retorno" ? "badge badge-ret" : "badge"}>{i.categoria}</span></td>
                <td className="whitespace-nowrap text-right">
                  <EditBtn onClick={() => { setEdit(i.id); setF({ codigo: i.codigo, descricao: i.descricao, minimo: String(i.minimo), quantidade: String(i.quantidade), categoria: i.categoria, unidade: i.unidade ?? "UNIDADE" }); }} />
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
  const ehFunc = tipo === "funcionarios";
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [tp, setTp] = useState<TipoPessoa>("Funcionário");
  const [edit, setEdit] = useState<string | null>(null);
  const lista = porCodigo(db[tipo]);
  const label = ehFunc ? "Funcionário" : "Setor";
  const limpar = () => { setCodigo(""); setNome(""); setEdit(null); };
  const codigoAuto = proximoCodigo(db.funcionarios, tp);
  return (
    <section className="panel">
      <h2 className="panel-title">{edit ? "Editar" : "Cadastrar"} {label}</h2>
      <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(e) => {
        e.preventDefault();
        if (!nome || (!ehFunc && !codigo) || (edit && !codigo)) return;
        update((d) => {
          if (edit) return { ...d, [tipo]: d[tipo].map((x) => (x.id === edit ? { ...x, codigo, nome, ...(ehFunc ? { tipo: tp } : {}) } : x)) };
          const novo = ehFunc ? { id: uid(), codigo: proximoCodigo(d.funcionarios, tp), nome, tipo: tp } : { id: uid(), codigo, nome };
          return { ...d, [tipo]: [...d[tipo], novo] };
        });
        limpar();
      }}>
        {ehFunc && (
          <div className="field">Tipo
            <div className="flex h-10 items-center gap-4 font-normal text-foreground">
              {(["Professor", "Funcionário"] as TipoPessoa[]).map((t) => (
                <label key={t} className="flex items-center gap-1.5"><input type="radio" checked={tp === t} onChange={() => setTp(t)} />{t}</label>
              ))}
            </div>
          </div>
        )}
        {ehFunc && !edit
          ? <label className="field">Código (automático)<input className="input" value={codigoAuto} readOnly /></label>
          : <label className="field">Código Interno<input className="input" value={codigo} onChange={(e) => setCodigo(e.target.value)} required /></label>}
        <label className="field min-w-64 flex-1">Nome<input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required /></label>
        <button className="btn btn-primary">{edit ? "Salvar alterações" : "Adicionar"}</button>
        {edit && <button type="button" className="btn btn-ghost" onClick={limpar}>Cancelar</button>}
      </form>
      <div className="mt-6 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Código</th><th>Nome</th>{ehFunc && <th>Tipo</th>}<th></th></tr></thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan={4} className="text-muted-foreground">Nenhum cadastro.</td></tr>}
            {lista.map((p) => (
              <tr key={p.id}><td>{p.codigo}</td><td>{p.nome}</td>{ehFunc && <td>{p.tipo ?? "-"}</td>}
                <td className="whitespace-nowrap text-right">
                  <EditBtn onClick={() => { setEdit(p.id); setCodigo(p.codigo); setNome(p.nome); if (p.tipo) setTp(p.tipo); }} />
                  <button className="link link-danger ml-3" onClick={() => confirm("Excluir?") && update((d) => ({ ...d, [tipo]: d[tipo].filter((x) => x.id !== p.id) }))}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
