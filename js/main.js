/* Header menu — only active while the inline navigation is collapsed. */
(function () {
  var toggle = document.querySelector('.bb-nav-toggle');
  var nav = document.getElementById('primary-nav');
  if (!toggle || !nav) return;

  function setOpen(open) {
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      nav.setAttribute('data-open', 'true');
    } else {
      nav.removeAttribute('data-open');
    }
  }

  toggle.addEventListener('click', function () {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });

  document.addEventListener('click', function (e) {
    if (toggle.getAttribute('aria-expanded') !== 'true') return;
    if (!nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
  });

  // leaving the collapsed range must not strand the panel open
  var wide = window.matchMedia('(min-width: 1081px)');
  (wide.addEventListener ? wide.addEventListener.bind(wide, 'change')
                         : wide.addListener.bind(wide))(function (e) {
    if (e.matches) setOpen(false);
  });
})();

/* Header menu — mark the link of the page we are on (articles count as Insights). */
(function () {
  var links = document.querySelectorAll('#primary-nav a');
  function key(path) {
    var s = path.replace(/\/+$/, '').split('/').pop().replace(/\.html$/, '');
    return /^insights/.test(s) ? 'insights' : s;
  }
  var here = key(location.pathname);
  if (!here) return;
  for (var i = 0; i < links.length; i++) {
    var href = (links[i].getAttribute('href') || '').split('#')[0];
    if (href && key(href) === here) links[i].setAttribute('aria-current', 'page');
  }
})();

/* Sustainable solutions: two scenes on one pinned frame.

   The reader is taken up to the building, driven into its glazing until the
   lit hall behind the glass fills the frame, and then carried on inside.  The
   second picture is not laid over the first at a standstill: it comes up while
   both are still moving and at a matched rate, which is what makes the change
   of picture read as one move instead of as a change of slide.

   The glazing's position is measured rather than guessed.  The photograph is
   laid in with object-fit: cover, so where the glazing lands inside the frame
   depends on the frame's proportion; the cover mapping is worked out here and
   written back as --door-x / --door-y, which is what the push aims at. */
