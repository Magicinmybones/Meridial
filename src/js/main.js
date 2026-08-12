/* ==========================================================================
   Meridial — behaviour
   ========================================================================== */
(function () {
  'use strict';

  /* The travel's length. Authored in the stylesheet (--morph-dur) so the
     timing has one home; read back here to know when the swap is due. */
  var DURATION = (function () {
    var v = getComputedStyle(document.documentElement)
              .getPropertyValue('--morph-dur');
    var n = parseFloat(v);
    if (!n) return 1000;
    return /ms/.test(v) ? n : n * 1000;
  })();

  /**
   * Chart backdrop.
   * Artboard: fourteen dashed verticals, 21 units apart, 120 units tall,
   * drawn at a 0.5-unit stroke with a 1/5 dash. Rendered in the SVG's own
   * coordinate space so it scales with the artboard.
   */
  function buildChartGrid() {
    var svgs = document.querySelectorAll('[data-chart-grid]');
    if (!svgs.length) return;

    var NS = 'http://www.w3.org/2000/svg';
    var COUNT = 14;
    var STEP = 21;
    var HEIGHT = 120;

    for (var s = 0; s < svgs.length; s++) {
      var frag = document.createDocumentFragment();
      for (var i = 0; i < COUNT; i++) {
        var x = i * STEP + 0.25;   /* a 0.5 stroke centres on the half unit */
        var line = document.createElementNS(NS, 'line');
        line.setAttribute('x1', x);
        line.setAttribute('y1', 0);
        line.setAttribute('x2', x);
        line.setAttribute('y2', HEIGHT);
        line.setAttribute('stroke', '#FFFFFF');
        line.setAttribute('stroke-width', '0.5');
        line.setAttribute('stroke-dasharray', '1 5');
        line.setAttribute('stroke-opacity', '0.3');
        frag.appendChild(line);
      }
      svgs[s].appendChild(frag);
    }
  }

  /**
   * Marquee loop distance.
   * The row carries the five marks twice, so one cycle is the offset between
   * a mark and its duplicate. Measuring it keeps the loop seamless at any
   * scale and with any substituted logo widths.
   */
  function measureMarquee() {
    var track = document.querySelector('[data-marquee-track]');
    if (!track) return;

    var logos = track.children;
    if (logos.length < 2) return;

    var half = Math.floor(logos.length / 2);
    var shift = logos[half].getBoundingClientRect().left -
                logos[0].getBoundingClientRect().left;

    if (shift > 0) {
      track.style.setProperty('--marquee-shift', '-' + shift.toFixed(3) + 'px');
    }
  }

  /**
   * Re-measure after layout-affecting events. The design unit is derived from
   * the viewport, so every scale-dependent measurement is taken again.
   */
  function onViewportChange(move) {
    var frame = null;
    return function () {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function () {
        measureMarquee();
        if (move) move.measure();
      });
    };
  }


  /**
   * The travel from the hero to the signal board.
   *
   * The site is one screen and never scrolls: a wheel, swipe or arrow key
   * moves between the two sections.
   *
   * What moves is the hero's own elements. Its glow expands until it owns the
   * screen — becoming the signal section's background — and its panel carries
   * the two cards left into the board's first column, while the hero's text
   * column clears to the left. The signal section stays out of the document's
   * paint until that travel finishes, so at no point are two copies of the
   * panel on screen and nothing of the second section overlaps the first.
   *
   * The swap at the end is a single frame, and it is invisible because by then
   * the hero's glow and panel are sitting exactly where the signal section
   * draws its own. Those two targets are measured here; the interpolation is a
   * CSS transition (§18).
   */
  function Transition() {
    var root = document.documentElement;
    var heroSection = document.querySelector('.section--hero');
    var signalSection = document.querySelector('.section--signal');
    var heroGlow = document.querySelector('[data-hero-glow]');
    var heroPanel = document.querySelector('[data-hero-panel]');
    var heroCards = document.querySelectorAll('.panel .card');
    var heroContent = document.querySelector('.hero__content');
    var heroNav = document.querySelector('.section--hero .mainnav');
    var heroCta = document.querySelector('.section--hero .btn-nav');
    var sigNav = document.querySelector('.signal__masthead .mainnav');
    var sigCta = document.querySelector('.signal__masthead .btn-nav');
    var wash = document.querySelector('[data-signal-wash]');
    var col1 = document.querySelector('[data-board-col1]');
    if (!(heroSection && signalSection && heroGlow && heroPanel && wash && col1)) {
      return null;
    }

    var panelTo = 'none';
    var shown = false;
    var timer = 0;

    function rel(el, box) {
      var r = el.getBoundingClientRect();
      return {
        left: r.left - box.left, top: r.top - box.top,
        width: r.width, height: r.height
      };
    }

    /* Each section is exactly one screen and they are stacked on it, so a
       section-relative rect is the rect the element occupies on screen. The
       signal section is measured while hidden — visibility still lays out. */
    function measure() {
      var wasShown = shown;
      var wasTravelling = root.classList.contains('to-signal');

      /* Measure the rest state: no transforms, no travel classes. Reading
         geometry flushes style, so the transition has to be suppressed across
         it or the browser treats the cleared value as a starting point and
         animates into place on load. */
      root.classList.remove('to-signal');
      eachCard(function (el) {
        el.style.transition = 'none';
        el.style.transform = 'none';
      });

      var hs = heroSection.getBoundingClientRect();
      var ss = signalSection.getBoundingClientRect();
      var g = rel(heroGlow, hs);
      var p = rel(heroPanel, hs);
      var w = rel(wash, ss);
      var c = rel(col1, ss);

      if (p.width && c.width) {
        /* The glow's expansion is pure CSS (left animates to 0); only the
           panel's travel needs measuring. Translate-only: the two card sets
           are unit-identical, so there is nothing to scale. */
        panelTo =
          'translate(' + (c.left - p.left).toFixed(2) + 'px,' +
                         (c.top - p.top).toFixed(2) + 'px)';

        root.style.setProperty('--hero-out-x',
          (-rel(heroContent || heroSection, hs).width * 0.35).toFixed(1) + 'px');
      }

      /* The masthead's navigation and call-to-action slide from the hero's
         layout to the signal's, so the swap hands one masthead to the other
         mid-gesture. Their travel is the difference between the two layouts,
         measured the same way as everything else. */
      if (heroNav && sigNav && heroCta && sigCta) {
        /* inline only for the measurement — an inline 'none' left behind
           would outweigh the class rule that slides them */
        heroNav.style.transform = 'none';
        heroCta.style.transform = 'none';
        var dNav = rel(sigNav, ss).left - rel(heroNav, hs).left;
        var dCta = rel(sigCta, ss).left - rel(heroCta, hs).left;
        heroNav.style.transform = '';
        heroCta.style.transform = '';
        root.style.setProperty('--nav-dx', dNav.toFixed(1) + 'px');
        root.style.setProperty('--cta-dx', dCta.toFixed(1) + 'px');
      }

      place(wasTravelling);
      void heroPanel.offsetWidth;         /* flush as the new starting point */
      eachCard(function (el) { el.style.transition = ''; });

      if (wasTravelling) root.classList.add('to-signal');
      root.classList.toggle('signal-shown', wasShown);
      root.classList.toggle('signal-in', wasShown);
    }

    /* The travel is applied to the two cards, not the panel: the panel's
       title and caption stay behind and fade where they stand. The delta is
       the same for both cards — the travel is translate-only. */
    function eachCard(fn) {
      for (var i = 0; i < heroCards.length; i++) fn(heroCards[i]);
    }

    function place(travelled) {
      eachCard(function (el) {
        el.style.transform = travelled ? panelTo : 'none';
      });
    }

    function go(forward) {
      if (forward === shown) return;
      clearTimeout(timer);
      shown = forward;

      if (forward) {
        root.classList.add('to-signal');
        place(true);
        /* The signal section takes over the moment the travel lands, when the
           two are identical, then its own content fades in. */
        timer = setTimeout(function () {
          root.classList.add('signal-shown');
          /* A tick later, so the browser has the section on screen before the
             opacity transition starts and actually animates it. A timer rather
             than a frame callback: frames are not guaranteed to be produced
             when nothing else is moving. */
          timer = setTimeout(function () {
            root.classList.add('signal-in');
          }, 20);
        }, DURATION);
      } else {
        root.classList.remove('signal-shown', 'signal-in');
        root.classList.remove('to-signal');
        place(false);
      }
    }

    /* One gesture moves one section. The lock clears when the wheel goes
       quiet, so a trackpad's inertial tail cannot bounce it back and forth. */
    var locked = false;
    var quiet = 0;

    function onWheel(e) {
      e.preventDefault();
      clearTimeout(quiet);
      quiet = setTimeout(function () { locked = false; }, 260);
      if (locked || Math.abs(e.deltaY) < 4) return;
      locked = true;
      go(e.deltaY > 0);
    }

    var touchY = null;
    function onTouchStart(e) { touchY = e.touches[0].clientY; }
    function onTouchMove(e) {
      if (touchY === null) return;
      var dy = touchY - e.touches[0].clientY;
      if (Math.abs(dy) < 24) return;
      touchY = null;
      go(dy > 0);
    }
    function onTouchEnd() { touchY = null; }

    function onKey(e) {
      var k = e.key;
      if (k === 'ArrowDown' || k === 'PageDown' || k === ' ' || k === 'End') {
        e.preventDefault(); go(true);
      } else if (k === 'ArrowUp' || k === 'PageUp' || k === 'Home') {
        e.preventDefault(); go(false);
      }
    }

    function listen() {
      window.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('touchstart', onTouchStart, { passive: true });
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', onTouchEnd, { passive: true });
      window.addEventListener('keydown', onKey);
    }

    return { measure: measure, listen: listen };
  }

  function init() {
    buildChartGrid();
    measureMarquee();

    var move = Transition();
    if (move) {
      document.documentElement.classList.add('morph-ready');
      move.measure();
      move.listen();
    }

    /* Held until the first frame is laid out, so the reveal starts from a
       painted page rather than part way through one. */
    requestAnimationFrame(function () {
      document.documentElement.classList.add('is-ready');
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        measureMarquee();
        if (move) move.measure();
      });
    }

    window.addEventListener('resize', onViewportChange(move), { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
