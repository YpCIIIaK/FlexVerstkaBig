import json
import os
import re

IMG = "/assets/images/program-starter.webp?v=4"

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

TITLE = "Стартовый набор для знакомства с FLEX"

INFO_HEAD = f"""        <div class="stick-info__head">
          <h1 class="stick-info__title stick-info__title--plain set-info__title">Стартовый набор</h1>
          <div class="stick-info__text set-info__text">
            <p>Набор включает в себя устройство FLEX и пять пачек стиков FAIIM</p>
            <p>Набор доступен только для первой покупки</p>
          </div>
        </div>
"""

PRICE = """          <p class="set-info__price">6 900 ₸</p>
"""

NOTE = """            <p class="set-info__note">Доступный FAIIM в наборе:<br />4 зафиксированных – PURPLE MIX, SUNSHINE MIX, YELLOW MIX, SKYGREEN, 5 на выбор</p>
"""

CTA = """          <div class="set-cta">
            <button class="set-cta__fav" type="button" aria-pressed="false" aria-label="Добавить в избранное" data-set-fav><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3C4.239 3 2 5.216 2 7.95C2 10.157 2.875 15.395 11.488 20.69C11.6425 20.7833 11.8195 20.8327 12 20.8327C12.1805 20.8327 12.3575 20.7833 12.512 20.69C21.126 15.395 22 10.157 22 7.95C22 5.216 19.761 3 17 3C14.239 3 12 6 12 6C12 6 9.761 3 7 3Z" /></svg></button>
            <button class="button set-cta__buy" type="button">Купить сейчас</button>
            <button class="button button--ghost set-cta__cart" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 7H6" /><circle cx="10" cy="20" r="1" /><circle cx="17" cy="20" r="1" /></svg>В корзину</button>
          </div>
"""

DESC = f"""    <section class="set-desc" aria-labelledby="set-desc-title">
      <h2 class="section-title" id="set-desc-title">{TITLE}</h2>
      <div class="set-desc__card">
        <p class="set-desc__lead">Набор включает в себя</p>
        <ul class="set-desc__list">
          <li>FLEX – система нагревания табака</li>
          <li>FAIIM PURPLE MIX</li>
          <li>FAIIM SUNSHINE MIX</li>
          <li>FAIIM YELLOW MIX</li>
          <li>FAIIM SKYGREEN</li>
          <li>Дополнительный FAIIM по выбору из ассортимента</li>
        </ul>
      </div>
    </section>
"""


def sub(t, pattern, repl):
    out, n = re.subn(pattern, lambda m: repl, t, count=1, flags=re.S)
    assert n == 1, pattern[:60]
    return out


def main():
    t = open("device.html", encoding="utf-8").read()
    t = t.replace('data-title="FLEX {name} — устройства — Flex"', f'data-title="{TITLE} — Flex"')
    t = t.replace('<main class="stick device"', '<main class="stick device set-page"', 1)
    t = sub(t, r"<title>[^<]*</title>", f"<title>{TITLE} — Flex</title>")
    t = sub(t, r'<meta name="description" content="[^"]*" />',
            '<meta name="description" content="Набор включает в себя устройство FLEX и пять пачек стиков FAIIM." />\n  <meta name="robots" content="noindex, nofollow" />')
    t = sub(t, r'      <a class="breadcrumbs__link" href="/catalog/ustroystva/">Устройства</a>\n      <span class="breadcrumbs__sep" aria-hidden="true">/</span>\n      <span class="breadcrumbs__current" aria-current="page">.*?</span></span>\n',
            '      <span class="breadcrumbs__current" aria-current="page">Стартовый набор</span>\n')
    t = sub(t, r'        <div class="stick-info__head">.*?\n        </div>\n\n        <div class="stick-info__bottom">',
            INFO_HEAD + '\n        <div class="stick-info__bottom">')
    t = sub(t, r'            </div>\n          </div>\n          <a class="button button--ghost stick-info__cta" href="/starter-kit">[^<]*</a>\n',
            "            </div>\n" + NOTE + "          </div>\n" + CTA)
    t = sub(t, r'(        <div class="stick-info__bottom">\n)', r"\g<0>" if False else '        <div class="stick-info__bottom">\n' + PRICE)
    t = sub(t, r'    <section class="stick-benefits".*?    </section>\n(?=\s*<script type="application/json" id="stick-data">)', DESC)
    t = t.replace("header__link--catalog is-current", "header__link--catalog")
    m = re.search(r'(<script type="application/json" id="stick-data">)(.*?)(</script>)', t, re.S)
    data = json.loads(m.group(2))
    for v in data.values():
        v["images"] = [IMG]
    t = t[:m.start(2)] + json.dumps(data, ensure_ascii=False) + t[m.end(2):]
    t = sub(t, r'            <div class="swiper-wrapper">\n.*?\n            </div>\n',
            f'            <div class="swiper-wrapper">\n              <div class="swiper-slide stick-gallery__slide stick-gallery__slide--pack set-gallery__slide">\n                <img src="{IMG}" alt="{TITLE}" width="1208" height="600" fetchpriority="high" />\n              </div>\n            </div>\n')
    open("starter-set.html", "w", encoding="utf-8").write(t)
    print("starter-set.html")


if __name__ == "__main__":
    main()
