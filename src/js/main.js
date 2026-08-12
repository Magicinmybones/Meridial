/* ==========================================================================
   Meridial — behaviour
   ========================================================================== */
(function () {
  'use strict';

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
   * The transition between the two sections.
   *
   * The site is one screen and never scrolls. A wheel, swipe or arrow key
   * moves between the hero and the signal board, and the motion is the one the
   * reference shows: the hero panel's background expands out of the right
   * column until it owns the screen, its two cards travel left into the
   * board's first column, the hero's own column clears out to the left, and
   * the rest of the board arrives once the cards have landed.
   *
   * This function only measures and switches a class. The travel itself is a
   * CSS transition — see §18. What is measured is where each shared element
   * sits in the hero versus where it sits in the board, expressed as the
   * transform that puts the board's copy on top of the hero's. At rest the two
   * screens coincide element for element, which is what makes the handover
   * invisible.
   */
  function Transition() {
    var root = document.documentElement;
    var wash = document.querySelector('[data-signal-wash]');
    var col1 = document.querySelector('[data-board-col1]');
    var heroGlow = document.querySelector('[data-hero-glow]');
    var heroPanel = document.querySelector('[data-hero-panel]');
    var heroContent = document.querySelector('.hero__content');
    var heroSection = document.querySelector('.section--hero');
    var signalSection = document.querySelector('.section--signal');
    if (!(wash && col1 && heroGlow && heroPanel && heroSection && signalSection)) {
      return null;
    }

    var washFrom = 'none';
    var colFrom = 'none';

    function rel(el, box) {
      var r = el.getBoundingClientRect();
      return {
        left: r.left - box.left, top: r.top - box.top,
        width: r.width, height: r.height
      };
    }

    /* Both ends are taken relative to their own section. The sections are
       stacked on the same screen and each is exactly one screen, so a
       section-relative rect is the rect the element occupies on screen. */
    function measure() {
      var hs = heroSection.getBoundingClientRect();
      var ss = signalSection.getBoundingClientRect();

      var was = root.classList.contains('to-signal');
      root.classList.remove('to-signal');

      /* Measuring means clearing the transform and reading geometry back, and
         the read flushes style — so without this the browser would treat the
         cleared value as a starting point and animate into the rest position
         on load. Suppress the transition across the measurement. */
      wash.style.transition = 'none';
      col1.style.transition = 'none';
      wash.style.transform = 'none';
      col1.style.transform = 'none';

      var g = rel(heroGlow, hs);
      var p = rel(heroPanel, hs);
      var w = rel(wash, ss);
      var c = rel(col1, ss);

      if (w.width && c.width && g.width && p.width) {
        washFrom =
          'translate(' + (g.left - w.left).toFixed(2) + 'px,' +
                         (g.top - w.top).toFixed(2) + 'px) scale(' +
          (g.width / w.width).toFixed(4) + ',' +
          (g.height / w.height).toFixed(4) + ')';

        /* width alone — scaling both axes independently would stretch the type
           inside the cards */
        colFrom =
          'translate(' + (p.left - c.left).toFixed(2) + 'px,' +
                         (p.top - c.top).toFixed(2) + 'px) scale(' +
          (p.width / c.width).toFixed(4) + ')';

        root.style.setProperty('--hero-out-x',
          (-rel(heroContent || heroSection, hs).width * 0.35).toFixed(1) + 'px');
      }

      place(was);

      /* Flush the placed transform as the new starting point, then hand the
         transition back. */
      void wash.offsetWidth;
      wash.style.transition = '';
      col1.style.transition = '';

      if (was) root.classList.add('to-signal');
    }

    /* Settled means no transform at all — the board's own layout. At rest the
       shared elements carry the transform that puts them where the hero has
       them. */
    function place(settled) {
      wash.style.transform = settled ? 'none' : washFrom;
      col1.style.transform = settled ? 'none' : colFrom;
    }

    function go(to) {
      if (to === root.classList.contains('to-signal')) return;
      root.classList.toggle('to-signal', to);
      place(to);
    }

    /* One gesture moves one section. The lock clears when the wheel goes quiet,
       so a trackpad's long inertial tail cannot bounce it back and forth. */
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
