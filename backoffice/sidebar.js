/* ─── TindaGo Back-Office Shared Sidebar ───
   A single source of truth for the sidebar used across every
   backoffice page. `initSidebar(page)` is called at the end of each
   page's inline script (after DOM is ready). It:
     • injects the <nav class="sidenav"> into #sidenavHost,
     • injects the mobile overlay div,
     • wires the topbar brand (#brandToggle) as the mobile drawer toggle
       and as the desktop collapse toggle,
     • closes the drawer on overlay click / Escape,
     • highlights the current page's nav link.

   It degrades gracefully — if an element is missing it just skips it.
*/
(function () {
  'use strict';

  var NAV_ITEMS = [
    { href: 'dashboard.html', label: 'Dashboard' },
    { href: 'products.html', label: 'Products' },
    { href: 'reports.html', label: 'Reports' },
    { href: 'debts.html', label: 'Debts' },
    { href: 'expenses.html', label: 'Expenses' },
    { href: 'restock.html', label: 'Restock' },
    { href: 'suppliers.html', label: 'Suppliers' }
  ];

  // Returns the current page's filename, e.g. "products.html"
  function currentPage() {
    var path = location.pathname.split('/').pop().split('?')[0];
    return path || '';
  }

  function ensureOverlay() {
    var existing = document.getElementById('sidenavOverlay');
    if (existing) return existing;
    var overlay = document.createElement('div');
    overlay.id = 'sidenavOverlay';
    overlay.className = 'sidenav-overlay';
    document.body.insertBefore(overlay, document.body.firstChild);
    return overlay;
  }

  function buildNav(activePage) {
    var nav = document.createElement('nav');
    nav.id = 'sidenav';
    nav.className = 'sidenav';

    NAV_ITEMS.forEach(function (item) {
      var a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;
      if (item.href === activePage) a.className = 'active';
      nav.appendChild(a);
    });

    return nav;
  }

  function initSidebar(active) {
    var activePage = active || currentPage();
    var brand = document.getElementById('brandToggle');
    var overlay = ensureOverlay();
    var nav = document.getElementById('sidenav');

    if (!nav) {
      nav = buildNav(activePage);
      var host = document.getElementById('sidenavHost');
      if (host) {
        host.appendChild(nav);
      } else {
        // Fallback: no host found — insert the nav as a sibling before .layout
        // so it is NOT a flex child of .layout (which would scroll it away).
        var layout = document.querySelector('.layout');
        if (layout) {
          layout.parentNode.insertBefore(nav, layout);
        } else {
          document.body.appendChild(nav);
        }
      }
    }

    // If nothing matched a nav entry, fall back to marking by URL anyway.
    if (!nav.querySelector('.active')) {
      var links = nav.querySelectorAll('a');
      for (var i = 0; i < links.length; i++) {
        var href = links[i].getAttribute('href') || '';
        if (href === activePage) {
          links[i].classList.add('active');
          break;
        }
      }
    }

    function ensureCloseButton() {
      if (!nav || nav.querySelector('.sidenav-close')) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sidenav-close';
      btn.setAttribute('aria-label', 'Close menu');
      btn.innerHTML = '&times;';
      btn.addEventListener('click', closeMenu);
      nav.insertBefore(btn, nav.firstChild);
    }

    function closeMenu() {
      if (nav) nav.classList.remove('open');
      if (overlay) overlay.classList.remove('show');
      if (brand) brand.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('drawer-open');
    }

    function openMenu() {
      if (!nav) return;
      ensureCloseButton();
      nav.classList.add('open');
      if (overlay) overlay.classList.add('show');
      if (brand) brand.setAttribute('aria-expanded', 'true');
      document.body.classList.add('drawer-open');
      var firstLink = nav.querySelector('a');
      if (firstLink) firstLink.focus();
    }

    function toggleMenu() {
      if (nav && nav.classList.contains('open')) closeMenu();
      else openMenu();
    }

    function setCollapsed(state) {
      if (!nav) return;
      // Desktop: toggle a body class so the shared CSS can hide the rail
      // and expand the content to full width. Mobile: nav is a fixed drawer,
      // so collapsing doesn't apply.
      document.body.classList.toggle('sidebar-collapsed', !!state);
      if (brand) brand.setAttribute('aria-expanded', state ? 'false' : 'true');
    }

    if (overlay) overlay.addEventListener('click', closeMenu);

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (nav && nav.classList.contains('open')) closeMenu();
      if (document.body.classList.contains('sidebar-collapsed')) setCollapsed(false);
    });

    if (brand && nav) {
      brand.addEventListener('click', function (e) {
        e.preventDefault();
        if (window.innerWidth < 769) {
          toggleMenu();
        } else {
          setCollapsed(!document.body.classList.contains('sidebar-collapsed'));
        }
      });
    }

    // If the window is resized up to desktop while the drawer is open,
    // close the drawer and remove the scroll lock so both are consistent.
    var prevWidth = window.innerWidth;
    window.addEventListener('resize', function () {
      var nowWidth = window.innerWidth;
      if (prevWidth < 769 && nowWidth >= 769) {
        closeMenu();
      }
      prevWidth = nowWidth;
    });

    // Expose for any page that wants programmatic control.
    window.sidebarMenu = {
      open: openMenu,
      close: closeMenu,
      toggle: toggleMenu,
      setCollapsed: setCollapsed,
      isOpen: function () { return !!(nav && nav.classList.contains('open')); }
    };
  }

  window.initSidebar = initSidebar;
})();