(function () {
  var track = document.querySelector('.bb-solutions__track');
  var stage = document.querySelector('.bb-solutions__stage');
  var frame = document.querySelector('.bb-solutions__frame');
  var out = document.querySelector('.bb-scene--out');
  var inn = document.querySelector('.bb-scene--in');
  if (!track || !stage || !frame || !out || !inn) return;

  var outView = out.querySelector('.bb-scene__view');
  var inView = inn.querySelector('.bb-scene__view');
  var outImg = out.querySelector('.bb-scene__image');
  var inImg = inn.querySelector('.bb-scene__image');
  var notesOut = Array.prototype.slice.call(out.querySelectorAll('.bb-annotation'));
  var notesIn = Array.prototype.slice.call(inn.querySelectorAll('.bb-annotation'));

  var pinned = window.matchMedia('(min-width: 1151px)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var queued = false;

  /* where the glazing sits in the exterior photograph itself: the point at
     which the hall behind the glass — the stair, the warm timber — is already
     showing through, so the inside comes up out of the place it is visible in */
  var DOOR_U = 0.540, DOOR_V = 0.640;

  var OUT_SETTLE = 0.055;   // the frame comes in a touch large and settles
  var SETTLED = 0.052;
  var NOTES_OUT = 0.045;    // the notes outside arrive, and are read until GO
  var GO = 0.409;           // the drive at the glazing begins
  var DISS0 = 0.570;        // the inside starts coming up
  var DISS1 = 0.668;        // and has taken the frame
  var DEEP = 0.795;         // the walk further in ends here
  var NOTES_IN = 0.805;     // the notes inside arrive, and are read to the end
  var PUSH = 2.05;          // how far into the glazing the outside is driven
  var IN_FROM = 0.94;       // the inside comes up a little wide
  var IN_TO = 1.10;         // and carries on past its true size, still going in

  function accel(t) { return Math.pow(t, 1.9); }               // approaching
  function smooth(t) { return t * t * (3 - 2 * t); }           // the dissolve
  function span(p, a, b) {
    if (p <= a) return 0;
    if (p >= b) return 1;
    return (p - a) / (b - a);
  }
  function show(list, on) {
    list.forEach(function (n) {
      if (on) n.setAttribute('data-shown', 'true');
      else n.removeAttribute('data-shown');
    });
  }

  /* the glazing's position inside the frame, once the photograph has been
     cropped to fill it */
  function door() {
    var fw = frame.clientWidth, fh = frame.clientHeight;
    var iw = outImg.naturalWidth || 1672, ih = outImg.naturalHeight || 941;
    if (!fw || !fh) return { x: DOOR_U, y: DOOR_V };
    var s = Math.max(fw / iw, fh / ih);          // object-fit: cover
    var dw = iw * s, dh = ih * s;
    var ox = (fw - dw) / 2, oy = (fh - dh) / 2;  // the crop is centred
    var x = (ox + DOOR_U * dw) / fw;
    var y = (oy + DOOR_V * dh) / fh;
    return { x: Math.min(Math.max(x, 0.06), 0.94),
             y: Math.min(Math.max(y, 0.06), 0.94) };
  }

  /* the notes outside are set in the photograph's own coordinates (data-u /
     data-v), so each mark lands on the same detail whatever the frame's
     proportion crops away, and follows the settle */
  function place(scale) {
    var fw = frame.clientWidth, fh = frame.clientHeight;
    if (!fw || !fh) return;
    var iw = outImg.naturalWidth || 1672, ih = outImg.naturalHeight || 941;
    var s = Math.max(fw / iw, fh / ih);
    var dw = iw * s, dh = ih * s;
    var ox = (fw - dw) / 2, oy = (fh - dh) / 2;
    var d = door();
    var cx = d.x * fw, cy = d.y * fh;
    notesOut.forEach(function (n) {
      var u = parseFloat(n.getAttribute('data-u'));
      var v = parseFloat(n.getAttribute('data-v'));
      if (isNaN(u) || isNaN(v)) return;
      var x = ox + u * dw, y = oy + v * dh;
      x = cx + (x - cx) * scale;
      y = cy + (y - cy) * scale;
      n.style.setProperty('--x', (x / fw * 100).toFixed(2) + '%');
      n.style.setProperty('--y', (y / fh * 100).toFixed(2) + '%');
    });
  }

  /* the same for the notes inside, which sit on the second photograph */
  function placeIn(scale) {
    var fw = frame.clientWidth, fh = frame.clientHeight;
    if (!fw || !fh) return;
    var iw = inImg.naturalWidth || 1670, ih = inImg.naturalHeight || 941;
    var s = Math.max(fw / iw, fh / ih);
    var dw = iw * s, dh = ih * s;
    var ox = (fw - dw) / 2, oy = (fh - dh) / 2;
    var cx = fw * 0.5, cy = fh * 0.56;           // the inside's transform-origin
    notesIn.forEach(function (n) {
      var u = parseFloat(n.getAttribute('data-u'));
      var v = parseFloat(n.getAttribute('data-v'));
      if (isNaN(u) || isNaN(v)) return;
      var x = cx + (ox + u * dw - cx) * scale;
      var y = cy + (oy + v * dh - cy) * scale;
      n.style.setProperty('--x', (x / fw * 100).toFixed(2) + '%');
      n.style.setProperty('--y', (y / fh * 100).toFixed(2) + '%');
    });
  }

  function rest() {
    place(1);
    placeIn(1);
    outView.style.removeProperty('--view-scale');
    inView.style.setProperty('--view-scale', '1');
    inn.style.setProperty('--in-on', '1');
    show(notesOut, true);
    show(notesIn, true);
  }

  function paint() {
    queued = false;
    if (!pinned.matches || reduce.matches) { rest(); return; }

    var travel = track.offsetHeight - stage.offsetHeight;
    if (travel <= 0) { rest(); return; }

    var p = -track.getBoundingClientRect().top / travel;
    if (p < 0) p = 0;
    if (p > 1) p = 1;

    var d = door();
    out.style.setProperty('--door-x', (d.x * 100).toFixed(2) + '%');
    out.style.setProperty('--door-y', (d.y * 100).toFixed(2) + '%');

    /* outside: settles, then is driven into the glazing.  It keeps moving all
       the way through the dissolve — a still picture underneath a fading one
       reads as a slide change */
    var settle = 1 + OUT_SETTLE * (1 - span(p, 0, SETTLED));
    var push = 1 + PUSH * accel(span(p, GO, DISS1));
    outView.style.setProperty('--view-scale', (settle * push).toFixed(4));
    place(settle * push);

    /* inside: comes up over the last third of the drive, and goes on into the
       room afterwards.  One unbroken forward move, no stop at the threshold */
    inn.style.setProperty('--in-on', smooth(span(p, DISS0, DISS1)).toFixed(4));
    var k = span(p, DISS0, DEEP);
    var inScale = IN_FROM + (IN_TO - IN_FROM) * k;
    inView.style.setProperty('--view-scale', inScale.toFixed(4));
    placeIn(inScale);

    /* the notes outside are gone before the drive starts, so nothing is left
       pointing at a picture that is no longer there */
    show(notesOut, p >= NOTES_OUT && p < GO);
    show(notesIn, p >= NOTES_IN);
  }

  function onScroll() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(paint);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  (pinned.addEventListener ? pinned.addEventListener.bind(pinned, 'change')
                           : pinned.addListener.bind(pinned))(onScroll);
  if (outImg && !outImg.complete) outImg.addEventListener('load', onScroll);
  if (inImg && !inImg.complete) inImg.addEventListener('load', onScroll);
  paint();
})();

/* The running strip loops by translating exactly one set width, so the row
   needs two copies. The second set is cloned at runtime; both sets reference
   the same image files in images/photos/. */
(function () {
  var row = document.querySelector('.bb-filmstrip__row');
  if (!row || row.dataset.looped) return;
  var set = Array.prototype.slice.call(row.children);
  set.forEach(function (node) { row.appendChild(node.cloneNode(true)); });
  row.dataset.looped = 'true';
})();

/* On a touch screen the strip can also be dragged with a finger. While the
   finger is down the strip follows it; once it lets go the CSS run picks up
   again from where the strip was left. The run is a CSS animation over one set
   width, so the place it resumes from is set through a negative delay. Vertical
   drags still scroll the page (touch-action: pan-y) and a tap still opens the
   photograph. */
(function () {
  var strip = document.querySelector('.bb-filmstrip');
  var row = document.querySelector('.bb-filmstrip__row');
  if (!strip || !row || !window.PointerEvent) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var duration = parseFloat(window.getComputedStyle(row).animationDuration) || 140;
  var drag = null;
  var moved = false;

  strip.style.touchAction = 'pan-y';

  function offset() {
    var m = window.getComputedStyle(row).transform;
    if (!m || m === 'none') return 0;
    return new DOMMatrixReadOnly(m).m41;
  }
  // the distance one full run covers, as in the strip-run keyframes
  function span() {
    return row.offsetWidth / 2 + Math.min(Math.max(15, window.innerWidth * 0.03), 59);
  }

  row.addEventListener('pointerdown', function (e) {
    moved = false;
    if (e.pointerType !== 'touch' || reduce.matches) return;
    drag = { id: e.pointerId, x: e.clientX, on: false, base: 0, cur: 0 };
  });
  row.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x;
    if (!drag.on) {
      if (Math.abs(dx) < 6) return;
      drag.on = true;
      moved = true;
      drag.base = offset();
      row.style.animation = 'none';
      row.setPointerCapture(e.pointerId);
    }
    drag.cur = drag.base + dx;
    row.style.transform = 'translateX(' + drag.cur + 'px)';
  });
  function release(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag;
    drag = null;
    if (!d.on) return;
    var length = span();
    var x = ((d.cur % length) - length) % length;
    row.style.transform = '';
    row.style.animation = 'none';
    void row.offsetWidth;
    row.style.animation = '';
    row.style.animationDelay = (x / length * duration) + 's';
    // a touch leaves :hover behind on phones, which would keep the run paused
    row.style.animationPlayState = 'running';
  }
  row.addEventListener('pointerup', release);
  row.addEventListener('pointercancel', release);
  // a drag that ends over a photograph is not a tap on it
  row.addEventListener('click', function (e) {
    if (!moved) return;
    moved = false;
    e.stopPropagation();
    e.preventDefault();
  }, true);
})();

