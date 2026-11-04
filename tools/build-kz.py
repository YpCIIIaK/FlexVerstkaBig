import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = [
    "index.html", "about.html", "catalog.html", "stick.html", "device.html", "faiim.html",
    "starter-kit.html", "referral.html", "404.html", "account.html", "favorites.html",
    "settings.html", "login.html",
]
DOC_DIRS = ("terms/", "privacy/", "cookie/", "consent/", "referral-rules/", "starter-kit-rules/")

T = {
    "О Бренде": "Бренд туралы",
    "О бренде": "Бренд туралы",
    "Каталог": "Каталог",
    "Программы": "Бағдарламалар",
    "Помощь": "Көмек",
    "Графический UI-дисплей": "Графикалық UI-дисплей",
    "Графический": "Графикалық",
    "Визуализация статуса, режима и уровня заряда": "Статусты, режимді және заряд деңгейін визуализациялау",
    "Функция паузы": "Үзіліс функциясы",
    "Опция поставить сеанс “на паузу” и продолжить, когда необходимо": "Сеансты «үзіліс» және қажет болған жағдайда жалғастыру мүмкіндігі",
    "Два режима работы": "Екі жұмыс режимі",
    "Возможность переключения между Классическим и Сбалансированным сеансами использования": "Классикалық және теңгерімді пайдалану сеанстары арасында ауысу мүмкіндігі",
    "Быстрая зарядка": "Жылдам қуаттау",
    "До 50% за тридцать минут*, сокращая время ожидания": "Күту уақытын қысқарта отырып, отыз минутта 50%-ға дейін*",
    "До 50% за тридцать минут, сокращая время ожидания": "Күту уақытын қысқарта отырып, отыз минутта 50%-ға дейін",
    "*При использовании оригинального кабеля питания и рекомендованного блока": "*Түпнұсқа қуаттандыру кабелін және ұсынылған блокты пайдаланған жағдайда",
    "Линейка устройств FLEX": "FLEX құрылғылар желісі",
    "Одна технология — четыре цвета": "Бір технология — төрт түс",
    "Фиолетовый Песок": "Күлгін Құм",
    "Синий Металлик": "Көк металлик",
    "Серый Металлик": "Сұр металлик",
    "Бежевый Песок": "Сарғыш құм",
    "FLEX Фиолетовый Песок": "FLEX Күлгін Құм",
    "FLEX Синий Металлик": "FLEX Көк металлик",
    "FLEX Серый Металлик": "FLEX Сұр металлик",
    "FLEX Бежевый Песок": "FLEX Сарғыш құм",
    "Линейка вкусов FAIIM": "FAIIM дәмдер топтамасы",
    "Табачный бленд с нотами тропических фруктов и капсулой": "Тропикалық жемістердің хош иісі бар темекі бленді және капсула",
    "Табачный бленд с ягодными нотами и капсулой с ментолом": "Жидек ноталары бар темекі бленді және ментол капсуласы",
    "Табачный бленд с фруктовыми нотами и цитрусовой капсулой": "Жеміс ноталары бар темекі бленді және цитрус дәмі бар капсула",
    "Классический табачный бленд с мятным акцентом": "Жалбыз дәмі бар классикалық темекі бленді",
    "Насыщенность": "Қанықтылық",
    "Ментол": "Ментол",
    "Капсула": "Капсула",
    "Программы FLEX": "FLEX бағдарламалары",
    "Стартовый набор": "Старттық жиынтық",
    "Устройство и стики в наборе для быстрого старта": "Жылдам іске қосуға арналған жиынтықтағы құрылғы мен стиктер",
    "Реферальная программа": "Рефералды бағдарлама",
    "Участие в программе рекомендации FLEX": "FLEX ұсынымдар бағдарламасына қатысу",
    "Узнать больше": "Көбірек білу",
    "Магазины Flex рядом": "FLEX дүкендері жақын маңда",
    "Магазины рядом": "FLEX дүкендері жақын маңда",
    "Стики": "Стиктер",
    "Устройства": "Құрылғылар",
    "Новости": "Жаңалықтар",
    "Контакты": "Байланыс",
    "Условия использования сайта": "Сайтты пайдалану шарттары",
    "Политика конфиденциальности": "Құпиялылық саясаты",
    "Политика файлов Cookie": "Cookie файлдарын пайдалану саясаты",
    "Документы": "Құжаттар",
    "Согласие на сбор, обработку и хранение перс.данных": "Жеке деректерді жинауға, өңдеуге және сақтауға келісім",
    "Как работает FLEX": "FLEX қалай жұмыс істейді",
    "Нагрев без горения": "Жанусыз қыздыру",
    "Снижение запаха": "Иістің азаюы",
    "Оттенки устройств FLEX": "FLEX құрылғыларының реңктері",
    "Открыть карту": "Картаны ашу",
    "Смотреть в каталоге": "Каталогты көру",
    "Как это работает": "Қалай жұмыс істейді",
    "Вы и Новый пользователь получаете вознаграждение": "Сіз және жаңа пайдаланушыға сыйақы беріледі",
    "ФИО, ИИН, пол и дата рождения не подлежат редактированию": "Аты-Жөні, ЖСН және туған күні өзгертілмейді",
    "В избранном пока ничего нет": "Әзірге таңдаулылар бөлімінде ештеңе жоқ",
    "Система нагревания табака": "Темекіні қыздыру жүйесі",
    "Часто задаваемые вопросы": "Жиі қойылатын сұрақтар",
    "Стартовый набор FLEX": "FLEX старттық жиынтық",
    "Всё необходимое для первого знакомства с FLEX — в одном комплекте. Устройство и стики по выгодной цене": "FLEX-пен алғашқы танысу үшін қажеттінің барлығы бір жиынтықта. Құрылғы мен стиктер тиімді бағамен ұсынылады",
    "* Стартовый набор доступен только в официальных магазинах FLEX": "*Старттық жиынтық тек FLEX ресми дүкендерінде қолжетімді.",
    "*Доступен только в официальных магазинах FLEX. Изображение товара может отличаться от фактического внешнего вида": "*Старттық жиынтық тек FLEX ресми дүкендерінде қолжетімді.",
    "Главная": "Басты бет",
    "FLEX в деталях": "FLEX туралы толығырақ",
    "Усовершенствованная технология нагрева табака без процесса горения, пепла и дыма": "Темекіні жану процесінсіз, күлсіз және түтінсіз қыздырудың жетілдірілген технологиясы",
    "Оптимизированная технология, которая уменьшает характерный запах нагреваемого табака": "Қыздырылатын темекіге тән ерекше иісті азайтатын оңтайландырылған технология",
    "Все товары": "Барлық тауарлар",
    "Подробнее": "Толығырақ",
    "Где купить FLEX?": "FLEX-ты қайдан сатып алуға болады?",
    "Где купить FAIIM?": "FAIIM-ды қайдан сатып алуға болады?",
    "Список магазинов FLEX": "FLEX дүкендерінің тізімі",
    "Какие стики совместимы с устройством FLEX?": "FLEX құрылғысымен қандай стиктер үйлесімді?",
    "Устройство FLEX разработано для использования только с табачными стиками FAIIM": "FLEX құрылғысы тек FAIIM темекі стиктерімен ғана пайдалануға арналған",
    "Что делать, если устройство работает некорректно?": "Құрылғы дұрыс жұмыс істемесе не істеу керек?",
    "Стартовый набор для знакомства с FLEX": "FLEX өнімімен танысуға арналған старттық жиынтық",
    "Набор включает в себя устройство FLEX и пять пачек стиков FAIIM": "Жиынтыққа FLEX құрылғысы және бес қорап FAIIM стигі кіреді",
    "Доступен только для первой покупки устройства": "Тек құрылғыны алғаш рет сатып алған кезде ғана қолжетімді",
    "Полные условия программы": "Бағдарламаның толық шарттары",
    "Программа рекомендации FLEX": "FLEX ұсынымдар бағдарламасы",
    "Ваш реферальный код": "Сіздің рефералды кодыңыз",
    "Вы можете поделиться своим кодом рекомендации": "Сіз өзіңіздің рефералды кодыңызбен бөлісе аласыз",
    "Новый пользователь приобретает своё первое устройство FLEX с Вашим кодом рекомендации": "Жаңа пайдаланушы өзінің алғашқы FLEX құрылғысын сіздің рефералды кодыңыз арқылы сатып алады",
    "Вы и Новый пользователь получаете вознаграждение – 1000 баллов Яндекс Плюс": "Сіз және жаңа пайдаланушы сыйақы ретінде 1000 Яндекс Плюс балын аласыз",
    "Страница не найдена": "Бет табылмады",
    "Похоже, такой страницы не существует или она была перемещена": "Мұндай бет жоқ немесе ол басқа жерге көшірілген сияқты",
    "На главную": "Басты бетке",
    "Перейти в каталог": "Каталогқа өту",
    "Личный кабинет": "Жеке кабинет",
    "Профиль": "Профиль",
    "Избранное": "Таңдаулылар",
    "Настройки": "Баптаулар",
    "Данные": "Деректер",
    "Имя": "Аты",
    "Телефон": "Телефон нөмірі",
    "Дата рождения": "Туған күні",
    "Дата регистрации": "Тіркелген күні",
    "Email": "Email",
    "Изменить": "Өзгерту",
    "Для изменения номера телефона обратитесь в поддержку по номеру 7707": "Телефон нөмірін өзгерту үшін 7707 нөмірі бойынша қолдау қызметіне хабарласыңыз",
    "Выйти из аккаунта": "Аккаунттан шығу",
    "Сохранённые товары": "Сақталған тауарлар",
    "Язык интерфейса": "Интерфейс тілі",
}


