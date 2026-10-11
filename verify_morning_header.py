with open('git/TindaGo/morning.html', 'rb') as f:
    morning = f.read()
with open('git/TindaGo/inventory.html', 'rb') as f:
    stock = f.read()

def find_full_a(html, needle):
    i = html.find(needle)
    if i < 0:
        return None
    tag_start = html.rfind(b'<a ', 0, i)
    if tag_start < 0:
        return None
    gt = html.find(b'>', tag_start)
    if gt < 0:
        return None
    closing = html.find(b'</a>', gt)
    if closing < 0:
        return None
    return html[tag_start:closing + len(b'</a>')]

sb = find_full_a(stock, b'href="setting.html"')
mb = find_full_a(morning, b'href="setting.html"')

print('=== Settings block comparison ===')
print('MORNING Settings block len:', len(mb))
print('STOCK Settings block len:', len(sb))
print('identical (full blocks, bytes):', mb == sb)
print()

# Confirm the rest of the unified Morning header is intact
text = morning.decode('utf-8', errors='replace')
checks = [
    ('manageStoreBtn id', 'id="manageStoreBtn"'),
    ('manageStore -> inventory.html', 'href="inventory.html"'),
    ('headerTutorialBtn id', 'id="headerTutorialBtn"'),
    ('tutorial onclick', "onclick=\"startTutorial('morning', true)\""),
    ('pageMorning title', 'data-i18n="pageMorning"'),
    ('Settings href', 'href="setting.html"'),
    ('Settings class', 'class="header-btn"'),
    ('Settings style', 'text-decoration:none;color:white;'),
    ('gear SVG present', '<circle cx="12" cy="12" r="3"/>'),
    ('header-page-title class', 'class="header-page-title"'),
]
print('=== Unified Morning header element checks ===')
for label, needle in checks:
    print(('OK  ' if needle in text else 'MISS') + ' ' + label)

print()
print('=== Bottom Nav 1 (Morning) still intact ===')
nav_re = b'<nav class="bottom-nav"[^>]*>[\\s\\S]*?</nav>'
import re
m = re.search(nav_re, morning)
if m:
    nav = m.group(0).decode('utf-8', errors='replace')
    print('bottom nav present:', bool(m))
    for href in ['morning.html', 'setting.html']:
        print(('OK  ' if href in nav else 'MISS') + ' nav ' + href + (' present' if href in nav else ' absent (good)'))
    print('nav has Morning tab:', 'navMorning' in nav)
    print('nav has Day tab:', 'pageDay' in nav)
    print('nav has Closing tab:', 'navClose' in nav)
    print('nav has Orders tab:', 'ordersLink' in nav)
else:
    print('MISS: bottom nav not found')