/* Photograph viewer, shared by every set of photographs on the page: the
   running strip and the checkerboard of project types. Each set is its own
   sequence, so the arrows stay inside the set the reader opened. The pages
   already reference the files, so opening one points the viewer at the same
   image URL and lets the browser reuse its cache. */
(function () {
  var viewer = document.getElementById('photo-viewer');
  var sets = Array.prototype.slice.call(
    document.querySelectorAll('.bb-filmstrip__row, .bb-photo-grid'));
  if (!viewer) return;

  var image = viewer.querySelector('.bb-viewer__image');
  var title = viewer.querySelector('.bb-viewer__title');
  var caption = viewer.querySelector('.bb-viewer__caption');
  var count = viewer.querySelector('.bb-viewer__count');
  var closeBtn = viewer.querySelector('.bb-viewer__close');
  var prevBtn = viewer.querySelector('.bb-viewer__nav--prev');
  var nextBtn = viewer.querySelector('.bb-viewer__nav--next');
  var backdrop = viewer.querySelector('.bb-viewer__backdrop');

  // one entry per photograph in a set; the strip is cloned for its loop, so
  // the duplicates are dropped and the originals kept in order
  function read(container) {
    return Array.prototype.slice
      .call(container.querySelectorAll('[data-photo]'))
      .filter(function (b, i, all) {
        return all.findIndex(function (x) { return x.dataset.photo === b.dataset.photo; }) === i;
      })
      .sort(function (a, b) { return a.dataset.photo - b.dataset.photo; })
      .map(function (b) {
        var img = b.querySelector('img');
        var figure = b.closest('figure');
        var note = figure && figure.querySelector('figcaption');
        var project = b.closest('.bb-project');
        var projectTitle = project && project.querySelector('.bb-heading--project');
        var stripEvent = note && note.querySelector('.bb-disclosure__event');
        var stripPlace = note && note.querySelector('.bb-disclosure__place');
        return {
          src: img.getAttribute('src'),
          alt: img.alt,
          title: projectTitle ? projectTitle.textContent.trim() : stripEvent ? stripEvent.textContent.trim() : '',
          caption: stripPlace ? stripPlace.textContent.trim() : note ? note.textContent.trim().replace(/\s+/g, ' ') : ''
        };
      });
  }

  var sources = [];
  var current = 0;
  var opener = null;

  function show(i) {
    current = Math.max(0, Math.min(i, sources.length - 1));
    image.src = sources[current].src;
    image.alt = sources[current].alt || 'Photograph ' + (current + 1) + ' of ' + sources.length;
    title.textContent = sources[current].title;
    title.hidden = !sources[current].title;
    caption.textContent = sources[current].caption;
    count.textContent = (current + 1) + ' / ' + sources.length;
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === sources.length - 1;
  }

  function open(list, i, from) {
    sources = list;
    opener = from || null;
    show(i);
    viewer.hidden = false;
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function close() {
    viewer.hidden = true;
    document.body.style.overflow = '';
    image.src = '';
    title.textContent = '';
    title.hidden = true;
    caption.textContent = '';
    if (opener) opener.focus();
    opener = null;
  }

  sets.forEach(function (container) {
    container.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-photo]');
      if (!btn || !container.contains(btn)) return;
      var list = read(container);
      if (!list.length) return;
      var selected = parseInt(btn.dataset.photo, 10);
      if (container.classList.contains('bb-filmstrip__row')) {
        list = list.slice(selected).concat(list.slice(0, selected));
        selected = 0;
      }
      open(list, selected, btn);
    });
  });

  // the large photograph at the head of a page opens in the viewer too, on a
  // phone, as a set of one; its caption is read from the figure
  var narrow = window.matchMedia('(max-width: 767px)');
  Array.prototype.slice.call(document.querySelectorAll('.bb-hero__figure')).forEach(function (figure) {
    var img = figure.querySelector('.bb-hero__image');
    if (!img) return;
    function entry() {
      var note = figure.querySelector('figcaption');
      var spans = note ? note.querySelectorAll('span') : [];
      return {
        src: img.getAttribute('src'),
        alt: img.alt,
        title: spans[0] ? spans[0].textContent.trim() : '',
        caption: spans[1] ? spans[1].textContent.trim() : ''
      };
    }
    function sync() {
      if (narrow.matches) {
        img.setAttribute('role', 'button');
        img.tabIndex = 0;
        img.style.cursor = 'zoom-in';
      } else {
        img.removeAttribute('role');
        img.removeAttribute('tabindex');
        img.style.cursor = '';
      }
    }
    function openHero() { if (narrow.matches) open([entry()], 0, img); }
    figure.addEventListener('click', openHero);
    img.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openHero(); }
    });
    sync();
    (narrow.addEventListener ? narrow.addEventListener.bind(narrow, 'change') : narrow.addListener.bind(narrow))(sync);
  });

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  prevBtn.addEventListener('click', function () { show(current - 1); });
  nextBtn.addEventListener('click', function () { show(current + 1); });

  // a horizontal swipe turns the page on touch screens, as the arrows do:
  // left for the next photograph, right for the previous one. A mostly
  // vertical or short or slow drag is left alone.
  var swipe = null;
  viewer.addEventListener('touchstart', function (e) {
    if (viewer.hidden || e.touches.length !== 1) { swipe = null; return; }
    swipe = { x: e.touches[0].clientX, y: e.touches[0].clientY, at: Date.now() };
  }, { passive: true });
  viewer.addEventListener('touchend', function (e) {
    if (!swipe) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - swipe.x;
    var dy = t.clientY - swipe.y;
    var quick = Date.now() - swipe.at < 800;
    swipe = null;
    if (!quick || Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    show(current + (dx < 0 ? 1 : -1));
  }, { passive: true });

  document.addEventListener('keydown', function (e) {
    if (viewer.hidden) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowLeft') { show(current - 1); return; }
    if (e.key === 'ArrowRight') { show(current + 1); return; }
    if (e.key !== 'Tab') return;
    // keep the keyboard inside the dialog while it is open
    var stops = [closeBtn, prevBtn, nextBtn].filter(function (button) { return !button.disabled; });
    var at = stops.indexOf(document.activeElement);
    e.preventDefault();
    stops[(at + (e.shiftKey ? stops.length - 1 : 1)) % stops.length].focus();
  });
})();

