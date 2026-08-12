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
    var svg = document.querySelector('[data-chart-grid]');
    if (!svg) return;

    var NS = 'http://www.w3.org/2000/svg';
    var COUNT = 14;
    var STEP = 21;
    var HEIGHT = 120;
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
    svg.appendChild(frag);
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
  function onViewportChange() {
    var frame = null;
    return function () {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measureMarquee);
    };
  }

  function init() {
    buildChartGrid();
    measureMarquee();

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measureMarquee);
    }
    window.addEventListener('resize', onViewportChange(), { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
