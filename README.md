# E-Matrix Web

Frontend Next.js do E-Matrix — reescrita do sistema legado em Symfony 3.

```bash
cp .env.example .env   # NEXT_PUBLIC_API_URL aponta para a API (localhost:3333)
yarn
yarn generate          # gera o client a partir de ../server/src/swagger.json
yarn dev               # http://localhost:3000
```

Convenções: [AGENTS.md](AGENTS.md).
