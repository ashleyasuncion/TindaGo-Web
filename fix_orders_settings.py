with open('git/TindaGo/inventory.html', 'rb') as f:
    stock = f.read()
with open('git/TindaGo/orders.html', 'rb') as f:
    orders = f.read()

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
orders_block = find_full_a(orders, b'href="setting.html"')

print('STOCK block len:', len(stock_block))
print('ORDERS block len:', len(orders_block))
print('identical before:', orders_block == stock_block)
print()

assert stock_block
assert orders_block

out = orders.replace(orders_block, stock_block)
print('new orders len:', len(out), '(was', len(orders), ')')

with open('git/TindaGo/orders.html', 'wb') as f:
    f.write(out)

after = open('git/TindaGo/orders.html', 'rb').read()
after_block = find_full_a(after, b'href="setting.html"')
print('after fix identical to stock:', after_block == stock_block)
print('after block len:', len(after_block))
