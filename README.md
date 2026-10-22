# Estoque Sinodal

Crie um software de controle de estoque em português, dividido em 3 telas principais. Armazene os dados localmente no navegador de forma 100% gratuita. Tela 1: Banco de Dados Abas ou seções para cadastrar e alimentar o sistema com: - Itens: [Código Interno, Descrição, Estoque Mínimo, Quantidade Atual, Categoria (Consumível ou Retorno)]. - Funcionários: [Código Interno, Nome]. - Setores: [Código Interno, Nome]. No topo desta tela, mostre o painel em VERMELHO chamado "⚠️ Para Comprar Hoje" com os itens abaixo do Estoque Mínimo. Tela 2: Entrada - Formulário para selecionar o Item e digitar a Quantidade. Ao salvar, soma no estoque e grava o fornecedor como "Almoxarifado" com data/hora atual. - Seção de Histórico na própria tela: 1. Preview: Mostra por padrão apenas as ÚLTIMAS 5 ENTRADAS realizadas. 2. Botão "Histórico de Entradas": Ao clicar, expande a visualização exibindo as entradas dos últimos 30 dias e libera dois campos de data ("De:" e "Até:") para eu personalizar o período que quero visualizar. Tela 3: Saída 1. Opção A (Saída Individual): Formulário rápido para 1 Item, Quantidade, Quem retirou e Setor. 2. Opção B (Botão "Saída de Vários Itens"): Abre tela à parte. Seleciona Quem retirou e Setor no topo, e adiciona várias linhas para múltiplos itens. 3. Seção "Pendentes de Retorno": Lista itens de "Retorno" que saíram, com botão verde "Dar Baixa de Devolução". 4. Seção de Histórico na própria tela: 1. Preview: Mostra por padrão apenas as ÚLTIMAS 5 SAÍDAS realizadas. 2. Botão "Histórico de Saídas": Ao clicar, expande a visualização exibindo as saídas dos últimos 30 dias e libera dois campos de data ("De:" e "Até:") para eu personalizar o período que quero visualizar. Regras Gerais: - Gravar data e hora automáticas em qualquer movimentação. - Adicione um botão para "Exportar PDF" que respeite o período filtrado na tela ou gere o relatório completo do estoque atual.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://estoque-sinodal.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/edd05cc8-07fa-4b60-938a-2041bf2bd5b2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
