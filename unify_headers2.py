import sys

STOCK_FILE = 'git/TindaGo/inventory.html'

def read_file(path):
    with open(path, 'rb') as f:
        return f.read()

def detect_line_ending(data):
    # first line break
    i = data.find(b'\n')
    if i < 0:
        return b'\n'
    if i > 0 and data[i-1:i] == b'\r':
        return b'\r\n'
    return b'\n'

# Reference gear SVG (byte-identical to what's in Stocks) — read from inventory.html
stock_data = read_file(STOCK_FILE)
gear_start = stock_data.find(b'<a class="header-btn" href="setting.html"')
gear_gt = stock_data.find(b'>', gear_start)
gear_close = stock_data.find(b'</a>', gear_gt)
GEAR_SVG_NT = stock_data[gear_start:gear_close + len(b'</a>')]  # no trailing newline

STORE_SVG_NT = b'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>'
TUTORIAL_SVG_NT = b'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'

def build_header(dest, page, title_i18n, title_text, NL):
    # dest, page, title_i18n, title_text are bytes
    return (
        b'<header class="app-header">' + NL +
        b'  <div class="header-left">' + NL +
        b'    <a class="header-btn" id="manageStoreBtn" aria-label="Manage Store" href="' + dest + b'">' + NL +
        b'      ' + STORE_SVG_NT + NL +
        b'    </a>' + NL +
        b'  </div>' + NL +
        b'  <h1 class="header-page-title" id="headerPageTitle" data-i18n="' + title_i18n + b'" style="flex:1;text-align:center;">' + title_text + b'</h1>' + NL +
        b'  <div class="header-actions">' + NL +
        b'    <button class="header-btn header-tutorial-btn" id="headerTutorialBtn" onclick="startTutorial(\'' + page + b'\', true)" aria-label="Tutorial">' + NL +
        b'      ' + TUTORIAL_SVG_NT + NL +
        b'    </button>' + NL +
        b'    ' + GEAR_SVG_NT + NL +
        b'  </div>' + NL +
        b'</header>'
    )

def find_first_header_block(data):
    start = data.find(b'<header')
    if start < 0:
        return None, None, None
    gt = data.find(b'>', start)
    if gt < 0:
        return None, None, None
    closing = data.find(b'</header>', gt)
    if closing < 0:
        return None, None, None
    end = closing + len(b'</header>')
    return start, end, data[start:end]

# CONFIG entries: (page_file_base, dest_href, tutorial_page_arg, i18n_key, title_text)
CONFIGS = [
    (b'orders',    b'morning.html', b'orders',   b'ordersTitle',   b'Mga Order'),
    (b'inventory', b'morning.html', b'inventory',b'stockTitle',    b'Stock'),
    (b'debts',     b'morning.html', b'debts',     b'debtsTitle',    b'Utang'),
    (b'closing',   b'inventory.html', b'closing',  b'pageClosing',  b'Isara'),
]

for pg, dest, page, title_i18n, title_text in CONFIGS:
    p = 'git/TindaGo/' + pg.decode() + '.html'
    data = read_file(p)
    NL = detect_line_ending(data)
    start, end, old_block = find_first_header_block(data)
    if old_block is None:
        print(p + ': NO HEADER FOUND — SKIP')
        continue
    new_block_nt = build_header(dest, page, title_i18n, title_text, b'\n')
    new_block = new_block_nt.replace(b'\n', b'\r\n') if NL == b'\r\n' else new_block_nt
    new_data = data[:start] + new_block + data[end:]
    with open(p, 'wb') as f:
        f.write(new_data)
    print(p + ': replaced header. old=' + str(len(old_block)) + ' new=' + str(len(new_block)) + ' native-LE=' + ('CRLF' if NL==b'\r\n' else 'LF'))

print()
print('=== now verify all 6 main pages ===')
all_main = [
    (b'morning', b'inventory.html', b'pageMorning', b'Umaga'),   # Nav1, neutral, manageStore->inventory
    (b'day',      b'inventory.html', b'pageDay',    b'Araw'),      # Nav1, neutral, manageStore->inventory
    (b'closing',  b'inventory.html', b'pageClosing',b'Isara'),     # Nav1, neutral, manageStore->inventory
    (b'orders',   b'morning.html',   b'ordersTitle',b'Mga Order'), # Nav2, neutral, manageStore->morning
    (b'inventory',b'morning.html',   b'stockTitle', b'Stock'),     # Nav2, neutral, manageStore->morning
    (b'debts',    b'morning.html',   b'debtsTitle', b'Utang'),     # Nav2, neutral, manageStore->morning
]
stock_gear = find_first_header_block(read_file(STOCK_FILE))[2]

for pg, dest, title_i18n, title_text in all_main:
    p = 'git/TindaGo/' + pg.decode() + '.html'
    data = read_file(p)
    start, end, block = find_first_header_block(data)
    text = block.decode('utf-8', errors='replace')
    has_manageStore = ('id="manageStoreBtn"' in text and ('href="' + dest.decode() + '"') in text)
    has_title = ('data-i18n="' + title_i18n.decode() + '"') in text and ('>' + title_text.decode() + '<') in text
    has_tutorial = ('id="headerTutorialBtn"' in text and ("startTutorial('" + pg.decode() + "', true)") in text)
    has_settings = ('href="setting.html"' in text)
    settings_block = text[text.find('href="setting.html"'):]
    settings_block = settings_block[:settings_block.find('</a>') + len('</a>')]
    settings_ok = (settings_block == stock_gear.decode('utf-8', errors='replace'))
    no_back = ('onclick="historyBack()' not in text)
    title_class_ok = ('class="header-page-title"' in text)
    title_style_ok = ('style="flex:1;text-align:center;"' in text)
    no_primary_bg = ('background:var(--primary)' not in text)
    print(pg.decode() + ': manageStore=' + str(has_manageStore) + ' title=' + str(has_title) + ' tutorial=' + str(has_tutorial) + ' settings=' + str(has_settings) + ' settingsEqStock=' + str(settings_ok) + ' noBack=' + str(no_back) + ' titleClass=' + str(title_class_ok) + ' titleStyle=' + str(title_style_ok) + ' noPrimaryBG=' + str(no_primary_bg))
