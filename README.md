# PlanWriter Frontend (React + Vite)

Frontend simples para conectar no backend .NET (PlanWriter).

## Requisitos
- Node 18+
- Backend disponível (por padrão em `https://localhost:56133/api`).

## Como rodar
```bash
npm install
cp .env.example .env
# Edite VITE_API_URL se necessário
npm run dev
```

## Rotas de API esperadas
- `POST /auth/login` -> { accessToken, user? }
- `POST /auth/register`
- `GET /profile/me` -> bootstrap da sessão (cookie/credenciais)
- `GET /projects` -> lista projetos do usuário
- `GET /projects/:id` -> detalhes
- `GET /projects/:id/progress` -> histórico
- `POST /projects/:id/progress` -> adicionar
- `DELETE /progress/:progressId` -> excluir

## Observações
- O frontend não persiste JWT em `localStorage/sessionStorage`.
- Requisições usam `withCredentials: true` para suportar sessão baseada em cookie HttpOnly.
- Base URL lida de `VITE_API_URL`.

## CI/CD
- Pipeline: `.github/workflows/pipeline.yml`
- Guia de configuração: `docs/deploy-github-actions.md`
