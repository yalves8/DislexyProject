# Design: Fluxo de Login, Cadastro e Modal de Configurações

**Data:** 2026-06-26
**Status:** Aprovado

---

## Contexto

A tela de login atual mistura login, cadastro e configurações de leitura numa única página — visualmente pesada e sem fluxo claro. Este redesign separa as responsabilidades em telas dedicadas, com identidade visual acolhedora para o público com dislexia (incluindo crianças e adolescentes).

---

## Decisões de Design

| Decisão | Escolha |
|---|---|
| Layout | Gradiente flutuante com glassmorphism |
| Paleta | Verde-Menta (`#d1fae5 → #a7f3d0 → #bfdbfe`) |
| Tom visual | Acolhedor e amigável |
| Modal de configurações | Somente no primeiro login |
| Flag de primeiro login | `localStorage`: `dislexy_first_login_done_<userId>` |

---

## Fluxo de Navegação

```
/login
  ├─ login OK → checa flag localStorage
  │     ├─ primeiro login  → abre SettingsModal → /library
  │     └─ não é primeiro  → /library diretamente
  └─ "Não tem conta?" → /register
        └─ cadastro OK → SettingsModal (sempre, é o 1º login) → /library
```

---

## Telas

### 1. `/login` — LoginPage

**Visual:**
- Fundo: `linear-gradient(145deg, #d1fae5 0%, #a7f3d0 30%, #bfdbfe 100%)`
- Cartão glassmorphism centralizado: `bg-white/82`, `backdrop-blur-md`, `rounded-3xl`, sombra verde
- Sem label ou tag de título redundante na tela

**Conteúdo do cartão:**
- Ícone 64×64px com gradiente verde→azul, `border-radius: 20px`, emoji 📖
- Título: `"Leitor Dislexy"` — `font-bold text-[#064e3b]`
- Subtítulo: `"Sua leitura acessível"` — `text-[#047857] font-semibold` (contraste visível)
- Campo `Usuário` com `autocomplete="username"`
- Campo `Senha` com `autocomplete="current-password"`
- Botão `→ Entrar` — gradiente `#10b981 → #3b82f6`
- Link `"Não tem conta? Cadastre-se"` → `/register`

**Comportamento:**
- Erro de credenciais: mensagem em vermelho abaixo dos campos
- Loading: botão desabilitado com texto "Entrando..."
- Login OK: verifica flag → SettingsModal ou `/library`

---

### 2. `/register` — RegisterPage

**Visual:** idêntica ao login (gradiente + glassmorphism).

**Conteúdo do cartão:**
- Mesmo ícone e identidade visual
- Título: `"Criar conta"`
- Subtítulo: `"É rápido e gratuito"`
- Campo `Usuário`
- Campo `Senha` com `autocomplete="new-password"`
- Campo `Confirmar Senha` com `autocomplete="new-password"`
- Botão `✓ Criar conta` — mesmo gradiente
- Link `"Já tem conta? Entrar"` → `/login`

**Comportamento:**
- Validação de senha: confirmar senha deve coincidir (frontend, antes de chamar a API)
- Usuário já existente: exibe mensagem de erro da API
- Cadastro OK: faz login automático → SettingsModal → `/library`
- Sem configurações de leitura aqui (movidas para o modal)

---

### 3. `SettingsModal` — Modal de Configurações (primeiro login)

**Trigger:** após login bem-sucedido, se `localStorage.getItem('dislexy_first_login_done_<userId>')` não existir.

**Visual:**
- Overlay: `bg-[#061c44]/55` sobre a biblioteca (que aparece desfocada ao fundo)
- Card branco centralizado, `rounded-2xl`, sombra forte
- Não pode ser fechado com clique no overlay (force o usuário a configurar)

**Conteúdo:**
- Emoji ⚙️ + título `"Configure sua leitura"` + subtítulo `"Personalize antes de começar"`
- **Fonte** (radio visual): OpenDyslexic (padrão) · Comic Sans MS · Arial
- **Régua de leitura** (toggle): ativada por padrão
- **Tamanho da fonte** (slider): 14–28px, padrão 18px
- *(Cor de sobreposição omitida — configuração avançada disponível nos Ajustes durante a leitura)*
- Botão `✓ Começar a Ler` — mesmo gradiente verde→azul

**Comportamento:**
- Botão faz `PUT /api/students/me/settings` com as preferências
- Após salvar: `localStorage.setItem('dislexy_first_login_done_<userId>', '1')`
- Redireciona ou desfaz overlay → usuário vê a biblioteca

---

## Arquitetura de Componentes

### Arquivos novos
| Arquivo | Responsabilidade |
|---|---|
| `src/pages/LoginPage.tsx` | Tela de login (substitui `Login.tsx`) |
| `src/pages/RegisterPage.tsx` | Tela de cadastro dedicada |
| `src/components/SettingsModal.tsx` | Modal de configurações pós-primeiro-login |

### Arquivos modificados
| Arquivo | Mudança |
|---|---|
| `src/App.tsx` | Adiciona rota `/register`, lógica de SettingsModal |
| `src/pages/Login.tsx` | Removido (substituído por `LoginPage.tsx`) |

### Componentes reutilizados
- `ReadingSettings` — usado dentro do `SettingsModal` (sem mudanças)
- `AuthContext` — sem mudanças
- `ProtectedRoute` — sem mudanças

---

## Flag de Primeiro Login

```ts
const FIRST_LOGIN_KEY = (userId: number) => `dislexy_first_login_done_${userId}`

// checar após login
const isFirstLogin = !localStorage.getItem(FIRST_LOGIN_KEY(userId))

// marcar após fechar o modal
localStorage.setItem(FIRST_LOGIN_KEY(userId), '1')
```

Sem mudanças no backend — a flag vive no localStorage do dispositivo.

---

## Validações Frontend

- `RegisterPage`: confirmar senha deve ser igual à senha antes de chamar a API
- Campos obrigatórios: `required` nativo + desabilitar botão durante loading
- Mensagens de erro da API exibidas abaixo dos campos

---

## Paleta de Cores

| Token | Valor | Uso |
|---|---|---|
| Gradiente fundo | `#d1fae5 → #a7f3d0 → #bfdbfe` | Background das telas |
| Verde escuro | `#064e3b` | Títulos principais |
| Verde médio | `#047857` | Subtítulos |
| Verde ação | `#10b981` | Botões, bordas de campos |
| Azul complementar | `#3b82f6` | Fim do gradiente dos botões |
| Overlay | `#061c44/55` | Fundo do SettingsModal |
