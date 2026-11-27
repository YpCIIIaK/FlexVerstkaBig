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
