with open('git/TindaGo/inventory.html', 'rb') as f:
    stock = f.read()
with open('git/TindaGo/morning.html', 'rb') as f:
    morning = f.read()

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
    end = closing + len(b'</a>')
    return html[tag_start:end]

stock_block = find_full_a(stock, b'href="setting.html"')
morning_block = find_full_a(morning, b'href="setting.html"')

print('STOCK block len:', len(stock_block))
print('MORNING block len:', len(morning_block))
print('identical before:', morning_block == stock_block)
print()

assert stock_block, 'stock block not found'
assert morning_block, 'morning block not found'

out = morning.replace(morning_block, stock_block)
print('new morning len:', len(out), '(was', len(morning), ')')

with open('git/TindaGo/morning.html', 'wb') as f:
    f.write(out)

# verify
after = open('git/TindaGo/morning.html', 'rb').read()
after_block = find_full_a(after, b'href="setting.html"')
print('after fix identical to stock:', after_block == stock_block)
print('after block len:', len(after_block))
print()
print('=== AFTER (morning) Settings block ===')
print(after_block.decode('utf-8', errors='replace'))
