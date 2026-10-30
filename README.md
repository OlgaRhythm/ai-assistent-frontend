# ai-assistent-frontend

Веб-интерфейс чата для AI-ассистента поддержки маркетплейса. React + TypeScript + Vite.

Работает с backend-репозиторием [`Market_AI_assistent_backend`](https://github.com/An-Vas/Market_AI_assistent_backend)
через единственный основной эндпоинт `POST /support`, а также использует
`GET /orders` для выбора заказа.

## Возможности интерфейса

- Облачка сообщений: свои (справа) и от ассистента (слева).
- Поле ввода сообщения + кнопка Send (Enter тоже отправляет).
- Когда backend просит уточнить заказ (`type: ORDERINFOREQUEST`), прямо под
  этим сообщением ассистента появляется выпадающий список заказов
  пользователя (`GET /orders?userId=`) и кнопка Apply — выбор сразу
  отправляет backend'у `orderId` выбранного заказа.
- Системные уведомления в чате: ошибки сети/сервера и сообщение о передаче
  диалога оператору (`type: OPERATOR`) — как обычное сообщение ассистента,
  поле ввода при этом не блокируется. Backend не возвращает структурированные
  коды ошибок, только текст — поэтому `src/api/client.ts` сопоставляет
  известные тексты (validation-ошибки, недоступность ML-сервиса, ответ не на
  английском и т.д.) с понятными сообщениями на английском; неизвестные
  ошибки показываются с общим текстом по статусу (4xx/5xx).
- Анимация "assistant is typing" (три пульсирующие точки) на время ожидания
  ответа backend.
- Значок ⚙ в шапке открывает панель: кнопка New conversation (новая сессия)
  и ручная установка `Session ID`. Идентичность пользователя (`userId`)
  приложение получает не отсюда, а из SSO-токена (`?sso_token=` в URL),
  который передаёт маркетплейс — см. `marketplace-mock`.

## Требования

- Node.js 20+ и npm
- Запущенный backend ([`Market_AI_assistent_backend`](https://github.com/An-Vas/Market_AI_assistent_backend))
  на `http://localhost:5005` (порт настраивается в его `.env`)

## Установка и запуск в разработке

```bash
git clone git@github.com:OlgaRhythm/ai-assistent.git
cd ai-assistent
npm install
npm run dev
```

Приложение откроется на `http://localhost:5173`.

Дев-сервер проксирует `/support`, `/orders`, `/hello` на `http://localhost:5005`
(см. `vite.config.ts`), поэтому backend нужно просто запустить отдельно —
настраивать CORS не требуется.

Если backend работает на другом порту/хосте, поменяйте адреса в
`server.proxy` в `vite.config.ts`.

## Запуск в Docker

Фронтенд собирается в статику и раздаётся через nginx, который также
проксирует `/support`, `/orders`, `/hello` на backend — адрес backend'а
настраивается переменной `BACKEND_URL` (подставляется в `nginx.conf.template`
встроенным envsubst-механизмом образа `nginx`).

Самостоятельный запуск (backend уже работает на хосте, например через
`npm run dev` или свой `docker-compose.yml`):

```bash
docker compose up -d --build
```

Приложение откроется на `http://localhost:8080`, обращается к backend на
`http://host.docker.internal:5005` (значение по умолчанию в
`docker-compose.yml`).

### Запуск всего стека сразу (frontend + backend + ML-сервис)

В родительской папке, где лежат все три репозитория как соседние директории
(`Market_AI_assistent_backend`, [`ai-assistant`](https://gitlab.com/Elitra/ai-assistant),
`ai-assistent-frontend`), есть общий `docker-compose.yml`, который поднимает
все три сервиса в одной Docker-сети и связывает их по именам сервисов:

```
ai-assistent/
├── docker-compose.yml          # оркестратор всего стека
├── Market_AI_assistent_backend/
├── ai-assistant/                # ML-сервис (FastAPI + Ollama-клиент)
└── ai-assistent-frontend/
```

```bash
cd ai-assistent   # родительская папка
docker compose up -d --build
```

Поднимутся:
- `frontend` → `http://localhost:8080`
- `backend` → `http://localhost:5005`
- `ml` → `http://localhost:8000`

Ollama не контейнеризована — ML-сервис обращается к ней по адресу
`OLLAMA_BASE_URL` (по умолчанию удалённый адрес коллеги; переопределяется
переменной окружения перед запуском, если нужно использовать локальную
Ollama: `OLLAMA_BASE_URL=http://host.docker.internal:11434 docker compose up -d`).

## Переменные окружения

См. `.env.example`. `VITE_API_BASE_URL` можно оставить пустым — тогда запросы
идут по относительным путям (работает и с dev-прокси, и в проде, если
собранный фронтенд раздаётся тем же backend-сервером из его папки `public/`).

## Сборка для продакшена

```bash
npm run build
```

Содержимое `dist/` можно скопировать в `public/` backend-репозитория, чтобы
раздавать фронтенд с того же origin (тогда CORS не требуется совсем).

## Проверки

```bash
npx tsc --noEmit -p tsconfig.app.json   # типы
npm run lint                            # oxlint
npm run build                           # сборка
```
