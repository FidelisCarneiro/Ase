# ASE Fidel - Guia de Configuração

Este projeto é um SPA (Single Page Application) construído com React, Vite, Tailwind CSS e Supabase.

## 1. Configuração do Supabase

1. Crie um novo projeto no [Supabase](https://supabase.com/).
2. Vá em **SQL Editor** e execute o conteúdo do arquivo `supabase/migrations/001_init.sql`. Isso criará todas as tabelas, triggers, RLS e RPCs necessárias.
3. Vá em **Project Settings > API** e copie a `URL` e a `anon key`.
4. No AI Studio (ou no seu ambiente local), configure as seguintes variáveis de ambiente:
   - `VITE_SUPABASE_URL`: Sua URL do Supabase.
   - `VITE_SUPABASE_ANON_KEY`: Sua chave anônima do Supabase.

## 2. Autenticação e Perfis

1. No painel do Supabase, vá em **Authentication > Users** e convide os usuários iniciais.
2. Após o usuário aceitar o convite e logar pela primeira vez, um perfil será criado automaticamente na tabela `public.profiles`.
3. Você deve ajustar manualmente a `role` do usuário na tabela `public.profiles` (ex: `SUPER_ADMIN`, `ADMIN`, `GERENTE`, etc).

## 3. Power Automate (Workflow de Aprovação)

O sistema foi desenhado para que o Power Automate gerencie as notificações e aprovações externas.

### Fluxo Sugerido:
1. **Gatilho:** Recorrência (ex: a cada 15 minutos).
2. **Ação:** Consultar a view `v_ase_pending` no Supabase (via conector HTTP ou Postgres).
3. **Ação:** Para cada registro, enviar um e-mail de aprovação para o `manager_email`.
4. **Ação:** Quando o gerente clicar em "Aprovar" no e-mail:
   - O Power Automate deve chamar a RPC `approve_ase(ase_id, approver_user_id, note)`.
5. **Ação:** Quando o gerente clicar em "Reprovar":
   - O Power Automate deve chamar a RPC `reject_ase(ase_id, approver_user_id, reason)`.

## 4. Funcionalidades Principais

- **Dashboard:** KPIs de consumo de HH e status de ASEs.
- **Novo ASE:** Formulário com cálculo automático de HH e seleção de equipe.
- **Importação de Efetivo:** Upload de arquivo Excel (.xlsx) para cadastro em lote de colaboradores.
- **PDF:** Geração de PDF corporativo diretamente no navegador.
- **WhatsApp:** Compartilhamento rápido de link da ASE via WhatsApp.
- **Auditoria:** Registro de todas as ações críticas no `audit_log`.

## 5. Publicação no GitHub Pages

1. Certifique-se de que o `base` no `vite.config.ts` está configurado corretamente se o repositório não estiver na raiz.
2. Execute `npm run build`.
3. O conteúdo da pasta `dist` deve ser enviado para o branch `gh-pages`.