def norm(s):
    s = html.unescape(s).replace("\xa0", " ").replace("–", "—").replace("ё", "е")
    s = re.sub(r"\s+", " ", s).strip().rstrip(".").strip()
    return s.casefold()


TN = {norm(k): v for k, v in T.items()}
CYR = re.compile(r"[А-Яа-яЁё]")
KZ_ONLY = re.compile(r"[ӘәҒғҚқҢңӨөҰұҮүҺһІі]")


def translate(text):
    key = norm(text)
    if not key or key not in TN:
        return None
    lead = re.match(r"^\s*", text).group(0)
    tail = re.search(r"\s*$", text).group(0)
    core = html.unescape(text).strip()
    out = TN[key]
    if core.endswith(".") and not out.endswith("."):
        out += "."
    return lead + html.escape(out, quote=False) + tail


def rewrite_paths(src):
    def fix(m):
        attr, q, url = m.group(1), m.group(2), m.group(3)
        if attr == "href" and url.startswith("/") and not url.startswith("/kz/"):
            page = re.split(r"[?#]", url[1:])[0]
            if page == "" or page + ".html" in PAGES or page.startswith("catalog/"):
                return f'{attr}={q}/kz{url}'
            return m.group(0)
        if re.match(r"^(https?:|mailto:|tel:|#|/|data:|javascript:)", url):
            return m.group(0)
        if url.startswith(("assets/", "src/")) or url.startswith(DOC_DIRS):
            return f'{attr}={q}../{url}'
        page = url.split("#")[0].split("?")[0]
        if page.endswith(".html") and page not in PAGES:
            return f'{attr}={q}../{url}'
        if re.fullmatch(r"[\w-]+", page) and page + ".html" not in PAGES and os.path.exists(os.path.join(ROOT, page + ".html")):
            return f'{attr}={q}../{url}'
        return m.group(0)
    src = re.sub(r'\b(href|src|srcset|poster|data-[a-z-]+)=(["\'])([^"\']*)', fix, src)
    src = re.sub(r'"(assets/[^"]+)"', r'"../\1"', src)
    return src


