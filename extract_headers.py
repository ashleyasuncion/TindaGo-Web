import sys, re

def find_first_header(html_bytes):
    # find first '<header'
    start = html_bytes.find(b'<header')
    if start < 0:
        return None, None
    # find the matching </header>
    depth = 0
    end = -1
    for j in range(start, len(html_bytes)):
        c = html_bytes[j:j+1]
        if c == b'<'[0]:
            # check if this is a closing tag </header>
            if html_bytes[j:j+9] == b'</header>':
                depth -= 1
                if depth == 0:
                    end = j + len(b'</header>')
                    break
            else:
                depth += 1
        # note: we don't decrement for other > because only <tag> matters; but to be safe,
        # we treat any '>' that is not part of a tag opening as neutral.
        # Actually simpler: count < and > as open/close of tags.
    # simpler robust approach:
    return None, None

# Robust: find first <header, then find next </header> after it.
def first_header_block(html_bytes):
    start = html_bytes.find(b'<header')
    if start < 0:
        return None
    gt = html_bytes.find(b'>', start)
    if gt < 0:
        return None
    closing = html_bytes.find(b'</header>', gt)
    if closing < 0:
        return None
    end = closing + len(b'</header>')
    return html_bytes[start:end]

files = ['orders', 'inventory', 'debts', 'closing']
for pg in files:
    p = 'git/TindaGo/' + pg + '.html'
    data = open(p, 'rb').read()
    block = first_header_block(data)
    print('==========', pg + '.html ==========');
    print('header block len:', len(block) if block else None)
    print(block.decode('utf-8', errors='replace') if block else '(none)')
    print()
