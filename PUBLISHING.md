# Guia de Publicação — Minhas Tarefas do Dia! 🌟

Este documento detalha os passos necessários para publicar uma nova versão do aplicativo na Google Play Store, seguindo as diretrizes do projeto (Vite + Capacitor).

## ⚠️ Regra Crítica de Versionamento

Conforme a **Regra 13** das nossas convenções: SEMPRE que for gerar um novo build ou APK, a versão do app **DEVE OBRIGATORIAMENTE** ser incrementada.

### Passo 1: Incrementar a Versão
1. No arquivo `package.json`, atualize a propriedade `"version"`.
2. No arquivo `android/app/build.gradle`:
   - Incremente o `versionCode` (deve ser um número inteiro, sempre crescente. Ex: de `1` para `2`).
   - Atualize o `versionName` para refletir a nova versão (ex: de `"1.0.0"` para `"1.0.1"`).

---

## 🛠️ Build e Sincronização

### Passo 2: Build da Aplicação Web
Execute o comando de build para compilar o código fonte de produção:
```bash
npm run build
```
*(Isso vai gerar a pasta `dist/` com o código minificado e otimizado).*

### Passo 3: Sincronizar com o Projeto Nativo
Copie os arquivos web compilados para o projeto Android nativo rodando:
```bash
npx cap sync android
```

---

## 📦 Geração do Pacote para a Loja

### Passo 4: Gerar o Android App Bundle (AAB) via Android Studio
A Google Play exige o formato **.aab** para novas publicações.
1. Abra o projeto nativo no Android Studio com o comando:
   ```bash
   npx cap open android
   ```
2. No Android Studio, aguarde o Gradle sincronizar completamente.
3. No menu superior, vá em **Build > Generate Signed Bundle / APK...**.
4. Selecione **Android App Bundle** e clique em *Next*.
5. Em **Key store path**, selecione sua chave de assinatura (`.jks` ou `.keystore`).
   - *Se for a primeira vez, clique em "Create new..." para gerar uma.*
6. Insira as senhas solicitadas.
7. Selecione a variante de build **release** e clique em *Finish*.
8. O Android Studio irá gerar o arquivo `.aab` (geralmente localizado em `android/app/release/app-release.aab`).

---

## 🚀 Publicação na Google Play

### Passo 5: Enviar para o Google Play Console
1. Acesse o [Google Play Console](https://play.google.com/console).
2. Selecione o aplicativo na sua lista de desenvolvedor.
3. No menu lateral esquerdo, vá para a faixa de lançamento desejada (ex: **Testes internos**, **Testes fechados** ou **Produção**).
4. Clique em **Criar nova versão**.
5. Faça o upload do arquivo `.aab` gerado no Passo 4.
6. Atualize as **Notas da versão** informando as novidades, correções de bugs e melhorias.
7. Salve e clique em **Revisar versão**.
8. Se não houver erros, clique em **Iniciar lançamento** para enviar o app para análise do Google.