def process(name):
    src = open(os.path.join(ROOT, name), encoding="utf-8").read()
    src = src.replace('<html lang="ru">', '<html lang="kk">', 1)
    src = re.sub(r'(<button class="header__lang"[^>]*aria-label=")[^"]*("[^>]*>\s*<img[^>]*>\s*)RU', r'\1Тіл: қазақша\2KZ', src)
    src = src.replace('<button class="lang-switch__btn is-active" type="button" role="radio" aria-checked="true">RU</button>', '<button class="lang-switch__btn" type="button" role="radio" aria-checked="false">RU</button>')
    src = src.replace('<button class="lang-switch__btn" type="button" role="radio" aria-checked="false">KZ</button>', '<button class="lang-switch__btn is-active" type="button" role="radio" aria-checked="true">KZ</button>')
    src = src.replace('Похоже, такой страницы не существует или она была перемещена. Вернитесь', 'Мұндай бет жоқ немесе ол басқа жерге көшірілген сияқты. Вернитесь')
    if name == "catalog.html":
        src = src.replace('href="starter-kit">Узнать больше</a>', 'href="starter-kit">Толығырақ</a>').replace('href="/starter-kit">Узнать больше</a>', 'href="/starter-kit">Толығырақ</a>')
    src = re.sub(r'assets/video/details-(pause|display|modes|charge-wide|charge)(\.mp4|-poster\.webp)', r'assets/video/details-kz-\1\2', src)
    src = src.replace('assets/video/main-hero-ru-mobile.mp4', 'assets/video/main-hero-kz-mobile.mp4').replace('assets/video/main-hero-ru-mobile.jpg', 'assets/video/main-hero-kz-mobile.jpg')
    src = src.replace('assets/video/main-hero-ru.mp4', 'assets/video/main-hero-kz2.mp4').replace('assets/video/main-hero-ru.jpg', 'assets/video/main-hero-kz2.jpg')
    src = src.replace('Оттенки устройств<br />FLEX', 'FLEX құрылғыларының<br />реңктері')
    src = re.sub(
        r'(<p class="(?:callout|feature-slide)__text">)Возможность переключения между сеансами использования:</p>\s*<ul class="(?:callout|feature-slide)__list">.*?</ul>',
        r'\1Классикалық және теңгерімді пайдалану сеанстары арасында ауысу мүмкіндігі</p>', src, flags=re.S)
    src = src.replace('href="referral-rules/"', 'href="referral-rules/kz/"').replace('href="starter-kit-rules/"', 'href="starter-kit-rules/kz/"')
    src = src.replace('href="/referral-rules/"', 'href="/referral-rules/kz/"').replace('href="/starter-kit-rules/"', 'href="/starter-kit-rules/kz/"')
    src = re.sub(
        r'Обратиться по номеру телефона (<a href="tel:7707">7707</a>) или в официальный магазин FLEX',
        r'\1 телефон нөміріне немесе ресми FLEX дүкеніне хабарласыңыз', src)
    missing = []

    def json_fix(m):
        data = json.loads(m.group(2))
        for item in data.values():
            for k in ("name", "text", "heading"):
                if isinstance(item.get(k), str):
                    t = translate(item[k])
                    if t is not None:
                        item[k] = html.unescape(t)
                    elif CYR.search(item[k]):
                        missing.append(item[k])
        return m.group(1) + json.dumps(data, ensure_ascii=False) + m.group(3)
    src = re.sub(r'(<script type="application/json" id="stick-data">)(.*?)(</script>)', json_fix, src, flags=re.S)

    parts = re.split(r'(<script\b.*?</script>|<style\b.*?</style>|<[^>]+>)', src, flags=re.S)
    in_title = False
    for i, p in enumerate(parts):
        if p.startswith("<"):
            if p.startswith("<title"):
                in_title = True
            elif p.startswith("</title"):
                in_title = False
            parts[i] = re.sub(
                r'\b(alt|aria-label|title|placeholder|content)="([^"]*)"',
                lambda m: f'{m.group(1)}="{html.escape(html.unescape(translate(m.group(2))), quote=True)}"' if translate(m.group(2)) else m.group(0),
                p)
            continue
        if not CYR.search(p):
            continue
        if in_title:
            head, _, tail = p.partition(" — ")
            t = translate(head)
            if t:
                parts[i] = t.strip() + (" — " + tail if tail else "")
            continue
        t = translate(p)
        if t is not None:
            parts[i] = t
        elif not KZ_ONLY.search(p):
            missing.append(re.sub(r"\s+", " ", html.unescape(p)).strip())
    out = rewrite_paths("".join(parts))
    os.makedirs(os.path.join(ROOT, "kz"), exist_ok=True)
    open(os.path.join(ROOT, "kz", name), "w", encoding="utf-8").write(out)
    return list(dict.fromkeys(missing))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    report = {}
    for p in PAGES:
        report[p] = process(p)
    for p, items in report.items():
        print(f"== {p} ({len(items)})")
        for s in items:
            print("  -", s)
