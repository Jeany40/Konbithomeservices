/* Konbit Home Services: shared script for every page */
(function () {
  'use strict';
  var PHONE_SMS = '+17186967379';

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Menu and Services dropdown ---------- */
  var header = document.querySelector('.site-header');
  var menuBtn = document.getElementById('menu-toggle');
  var svcBtn = document.getElementById('services-toggle');
  var svcMenu = document.getElementById('services-menu');
  var scrim = document.getElementById('menu-scrim');

  function setServices(open) {
    if (!svcBtn || !svcMenu) return;
    svcMenu.hidden = !open;
    svcBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function setMenu(open) {
    if (!header || !menuBtn) return;
    header.setAttribute('data-menu', open ? 'open' : 'closed');
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    var label = menuBtn.querySelector('.menu-label');
    if (label) label.textContent = open ? 'Close' : 'Menu';
    if (scrim) scrim.hidden = !open;
    document.documentElement.classList.toggle('menu-locked', open);
  }

  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      setMenu(header.getAttribute('data-menu') !== 'open');
    });
  }
  if (svcBtn) {
    svcBtn.addEventListener('click', function () { setServices(svcMenu.hidden); });
  }
  if (scrim) {
    scrim.addEventListener('click', function () { setServices(false); setMenu(false); });
  }
  document.addEventListener('click', function (e) {
    if (svcMenu && !svcMenu.hidden && !e.target.closest('.nav-dropdown')) setServices(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (svcMenu && !svcMenu.hidden) { setServices(false); svcBtn.focus(); }
    else if (header && header.getAttribute('data-menu') === 'open') { setMenu(false); menuBtn.focus(); }
  });
  if (header) {
    Array.prototype.forEach.call(header.querySelectorAll('.nav-panel a'), function (a) {
      a.addEventListener('click', function () { setServices(false); setMenu(false); });
    });
  }
  if (window.matchMedia) {
    var wide = window.matchMedia('(min-width: 1000px)');
    var onWide = function (e) { if (e.matches) setMenu(false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide);
    else if (wide.addListener) wide.addListener(onWide);
  }

  /* ---------- Copy buttons ---------- */
  function selectNode(el) {
    if (!el) return;
    if (typeof el.select === 'function') { el.focus(); el.select(); return; }
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
  function flash(btn, text) {
    var label = btn.querySelector('.btn-label');
    if (!label) return;
    if (!btn.getAttribute('data-label')) btn.setAttribute('data-label', label.textContent);
    label.textContent = text;
    clearTimeout(btn._timer);
    btn._timer = setTimeout(function () { label.textContent = btn.getAttribute('data-label'); }, 2600);
  }
  function copyText(text, btn, fallbackEl) {
    function done() { flash(btn, 'Copied'); }
    function fail() { selectNode(fallbackEl); flash(btn, 'Selected. Copy it now'); }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fail);
      } else { fail(); }
    } catch (err) { fail(); }
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (btn) {
    btn.addEventListener('click', function () {
      copyText(btn.getAttribute('data-copy'), btn, document.getElementById(btn.getAttribute('data-copy-target')));
    });
  });

  /* ---------- Estimate form (Contact page) ---------- */
  var form = document.getElementById('estimate-form');
  if (form) {
    var result = document.getElementById('estimate-result');
    var preview = document.getElementById('result-preview');
    var smsLink = document.getElementById('result-sms');
    var resultTitle = document.getElementById('result-title');
    var copyBtn = document.getElementById('result-copy');
    var f = {
      name: document.getElementById('est-name'),
      phone: document.getElementById('est-phone'),
      email: document.getElementById('est-email'),
      area: document.getElementById('est-area'),
      service: document.getElementById('est-service'),
      details: document.getElementById('est-details')
    };

    var setError = function (input, msg) {
      var err = document.getElementById(input.id + '-error');
      if (!err) return;
      if (msg) {
        err.textContent = msg;
        err.hidden = false;
        input.setAttribute('aria-invalid', 'true');
      } else {
        err.textContent = '';
        err.hidden = true;
        input.removeAttribute('aria-invalid');
      }
    };
    var phoneDigits = function (v) {
      var d = String(v || '').replace(/\D/g, '');
      if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1);
      return d;
    };
    var prettyPhone = function (d) {
      return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
    };
    var contactMethod = function () {
      var c = form.querySelector('input[name="contact"]:checked');
      return c ? c.value : 'Call';
    };
    var validate = function () {
      var first = null;
      var check = function (input, ok, msg) {
        setError(input, ok ? '' : msg);
        if (!ok && !first) first = input;
      };
      check(f.name, f.name.value.trim().length > 0, 'Enter your name.');
      check(f.phone, phoneDigits(f.phone.value).length === 10, 'Enter a 10-digit phone number, like (718) 555-0123.');
      var email = f.email.value.trim();
      var needEmail = contactMethod() === 'Email' && !email;
      var emailOk = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      check(f.email, emailOk && !needEmail, needEmail ? 'Add your email so we can write back.' : 'Check the email address, or leave it blank.');
      check(f.area, !!f.area.value, 'Choose where the project is.');
      check(f.service, !!f.service.value, 'Choose the type of work.');
      return first;
    };
    var compose = function () {
      var lines = ['Estimate request for Konbit Home Services', ''];
      lines.push('Name: ' + f.name.value.trim());
      lines.push('Phone: ' + prettyPhone(phoneDigits(f.phone.value)));
      var email = f.email.value.trim();
      if (email) lines.push('Email: ' + email);
      lines.push('Project location: ' + f.area.value);
      lines.push('Type of work: ' + f.service.value);
      var details = f.details.value.trim();
      if (details) lines.push('', 'Project details:', details);
      lines.push('', 'Best way to reach me: ' + contactMethod());
      return lines.join('\n');
    };

    // A link like contact.html?service=Tile%20Installation picks that service.
    try {
      var wanted = new URLSearchParams(window.location.search).get('service');
      if (wanted && Array.prototype.some.call(f.service.options, function (o) { return o.value === wanted; })) {
        f.service.value = wanted;
      }
    } catch (err) { /* older browsers: leave the choice empty */ }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var first = validate();
      if (first) { first.focus(); return; }
      var msg = compose();
      preview.textContent = msg;
      smsLink.setAttribute('href', 'sms:' + PHONE_SMS + '?&body=' + encodeURIComponent(msg));
      form.hidden = true;
      result.hidden = false;
      resultTitle.focus();
    });
    form.addEventListener('input', function (e) {
      if (e.target.getAttribute && e.target.getAttribute('aria-invalid') === 'true') setError(e.target, '');
    });
    form.addEventListener('change', function (e) {
      if (e.target.name === 'contact') { setError(f.email, ''); return; }
      if (e.target.getAttribute && e.target.getAttribute('aria-invalid') === 'true') setError(e.target, '');
    });
    copyBtn.addEventListener('click', function () { copyText(preview.textContent, copyBtn, preview); });
    document.getElementById('result-edit').addEventListener('click', function () {
      result.hidden = true;
      form.hidden = false;
      f.name.focus();
    });
  }

  /* ---------- Photo viewer (Our Work page) ---------- */
  var lb = document.getElementById('lightbox');
  var shots = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox]'));
  if (lb && typeof lb.showModal === 'function' && shots.length) {
    var lbImg = document.getElementById('lightbox-img');
    var lbCap = document.getElementById('lightbox-caption');
    var lbCount = document.getElementById('lb-count');
    var group = shots;
    var current = 0;
    var galleryOf = function (name) {
      return shots.filter(function (s) { return s.getAttribute('data-gallery') === name; })
        .sort(function (a, b) { return Number(a.getAttribute('data-lightbox')) - Number(b.getAttribute('data-lightbox')); });
    };
    var showShot = function (i) {
      current = (i + group.length) % group.length;
      var s = group[current];
      var thumb = s.querySelector('img');
      lbImg.src = s.getAttribute('data-full');
      lbImg.alt = s.getAttribute('data-alt') || (thumb ? thumb.alt : '');
      lbCap.textContent = s.getAttribute('data-caption') || '';
      lbCount.textContent = (current + 1) + ' / ' + group.length;
    };
    var openGallery = function (name, shot) {
      group = galleryOf(name);
      if (!group.length) return;
      showShot(shot ? Math.max(0, group.indexOf(shot)) : 0);
      try { lb.showModal(); } catch (err) { /* already open */ }
    };
    shots.forEach(function (s) {
      s.addEventListener('click', function () { openGallery(s.getAttribute('data-gallery'), s); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-open-gallery]'), function (btn) {
      btn.addEventListener('click', function () { openGallery(btn.getAttribute('data-open-gallery')); });
    });
    document.getElementById('lb-prev').addEventListener('click', function () { showShot(current - 1); });
    document.getElementById('lb-next').addEventListener('click', function () { showShot(current + 1); });
    document.getElementById('lb-close').addEventListener('click', function () { lb.close(); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); showShot(current - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); showShot(current + 1); }
    });
  } else {
    shots.forEach(function (s) { s.style.cursor = 'default'; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-open-gallery]'), function (b) { b.hidden = true; });
  }
})();
