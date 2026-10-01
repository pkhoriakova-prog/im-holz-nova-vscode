/* Header menu — only active while the inline navigation is collapsed. */
(function () {
  var toggle = document.querySelector('.nav-toggle');
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
  var track = document.querySelector('.solutions__track');
  var stage = document.querySelector('.solutions__stage');
  var frame = document.querySelector('.solutions__frame');
  var out = document.querySelector('.scene--out');
  var inn = document.querySelector('.scene--in');
  if (!track || !stage || !frame || !out || !inn) return;

  var outView = out.querySelector('.scene__view');
  var inView = inn.querySelector('.scene__view');
  var outImg = out.querySelector('.scene__image');
  var notesOut = Array.prototype.slice.call(out.querySelectorAll('.annot'));
  var notesIn = Array.prototype.slice.call(inn.querySelectorAll('.annot'));

  var pinned = window.matchMedia('(min-width: 1151px)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var queued = false;

  /* where the glazing sits in the exterior photograph itself: the point at
     which the hall behind the glass — the stair, the warm timber — is already
     showing through, so the inside comes up out of the place it is visible in */
  var DOOR_U = 0.600, DOOR_V = 0.630;

  var OUT_SETTLE = 0.055;   // the frame comes in a touch large and settles
  var SETTLED = 0.06;
  var NOTES_OUT = 0.081;    // the notes outside arrive, and are read until GO
  var GO = 0.318;           // the drive at the glazing begins
  var DISS0 = 0.502;        // the inside starts coming up
  var DISS1 = 0.615;        // and has taken the frame
  var DEEP = 0.764;         // the walk further in ends here
  var NOTES_IN = 0.775;     // the notes inside arrive, and are read to the end
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
    var iw = outImg.naturalWidth || 2400, ih = outImg.naturalHeight || 1856;
    if (!fw || !fh) return { x: DOOR_U, y: DOOR_V };
    var s = Math.max(fw / iw, fh / ih);          // object-fit: cover
    var dw = iw * s, dh = ih * s;
    var ox = (fw - dw) / 2, oy = (fh - dh) / 2;  // the crop is centred
    var x = (ox + DOOR_U * dw) / fw;
    var y = (oy + DOOR_V * dh) / fh;
    return { x: Math.min(Math.max(x, 0.06), 0.94),
             y: Math.min(Math.max(y, 0.06), 0.94) };
  }

  function rest() {
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

    /* inside: comes up over the last third of the drive, and goes on into the
       room afterwards.  One unbroken forward move, no stop at the threshold */
    inn.style.setProperty('--in-on', smooth(span(p, DISS0, DISS1)).toFixed(4));
    var k = span(p, DISS0, DEEP);
    inView.style.setProperty('--view-scale',
      (IN_FROM + (IN_TO - IN_FROM) * k).toFixed(4));

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
  paint();
})();

/* The running strip loops by translating exactly one set width, so the row
   needs two copies. The second set is cloned at runtime; both sets reference
   the same image files in images/photos/. */
(function () {
  var row = document.querySelector('.filmstrip__row');
  if (!row || row.dataset.looped) return;
  var set = Array.prototype.slice.call(row.children);
  set.forEach(function (node) { row.appendChild(node.cloneNode(true)); });
  row.dataset.looped = 'true';
})();

/* Photograph viewer, shared by every set of photographs on the page: the
   running strip and the checkerboard of project types. Each set is its own
   sequence, so the arrows stay inside the set the reader opened. The pages
   already reference the files, so opening one points the viewer at the same
   image URL and lets the browser reuse its cache. */
(function () {
  var viewer = document.getElementById('photo-viewer');
  var sets = Array.prototype.slice.call(
    document.querySelectorAll('.filmstrip__row, .projects__grid'));
  if (!viewer || !sets.length) return;

  var image = viewer.querySelector('.viewer__image');
  var title = viewer.querySelector('.viewer__title');
  var caption = viewer.querySelector('.viewer__caption');
  var count = viewer.querySelector('.viewer__count');
  var closeBtn = viewer.querySelector('.viewer__close');
  var prevBtn = viewer.querySelector('.viewer__nav--prev');
  var nextBtn = viewer.querySelector('.viewer__nav--next');
  var backdrop = viewer.querySelector('.viewer__backdrop');

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
        var projectTitle = b.closest('.project') && b.closest('.project').querySelector('.project__title');
        return {
          src: img.getAttribute('src'),
          alt: img.alt,
          title: projectTitle ? projectTitle.textContent.trim() : '',
          caption: note ? note.textContent.trim().replace(/\s+/g, ' ') : ''
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
      if (container.classList.contains('filmstrip__row')) {
        list = list.slice(selected).concat(list.slice(0, selected));
        selected = 0;
      }
      open(list, selected, btn);
    });
  });

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  prevBtn.addEventListener('click', function () { show(current - 1); });
  nextBtn.addEventListener('click', function () { show(current + 1); });

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
  var list = document.querySelector('.pills');
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
  var track = document.querySelector('.ecosystem__track');
  var stage = document.querySelector('.ecosystem__stage');
  var cards = Array.prototype.slice.call(document.querySelectorAll('.eco-card'));
  var hub = document.querySelector('.eco-hub');
  var spokes = document.querySelector('.ecosystem__spokes');
  if (!track || !stage || !cards.length || !hub) return;

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
  var rolls = Array.prototype.slice.call(document.querySelectorAll('.link-underline__roll'));
  rolls.forEach(function (roll) {
    var text = roll.getAttribute('data-text') || roll.textContent;
    var link = roll.closest('a');
    if (link && !link.getAttribute('aria-label')) link.setAttribute('aria-label', text);
    roll.setAttribute('aria-hidden', 'true');
    roll.textContent = '';
    text.split('').forEach(function (ch, i) {
      var cell = document.createElement('span');
      cell.className = 'ch';
      cell.style.transitionDelay = (i * 16) + 'ms';
      var a = document.createElement('span');
      a.className = 'ch__a';
      a.textContent = ch === ' ' ? ' ' : ch;
      var b = document.createElement('span');
      b.className = 'ch__b';
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
  var section = document.querySelector('.vision');
  if (!section) return;
  var track = section.querySelector('.vision__track');
  var stage = section.querySelector('.vision__stage');
  if (!track || !stage) return;

  section.querySelectorAll('[data-vision-slide]').forEach(function (button) {
    button.addEventListener('click', function () {
      var selected = button.dataset.visionSlide;
      section.querySelectorAll('[data-vision-slide]').forEach(function (item) {
        item.setAttribute('aria-pressed', String(item === button));
      });
      section.querySelector('.vslide--vision').classList.toggle('is-current', selected === 'vision');
      section.querySelector('.vslide--mission').classList.toggle('is-current', selected === 'mission');
      section.dataset.current = selected;
    });
  });

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
    section.classList.remove('is-held');
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
    section.classList.toggle('is-held', raw < 0.999);

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
      node.textContent = Math.round(target * eased);
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
