with open('git/TindaGo/inventory.html', 'rb') as f:
    stock = f.read()
with open('git/TindaGo/day.html', 'rb') as f:
    day = f.read()

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

stock_block = find_full_a(stock, b'href="setting.html"')
day_block = find_full_a(day, b'href="setting.html"')

print('STOCK block len:', len(stock_block))
print('DAY block len:', len(day_block))
print('identical before:', day_block == stock_block)
print()

assert stock_block, 'stock block not found'
assert day_block, 'day block not found'

out = day.replace(day_block, stock_block)
print('new day len:', len(out), '(was', len(day), ')')

with open('git/TindaGo/day.html', 'wb') as f:
    f.write(out)

after = open('git/TindaGo/day.html', 'rb').read()
after_block = find_full_a(after, b'href="setting.html"')
print('after fix identical to stock:', after_block == stock_block)
print('after block len:', len(after_block))
print()
print('=== AFTER (day) Settings block ===')
print(after_block.decode('utf-8', errors='replace'))
