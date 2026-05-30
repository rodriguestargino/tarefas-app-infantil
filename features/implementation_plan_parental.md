# Plano de Implementação: Área dos Pais 🛡️📊 (Painel de Controle e Recompensas)

Este plano descreve o design e as alterações técnicas necessárias para criar a **Área dos Pais**, um espaço exclusivo e protegido para os responsáveis gerenciarem a rotina, acompanharem métricas de progresso das crianças e configurarem um **Mural de Recompensas** (sistema de troca de estrelas por prêmios reais lúdicos).

---

## Sugestão de Nomes para a Funcionalidade
Propomos termos protetores e acolhedores alinhados com o aplicativo:
1. **(Recomendado) 🛡️ Central dos Pais 📊** (Soa oficial, seguro e completo).
2. **⚙️ Painel do Super-Herói Líder 🦸‍♂️** (Divertido e integrado ao tema de heróis).
3. **🔑 Espaço da Família 🌈** (Foco em união e colaboração).

---

## User Review Required

> [!IMPORTANT]
> **Bloqueio de Entrada (Parental Gate):**
> Para impedir o acesso da criança, sugerimos duas abordagens de bloqueio. Qual prefere?
> 
> * **Opção A (Lúdica/Matemática):** Um desafio matemático aleatório que muda a cada acesso (Ex: "Resolva para entrar: `8 x 7 = ?`" ou "Quanto é `24 + 15`?"). Rápido para os pais, intransponível para crianças pequenas.
> * **Opção B (Senha de 4 dígitos):** Um código PIN de 4 dígitos configurado pelo pai no primeiro acesso (Ex: `1234`).
> 
> *Qual método de bloqueio prefere para o Parental Gate?*

> [!NOTE]
> **Loja de Recompensas (Rewards Shop):**
> O app já possui um sistema de **Estrelas** que a criança acumula ao completar tarefas. Propomos criar uma aba de **Recompensas** onde o pai cadastra prêmios reais e o custo em estrelas. 
> Exemplos:
> * 🎮 1 hora de Videogame = Cost: 10 Estrelas
> * 🍦 Sorvete no Domingo = Cost: 15 Estrelas
> * 🌳 Passear no Parque = Cost: 25 Estrelas
> 
> A criança poderá ver esses prêmios na tela de tarefas e clicar em "Resgatar", o que enviará uma solicitação de aprovação na Área dos Pais.
> 
> *Aprova essa dinâmica de Loja de Recompensas baseada nas estrelas acumuladas?*

---

## Estrutura de Abas da Área dos Pais

Propomos uma interface premium unificada em abas:
1. **📊 Relatórios (Insights):** Gráficos simples ou resumos mostrando a taxa de conclusão de tarefas da semana (Ex: "Pedrinho completou 92% das tarefas esta semana!").
2. **🎁 Loja de Recompensas:** Cadastro e controle de prêmios por estrelas, com aprovação de resgates feitos pela criança.
3. **⚙️ Gerenciar Atividades:** Painel consolidado para gerenciar todas as 3 funcionalidades (cadastrar/editar tarefas diárias, matérias da agenda escolar e datas do calendário).
4. **☁️ Sincronização Nuvem:** Visualização do status de conexão e Código de Família.

---

## Proposed Changes

### 1. Interface & Estilos (HTML / CSS)

#### [MODIFY] [index.html](file:///c:/Users/rodri/Dev/workspace/tarefas-app/index.html)
- Substituir o botão simples de engrenagem (`⚙️`) ao lado do nome da criança por um botão mais destacado: `🛡️ Área dos Pais`.
- Criar a estrutura HTML do **Parental Gate Modal** (o modal de desafio de entrada).
- Criar o HTML da **Central dos Pais Dashboard**, contendo a navegação por abas e os placeholders para relatórios, prêmios e controle de tarefas.
- Adicionar uma seção lúdica chamada **"🌟 Trocar minhas Estrelas! 🎁"** na tela principal da criança (Slide 1) para exibição e resgate de prêmios.

#### [MODIFY] [agenda.css](file:///c:/Users/rodri/Dev/workspace/tarefas-app/src/styles/agenda.css)
- Adicionar estilização premium e moderna para o painel dos pais (dashboard em tons elegantes de azul marinho escuro e branco para diferenciar do tema infantil colorido).
- Estilizar os cards de relatórios estatísticos (com barras de progresso circulares ou retangulares e badges de conquistas).
- Estilizar a vitrine de prêmios/recompensas da criança.

### 2. Lógica & Persistência (JavaScript)

#### [NEW] [ParentDashboard.js](file:///c:/Users/rodri/Dev/workspace/tarefas-app/src/components/ParentDashboard.js)
- Componente principal da Área dos Pais:
  - Lógica do **Parental Gate** (gerador de contas matemáticas aleatórias ou validação de PIN).
  - Funções de renderização das abas (Estatísticas, Prêmios, Configurações).
  - Lógica de cadastro, edição e exclusão de recompensas.
  - Aprovação/rejeição de prêmios pendentes solicitados pela criança.

#### [MODIFY] [storage.js](file:///c:/Users/rodri/Dev/workspace/tarefas-app/src/services/storage.js)
- Implementar chaves de armazenamento para o sistema de recompensas:
  - `loadRewardsList()` / `saveRewardsList(list)`: Lista de prêmios disponíveis.
  - `loadRedeemedList()` / `saveRedeemedList(list)`: Prêmios solicitados / resgatados.
  - `loadFamilyStatistics()`: Estatísticas compiladas de conclusão diária de tarefas.
- Garantir que todas as alterações de prêmios e resgates sejam automaticamente replicadas no **Supabase** via `syncLocalToCloud()` se a nuvem estiver ativa.

#### [MODIFY] [main.js](file:///c:/Users/rodri/Dev/workspace/tarefas-app/src/main.js)
- Integrar os botões de ação e modais do `ParentDashboard.js`.
- Atualizar a escuta de alterações em tempo real do Supabase para processar quando o pai aprovar um prêmio de outro dispositivo (fazendo com que a estrela da criança seja deduzida instantaneamente e o prêmio apareça como "Liberado! 🎉" no tablet dela).

---

## Esboço da Loja de Recompensas (Rewards Shop)

```
+---------------------------------------------------+
|               🌟 MEU BAÚ DE PRÊMIOS 🎁             |
|   Minhas Estrelas: ⭐ 18 Estrelas Disponíveis     |
|                                                   |
|  +---------------------------------------------+  |
|  | 🎮 1 Hora de videogame        [ Custa ⭐ 10 ]  |
|  |    [ Resgatar Prêmio! ]                     |  |
|  +---------------------------------------------+  |
|  +---------------------------------------------+  |
|  | 🍦 Sorvete no Domingo         [ Custa ⭐ 15 ]  |
|  |    [ Resgatar Prêmio! ]                     |  |
|  +---------------------------------------------+  |
+---------------------------------------------------+
```

---

## Plano de Verificação

### Testes Automatizados (Vitest)
- Criar testes unitários para a Loja de Recompensas (garantir que a dedução de estrelas ocorra de forma correta ao solicitar prêmios e que não permita resgates se a criança não tiver estrelas suficientes).

### Testes Manuais
1. Tentar entrar na Área dos Pais errando o desafio matemático para verificar a segurança do Parental Gate.
2. Cadastrar uma recompensa personalizada, simular o resgate pela criança e verificar se ela aparece na Área dos Pais para aprovação.
3. Aprovar o prêmio e certificar-se de que o saldo de estrelas da criança diminui de forma correta na tela principal.
