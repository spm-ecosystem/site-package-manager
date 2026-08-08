# Guia de Desenvolvimento de Temas (GitOps)

Este diretório contém os pacotes de modernização de sites suportados pelo **Site Package Manager**. Qualquer desenvolvedor pode propor novos temas ou suporte a novos sites através de Pull Requests.

---

## Como Adicionar um Novo Site ou Tema (Passo a Passo)

### Passo 1: Criar a Estrutura de Pastas
Crie um novo diretório aninhado seguindo o padrão de nomenclatura `websites/<dominio-do-site>/<nome-do-tema>/`:

```bash
mkdir -p public/websites/meusite.com/meu-tema-moderno/
```

### Passo 2: Criar o Manifesto do Tema (`manifest.json`)
Dentro da pasta do tema, crie o arquivo `manifest.json`. Ele define quais elementos do site original serão extraídos e qual componente React será montado para reconstruir a página:

```json
{
  "containerSelector": "#main-content-div",
  "layoutComponent": "UiModernGridPage",
  "urlPattern": "page=gallery",
  "props": {
    "pageTitle": "Minha Galeria Moderna"
  },
  "children": [
    {
      "name": "items",
      "selector": ".post-thumbnail",
      "propsMap": {
        "imageUrl": "img | attr:src",
        "linkUrl": "a | attr:href",
        "title": "img | attr:title"
      }
    }
  ]
}
```

### Passo 3: Criar o Arquivo de Estilos (`content.css`)
Crie o arquivo `content.css` contendo os tokens de design do tema e a inicialização do Tailwind CSS:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:host {
  --spm-bg-primary: #0f172a;
  --spm-bg-secondary: #1e293b;
  --spm-text-primary: #f8fafc;
  --spm-text-muted: #94a3b8;
  --spm-accent: #38bdf8;
  --spm-border: #334155;
  --spm-radius: 12px;
}
```

### Passo 4: (Opcional) Criar Componentes React Específicos
Se o seu tema precisar de componentes React exclusivos que não existem na biblioteca da extensão:
1. Crie uma pasta `components/` dentro do seu tema: `public/websites/meusite.com/meu-tema-moderno/components/`.
2. Crie seu componente React lá (ex: `UiSpecialGalleryCard.tsx`).
3. O script da extensão irá encontrar seu componente automaticamente e registrá-lo na biblioteca core durante a compilação!

### Passo 5: Atualizar o Registro Central (`registry.json`)
Abra o arquivo [`registry.json`](file:///home/watashi/Projects/extension/registry.json) na raiz do projeto e mapeie o novo domínio e pacote correspondente:

```json
  "meusite.com": {
    "defaultPackage": "meu-tema-moderno",
    "packages": {
      "meu-tema-moderno": {
        "displayName": "Meu Tema Moderno",
        "author": "seu-username",
        "directory": "meu-tema-moderno",
        "activeVersion": "1.0.0",
        "history": [
          { "version": "1.0.0", "ref": "master", "date": "2026-08-08" }
        ]
      }
    }
  }
```

### Passo 6: Compilar e Testar Localmente
Para gerar os arquivos finais de CSS utilitário e mapear novos componentes no registro, rode a compilação:

```bash
npm run build
```

Isso gerará o arquivo `style.css` compilado pelo Tailwind dentro da pasta do seu tema.

#### Como Testar na Extensão:
1. Abra a extensão no navegador Chrome.
2. Acesse o site mapeado (ex: `meusite.com`).
3. Abra o popup da extensão, ative o **Developer Mode** (Modo Desenvolvedor).
4. Clique em **"Load Local Package Folder"** e selecione a pasta do seu tema (`public/websites/meusite.com/meu-tema-moderno/`).
5. A extensão salvará os arquivos localmente no storage, ignorando os arquivos remotos. A página reabrirá carregando o seu novo design instantaneamente a cada F5!

---

## Enviando a Alteração (GitOps)
Após validar o tema localmente:
1. Faça o commit da sua nova pasta e do `registry.json` atualizado.
2. Abra um Pull Request.
3. Assim que o PR for aprovado e integrado ao branch principal, todos os usuários do Site Package Manager receberão o suporte ao novo site de forma imediata e automática!
