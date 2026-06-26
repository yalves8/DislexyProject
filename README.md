# DilexyProject

Aplicação web para organizar e ler PDFs com foco em acessibilidade. O projeto permite autenticação de usuários, envio de arquivos PDF, extração de texto, adaptação do conteúdo com Gemini e leitura em uma interface com ajustes visuais e régua de leitura.

## O que o projeto faz

- Cadastro e login de usuários com JWT.
- Biblioteca pessoal de PDFs, com listagem, upload, visualização e exclusão.
- Extração do texto do PDF no backend.
- Adaptação do texto com Gemini quando a chave de API está configurada.
- Tela de leitura com fonte configurável, tamanho de texto, cor de sobreposição, régua de leitura e controle de leitura em voz alta pelo navegador.
- Interface frontend com suporte a PWA.

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7 |
| Backend | FastAPI, SQLModel, SQLite |
| Autenticação | JWT, bcrypt |
| PDF | PyMuPDF |
| IA | Google Gemini |

## Estrutura

```text
DislexyProject/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── auth.py
│   │   ├── database.py
│   │   ├── models/
│   │   ├── routers/
│   │   └── services/
│   ├── seed.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   └── services/
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Requisitos

- Python 3.11+
- Node.js 18+
- npm
- Chave `GEMINI_API_KEY` para adaptação de PDF via Gemini

## Variáveis de ambiente

### Backend

Crie `backend/.env` com algo assim:

```env
GEMINI_API_KEY=sua_chave_aqui
SECRET_KEY=troque_por_uma_chave_secreta_longa
# DATABASE_URL=sqlite:///./dilexy.db
```

### Frontend

Em desenvolvimento, pode deixar `VITE_API_URL` vazio para usar o proxy do Vite. Em produção, aponte para o backend, sem o sufixo `/api`.

```env
# VITE_API_URL=http://localhost:8000
```

## Como rodar localmente

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

O backend fica disponível em `http://localhost:8000` e a documentação em `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend fica disponível em `http://localhost:5173`.

### Build de produção do frontend

```bash
cd frontend
npm run build
```

Se o diretório `frontend/dist` existir, o FastAPI também consegue servir os arquivos estáticos do frontend.

## Credenciais de teste

Depois de rodar `python seed.py`, ficam disponíveis estes usuários:

- `professor` / `senha123`
- `aluno` / `senha123`

## Rotas da API

Todas as rotas abaixo estão expostas com o prefixo `/api`.

### Autenticação

- `POST /api/auth/register` - cria uma conta
- `POST /api/auth/login` - autentica e retorna JWT

### Configurações de leitura

- `GET /api/students/me/settings` - busca as preferências atuais
- `PUT /api/students/me/settings` - atualiza as preferências

### PDFs

- `POST /api/pdfs/upload` - envia um PDF e salva o texto extraído/adaptado
- `GET /api/pdfs` - lista os PDFs do usuário logado
- `GET /api/pdfs/{id}` - busca um PDF específico
- `DELETE /api/pdfs/{id}` - remove um PDF

### Saúde

- `GET /health` - status do backend

## Fluxo da interface

- `/login` - tela de login
- `/register` - cadastro
- `/library` - biblioteca de PDFs
- `/library/:pdfId` - leitura do PDF selecionado

## Observações

- O app usa áudio do navegador para leitura em voz alta.
- As preferências de leitura são salvas por usuário logado.
- O texto adaptado depende da disponibilidade da `GEMINI_API_KEY`; sem ela, o backend usa o texto original como fallback.
