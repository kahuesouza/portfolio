/* Carrossel 3D dos Reels: cilindro de cartões que gira sozinho e responde ao arrasto. */
(function () {
  var angle = 0, vel = 0, target = null, dragging = false, moved = 0, lastX = 0, lastT = 0;
  var hover = false, idleUntil = 0, active = -1, lastTs = 0, bound = false, visible = true;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SPEED = reduce ? 0 : 5, SENS = 0.38;

  function q(id) { return document.getElementById(id); }
  function cards() { var r = q('km-ring'); return r ? r.querySelectorAll('.km-rc-card') : []; }
  function step() { var n = cards().length; return n ? 360 / n : 36; }
  function norm(a) { a = a % 360; return a < -180 ? a + 360 : a > 180 ? a - 360 : a; }
  function idxFront() {
    var n = cards().length; if (!n) return 0;
    var i = Math.round(-angle / step()) % n; return i < 0 ? i + n : i;
  }
  function goTo(i) {
    var d = norm(-i * step() - angle);
    target = angle + d; vel = 0;
    idleUntil = performance.now() + 6000;
  }
  function pauseAll() {
    var cs = cards();
    for (var i = 0; i < cs.length; i++) { var v = cs[i].querySelector('video'); if (v) v.pause(); }
    active = -1;
  }
  function setActive(i) {
    var cs = cards(); if (i === active || !cs.length) return;
    if (active >= 0 && cs[active]) {
      var pv = cs[active].querySelector('video');
      if (pv) { pv.pause(); pv.muted = true; }
      cs[active].classList.remove('is-front', 'has-sound');
    }
    active = i;
    var c = cs[i], v = c.querySelector('video');
    c.classList.add('is-front');
    if (v) {
      if (!v.getAttribute('src')) v.setAttribute('src', v.getAttribute('data-rsrc'));
      v.muted = true;
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    }
    var t = q('km-rc-title'), n = q('km-rc-count');
    if (t) t.textContent = c.getAttribute('data-title');
    if (n) n.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(cs.length).padStart(2, '0');
  }
  function toggleSound(c) {
    var v = c.querySelector('video'); if (!v) return;
    v.muted = !v.muted; c.classList.toggle('has-sound', !v.muted);
    if (!v.muted) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    idleUntil = performance.now() + 60000;
  }
  function inStage(e) { return e.target && e.target.closest && e.target.closest('#km-rc-stage'); }
  function onDown(e) {
    var st = inStage(e); if (!st) return;
    dragging = true; moved = 0; lastX = e.clientX; lastT = performance.now(); vel = 0; target = null;
    idleUntil = performance.now() + 6000;
    try { st.setPointerCapture(e.pointerId); } catch (x) {}
  }
  function onMove(e) {
    if (!dragging) return;
    var now = performance.now(), dx = e.clientX - lastX, dt = Math.max(now - lastT, 1);
    moved += Math.abs(dx); angle += dx * SENS;
    vel = vel * 0.6 + (dx * SENS / dt * 1000) * 0.4;
    lastX = e.clientX; lastT = now;
  }
  function onUp(e) {
    if (!dragging) return; dragging = false;
    if (performance.now() - lastT > 90) vel = 0;
    if (moved < 6) {
      var c = e.target && e.target.closest && e.target.closest('.km-rc-card');
      if (c) {
        var i = Array.prototype.indexOf.call(cards(), c);
        if (i === idxFront()) toggleSound(c); else if (i >= 0) goTo(i);
      }
    }
  }
  function bind() {
    if (bound) return; bound = true;
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', function () { dragging = false; });
    document.addEventListener('pointerover', function (e) { if (inStage(e)) hover = true; });
    document.addEventListener('pointerout', function (e) { if (inStage(e)) hover = false; });
    document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest && e.target.closest('[data-rc-nav]'); if (!b) return;
      var n = cards().length; if (!n) return;
      goTo((idxFront() + (b.getAttribute('data-rc-nav') === 'next' ? 1 : -1) + n) % n);
    });
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (!visible) pauseAll(); });
    var wait = setInterval(function () { var s = q('km-rc-stage'); if (s) { io.observe(s); clearInterval(wait); } }, 400);
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    var ring = q('km-ring'); if (!ring) { lastTs = ts; return; }
    bind();
    var dt = Math.min((ts - lastTs) / 1000, 0.05); lastTs = ts;
    if (!dragging && visible) {
      if (target !== null) {
        var d = target - angle; angle += d * Math.min(1, dt * 7);
        if (Math.abs(d) < 0.05) { angle = target; target = null; }
      } else if (Math.abs(vel) > 1) {
        angle += vel * dt; vel *= Math.pow(0.04, dt);
      } else if (!hover && SPEED && performance.now() > idleUntil) {
        angle -= SPEED * dt;
      }
    }
    var tilt = ring.getAttribute('data-tilt') || '-7';
    ring.style.transform = 'translateZ(calc(var(--R) * -1)) rotateX(' + tilt + 'deg) rotateY(' + angle.toFixed(2) + 'deg)';
    if (visible) {
      var settled = target === null && Math.abs(vel) < 20;
      if (settled || active < 0) setActive(idxFront());
    }
  }
  requestAnimationFrame(frame);
})();
