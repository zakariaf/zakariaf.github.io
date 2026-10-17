// zakaria.dev motion: everything here is decoration over a page that already works without it.
(function () {
  'use strict';
  var calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var fine = !!(window.matchMedia && matchMedia('(pointer: fine)').matches);
  var root = document.documentElement;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var clamp = function (x, a, b) { return Math.min(b, Math.max(a, x)); };

  // Theme: follows the system until the visitor picks one.
  var themeBtn = $('#themeBtn');
  function isDark() { var t = root.getAttribute('data-theme'); return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; }
  function paint() { if (themeBtn) themeBtn.textContent = isDark() ? 'Light' : 'Dark'; }
  paint();
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('zd-theme', next); } catch (e) {}
    paint();
  });

  // Headings rise in word by word.
  $$('.split').forEach(function (el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span'); w.className = 'w';
            var s = document.createElement('span'); s.textContent = part; s.style.setProperty('--i', i++);
            w.appendChild(s); frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) walk(child);
      });
    })(el);
    if (el.dataset.delay) $$('.w > span', el).forEach(function (s) { s.style.transitionDelay = 'calc(' + el.dataset.delay + 's + var(--i) * 45ms)'; });
  });

  // Reveal on scroll, and count numbers up the first time they show.
  function countUp(el) {
    var to = +el.getAttribute('data-count'), suffix = el.getAttribute('data-suffix') || '';
    if (calm) { el.textContent = to.toLocaleString('en-US') + suffix; return; }
    var t0 = performance.now(), dur = 1600;
    (function tick(now) {
      var p = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(to * e).toLocaleString('en-US') + (p === 1 ? suffix : '');
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }
  var seen = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      var n = entry.target.matches('[data-count]') ? entry.target : $('[data-count]', entry.target);
      if (n) countUp(n);
      seen.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
  $$('.rv, .split').forEach(function (el) { seen.observe(el); });

  // The last word of the headline rolls through what I make.
  var roll = $('#roll');
  if (roll && !calm) {
    var words = $$('span', roll), k = 0;
    setTimeout(function () {
      setInterval(function () {
        var cur = words[k]; k = (k + 1) % words.length; var nxt = words[k];
        cur.classList.remove('on'); cur.classList.add('out');
        nxt.classList.remove('out'); nxt.classList.add('on');
        setTimeout(function () { cur.classList.remove('out'); }, 900);
      }, 2300);
    }, 2400);
  }

  // Nav: a hairline once scrolled; hides on the way down, returns on the way up.
  var nav = $('#nav'), lastY = 0;

  // The orbit: the app icons circle the photo on two tilted ellipses, in front of it and behind it.
  var orbit = $('#orbit'), apps = orbit ? $$('.app', orbit) : [];
  var tiltX = 0, tiltY = 0, aimX = 0, aimY = 0, orbitOn = true;
  var rings = [{ r: 0.34, speed: 0.00016 }, { r: 0.49, speed: -0.00011 }];
  var counts = [0, 0]; apps.forEach(function (a) { counts[+a.dataset.ring]++; });
  var idx = [0, 0];
  apps.forEach(function (a) { var r = +a.dataset.ring; a._phase = (idx[r]++ / counts[r]) * Math.PI * 2 + r * 0.4; });
  function drawOrbit(t) {
    if (!orbit) return;
    var W = orbit.clientWidth, cx = W / 2, cy = W / 2, squash = 0.56 + tiltY * 0.1, half = apps[0] ? apps[0].offsetWidth / 2 : 36;
    apps.forEach(function (a) {
      var ring = rings[+a.dataset.ring], th = a._phase + (calm ? 0 : t * ring.speed);
      var x = Math.cos(th) * ring.r * W, y = Math.sin(th) * ring.r * W * squash;
      var depth = (Math.sin(th) + 1) / 2;                       // 0 = behind, 1 = in front
      var s = 0.6 + depth * 0.55, z = depth > 0.5 ? 25 : 10;
      x += tiltX * 18 * depth; y += tiltY * 10 * depth;
      a.style.transform = 'translate(' + (cx + x - half) + 'px,' + (cy + y - half) + 'px) scale(' + s.toFixed(3) + ') rotate(' + (Math.cos(th) * 8).toFixed(2) + 'deg)';
      a.style.zIndex = z;
      a.style.opacity = (0.45 + depth * 0.55).toFixed(3);
      a.style.filter = depth < 0.35 ? 'blur(' + ((0.35 - depth) * 5).toFixed(2) + 'px)' : 'none';
    });
    $$('.ring', orbit).forEach(function (r) { r.style.transform = 'translate(-50%,-50%) scaleY(' + squash.toFixed(3) + ') rotate(' + (tiltX * 4).toFixed(2) + 'deg)'; });
  }
  if (orbit) new IntersectionObserver(function (e) { orbitOn = e[0].isIntersecting; }).observe(orbit);

  // The hero glow follows the pointer; the orbit leans toward it.
  var glow = $('#glow'), hero = $('.hero');
  if (hero && fine && !calm) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      if (glow) glow.style.transform = 'translate(' + (e.clientX - r.left - 380) + 'px,' + (e.clientY - r.top - 380) + 'px)';
      aimX = (e.clientX / innerWidth - 0.5) * 2; aimY = (e.clientY / innerHeight - 0.5) * 2;
    });
  }
  if (glow) glow.style.transform = 'translate(' + (innerWidth * 0.62 - 380) + 'px,' + (innerHeight * 0.45 - 380) + 'px)';

  // Cards lean toward the pointer, with a spotlight under it.
  if (fine && !calm) $$('.tilt').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', (px * 100) + '%'); card.style.setProperty('--my', (py * 100) + '%');
      card.style.transform = 'perspective(900px) rotateY(' + ((px - 0.5) * 7).toFixed(2) + 'deg) rotateX(' + ((0.5 - py) * 7).toFixed(2) + 'deg) translateY(-4px)';
    });
    card.addEventListener('pointerleave', function () { card.style.transform = ''; });
  });

  // A preview of each post follows the pointer over the writing list.
  var peek = $('#peek');
  if (peek && fine && !calm) {
    var img = $('img', peek), px = 0, py = 0, tx = 0, ty = 0;
    $$('[data-peek]').forEach(function (row) {
      row.addEventListener('pointerenter', function (e) { img.src = row.dataset.peek; if (!peek.classList.contains('on')) { px = tx = e.clientX + 180; py = ty = e.clientY; } peek.classList.add('on'); });
      row.addEventListener('pointerleave', function () { peek.classList.remove('on'); });
      row.addEventListener('pointermove', function (e) { tx = e.clientX + 180; ty = e.clientY; });
    });
    (function follow() {
      px += (tx - px) * 0.14; py += (ty - py) * 0.14;
      peek.style.left = px + 'px'; peek.style.top = py + 'px';
      requestAnimationFrame(follow);
    })();
  }

  // Scroll-driven pieces: the pinned app shelf, the stack words, the timeline line, the reading bar.
  var shelfSec = $('#apps'), shelf = $('#shelf'), shelfBar = $('#shelf-bar');
  var bands = $$('.band-row'), tlLine = $('#tl-line'), tl = $('#timeline'), tlItems = $$('.tl');
  var progress = $('#progress');
  var wide = function () { return innerWidth > 860; };
  function sizeShelf() {
    if (!shelfSec || !shelf) return;
    if (!wide()) { shelfSec.style.height = ''; return; }
    var travel = Math.max(0, shelf.scrollWidth - innerWidth);
    shelfSec.style.height = (innerHeight + travel) + 'px';
  }
  var bandShift = 0, lastScroll = scrollY, velocity = 0;
  function onScroll() {
    var y = scrollY;
    if (nav) {
      nav.classList.toggle('scrolled', y > 10);
      nav.classList.toggle('hide', !calm && y > lastY + 4 && y > 400);
      if (y < lastY - 4) nav.classList.remove('hide');
      lastY = y;
    }
    if (shelfSec && shelf && wide()) {
      var top = shelfSec.offsetTop, travel = shelfSec.offsetHeight - innerHeight;
      var p = travel > 0 ? clamp((y - top) / travel, 0, 1) : 0;
      shelf.style.transform = 'translate3d(' + (-p * Math.max(0, shelf.scrollWidth - innerWidth)) + 'px,0,0)';
      if (shelfBar) shelfBar.style.transform = 'scaleX(' + p + ')';
    }
    if (tl && tlLine) {
      var r = tl.getBoundingClientRect(), mid = innerHeight * 0.62;
      var lp = clamp((mid - r.top) / r.height, 0, 1);
      tlLine.style.transform = 'scaleY(' + lp + ')';
      tlItems.forEach(function (it) { it.classList.toggle('lit', it.getBoundingClientRect().top < mid); });
    }
    if (progress) {
      var max = document.documentElement.scrollHeight - innerHeight;
      progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    }
  }
  function frame(t) {
    if (!calm) {
      tiltX += (aimX - tiltX) * 0.05; tiltY += (aimY - tiltY) * 0.05;
      if (orbitOn) drawOrbit(t);
      var y = scrollY; velocity += ((y - lastScroll) - velocity) * 0.1; lastScroll = y;
      bandShift += 0.5 + Math.abs(velocity) * 0.6;
      bands.forEach(function (b) {
        var w = b.scrollWidth / 2, dir = +b.dataset.speed > 0 ? 1 : -1;
        var x = ((bandShift * Math.abs(+b.dataset.speed)) % w);
        b.style.transform = 'translate3d(' + (dir > 0 ? x - w : -x) + 'px,0,0) skewX(' + clamp(-velocity * 0.25, -8, 8).toFixed(2) + 'deg)';
      });
    }
    requestAnimationFrame(frame);
  }
  sizeShelf(); onScroll(); drawOrbit(0);
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', function () { sizeShelf(); onScroll(); drawOrbit(performance.now()); });
  addEventListener('load', function () { sizeShelf(); onScroll(); });
  requestAnimationFrame(frame);

  // Live star counts from GitHub; the page keeps its built-in numbers if the API says no.
  var rows = $$('[data-repo]');
  if (rows.length && window.fetch) {
    fetch('https://api.github.com/users/zakariaf/repos?per_page=100&type=owner', { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (repos) {
        if (!repos) return;
        var by = {}, total = 0;
        repos.forEach(function (r) { by[r.full_name.toLowerCase()] = r.stargazers_count; if (!r.fork) total += r.stargazers_count; });
        rows.forEach(function (row) { var n = by[row.dataset.repo.toLowerCase()]; if (n != null) $('.sc', row).textContent = n.toLocaleString('en-US'); });
        var st = $('#star-total');
        if (st && total > 0) { var floor = Math.floor(total / 10) * 10; st.setAttribute('data-count', floor); if (st.closest('.in')) st.textContent = floor.toLocaleString('en-US') + '+'; }
      })
      .catch(function () {});
  }
})();
