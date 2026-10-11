import sys

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

with open('git/TindaGo/day.html', 'rb') as f:
    day = f.read()
with open('git/TindaGo/inventory.html', 'rb') as f:
    stock = f.read()

db = find_full_a(day, b'href="setting.html"')
sb = find_full_a(stock, b'href="setting.html"')

print('=== DAY full Settings block ===')
print(db.decode('utf-8', errors='replace'))
print()
print('DAY len:', len(db))
print()
print('=== STOCK full Settings block ===')
print(sb.decode('utf-8', errors='replace'))
print()
print('STOCK len:', len(sb))
print()
print('identical (full blocks):', db == sb)
if db != sb:
    print()
    print('=== byte diff ===')
    maxlen = max(len(db), len(sb))
    for k in range(maxlen):
        b_d = db[k] if k < len(db) else None
        b_s = sb[k] if k < len(sb) else None
        if b_d != b_s:
            ta = max(0, k-70); te = min(maxlen, k+70)
            print('first diff at byte', k)
            print('  DAY['+str(ta)+':'+str(te)+']:', db[ta:te])
            print('  STOCK['+str(ta)+':'+str(te)+']:', sb[ta:te])
            break
    else:
        print('blocks differ in length only:', len(db), 'vs', len(sb))
        # if one is prefix of other, show tail
        if db[:len(sb)] == sb:
            print('DAY has STOCK as prefix; DAY tail:', db[len(sb):])
        elif sb[:len(db)] == db:
            print('STOCK has DAY as prefix; STOCK tail:', sb[len(db):])
