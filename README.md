# Consultoria Fitto V2

Aplicativo de consultoria de treino e alimentação, desenvolvido com Expo Router, React Native Web, TypeScript e Supabase.

## Funcionalidades

- Perfis independentes de aluno e profissional, autenticação e recuperação de acesso.
- Painel profissional, convites e acompanhamento dos alunos.
- Montagem de fichas, divisões, séries, metas de RIR/RPE, técnicas e prévia interativa do aluno.
- Biblioteca de exercícios com GIFs, busca em português e favoritos.
- Execução de treinos, registro de carga pelo aluno, descanso, histórico e feedbacks.
- Planejamento alimentar e catálogo de alimentos.
- Perfil redesenhado com apresentação, atendimento, contato e edição em abas.
- Interface responsiva para celular e computador.

## Executar localmente

1. Instale as dependências com `npm ci`.
2. Copie `.env.example` para `.env` e configure a URL e a chave publicável do seu projeto Supabase.
3. Execute `npm run web`.

Use somente a chave publicável no aplicativo. Variáveis de ambiente locais não são versionadas.

## Verificação

```sh
npm run typecheck
node scripts/test-profile-presentation.cjs
node scripts/test-quick-prescription.cjs
node scripts/test-portuguese-catalog.cjs
```

Os demais testes de modelos estão em `scripts/test-*.cjs`. Os testes SQL estão junto dos recursos correspondentes em `supabase/`.

## Banco de dados

`supabase/migrations/` contém a base dos perfis. Os arquivos SQL em `supabase/` registram os recursos incrementais de autenticação, vínculos, treino e alimentação, com seus testes. O ambiente publicado utiliza um projeto Supabase já configurado; o deploy web não executa esses scripts automaticamente.

## Build web

```sh
npx expo export --platform web
```

A saída é gerada em `dist/`. `vercel.json` configura o build e as rotas da aplicação. Configure as mesmas variáveis `EXPO_PUBLIC_SUPABASE_*` no ambiente de build da hospedagem.

Os arquivos de origem e licença dos catálogos estão junto aos módulos em `src/features/` e em `supabase/ANIMATED-CATALOG.md`.
