DUPLA IALLY E KENNEDY

# Reaproveita — Frontend + Backend + MariaDB

Aplicação web para gestão de produtos, lotes, validade, reservas e relatórios de desperdício evitado.

## Tecnologias

- Frontend: HTML5, CSS3 e JavaScript ES Modules (sem framework).
- Backend: Node.js + Express.
- Banco de dados: MariaDB.
- Driver: `mariadb`.
- API: REST/JSON.

## Estrutura

```text
reaproveita/
├── backend/
│   ├── config/database.js
│   ├── middleware/errorHandler.js
│   ├── routes/
│   ├── utils/asyncHandler.js
│   └── server.js
├── database/schema.sql
├── frontend/
│   ├── assets/logo-folha.png
│   ├── css/styles.css
│   ├── js/api.js
│   └── index.html
├── .env.example
├── .gitignore
└── package.json
```

## Requisitos

- Node.js 20 ou superior.
- MariaDB Server instalado e em execução.
- Um cliente MariaDB (HeidiSQL, DBeaver ou terminal) para executar o SQL.

## Instalação

1. Abra a pasta do projeto no VS Code.
2. Abra um terminal nessa pasta e execute:
   ```bash
   npm install
   ```
3. Crie o banco e as tabelas executando todo o conteúdo de `database/schema.sql` no HeidiSQL, DBeaver ou terminal MariaDB.
4. Copie `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```
   No Windows, também pode duplicar o arquivo manualmente e renomear a cópia para `.env`.
5. Edite `.env` com os dados reais do seu MariaDB:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=sua_senha
   DB_NAME=reaproveita
   PORT=3000
   ```
6. Inicie:
   ```bash
   npm run dev
   ```
7. Acesse `http://localhost:3000`.

O Express serve o frontend e a API no mesmo endereço. Isso evita configurar CORS durante o desenvolvimento.

## Rotas principais

| Método                | Endpoint              | Finalidade         |
| --------------------- | --------------------- | ------------------ |
| GET                   | `/api/health`         | Testar API e banco |
| GET/POST/PUT/DELETE   | `/api/products`       | CRUD de produtos   |
| GET/POST/PUT/DELETE   | `/api/lots`           | CRUD de lotes      |
| GET/POST/PATCH/DELETE | `/api/reservations`   | Reservas e status  |
| GET                   | `/api/dashboard`      | Indicadores        |
| GET                   | `/api/reports`        | Relatórios         |
| GET                   | `/api/reports/export` | Exportar CSV       |
| GET/POST              | `/api/establishments` | Estabelecimentos   |

## Regras importantes

- Produtos são o catálogo de alimentos; lotes guardam quantidade e validade específicas.
- Reservar um lote reduz seu saldo dentro de uma transação MariaDB.
- Cancelar uma reserva devolve a quantidade ao lote.
- Concluir uma reserva contabiliza o peso estimado como desperdício evitado.
- Lotes com reservas vinculadas não podem ser excluídos.
- O sistema é um protótipo administrativo: ainda não inclui login/perfis de usuário.

## Verificação

```bash
npm run check
```

Se o servidor não iniciar, verifique primeiro se o serviço MariaDB está ligado e se as credenciais no `.env` estão corretas.

## Logotipo e arquivo HTML principal

- A página oficial é `frontend/index.html`, servida pelo Express em `http://localhost:3000`.
- Os arquivos duplicados antigos na raiz (`index.html`, `styles.css` e `app.js`) foram removidos para evitar confusão.
- A folha da marca é `frontend/assets/logo-folha.png` (PNG 32 × 32 enviado pelo usuário).
- Para trocar o logo no futuro, substitua esse PNG mantendo o mesmo nome; ele também aparece no cartão de impacto e na aba do navegador.
- O restante dos ícones permanece na família Flaticon UIcons.
