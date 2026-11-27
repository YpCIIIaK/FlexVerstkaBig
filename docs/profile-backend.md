# Профиль: адреса и карты — что доработать на бэкенде

Вёрстка: `account.html` (блоки «Мои адреса», «Мои карты», окна добавления/изменения/удаления). Логика: `src/lib/profile.js`.
Сейчас данные хранятся в `localStorage` (заглушка). Чтобы подключить API, до `profile.js` определите `window.flexProfileApi`:

| Метод | Что делает |
|---|---|
| `listAddresses() → Promise<Address[]>` | Список адресов |
| `saveAddresses(list) → Promise` | Сохранить весь список (добавление, изменение, удаление, «Сделать основным») |
| `listCards() → Promise<Card[]>` | Список карт |
| `saveCards(list) → Promise` | Сохранить (удаление, переименование) |
| `addCard() → Promise` | Открыть форму платёжного провайдера; после возврата фронт перечитает `listCards()` |

```
Address = { id, title, city, street, house, flat, entrance, floor, comment, main: bool }
Card    = { id, brand: "visa" | "mastercard", last4, name, main: bool }
```
Основной адрес/карта — ровно один (`main: true`), фронт это поддерживает.

## Данные профиля
Локально (localhost) профиль заполняется тестовыми данными, без запросов к API. Боевой режим: `/account?live`.

## Проверка
- `/account?profile=empty` — нет адресов и карт
- `/account?profile=filled` — два адреса и две карты, как в макете

# Мои устройства (`/devices`)

Логика: `src/lib/devices.js`. Заглушка в `localStorage`. Для API определите `window.flexDevicesApi`:

| Метод | Что делает |
|---|---|
| `list() → Promise<Device[]>` | Устройства пользователя |
| `register(serial) → Promise` | Регистрация по серийному номеру; ошибка → «Устройство с таким серийным номером не найдено» |
| `remove(id) → Promise` | Отвязать устройство |

```
Device = { id, serial, color: "violet" | "blue" | "gray" | "beige", warranty: "YYYY-MM-DD" }
```

Заглушка: номер вида `FLX12345678` регистрируется, номер на `0000` или другого формата — ошибка.
Проверка: `/devices?devices=empty`, `/devices?devices=filled`.
Ссылка «Диагностика» пока ведёт на `/help`.
