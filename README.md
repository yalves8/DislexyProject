# Luz

PWA que simula um leitor de PDF instalável para pessoas com dislexia. A proposta é que o usuário abra um PDF pelo dispositivo, escolha **Abrir com Luz** quando o navegador permitir, selecione as páginas que precisa estudar e gere uma adaptação visual orientada por IA.

O botão **Abrir PDF** continua como fallback seguro para navegadores que não suportam File Handling. O app funciona como uma ferramenta de leitura: abrir PDF, escolher páginas, adaptar, ler, baixar e, quando logado, acessar adaptações anteriores.

## Conceito

> Luz é um leitor de PDF acessível para pessoas com dislexia, capaz de abrir arquivos PDF como se fosse um app leitor padrão e adaptar o conteúdo usando IA, com apoio de diretrizes sobre leitura acessível e adaptação educacional.

## Fluxo principal

1. Usuário abre ou instala a PWA.
2. Em navegadores compatíveis, usuário abre um PDF pelo sistema usando **Abrir com**.
3. Se File Handling não estiver disponível, usuário usa o botão **Abrir PDF**.
4. O app mostra nome e total de páginas.
5. Usuário seleciona um intervalo, como `1-10`.
6. Usuário clica em **Adaptar trecho**.
7. O app exibe mensagens simples de processamento.
8. A resposta estruturada é renderizada como material visual.
9. Usuário pode baixar a adaptação em PDF.
10. Se estiver logado, a adaptação pode ser salva no histórico.
11. Usuário logado acessa adaptações anteriores na rota `/historico`.

## Interface simples

A interface principal evita detalhes técnicos para reduzir carga cognitiva.

Antes da adaptação, o usuário vê apenas:

- abrir PDF;
- arquivo aberto;
- intervalo de páginas;
- botão **Adaptar trecho**.

Detalhes como base de acessibilidade, modo de IA, recuperador e scores ficam em **Detalhes técnicos da adaptação**, uma seção recolhida por padrão no resultado.

## Adaptação visual

O resultado inclui:

- resumo curto;
- cards de ideias principais;
- glossário;
- passo a passo;
- mapa conceitual visual;
- exemplos práticos;
- fórmulas ou regras importantes;
- guia de estudo;
- quiz de revisão.

## Como o RAG é usado

O sistema possui uma base local de conhecimento com diretrizes sobre dislexia, leitura acessível, carga cognitiva, materiais visuais e leitores de PDF com tecnologia assistiva.

Durante a adaptação:

1. O texto real é extraído das páginas selecionadas do PDF.
2. Esse texto é usado como consulta para o recuperador local.
3. O recuperador seleciona os trechos mais relevantes da base.
4. Esses trechos são enviados como contexto para a IA.
5. A IA gera um material adaptado seguindo as diretrizes recuperadas.

O conteúdo da adaptação continua vindo do PDF. A base RAG orienta a forma da adaptação.

### Base local

Arquivos principais:

```text
backend/app/rag/knowledge_base/dyslexia_reading_guidelines.md
backend/app/rag/knowledge_base/accessible_learning_design.md
backend/app/rag/knowledge_base/cognitive_load_and_chunking.md
backend/app/rag/knowledge_base/visual_study_materials.md
backend/app/rag/knowledge_base/assistive_technology_pdf_readers.md
```

Essa é uma base local curada de diretrizes sobre dislexia, acessibilidade e aprendizagem. Ela não finge ser um conjunto de artigos científicos específicos.

### Recuperador

O recuperador fica em:

```text
backend/app/rag/retriever.py
```

Para a demo, foi implementado um RAG local com chunking e recuperação lexical por similaridade de termos.

Identificação devolvida pela API e disponível nos detalhes técnicos:

```text
retriever: local-keyword
```

Cada resposta de adaptação devolve os contextos usados:

```json
{
  "rag": {
    "enabled": true,
    "retriever": "local-keyword",
    "topK": 5,
    "contexts": [
      {
        "title": "Diretrizes de leitura acessível para dislexia",
        "source": "dyslexia_reading_guidelines.md",
        "score": 0.82,
        "contentPreview": "usar frases curtas..."
      }
    ]
  }
}
```

Exemplos de diretrizes:

- usar frases curtas;
- dividir conteúdo em blocos pequenos;
- explicar termos difíceis;
- criar mapas conceituais;
- usar exemplos concretos;
- explicar fórmulas por partes;
- finalizar com revisão ativa.

## IA e fallback

O caminho feliz usa o texto real extraído do PDF.

Se `GEMINI_API_KEY` estiver configurada, o backend tenta gerar JSON estruturado com Gemini. Se a IA falhar ou a chave não estiver configurada, o backend retorna um fallback baseado no texto extraído.

Mensagem registrada nos detalhes técnicos quando isso acontece:

> Não foi possível processar a IA real. Exibindo uma adaptação demonstrativa baseada no texto extraído.

Se o PDF não tiver texto extraível, o app informa que OCR será necessário.

## Limite de páginas

- Limite atual: 10 páginas por adaptação.
- O usuário pode abrir PDFs maiores.
- O bloqueio ocorre apenas no momento de adaptar o trecho.
- O limite existe por performance, custo de IA e foco de estudo.

## Histórico e exportação

Usuários não logados podem abrir PDF, adaptar o trecho atual e baixar o PDF gerado. Eles não veem histórico e nada é persistido como adaptação anterior.

