# RipperOS ADE

Ambiente de desenvolvimento com agentes em que **cada usuário cria os próprios bots**: cada bot tem nome, papel e instruções, conversa com você e com outros bots, e trabalha na **sua própria VM Linux leve**, com a tela visível ao vivo.

RipperOS é um fork do [Orca](https://github.com/stablyai/orca) (MIT). O README original do Orca está em [`docs/readme/README.orca-upstream.md`](docs/readme/README.orca-upstream.md).

## Status

Em construção. Roteiro:

1. **Rebranding** do Orca para RipperOS (nome, identidade do app, canal de atualização) — feito.
2. **Bots como personas**: nome, avatar, papel, instruções, agente (Claude Code) e receita de VM.
3. **Interface centrada em bots**: lista de bots e grupos, chat no centro, tela do bot e rotinas à direita.
4. **Uma VM por bot**: receita Docker (Debian slim + desktop leve + noVNC) sobre as VMs efêmeras do Orca.
5. **Grupos e conversa entre bots (A2A)** sobre a orquestração do Orca.
6. **Rotinas e marketplace** de bots.

## Desenvolvimento (Windows)

Pré-requisitos:

- Node 24
- pnpm via corepack (`corepack pnpm ...`)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) com a carga **"Desenvolvimento para desktop com C++"** (necessário para compilar os módulos nativos)
- Docker Desktop (para as VMs dos bots)
- Um caminho de pasta **sem espaços**: o node-gyp falha ao compilar módulos nativos em caminhos com espaço

```bash
corepack pnpm install
```

```bash
corepack pnpm dev
```

Validação: `corepack pnpm tc` (tipos) e `corepack pnpm test` (testes). Regras de código e UI em [`AGENTS.md`](AGENTS.md) e [`docs/STYLEGUIDE.md`](docs/STYLEGUIDE.md).

## O que ainda aponta para o Orca

Mantido de propósito, para não quebrar integrações e facilitar puxar atualizações do upstream:

- o comando de terminal `orca`, o arquivo `orca.yaml` e o esquema de links `orca://`;
- o nome interno do pacote (`orca`);
- serviços do Orca ainda não substituídos: compartilhamento (`share.onorca.dev`), relay/push móvel e marketplace de plugins.

Desligado no fork: envio de feedback e o "what's new" do Orca. A telemetria só transmite em builds oficiais do Orca, então fica inativa aqui.

## Licença

MIT. Veja [`LICENSE`](LICENSE).
