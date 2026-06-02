# CLAUDE.md — Minhas Tarefas do Dia! 🌟

## Sobre o Projeto

Aplicativo de rotina e tarefas infantil, lúdico e interativo. Ajuda crianças no desenvolvimento da autonomia e cumprimento de hábitos diários via recompensas visuais, sonoras e feedback háptico. Empacotado como app Android nativo via Capacitor.

**Idioma do app:** Português (pt-BR). Todo texto voltado ao usuário (labels, toasts, modais) deve ser escrito em português brasileiro.

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Linguagem | Vanilla JavaScript (ES6 modules) |
| Markup | HTML5 semântico |
| Estilos | Vanilla CSS (sem frameworks CSS) |
| Build/Dev | Vite 6 (`npm run dev`, `npm run build`) |
| Testes | Vitest 4 + jsdom + @testing-library/dom |
| Mobile | Capacitor 6 (Android) |
| Plugins Nativos | `@capacitor/haptics`, `@capacitor/status-bar` |
| Sincronização | Supabase (opcional, via família) |
| Fontes | Google Fonts — Baloo 2 |

---

## Estrutura do Projeto

```
tarefas-app/
├── index.html              # SPA principal (todo o markup estático)
├── vite.config.js           # Config Vite + Vitest (jsdom, globals)
├── capacitor.config.json    # Config Capacitor (appId: com.tarefas.crianca)
├── .env / .env.example      # Credenciais Supabase (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
├── features/ideas.md        # Backlog de ideias de gamificação
├── src/
│   ├── main.js              # Entry point — inicialização, estado global, bindings window.*
│   ├── style.css            # Importa todos os CSS parciais
│   ├── data/
│   │   └── defaultTasks.js  # Array TASKS_DEFAULT com tarefas padrão
│   ├── services/
│   │   ├── storage.js       # Persistência localStorage com fallback em memória + sync cloud
│   │   ├── haptics.js       # Wrapper Capacitor Haptics (vibração nativa)
│   │   ├── audio.js         # Sons via Web Audio API (tique-taque, fanfarra)
│   │   └── supabase.js      # Cliente Supabase para sincronização em família
│   ├── components/
│   │   ├── TaskCard.js      # Renderização dos cards de tarefa + drag-and-drop
│   │   ├── ProgressSection.js # Barra de progresso + estrelas
│   │   ├── TimerModal.js    # Cronômetro com ampulheta SVG animada
│   │   ├── SettingsModal.js # Modal de configurações (nome, CRUD de tarefas)
│   │   ├── AgendaSection.js # Tela "Minha Agenda" escolar (matérias + livros por dia)
│   │   ├── EventsSection.js # Tela "Provas e Festas" (calendário de eventos)
│   │   └── ParentDashboard.js # Central dos Pais (relatórios, prêmios, atividades, nuvem)
│   └── styles/
│       ├── global.css       # Reset, body, tipografia, layout base
│       ├── variables.css    # Variáveis CSS customizadas
│       ├── components.css   # Estilos de cards, modais, botões, progresso
│       ├── animations.css   # Keyframes (nuvens, estrelas, confetes)
│       └── agenda.css       # Estilos das telas Agenda e Eventos
└── android/                 # Projeto nativo Android (gerado pelo Capacitor)
```

---

## Arquitetura & Padrões

### Navegação
- **SPA com 3 slides horizontais** navegados por swipe touch ou botões de navegação:
  - Slide 0: Tarefas (tela principal)
  - Slide 1: Agenda Escolar
  - Slide 2: Provas e Festas
- Slides inativos recebem classe `inactive-slide` após transição (400ms) para evitar scroll extra.
- Navegação exposta globalmente: `window.slideToSlide(index)`, `window.slideToTasks()`, `window.slideToAgenda()`, `window.slideToEvents()`.

### Estado & Persistência
- **localStorage** é a fonte de verdade primária, com fallback em memória (objeto `store` em `storage.js`).
- Chaves de armazenamento seguem o prefixo `tarefas_` (ex: `tarefas_order`, `tarefas_done`, `tarefas_custom_list`).
- Tarefas concluídas (`done`) são resetadas automaticamente na mudança de dia via `checkDateChange()`.
- Toda escrita no localStorage também chama `syncLocalToCloud()` se a família estiver conectada ao Supabase.