Para a demo, o histórico autenticado fica no `localStorage` do navegador, separado por usuário:

```text
leitor_pdf_adaptacoes:{username}
```

- O histórico só aparece para usuário logado.
- A página de histórico fica em `/historico`.
- O plano gratuito guarda até 5 adaptações salvas por usuário.
- Se já existirem 5 adaptações, a nova adaptação continua visível, mas não é salva até o usuário excluir uma antiga.
- O histórico permite abrir, baixar novamente e excluir adaptações.
- Uma adaptação criada sem login pode ser salva depois se o usuário clicar em **Entrar para salvar**.

O botão de download fica no cabeçalho do material adaptado. Ele mostra estado de geração, evita múltiplos cliques e exibe sucesso ou erro. O PDF exportado é visual e usa cabeçalho, blocos destacados, cards, passos numerados, glossário, mapa visual e quiz.

Em produção, esse histórico pode migrar para o backend vinculado ao usuário.

## Login com Google

O app mantém o login por usuário/senha como fallback e também suporta **Entrar com Google**.

Para habilitar o botão Google:

```env
# frontend/.env
VITE_GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com

# backend/.env
GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
```

Fluxo:

1. O frontend carrega o Google Identity Services.
2. O Google devolve um ID token.
3. O frontend envia o token para `POST /api/auth/google`.
4. O backend valida o token com o Google.
5. Se a conta ainda não existir, o backend cria o usuário automaticamente.
6. O backend devolve o JWT normal do Luz.

Se `VITE_GOOGLE_CLIENT_ID` não estiver configurado, a opção Google aparece na tela, mas informa que a configuração está pendente. O login por usuário/senha continua funcionando como fallback.

## PWA e abertura de PDF

O manifest usa o nome da PWA como `Luz`, com ícones próprios em:

```text
frontend/public/icons/icon-192.png
frontend/public/icons/icon-512.png
```

O manifest inclui:

```json
"file_handlers": [
  {
    "action": "/open",
    "accept": {
      "application/pdf": [".pdf"]
    }
  }
]
```

Em navegadores compatíveis, a PWA instalada pode ser associada à abertura de PDFs. A rota `/open` reutiliza o leitor e o código usa `launchQueue` com checagens seguras para receber o arquivo. Em outros ambientes, a rota mostra fallback e o botão **Abrir PDF** simula esse fluxo para a apresentação.

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7 |
| PWA | Manifest + Service Worker simples |
| Backend | FastAPI, SQLModel, SQLite |
| PDF | PyMuPDF |
| Exportação PDF | Gerador local simples no frontend |
| IA | Google Gemini |
| RAG local | Base Markdown no backend + recuperador `local-keyword` |

## Como rodar

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Crie `backend/.env` se quiser IA real:

```env
GEMINI_API_KEY=sua_chave
SECRET_KEY=uma_chave_segura
GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
```

Sem `GEMINI_API_KEY`, o app ainda roda com fallback baseado no texto extraído.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Para exibir o botão Google no frontend, crie `frontend/.env`:

```env
VITE_GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
```

Acesse:

```text
http://localhost:5173
```

## Build

```powershell
cd frontend
npm run build
```

## Roteiro de apresentação

1. Abrir a PWA em `http://localhost:5173`.
2. Explicar que ela simula um leitor de PDF instalável.
3. Explicar que, instalada em navegador compatível, ela pode aparecer no fluxo **Abrir com**.
4. Clicar em **Abrir PDF** como fallback da demo.
5. Mostrar total de páginas e nome do arquivo.
6. Selecionar intervalo de até 10 páginas.
7. Clicar em **Adaptar trecho**.
8. Mostrar os estados simples de processamento.
9. Mostrar a adaptação visual sem login.
10. Baixar a adaptação em PDF.
11. Mostrar o aviso **Entrar para salvar**.
12. Entrar na conta e abrir `/historico`.
13. Abrir uma adaptação pelo histórico.
14. Excluir uma adaptação antiga.
15. Abrir **Detalhes técnicos da adaptação** para explicar a base de acessibilidade.
16. Testar um intervalo maior que 10 páginas para mostrar o limite.
17. Explicar evoluções: OCR, embeddings, banco vetorial, histórico no backend e leitura em voz alta.

## Evolução futura

- Trocar recuperação lexical por embeddings.
- Usar FAISS, Chroma ou Supabase Vector.
- Adicionar artigos científicos reais com metadados completos.
- Criar ingestão automática de documentos da base.
- Adicionar OCR para PDFs escaneados.
- Salvar histórico por usuário no backend.
- Melhorar exportação com estilos avançados.

## Principais arquivos

```text
frontend/src/pages/PDFLibrary.tsx
frontend/src/pages/HistoryPage.tsx
frontend/src/components/AdaptedStudyMaterial.tsx
frontend/src/services/adaptationPdf.ts
frontend/src/services/adaptationHistory.ts
frontend/src/services/pdfReaderApi.ts
backend/app/rag/retriever.py
backend/app/rag/schemas.py
backend/app/rag/knowledge_base/*.md
backend/app/routers/pdfs.py
backend/app/services/pdf_extractor.py
backend/app/services/pdf_adaptation.py
frontend/public/manifest.webmanifest
frontend/public/sw.js
```
