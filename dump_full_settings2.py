import sys

def find_full_a(html, needle):
    i = html.find(needle)
    if i < 0:
        return None
    # find the '<a ' that contains this href
    tag_start = html.rfind(b'<a ', 0, i)
    if tag_start < 0:
        return None
    # find the '>' that ends the opening <a ...> tag
    gt = html.find(b'>', tag_start)
    if gt < 0:
        return None
    # find the next '</a>' after that '>'
    closing = html.find(b'</a>', gt)
    if closing < 0:
        return None
    end = closing + len(b'</a>')
    return html[tag_start:end]

with open('git/TindaGo/inventory.html', 'rb') as f:
    stock = f.read()
with open('git/TindaGo/morning.html', 'rb') as f:
    morning = f.read()

sb = find_full_a(stock, b'href="setting.html"')
mb = find_full_a(morning, b'href="setting.html"')

print('=== STOCK full Settings block ===')
print(sb.decode('utf-8', errors='replace'))
print()
print('STOCK len:', len(sb))
print()
print('=== MORNING full Settings block ===')
print(mb.decode('utf-8', errors='replace'))
print()
print('MORNING len:', len(mb))
print()
print('identical (full blocks):', mb == sb)
if mb != sb:
    print()
    print('=== diff ===')
    maxlen = max(len(mb), len(sb))
    for k in range(maxlen):
        b_m = mb[k] if k < len(mb) else None
        b_s = sb[k] if k < len(sb) else None
        if b_m != b_s:
            ta = max(0, k-60); te = min(maxlen, k+60)
            print('first diff at byte', k)
            print('  morning['+str(ta)+':'+str(te)+']:', mb[ta:te])
            print('  stock   ['+str(ta)+':'+str(te)+']:', sb[ta:te])
            break
