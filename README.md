# Client Tracking Plugin (Chrome Extension + Supabase)

Расширение Chrome (Manifest V3) для трекинга клиентов в модальном окне сайта:

- отслеживает появление модалки через `MutationObserver`
- извлекает никнейм клиента из DOM
- делает `GET/POST/PATCH` в Supabase REST API
- внедряет UI рядом с никнеймом (`+` или `i` + tooltip)
- открывает модалку расширения для создания/редактирования записи

## Структура проекта

```text
  manifest.json
  src/
    api/supabase-rest.js
    content/main.js
    content/observer.js
    content/parser.js
    content/ui.js
    options/options.html
    options/options.js
    options/options.css
    state/storage.js
    styles/injected-ui.css
supabase/migrations/001_clients.sql
sandbox.html
```

## 1) Настройка базы данных Supabase

В проекте есть SQL миграция:

- `supabase/migrations/001_clients.sql`

Она создает:

- таблицу `public.clients` (`nickname`, `deal_count`, `comment`, `created_at`, `updated_at`)
- уникальность `nickname`
- триггер автообновления `updated_at`
- RLS + базовые политики для роли `anon` (select/insert/update)

### Как применить SQL

1. Откройте Supabase Dashboard вашего проекта.
2. Перейдите в SQL Editor.
3. Выполните SQL из файла `supabase/migrations/001_clients.sql`.

## 2) Установка расширения в Chrome (Developer Mode)

1. Откройте `chrome://extensions`.
2. Включите **Режим разработчика**(справа сверху).
3. Нажмите **Загрузить распакованное расширение**.
4. Выберите папку:
   - `client-tracking-plugin`

## 3) Настройка расширения (Options page)

Откройте настройки расширения и заполните поля:

- `API URL`: API URL Supabase DB (....supabase.co)
- `API Key`: publishable/anon key вашего проекта (sb_publishable_...)
- `Целевой домен`: домен сайта заказчика, например `crm.example.com`
- `Селектор модального окна`: например `.client-modal`
- `Селектор никнейма`: например `.client-modal .nickname`


## 4) Тестирование на sandbox

Добавлен файл:

- `sandbox.html`

В нем есть тестовая модалка и никнейм, чтобы проверить внедрение UI.

### Как тестировать

1. Запустите локальный сервер из корня проекта (PowerShell):
   - `python -m http.server 5500`
2. Откройте:
   - `http://localhost:5500/sandbox.html`
3. В options укажите:
   - `Целевой домен`: `localhost`
   - `Селектор модального окна`: `.sandbox-client-modal`
   - `Селектор никнейма`: `.sandbox-nickname`
4. Нажмите в sandbox «Открыть карточку клиента».
5. Проверьте сценарии:
   - нет записи -> отображается `+`
   - запись есть -> отображается `i` + tooltip
   - клик по кнопке -> открывается модалка редактирования

### Альтернатива (только для тестов): открыть `sandbox.html` напрямую (file://)

1. Откройте `chrome://extensions`.
2. У карточки расширения временно включите **Allow access to file URLs**.
3. Обновите расширение (кнопка Reload).
4. Откройте `sandbox.html` напрямую (double-click).

## 5) Логика работы

1. Content script запускается на странице.
2. Проверяет домен по `targetDomain` из `chrome.storage.local`.
3. Observer отслеживает появление модалки (`modalSelector`).
4. Из модалки извлекается никнейм (`nicknameSelector`).
5. Выполняется запрос в Supabase:
   - GET клиента по `nickname`
6. UI обновляется:
   - `+` если клиента нет
   - `i` и tooltip если клиент есть
7. При сохранении формы:
   - POST (создание) или PATCH (обновление)
   - затем refetch и обновление состояния UI без перезагрузки страницы

## 6) Что хранится локально

В `chrome.storage.local`:

- `apiUrl`
- `apiKey`
- `targetDomain`
- `modalSelector`
- `nicknameSelector`
- `debug`

Секреты не логируются в консоль расширения.

