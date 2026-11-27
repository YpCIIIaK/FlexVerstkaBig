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

# Мои покупки (`/purchases`)

Логика: `src/lib/orders.js`. Для API определите `window.flexOrdersApi.list() → Promise<Order[]>`:

```
Order = { id, date: "YYYY-MM-DD", channel: "online" | "store", status: "courier" | "received" | "canceled" | "processing", items: ["gray", "yellow", ...] }
```
Сейчас `items` — ключи товаров из справочника в `orders.js`; на бэкенде лучше отдавать `{ name, img, price }` по каждой позиции.
Кнопки «Повторить заказ», «Показать чек», «Подробнее» пока без действий (карточка заказа — следующий шаг).
Проверка: `/purchases?orders=empty`, `/purchases?orders=filled`.

# Карточка заказа (`/order?id=…`)

Логика: `src/lib/order-page.js` (данные берёт через `window.flexOrders.find(id)` из `orders.js`).
Сейчас этапы доставки, адрес, магазин, способ и дата оплаты — заглушки, считаются от даты заказа.
От бэкенда нужно по заказу: позиции `{ name, kind, color|taste, img, price }`, стоимость доставки, история статусов `[{ status, at }]`, адрес доставки или магазин, способ оплаты (`brand`, `last4`), дата оплаты, ссылка на электронный чек.

Состояния:
- онлайн, в пути — `/order?id=10458` (текущий шаг «Передан курьеру»)
- в магазине — `/order?id=10457` (вместо «Доставка» блок «Место покупки»)
- отменён — `/order?id=10456` (шаг «Заказ отменён», оплата «Возвращено»)
- доставлен — статус `received` у онлайн-заказа
