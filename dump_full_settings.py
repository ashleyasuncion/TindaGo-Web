import sys

with open('git/TindaGo/morning.html', 'rb') as f:
    morning = f.read()
with open('git/TindaGo/inventory.html', 'rb') as f:
    stock = f.read()

def find_full_a(html, needle_bytes):
    i = html.find(needle_bytes)
    if i < 0:
        return None
    tag_start = html.rfind(b'<a ', 0, i)
    if tag_start < 0:
        return None
    gt = html.find(b'>', tag_start)
    if gt < 0:
        return None
    depth = 0
    end = -1
    for j in range(tag_start, len(html)):
        c = html[j]
        if c == 60:  # b'<'
            depth += 1
        elif c == 62:  # b'>'
            depth -= 1
            if depth == 0 and j > gt:
                end = j + 1
                break
    if end < 0:
        return None
    return html[tag_start:end]

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
    print('=== byte diff ===')
    maxlen = max(len(mb), len(sb))
    for k in range(maxlen):
        b_m = mb[k] if k < len(mb) else None
        b_s = sb[k] if k < len(sb) else None
        if b_m != b_s:
            ta = max(0, k-50); te = min(maxlen, k+50)
            print('first diff at byte', k)
            print('  morning['+str(ta)+':'+str(te)+']:', mb[ta:te])
            print('  stock   ['+str(ta)+':'+str(te)+']:', sb[ta:te])
            break