/* The audience pills. The panel is swapped in place — the section keeps its
   position on the page, so the reader compares three readings of one sheet
   rather than being moved between screens. Arrow keys walk the set, as a
   tab list should. */
(function () {
  var list = document.querySelector('.bb-pills');
  if (!list) return;

  var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
  if (!tabs.length) return;

  function panelOf(tab) {
    return document.getElementById(tab.getAttribute('aria-controls'));
  }

  function select(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      var panel = panelOf(t);
      if (panel) panel.hidden = !on;
      var lead = document.getElementById(t.id.replace('tab-', 'lead-'));
      if (lead) lead.hidden = !on;
    });
    if (focus) tab.focus();
  }

  list.addEventListener('click', function (e) {
    var tab = e.target.closest('[role="tab"]');
    if (tab) select(tab, false);
  });

  list.addEventListener('keydown', function (e) {
    var at = tabs.indexOf(document.activeElement);
    if (at < 0) return;
    var to = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = (at + 1) % tabs.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = (at + tabs.length - 1) % tabs.length;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = tabs.length - 1;
    if (to === null) return;
    e.preventDefault();
    select(tabs[to], true);
  });
})();

/* The ecosystem draws itself: six participants at rest, then closing in around
   the centre while IM HOLZ Nova takes its place between them. Scroll position
   is the only clock, so the reader can run it forwards or back. */
