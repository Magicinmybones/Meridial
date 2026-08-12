/* Injected measurement probe. Writes a JSON blob into <pre id="probe">,
   which the harness reads back out of --dump-dom. */
(function () {
  window.__errs = [];
  window.addEventListener('error', function (e) {
    window.__errs.push(String(e.message || e));
  });

  function box(sel) {
    var el = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return {
      l: +r.left.toFixed(2), r: +r.right.toFixed(2),
      t: +r.top.toFixed(2), b: +r.bottom.toFixed(2),
      w: +r.width.toFixed(2), h: +r.height.toFixed(2)
    };
  }

  function fs(sel) {
    var el = document.querySelector(sel);
    return el ? getComputedStyle(el).fontSize : null;
  }

  /* The design unit, resolved: the title is authored at 96 units. */
  function unit() {
    var el = document.querySelector('.hero__title');
    if (!el) return null;
    return +(parseFloat(getComputedStyle(el).fontSize) / 96).toFixed(5);
  }

  var done = false;

  function run() {
    if (done) return;
    done = true;
    var de = document.documentElement;
    var hero = document.querySelector('.section--hero') || document.querySelector('.hero');
    var grid = document.querySelector('.hero__grid') || document.querySelector('.hero__canvas');
    var glow = document.querySelector('.hero__glow') || document.querySelector('.glow');

    var data = {
      vw: window.innerWidth,
      vh: window.innerHeight,
      scrollW: de.scrollWidth,
      clientW: de.clientWidth,
      scrollH: de.scrollHeight,
      clientH: de.clientHeight,
      u: unit(),
      hero: box(hero),
      grid: box(grid),
      content: box('.hero__content'),
      panel: box('.hero__panel'),
      glow: box(glow),
      masthead: box('.masthead'),
      brand: box('.brand'),
      cta: box('.btn-nav'),
      nav: box('.mainnav'),
      title: box('.hero__title'),
      sub: box('.hero__sub'),
      actions: box('.hero__actions'),
      trusted: box('.trusted'),
      marquee: box('.marquee'),
      panelBox: box('.panel'),
      cardA: box('.card--allocation'),
      cardV: box('.card--value'),
      panelTitle: box('.panel__title'),
      panelCaption: box('.panel__caption'),
      signal: box('.section--signal'),
      signalWash: box('.signal'),
      board: box('.board'),
      signalTitle: box('.signal__title'),
      colA: box('.board__col--allocation'),
      colM: box('.board__col--mid'),
      colE: box('.board__col--end'),
      /* Layout widths, which transforms do not affect — the morph scales
         column one, so its rect mid-morph is not its laid-out width. */
      colLayout: ['.board__col--allocation', '.board__col--mid', '.board__col--end']
        .map(function (s) { var e = document.querySelector(s); return e ? e.offsetWidth : 0; }),
      radar: box('.radar'),
      fsTitle: fs('.hero__title'),
      fsSub: fs('.hero__sub'),
      fsNav: fs('.mainnav__list a'),
      fsPanelTitle: fs('.panel__title'),
      errs: window.__errs
    };

    var pre = document.createElement('pre');
    pre.id = 'probe';
    pre.textContent = JSON.stringify(data);
    document.body.appendChild(pre);
  }

  window.addEventListener('load', function () {
    var fonts = (document.fonts && document.fonts.ready)
      ? document.fonts.ready : Promise.resolve();
    fonts.then(function () {
      requestAnimationFrame(function () {
        requestAnimationFrame(run);
      });
    });
  });

  /* Backstop: under virtual time the fonts promise can settle after the
     budget expires, which loses the whole measurement. */
  setTimeout(run, 4000);
})();