### Componentes
- Componentes são **módulos ES6 puros** (sem framework). Cada um exporta funções de renderização que manipulam o DOM diretamente.
- Funções chamadas pelo HTML via `onclick` são expostas em `window.*` no `main.js`.
- Componentes recebem callbacks como parâmetros em vez de acessar estado global diretamente.

### Modelo de Dados — Tarefa
```js
{
  id: Number,           // Identificador único
  name: String,         // Nome da atividade (máx 24 chars)
  emoji: String,        // Emoji representativo
  color: String,        // 'yellow' | 'blue' | 'pink' | 'orange' | 'purple' | 'mint' | 'red' | 'teal'
  duration: Number,     // Duração do timer em segundos (0 = sem timer)
  timeLabel: String     // Label descritivo do tempo
}
```

### Recompensas (Rewards)
- Crianças ganham ⭐ (estrelas) ao completar tarefas.
- Pais configuram prêmios com custo em estrelas na Central dos Pais.
- Crianças resgatam prêmios que ficam "pendentes" até aprovação dos pais.

### Proteção Parental
- Acesso à Central dos Pais requer resolução de um desafio matemático (multiplicação).
- O modal `parentGateModal` filtra acesso infantil.

---

## Comandos

```bash
npm run dev      # Servidor de desenvolvimento Vite
npm run build    # Build de produção (output em dist/)
npm run preview  # Preview do build de produção
npm run test     # Roda testes com Vitest
npx cap sync android  # Sincroniza build web com projeto Android
npx cap open android  # Abre no Android Studio
```

---

## Convenções de Código

1. **Sem frameworks** — JavaScript vanilla, CSS vanilla, HTML5 semântico.
2. **Módulos ES6** — imports/exports nativos, sem CommonJS.
3. **Funções puras e callbacks** — componentes recebem dependências via parâmetros.
4. **Bindings globais** — funções chamadas por `onclick` no HTML são atribuídas a `window.*` em `main.js`.
5. **Nomes de variáveis e funções** — em inglês (código) com textos de UI em português.
6. **Constantes localStorage** — declaradas como `const LS_*` no topo de `storage.js`.
7. **Haptics** — usar `triggerHapticImpact()` para interações de toque e `triggerHapticSuccess()` para completar ações.
8. **Toast notifications** — usar `showToast('mensagem')` para feedback visual breve.
9. **Testes** — colocados junto aos arquivos fonte com sufixo `.test.js` (ex: `ProgressSection.test.js`).
10. **CSS modular** — estilos separados por domínio em `src/styles/` e importados via `src/style.css`.
11. **Reportes Concisos** — Ao finalizar uma tarefa, o assistente (IA) deve responder de forma extremamente concisa, informando apenas os pontos principais (ex: "Done", "Success", "Implemented"). Nenhuma explicação detalhada deve ser dada a menos que o usuário solicite explicitamente.
12. **Commits** — As mensagens de commit devem ser escritas sempre em inglês e seguir o padrão *Conventional Commits* (ex: `feat(scope): message`, `fix(scope): message`, `style: message`, `refactor: message`).

---

## Considerações Importantes

- **Offline-first**: O app funciona 100% offline. Supabase é opcional para sincronização entre dispositivos da mesma família.
- **Público-alvo**: Crianças. Todo UI/UX deve ser lúdico, colorido e com feedback sensorial (sons, vibrações, animações).
- **Acessibilidade tátil**: Áreas de toque ampliadas para dedinhos pequenos. Drag-and-drop via alça `.grip`.
- **Sem dependências externas pesadas**: Sons são sintetizados via Web Audio API, sem arquivos de áudio.
- **Reset diário automático**: Tarefas e livros empacotados são resetados na mudança de dia.
- **Não expor `.env`**: Credenciais Supabase estão no `.env` (gitignored). Usar `.env.example` como referência.
