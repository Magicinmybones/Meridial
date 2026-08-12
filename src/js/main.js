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
  function onViewportChange(morph) {
    var frame = null;
    return function () {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function () {
        measureMarquee();
        if (morph) { morph.measure(); morph.apply(); }
      });
    };
  }


  /**
   * The morph.
   *
   * The reference recording does not scroll from the hero into the signal
   * section. The hero's glow expands into the signal's wash, and the hero's two
   * panel cards travel into the board's first column — the same elements in
   * both artboards. The signal section is pinned for one screen of scroll and
   * the transition scrubs across it.
   *
   * Both ends are measured rather than written down, so the morph holds at any
   * viewport and survives a layout change without a number to update.
   */
  function Morph() {
    var track = document.querySelector('[data-morph-track]');
    var wash = document.querySelector('[data-signal-wash]');
    var col1 = document.querySelector('[data-board-col1]');
    var heroGlow = document.querySelector('[data-hero-glow]');
    var heroPanel = document.querySelector('[data-hero-panel]');
    if (!(track && wash && col1 && heroGlow && heroPanel)) return null;

    var reduce = window.matchMedia &&
                 window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var from = null;

    function rel(el, box) {
      var r = el.getBoundingClientRect();
      return {
        left: r.left - box.left,
        top: r.top - box.top,
        width: r.width,
        height: r.height
      };
    }

    var heroSection = document.querySelector('.section--hero');
    var signalSection = document.querySelector('.section--signal');

    /* Both ends are taken relative to their own section, not to the viewport.
       Each section is exactly one screen, so a section-relative rect is the
       rect that element will have on screen when its section fills the
       viewport — which is true of the hero at rest and of the signal while it
       is pinned. Measuring against the viewport instead would fold in whatever
       the scroll position happened to be. */
    function measure() {
      wash.style.transform = '';
      col1.style.transform = '';
      last = -1;              /* the cleared transform must be re-applied */

      var hs = heroSection.getBoundingClientRect();
      var ss = signalSection.getBoundingClientRect();
      var g = rel(heroGlow, hs);
      var p = rel(heroPanel, hs);
      var w = rel(wash, ss);
      var c = rel(col1, ss);
      if (!w.width || !c.width || !g.width || !p.width) return;

      from = {
        wash: {
          sx: g.width / w.width,
          sy: g.height / w.height,
          dx: g.left - w.left,
          dy: g.top - w.top
        },
        col: {
          /* the cards scale by width alone; scaling both axes independently
             would stretch the type */
          s: p.width / c.width,
          dx: p.left - c.left,
          dy: p.top - c.top
        }
      };
    }

    /* The hero's geometry is only correct while the hero is laid out at the top
       of the document; both elements are static, so one measurement per layout
       is enough. */
    function progress() {
      var r = track.getBoundingClientRect();
      var span = window.innerHeight;
      if (!span) return 0;
      var p = -r.top / span;
      return p < 0 ? 0 : (p > 1 ? 1 : p);
    }

    function ease(t) {                 /* cubic-bezier(0.33, 0, 0.2, 1)-ish */
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    var last = -1;

    function apply() {
      if (!from || reduce) return;
      var raw = progress();
      if (Math.abs(raw - last) < 0.0005) return;
      last = raw;
      var p = ease(raw);
      var inv = 1 - p;

      var sx = from.wash.sx + (1 - from.wash.sx) * p;
      var sy = from.wash.sy + (1 - from.wash.sy) * p;
      wash.style.transform =
        'translate(' + (from.wash.dx * inv).toFixed(2) + 'px,' +
                       (from.wash.dy * inv).toFixed(2) + 'px) ' +
        'scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')';

      var s = from.col.s + (1 - from.col.s) * p;
      col1.style.transform =
        'translate(' + (from.col.dx * inv).toFixed(2) + 'px,' +
                       (from.col.dy * inv).toFixed(2) + 'px) ' +
        'scale(' + s.toFixed(4) + ')';

      /* The rest of the board arrives once the cards have landed: the last
         third of the scrub, matching the recording's half-second tail. */
      var tail = (p - 0.66) / 0.34;
      document.documentElement.style.setProperty(
        '--morph-tail', String(tail < 0 ? 0 : (tail > 1 ? 1 : tail)));
    }

    return { measure: measure, apply: apply };
  }

  function init() {
    buildChartGrid();
    measureMarquee();

    var morph = Morph();
    if (morph) {
      document.documentElement.classList.add('morph-ready');
      morph.measure();
      morph.apply();

      /* Applied synchronously rather than deferred to the next frame. The work
         is two transform writes, the scroll handler is passive, and deferring
         costs a frame of lag against the scroll it is tracking. `apply` skips
         the writes when the progress has not moved. */
      window.addEventListener('scroll', morph.apply, { passive: true });
    }

    /* Held until the first frame is laid out, so the reveal starts from a
       painted page rather than part way through one. */
    requestAnimationFrame(function () {
      document.documentElement.classList.add('is-ready');
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        measureMarquee();
        if (morph) { morph.measure(); morph.apply(); }
      });
    }

    window.addEventListener('resize', onViewportChange(morph), { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