(function () {
  var track = document.querySelector('.bb-ecosystem__track');
  var stage = document.querySelector('.bb-ecosystem__stage');
  if (!track || !stage) return;
  var cards = Array.prototype.slice.call(stage.querySelectorAll('.bb-card--ecosystem'));
  var hub = document.querySelector('.bb-eco-hub');
  var spokes = document.querySelector('.bb-ecosystem__spokes');
  if (!cards.length || !hub) return;

  var wide = window.matchMedia('(min-width: 1151px)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var geom = null;
  var queued = false;
  var END_SCALE = 0.50;
  var LEAD = 0.20;      // of the travel, held still before anything moves
  var TAIL = 0.22;      // and again at the end, on the finished diagram

  function live() { return wide.matches && !reduce.matches; }

  // the ring the six settle onto, measured from the field as it actually lays out
  function measure() {
    cards.forEach(function (c) { c.style.transform = ''; });
    var s = stage.getBoundingClientRect();
    var cx = s.width / 2, cy = s.height / 2;
    // The ring is an ellipse, not a circle: the field is wider than it is
    // tall, so the six sit further out sideways than above and below. Its
    // radii are bounded twice over — wide enough to clear the centre card,
    // short enough to keep every shrunk cell inside the pinned field.
    var r0 = cards[0].getBoundingClientRect();
    var hw = (r0.width * END_SCALE) / 2, hh = (r0.height * END_SCALE) / 2;
    var hr = hub.getBoundingClientRect();
    var GAP = 14;
    var rx = Math.min(s.width * 0.30, s.width / 2 - hw - 10);
    var ry = Math.min(s.height * 0.36, s.height / 2 - hh - 10);
    rx = Math.max(rx, (hr.width / 2 + hw + GAP) / Math.cos(Math.PI / 6));
    ry = Math.max(ry, hr.height / 2 + hh + GAP);
    geom = cards.map(function (c, i) {
      var r = c.getBoundingClientRect();
      var sx = r.left - s.left + r.width / 2;
      var sy = r.top - s.top + r.height / 2;
      var a = -Math.PI / 2 + i * Math.PI / 3;
      var ex = cx + rx * Math.cos(a), ey = cy + ry * Math.sin(a);
      return { dx: ex - sx, dy: ey - sy, ex: ex, ey: ey };
    });
    if (spokes) {
      spokes.setAttribute('viewBox', '0 0 ' + s.width.toFixed(0) + ' ' + s.height.toFixed(0));
      spokes.innerHTML = geom.map(function (g) {
        return '<line x1="' + cx.toFixed(1) + '" y1="' + cy.toFixed(1) +
               '" x2="' + g.ex.toFixed(1) + '" y2="' + g.ey.toFixed(1) + '"/>';
      }).join('');
    }
  }

  function rest() {
    cards.forEach(function (c) { c.style.transform = ''; });
    stage.style.removeProperty('--eco-p');
    hub.style.transform = '';
    hub.style.opacity = '';
    if (spokes) spokes.style.opacity = '';
  }

  function paint() {
    queued = false;
    if (!live()) { rest(); return; }
    if (!geom) measure();

    var travel = track.offsetHeight - stage.offsetHeight;
    if (travel <= 0) { rest(); return; }

    var raw = -track.getBoundingClientRect().top / travel;
    if (raw < 0) raw = 0;
    if (raw > 1) raw = 1;

    // Held at both ends: the field stays still long enough to be read before
    // anything moves, and the finished diagram stays up for a moment before
    // the page carries on.
    var p = (raw - LEAD) / (1 - LEAD - TAIL);
    if (p < 0) p = 0;
    if (p > 1) p = 1;
    stage.style.setProperty('--eco-p', p.toFixed(3));

    var scale = 1 - (1 - END_SCALE) * p;
    cards.forEach(function (c, i) {
      var g = geom[i];
      c.style.transform = 'translate(' + (g.dx * p).toFixed(2) + 'px,' +
                          (g.dy * p).toFixed(2) + 'px) scale(' + scale.toFixed(3) + ')';
    });

    // the centre arrives once the six are well on their way in
    var q = (p - 0.42) / 0.5;
    if (q < 0) q = 0;
    if (q > 1) q = 1;
    hub.style.opacity = q.toFixed(3);
    hub.style.transform = 'translate(-50%, -50%) scale(' + (0.72 + 0.28 * q).toFixed(3) + ')';
    if (spokes) spokes.style.opacity = (q * 0.85).toFixed(3);
  }

  function onScroll() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(paint);
  }

  function onResize() { geom = null; onScroll(); }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  (wide.addEventListener ? wide.addEventListener.bind(wide, 'change')
                         : wide.addListener.bind(wide))(onResize);
  paint();
})();

