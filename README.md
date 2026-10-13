# Flex — вёрстка

Чистые **HTML + CSS + ванильный JS**, без сборщиков. Структура как в RLP Verstka.

## Структура

```
index.html
assets/images/   assets/logo/   assets/fonts/   assets/favicon/   assets/docs/
assets/vendor/            # lenis, swiper, fancybox (pinned)
src/styles/main.css       # только @import в порядке каскада
  ├ vars.css              # токены :root
  ├ fonts.css             # @font-face
  ├ global.css            # reset, базовые стили
  ├ header.css / footer.css
  └ style.css             # блоки страниц; медиа-запросы сразу за блоком
src/lib/main.js           # единый IIFE
```
