import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
exec(open(os.path.join(ROOT, "tools", "news-data.py"), encoding="utf-8").read())


def date_html(date, indent=12):
    return (" " * indent + f'<span class="news-card__date">{date}</span>\n') if date else ""


def card(i, n, tag="article", h="h2"):
    label, cat, date, title, text = n[:5]
    slug = n[5] if len(n) > 5 else None
    img = f'<img class="news-card__img" src="{n[6]}" alt="" width="920" height="463" loading="lazy" />'
    ttl = f'<{h} class="news-card__title">{title}</{h}>'
    if slug:
        img = f'<a class="news-card__media" href="/news/{slug}" tabindex="-1" aria-hidden="true">{img}</a>'
        ttl = f'<{h} class="news-card__title"><a class="news-card__link" href="/news/{slug}">{title}</a></{h}>'
    return f"""      <{tag} class="news-card" data-news data-category="{cat}">
        {img}
        <div class="news-card__body">
          <div class="news-card__meta">
            <span class="news-card__tag">{label}</span>
{date_html(date)}          </div>
          {ttl}
          <p class="news-card__text">{text}</p>
        </div>
      </{tag}>
"""


def article_main(a):
    n = NEWS[a["index"] - 1]
    slides = "".join(
        f'            <div class="swiper-slide"><img class="news-article__img" src="{src}" alt="" width="1130" height="568"'
        + (' fetchpriority="high"' if k == 0 else ' loading="lazy"') + " /></div>\n"
        for k, src in enumerate(a["slides"])
    )
    nav = """        <div class="news-article__nav">
        <button class="news-article__arrow news-article__arrow--prev" type="button" aria-label="Предыдущее фото" data-news-prev><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 15L7.5 10L12.5 5" /></svg></button>
        <button class="news-article__arrow news-article__arrow--next" type="button" aria-label="Следующее фото" data-news-next><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 15L12.5 10L7.5 5" /></svg></button>
        <div class="stick-gallery__dots news-article__dots" data-news-dots></div>
        </div>
""" if len(a["slides"]) > 1 else ""
    body = ('\n      <div class="news-article__body">\n' + a["body"] + "      </div>\n") if a["body"] else ""
    also = "".join(card(i, NEWS[i - 1], "li", "h3") for i in a["also"])
    return f"""  <main class="news news--article" data-news-article>
    <nav class="breadcrumbs" aria-label="Хлебные крошки">
      <a class="breadcrumbs__link" href="/">Главная</a>
      <span class="breadcrumbs__sep" aria-hidden="true">/</span>
      <a class="breadcrumbs__link" href="/news">Новости</a>
      <span class="breadcrumbs__sep" aria-hidden="true">/</span>
      <span class="breadcrumbs__current" aria-current="page">{a['crumb']}</span>
    </nav>

    <article class="news-article">
      <header class="news-article__head">
        <div class="news-card__meta">
          <span class="news-card__tag">{n[0]}</span>
{date_html(n[2], 10)}        </div>
        <h1 class="news-article__title">{a.get("h1", n[3])}</h1>
        <p class="news-article__lead">{a['lead']}</p>
      </header>

      <div class="news-article__gallery">
        <div class="swiper news-article__swiper" data-news-gallery>
          <div class="swiper-wrapper">
{slides}          </div>
        </div>
{nav}      </div>
{body}    </article>

    <section class="news-also" aria-labelledby="news-also-title">
      <h2 class="section-title" id="news-also-title">Читайте также</h2>
      <ul class="news__grid news-also__list">
{also}      </ul>
    </section>
  </main>
"""


def main():
    page = open("news.html", encoding="utf-8").read()
    cards = "".join(card(i, n) for i, n in enumerate(NEWS, 1))
    page, n_sub = re.subn(r'(<div class="news__grid" data-news-grid>\n).*?(    </div>\n\n    <p class="news__empty")',
                  lambda m: m.group(1) + cards + m.group(2), page, flags=re.S)
    assert n_sub == 1
    open("news.html", "w", encoding="utf-8").write(page)

    for a in ARTICLES:
        n = NEWS[a["index"] - 1]
        p = re.sub(r"  <main class=\"news\" data-news-page>.*?  </main>\n", lambda m: article_main(a), page, flags=re.S)
        p = p.replace("<title>Новости — Flex</title>", f"<title>{a.get('h1', n[3])} — Flex</title>")
        p = re.sub(r'<meta name="description" content="[^"]*" />', f'<meta name="description" content="{a["lead"]}" />', p, count=1)
        p = p.replace('<a class="header__menu-link" href="/news" aria-current="page">', '<a class="header__menu-link" href="/news">')
        p = p.replace('  <link rel="stylesheet" href="/src/styles/main.css', '  <link rel="stylesheet" href="/assets/vendor/swiper/swiper-bundle.min.css" />\n  <link rel="stylesheet" href="/src/styles/main.css', 1)
        p = p.replace('  <script src="/src/lib/main.js', '  <script src="/assets/vendor/swiper/swiper-bundle.min.js" defer></script>\n  <script src="/src/lib/main.js', 1)
        os.makedirs("news", exist_ok=True)
        open(os.path.join("news", n[5] + ".html"), "w", encoding="utf-8").write(p)
        print("news/" + n[5] + ".html")


if __name__ == "__main__":
    main()