/* The words on a link turn over letter by letter. Each character is given its
   own little window with a copy beneath it; on hover both slide up, one
   fractionally after the next. The split content is hidden from assistive
   software, which reads the label off the link itself. */
(function () {
  var rolls = Array.prototype.slice.call(document.querySelectorAll('.bb-link-underline__roll'));
  rolls.forEach(function (roll) {
    var text = roll.textContent;
    var link = roll.closest('a');
    if (link && !link.getAttribute('aria-label')) link.setAttribute('aria-label', text);
    roll.setAttribute('aria-hidden', 'true');
    roll.textContent = '';
    text.split('').forEach(function (ch, i) {
      var cell = document.createElement('span');
      cell.className = 'bb-link-underline__char';
      cell.style.transitionDelay = (i * 16) + 'ms';
      var a = document.createElement('span');
      a.textContent = ch === ' ' ? ' ' : ch;
      var b = document.createElement('span');
      b.textContent = a.textContent;
      cell.appendChild(a);
      cell.appendChild(b);
      roll.appendChild(cell);
    });
  });
})();

/* Vision & Mission. The stage is held on desktop and tablets while the
   building rises and the statements change. Phones use buttons. */
(function () {
  var section = document.querySelector('.bb-vision');
  if (!section) return;
  var track = section.querySelector('.bb-vision__track');
  var stage = section.querySelector('.bb-vision__stage');
  if (!track || !stage) return;

  section.querySelectorAll('[data-vision-slide]').forEach(function (button) {
    button.addEventListener('click', function () {
      var selected = button.dataset.visionSlide;
      section.querySelectorAll('[data-vision-slide]').forEach(function (item) {
        item.setAttribute('aria-pressed', String(item === button));
      });
      section.querySelector('.bb-vision-slide--vision').classList.toggle('bb-vision-slide--current', selected === 'vision');
      section.querySelector('.bb-vision-slide--mission').classList.toggle('bb-vision-slide--current', selected === 'mission');
      section.dataset.current = selected;
    });
  });

  // on a phone, where one statement is shown at a time, a horizontal swipe
  // moves between them as the two buttons do: left for the mission, right for
  // the vision. A short, slow or mostly vertical drag is left alone.
  var phone = window.matchMedia('(max-width: 699px)');
  var swipe = null;
  section.addEventListener('touchstart', function (e) {
    if (!phone.matches || e.touches.length !== 1) { swipe = null; return; }
    swipe = { x: e.touches[0].clientX, y: e.touches[0].clientY, at: Date.now() };
  }, { passive: true });
  section.addEventListener('touchend', function (e) {
    if (!swipe) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - swipe.x;
    var dy = t.clientY - swipe.y;
    var quick = Date.now() - swipe.at < 800;
    swipe = null;
    if (!quick || Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    var target = section.querySelector('[data-vision-slide="' + (dx < 0 ? 'mission' : 'vision') + '"]');
    if (target && target.getAttribute('aria-pressed') !== 'true') target.click();
  }, { passive: true });

  var wide = window.matchMedia('(min-width: 700px)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var queued = false;

  var BUILD0 = 0.04, BUILD1 = 0.94;   // five floors share this stretch
  var TAIL = 0.12;
  var OUT0 = 0.32, OUT1 = 0.54;       // vision lets go...
  var IN0 = 0.46, IN1 = 0.68;       // ...as mission arrives, a slight overlap so it never goes empty

  function live() { return wide.matches && !reduce.matches; }
  function span(p, a, b) { return p <= a ? 0 : p >= b ? 1 : (p - a) / (b - a); }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function softer(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function set(name, v) { section.style.setProperty(name, v.toFixed(3)); }

  var NAMES = ['--v', '--m', '--f0', '--f1', '--f2', '--f3', '--f4'];

  function rest() {
    NAMES.forEach(function (n) { section.style.removeProperty(n); });
    section.style.removeProperty('--vision-h');
    section.classList.remove('bb-vision--held');
  }

  function paint() {
    queued = false;
    if (!live()) { rest(); return; }
    section.style.setProperty('--vision-h', stage.offsetHeight + 'px');
    var travel = track.offsetHeight - stage.offsetHeight;
    if (travel <= 0) { rest(); return; }
    var stick = parseFloat(window.getComputedStyle(stage).top) || 0;
    var raw = (stick - track.getBoundingClientRect().top) / travel;
    var q = span(raw, 0, 1 - TAIL);
    // while the stage is held, the real next section waits: its top is already
    // drawn under the stage, and it takes over on the very line it was drawn on
    section.classList.toggle('bb-vision--held', raw < 0.999);

    set('--v', 1 - softer(span(q, OUT0, OUT1)));
    set('--m', softer(span(q, IN0, IN1)));
    var step = (BUILD1 - BUILD0) / 5;
    for (var i = 0; i < 5; i++) {
      set('--f' + i, smooth(span(q, BUILD0 + i * step, BUILD0 + (i + 1) * step)));
    }
  }

  function onScroll() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(paint);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  // the stage changes height when fonts arrive or the drawing resizes
  if ('ResizeObserver' in window) new ResizeObserver(onScroll).observe(stage);
  [wide, reduce].forEach(function (mq) {
    (mq.addEventListener ? mq.addEventListener.bind(mq, 'change')
                         : mq.addListener.bind(mq))(onScroll);
  });
  paint();
})();

/* In Numbers: the figures count up the first time they come into view. */
(function () {
  var nodes = document.querySelectorAll('[data-count]');
  if (!nodes.length || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function run(node) {
    var target = parseInt(node.dataset.count, 10);
    var start = null;
    var DURATION = 1800;
    function frame(now) {
      if (start === null) start = now;
      var t = Math.min((now - start) / DURATION, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      var n = Math.round(target * eased);
      node.textContent = n >= 1000 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009') : n;
      if (t < 1) window.requestAnimationFrame(frame);
    }
    node.textContent = '0';
    window.requestAnimationFrame(frame);
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      io.unobserve(entry.target);
      run(entry.target);
    });
  }, { threshold: 0.6 });
  nodes.forEach(function (node) { io.observe(node); });
})();

/* Eco Solutions: one solution is open at a time. On a wide screen it is read
   in the panel beside the list; on a narrow one it opens under its row. */
(function () {
  var root = document.querySelector('.bb-solution-picker');
  if (!root) return;
  var rows = Array.prototype.slice.call(root.querySelectorAll('.bb-solution'));
  var panel = root.querySelector('.bb-solution-picker__panel');
  if (!rows.length || !panel) return;
  var pIcon = panel.querySelector('.bb-solution-picker__panel-icon');
  var pTitle = panel.querySelector('.bb-solution-picker__panel-title');
  var pText = panel.querySelector('.bb-solution-picker__panel-text');
  var wide = window.matchMedia('(min-width: 1151px)');
  var current = null;

  function fillPanel(row) {
    pIcon.src = 'images/icons/' + row.getAttribute('data-icon') + '.svg';
    pTitle.textContent = row.querySelector('.bb-solution__name').textContent;
    pText.innerHTML = row.querySelector('.bb-solution__detail').innerHTML;
  }

  function select(row, swap) {
    if (row === current) return;
    current = row;
    rows.forEach(function (r) {
      var on = r === row;
      r.classList.toggle('bb-solution--active', on);
      r.querySelector('.bb-solution__btn').setAttribute('aria-expanded', String(on));
    });
    if (swap && wide.matches) {
      panel.classList.add('bb-solution-picker__panel--swapping');
      window.setTimeout(function () { fillPanel(row); panel.classList.remove('bb-solution-picker__panel--swapping'); }, 180);
    } else {
      fillPanel(row);
    }
  }

  rows.forEach(function (row) {
    var btn = row.querySelector('.bb-solution__btn');
    btn.addEventListener('click', function () {
      if (!wide.matches && row === current) {   // a narrow screen can close its row
        row.classList.remove('bb-solution--active');
        btn.setAttribute('aria-expanded', 'false');
        current = null;
        return;
      }
      select(row, true);
    });
    btn.addEventListener('mouseenter', function () { if (wide.matches) select(row, true); });
  });

  panel.hidden = false;
  root.classList.add('bb-solution-picker--live');
  select(rows[0], false);
})();
