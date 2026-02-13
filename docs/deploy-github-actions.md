# CI/CD do Frontend com GitHub Actions

Este repositório possui pipeline em:

- `.github/workflows/pipeline.yml`

Fluxo:

1. Build do frontend em `push`/`pull_request` da `main`.
2. Deploy automático na máquina self-hosted quando houver `push` na `main`.
3. Deploy manual via `Run workflow`.

## Pré-requisitos

Na máquina de deploy (runner self-hosted), você precisa:

- Runner registrado com labels:
  - `self-hosted`
  - `macOS`
  - `deploy`
- Docker + Docker Compose instalados.
- Estrutura de diretórios:
  - `DEPLOY_ROOT/PlanWriter`
  - `DEPLOY_ROOT/PlanWriter-Frontend`

## Secret necessário

No repositório `PlanWriter-Frontend`, configure:

- `DEPLOY_ROOT`: pasta raiz onde estão os dois repositórios.

Exemplo:

```text
/Users/alessandrosilveira/planwriter-deploy
```

## O que o deploy executa

O job de deploy:

1. Atualiza backend e frontend (`git pull --ff-only origin main`).
2. Roda o compose do backend:

```bash
docker compose -f "$DEPLOY_ROOT/PlanWriter/docker-compose.yml" up -d --build
docker compose -f "$DEPLOY_ROOT/PlanWriter/docker-compose.yml" ps
```
