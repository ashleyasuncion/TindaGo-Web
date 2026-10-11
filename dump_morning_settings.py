import sys

with open('git/TindaGo/morning.html', 'rb') as f:
    morning = f.read()
with open('git/TindaGo/inventory.html', 'rb') as f:
    stock = f.read()

def block_of_bytes(html, needle_bytes):
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

sb = block_of_bytes(stock, b'href="setting.html"')
mb = block_of_bytes(morning, b'href="setting.html"')

print('=== STOCK settings block (bytes) ===')
print(sb)
print()
print('len:', len(sb))
print()
print('=== MORNING settings block (bytes) ===')
print(mb)
print()
print('len:', len(mb))
print()
print('identical bytes:', mb == sb)
if mb != sb:
    print()
    print('=== byte-by-byte diff ===')
    maxlen = max(len(mb), len(sb))
    for k in range(maxlen):
        mb_byte = mb[k] if k < len(mb) else None
        sb_byte = sb[k] if k < len(sb) else None
        if mb_byte != sb_byte:
            start = max(0, k - 40)
            end = min(maxlen, k + 40)
            print('first diff at byte', k)
            print('  morning['+str(start)+':' + str(end) + ']:', mb[start:end])
            print('  stock   ['+str(start)+':' + str(end) + ']:', sb[start:end])
            break
