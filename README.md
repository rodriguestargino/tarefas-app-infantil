# Minhas Tarefas do Dia! 🌟📱

Um aplicativo de rotina e tarefas lúdico, colorido e interativo projetado especialmente para crianças! Ele ajuda no desenvolvimento da autonomia e do cumprimento de hábitos diários por meio de recompensas visuais, sonoras e interações táteis muito divertidas.

O aplicativo é **100% Open Source** e foi empacotado para rodar nativamente em dispositivos Android, com integrações premium do sistema.

---

## 🌟 Principais Recursos

- **Design Premium e Lúdico:** Cores vibrantes, animações dinâmicas de nuvens flutuantes, estrelas cintilantes e um visual acolhedor para crianças.
- **Arrastar e Soltar Otimizado:** Reordenação tátil e responsiva de tarefas ativada por uma alça lateral de arrasto (`.grip`) com área de toque ampliada para dedinhos pequenos.
- **Progresso Interativo:** Barra de progresso com gradiente brilhante e estrelas que se acendem à medida que as tarefas são cumpridas, terminando com uma chuva festiva de confetes!
- **Cronômetro com Ampulheta Animada:** Um timer visual baseado em um SVG interativo de ampulheta que esvazia em tempo real, ajudando a criança a gerenciar tarefas temporizadas (ex: escovar dentes, telas).
- **Áudio Sintetizado Nativo:** Sons de tique-taque e fanfarra gerados dinamicamente via Web Audio API, eliminando a necessidade de arquivos de som pesados e garantindo leveza extrema.
- **Painel de Configurações para Pais (⚙️):**
  - **Nome Personalizado:** Substitui a saudação padrão por *"Olá, [Nome da Criança]! 🦸"*.
  - **Gerenciador de Atividades:** Crie novas tarefas, edite ou exclua as existentes diretamente pela tela do aplicativo.
  - **Temporizador customizado:** Defina se a tarefa requer timer e qual a duração ideal.
- **Privacidade Absoluta (Offline-First):** O aplicativo funciona 100% offline. Ele armazena todos os dados localmente no próprio aparelho da criança, garantindo total conformidade com a segurança infantil e privacidade.

---

## 📱 Integrações Nativas Premium (Android)

Graças ao **Capacitor**, o app se integra perfeitamente com os recursos nativos do sistema Android:

1. **Feedback Hático Físico (Vibração):**
   - Vibrações suaves de toque físico (`Haptics.impact`) ao arrastar e soltar cartões ou clicar nos botões de dia da semana.
   - Vibração festiva de sucesso (`Haptics.notification`) ao marcar tarefas como feitas, esvaziar a ampulheta ou completar o progresso de 100% do dia!
2. **Barra de Status Integrada:**
   - A barra superior do celular Android se adapta automaticamente mudando a cor de fundo e contraste de ícones para se misturar de forma imersiva com o gradiente do céu do aplicativo.

---

## 🛠️ Tecnologias Utilizadas

- **Núcleo:** HTML5 semântico, Vanilla CSS e ES6 JavaScript modular.
- **Empacotador/Build:** [Vite](https://vitejs.dev/) para compilação rápida de produção.
- **Ponte Nativa Mobile:** [Capacitor Core & CLI](https://capacitorjs.com/).
- **Plugins Nativos:** `@capacitor/haptics` e `@capacitor/status-bar`.
- **Licenciamento:** Licença Open Source MIT.

---

## 📦 Como Executar o Projeto Localmente

### Pré-requisitos
Certifique-se de ter o [Node.js](https://nodejs.org/) instalado em sua máquina.

### 1. Clonar o repositório
```bash
git clone https://github.com/rodriguestargino/tarefas-app-infantil.git
cd tarefas-app-infantil
```

### 2. Instalar as dependências
```bash
npm install
```

### 3. Executar o servidor de desenvolvimento
Inicie o Vite localmente para abrir e testar no navegador:
```bash
npm run dev
```

---

## 🤖 Como Sincronizar e Compilar para Android

Para rodar ou gerar o instalador nativo `.apk` do Android, você precisará do **Android SDK** ou **Android Studio** instalado.

### 1. Gerar o build web de produção
```bash
npm run build
```

### 2. Sincronizar com a pasta nativa do Android
```bash
npx cap sync android
```

### 3. Abrir o projeto no Android Studio
Você pode abrir o projeto nativo gerado na pasta `android/` para compilar ou rodar em seu celular físico via USB:
```bash
npx cap open android
```

### 4. Compilar diretamente via linha de comando
Se você tiver o Gradle configurado nas variáveis de ambiente, pode gerar o arquivo de instalação `.apk` de testes executando:
```powershell
cd android
./gradlew assembleDebug
```
O arquivo final `.apk` gerado estará em:  
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📄 Licença

Este projeto é um software livre licenciado sob a **[Licença MIT](LICENSE)**. Sinta-se à vontade para clonar, modificar, distribuir e contribuir com o projeto!

---

Desenvolvido com carinho para tornar as rotinas diárias das supercrianças muito mais divertidas! 🌟🦸‍♂️
