import pathlib, re

root = pathlib.Path(r"C:\Users\PLP23-00167\Desktop\Capstone App")
app_js = (root / "git/TindaGo/app.js").read_text(encoding="utf-8", errors="ignore")
morph = (root / "git/TindaGo/checkout_morph.js").read_text(encoding="utf-8", errors="ignore")
html = (root / "git/TindaGo/checkout.html").read_text(encoding="utf-8", errors="ignore")
native_kt = pathlib.Path(root / "git/app/TindaGo_APP/app/src/main/java/com/example/tindago/ui/components/CheckoutCategorySearchField.kt")
vm = pathlib.Path(root / "git/app/TindaGo_APP/app/src/main/java/com/example/tindago/ui/screens/AppViewModel.kt")
models = pathlib.Path(root / "git/app/TindaGo_APP/app/src/main/java/com/example/tindago/data/Models.kt")

print("=== morph checks ===")
checks = [
    ("data-cat", 'data-cat=' in morph),
    ("data-sub", 'data-sub=' in morph),
    ("data-action clear", 'data-action="clear"' in morph),
    ("data-action back", 'data-action="back"' in morph),
    ("delegated dd click", "dd.addEventListener('click'" in morph),
    ("closest", "closest('[data-cat" in morph or 'closest(' in morph),
    ("stopPropagation in selectCheckoutCategory", "selectCheckoutCategory=function(cat,e)" in morph),
    ("stopPropagation in selectCheckoutSubcategory", "selectCheckoutSubcategory=function(sub,e)" in morph),
    ("clearCheckoutCategoryFilter(e)", "clearCheckoutCategoryFilter=function(e)" in morph),
    ("backToCheckoutCategories(e)", "backToCheckoutCategories=function(e)" in morph),
    ("__checkoutCloseDropdown", "__checkoutCloseDropdown" in morph),
    ("__checkoutWrapped", "__checkoutWrapped" in morph),
    ("wrapSelect interval", "wrapSelect" in morph),
    ("remove inline onclick selectCheckoutCategory", "onclick=\"selectCheckoutCategory" not in morph),
    ("remove inline onclick selectCheckoutSubcategory", "onclick=\"selectCheckoutSubcategory" not in morph),
    ("add open after render subcategories (category)", "render('subcategories'); dd.classList.add('open')" in morph),
    ("render subcategories after sub pick sticky", morph.count("render('subcategories')")>=2),
    ("document outside dismiss sc.contains", "if(!sc.contains(e.target)) closeDD()" in morph),
]
for k,v in checks:
    print(f"{'PASS' if v else 'FAIL'}  {k}")

print("\n=== app.js filter checks ===")
print("has getCheckoutFilteredProducts", "getCheckoutFilteredProducts" in app_js)
# extract function
m = re.search(r"function getCheckoutFilteredProducts\(.*?\{.*?\n\}", app_js, re.S)
if m:
    snippet = m.group(0)
    print(snippet[:800])
else:
    # fallback manual
    i=app_js.find("function getCheckoutFilteredProducts")
    print(app_js[i:i+900])

print("\n--- onProductSearch snippet ---")
i=app_js.find("function onProductSearch")
print(app_js[i:i+1200])

print("\n--- selectProduct snippet ---")
i=app_js.find("function selectProduct(")
print(app_js[i:i+1100])

print("\n=== PRODUCT_CATEGORIES / SUBCATEGORIES counts ===")
# categories
import re
mc = re.search(r"var PRODUCT_CATEGORIES\s*=\s*\[(.*?)\]", app_js, re.S)
if mc:
    cats = re.findall(r"'([^']+)'|\"([^\"]+)\"", mc.group(1))
    cats = [a or b for a,b in cats]
    print("categories:", len(cats), cats[:5], "...", cats[-3:])
ms = re.search(r"var PRODUCT_SUBCATEGORIES\s*=\s*\{(.*?)\};", app_js, re.S)
if ms:
    subs_raw = ms.group(1)
    # count categories with subs
    subs = re.findall(r"(\w+):\[", subs_raw)
    print("subcategories keys:", len(subs), subs)
    # count total subs
    vals = re.findall(r"\[(.*?)\]", subs_raw)
    total = sum(v.count(",")+1 if v.strip() else 0 for v in vals)
    print("total subs:", total)

print("\n=== getSampleProducts ===")
i=app_js.find("function getSampleProducts")
if i!=-1:
    print(app_js[i:i+3000])
else:
    i=app_js.find("getSampleProducts")
    print("not found getSampleProducts, search:", app_js.find("sample"))

print("\n=== state.products subcategory sample ===")
# find any product objects literal with subcategory
subs_in_products = re.findall(r"subcategory:\s*'([^']+)'|subcategory:\s*\"([^\"]+)\"", app_js)
print("subcategory literals in app.js:", subs_in_products[:20], "total", len(subs_in_products))
# check assignment loop
i=app_js.find("subcategory")
print(app_js[max(0,i-600):i+1200][:1800])

print("\n=== native ProductCatalog ===")
if models.exists():
    s=models.read_text(encoding="utf-8", errors="ignore")
    # find CATEGORIES
    m=re.search(r"CATEGORIES.*?\[(.*?)\]", s, re.S)
    print("native CATEGORIES snippet:", s[s.find("CATEGORIES"):s.find("CATEGORIES")+600])
    print("native SUBCATEGORIES snippet:", s[s.find("SUBCATEGORIES"):s.find("SUBCATEGORIES")+900])

print("\n=== html structure ===")
print("has checkoutSearchControl", "checkoutSearchControl" in html)
print("has productSuggestions", "productSuggestions" in html)
print("has checkoutCategoryDropdown", "checkoutCategoryDropdown" in html)
# find search-control block
a=html.find("checkoutSearchControl")
print(html[max(0,a-500):a+2000][:2200])

print("\n=== AppViewModel filter parity ===")
if vm.exists():
    s=vm.read_text(encoding="utf-8", errors="ignore")
    idx=s.find("getCheckoutFiltered")
    if idx==-1:
        idx=s.find("subcategory")
    print(s[max(0,idx-800):idx+1800][:2600])
