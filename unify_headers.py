import sys

STOCK_FILE = 'git/TindaGo/inventory.html'
GEAR_SVG = None  # will be read from Stocks reference

def read_file(path):
    with open(path, 'rb') as f:
        return f.read()

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
    old_block = data[start:end]
    return start, end, old_block

def detect_line_ending(data):
    # detect native line ending by looking at the first line break after <!DOCTYPE
    doctype_end = data.find(b'>')
    if doctype_end < 0:
        return b'\n'
    rest = data[doctype_end+1:doctype_end+4]
    if rest.startswith(b'\r\n'):
        return b'\r\n'
    if rest.startswith(b'\n'):
        return b'\n'
    return b'\n'

def le(data, le_bytes):
    return data.replace(b'\r\n', b'\n').replace(b'\n', le_bytes)

# Read Stock reference for the gear SVG (byte-identical)
stock_data = read_file(STOCK_FILE)
stock_block = find_first_header_block(stock_data)[2]
# extract the gear <a ...>...</a> from the stock header's header-actions
stock_actions_start = stock_block.find(b'<div class="header-actions">')
stock_actions_end = stock_block.find(b'</div>\r\n', stock_actions_start)
if stock_actions_end < 0:
    stock_actions_end = stock_block.find(b'</div>\n', stock_actions_end)
    if stock_actions_end < 0:
        stock_actions_end = stock_block.find(b'</div>', stock_actions_start)
stock_actions = stock_block[stock_actions_start:stock_actions_end]
# the gear <a ...>...</a> is the last <a> in the actions
gear_a_start = stock_actions.rfind(b'<a ')
gear_a_gt = stock_actions.find(b'>', gear_a_start)
gear_close = stock_actions.find(b'</a>', gear_a_gt)
gear_block = stock_actions[gear_a_start:gear_close + len(b'</a>')]
GEAR_SVG = gear_block
print('Gear SVG (from Stocks, byte-identical reference):')
print(GEAR_SVG.decode('utf-8', errors='replace'))
print('gear len:', len(GEAR_SVG))
print()

STORE_SVG = b'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>'
TUTORIAL_SVG = b'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'

# Per-file config: (file, dest, page, title_i18n, title_text)
CONFIGS = [
    ('orders',    'morning.html', 'orders',   'ordersTitle', 'Mga Order'),
    ('inventory', 'morning.html', 'inventory','stockTitle',  'Stock'),
    ('debts',     'morning.html', 'debts',     'debtsTitle',  'Utang'),
    ('closing',   'inventory.html','closing',  'pageClosing', 'Isara'),
]

NL = {True: b'\r\n', False: b'\n'}

for pg, dest, page, title_i18n, title_text in CONFIGS:
    p = 'git/TindaGo/' + pg + '.html'
    data = read_file(p)
    start, end, old_block = find_first_header_block(data)
    if old_block is None:
        print(p + ': COULD NOT FIND HEADER BLOCK — SKIP')
        continue
    # detect native line ending from the file (first line break after doctype)
    le_bytes = detect_line_ending(data)
    L = 'CRLF' if le_bytes == b'\r\n' else 'LF'
    print(p + '.html: native line-ending = ' + L)

    nl = NL[le_bytes == b'\r\n']
    # build new header using this line-ending style
    new_block = (
        b'<header class="app-header">' + nl +
        b'  <div class="header-left">' + nl +
        b'    <a class="header-btn" id="manageStoreBtn" aria-label="Manage Store" href="' + dest.encode() + b'">' + nl +
        b'      ' + STORE_SVG + nl +
        b'    </a>' + nl +
        b'  </div>' + nl +
        b'  <h1 class="header-page-title" id="headerPageTitle" data-i18n="' + title_i18n.encode() + b'" style="flex:1;text-align:center;">' + title_text.encode() + b'</h1>' + nl +
        b'  <div class="header-actions">' + nl +
        b'    <button class="header-btn header-tutorial-btn" id="headerTutorialBtn" onclick="startTutorial(\'' + page.encode() + b'\', true)" aria-label="Tutorial">' + nl +
        b'      ' + TUTORIAL_SVG + nl +
        b'    </button>' + nl +
        b'    ' + GEAR_SVG.replace(b'\r\n', nl).replace(b'\n', nl) + nl +
        b'  </div>' + nl +
        b'</header>'
    )
    # replace
    new_data = data[:start] + new_block + data[end:]
    with open(p, 'wb') as f:
        f.write(new_data)
    print('  replaced header block (old len ' + str(len(old_block)) + ' -> new len ' + str(len(new_block)) + ')')
    print('  new header:')
    print(new_block.decode('utf-8', errors='replace'))
    print()

print('DONE — all 4 main pages unified.')
