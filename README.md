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
- `GET /projects` -> lista projetos do usuário
- `GET /projects/:id` -> detalhes
- `GET /projects/:id/progress` -> histórico
- `POST /projects/:id/progress` -> adicionar
- `DELETE /progress/:progressId` -> excluir

## Observações
- O token JWT é guardado no localStorage e enviado em `Authorization: Bearer ...`.
- Base URL lida de `VITE_API_URL`.
