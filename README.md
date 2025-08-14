# Franca Insights - Plataforma de Gestão de Social Media

## Visão Geral

O **Franca Insights** é uma aplicação web completa, desenvolvida para a gestão de conteúdo de social media para múltiplos clientes. A plataforma centraliza o fluxo de trabalho desde a concepção de ideias até a publicação final, oferecendo um portal colaborativo para a equipe interna e um painel de aprovação simplificado para os clientes.

A aplicação foi construída com Next.js e TypeScript, utilizando uma arquitetura moderna com Server Components e uma API "bridge" que centraliza a comunicação com serviços de backend, como n8n e Supabase.

## ✨ Principais Funcionalidades

- **Autenticação e Papéis de Usuário**: Sistema de login com três níveis de acesso: `admin`, `colaborador` e `cliente`, cada um com permissões específicas.
- **Gestão de Clientes**: A equipe interna pode filtrar e visualizar o conteúdo por cliente.
- **Fluxo de Ideias**:
    - Criação e edição de ideias de posts (Reels, Carrossel, Imagem Única, etc.).
    - Envio de ideias para aprovação do cliente.
    - Painel para clientes aprovarem, solicitarem ajustes ou reprovarem ideias, com a exigência de comentários para feedback.
    - Status claros que acompanham a ideia desde o rascunho até a aprovação (`rascunho`, `ideia_em_aprovacao`, `ideia_em_alteracao`, `aprovada`, etc.).
- **Fluxo de Publicações**:
    - Criação de publicações a partir de ideias aprovadas.
    - Upload de mídias (imagens e vídeos) associadas a cada publicação.
    - Painel de aprovação para o cliente validar a arte final.
    - Agendamento e rastreamento de publicações, com status como `em_design`, `agendada` e `publicada`.
- **Dashboard e Visão Geral**: Painel inicial com métricas chave sobre o andamento da produção de conteúdo.
- **Interface Intuitiva**: Componentes de UI modernos e responsivos construídos com **Shadcn/ui** e **Radix UI**, garantindo uma ótima experiência de uso.

## 🚀 Tech Stack

- **Framework**: Next.js 15+ (com App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS e `tw-animate-css`
- **Componentes UI**: Shadcn/ui, Radix UI (para componentes base como Dialogs, Popovers, etc.)
- **Gerenciamento de Estado**: Zustand
- **Formulários**: React Hook Form
- **API Backend**: A comunicação é feita através de uma rota de API "bridge" (`/api/bridge`) que delega as requisições para um webhook do n8n, que por sua vez interage com o Supabase.
- **Armazenamento de Mídia**: Supabase Storage para upload e armazenamento de imagens e vídeos.
- **Linting & Formatting**: ESLint
