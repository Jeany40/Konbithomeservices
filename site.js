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
  // Requests are emailed through Web3Forms (the form's action). If sending fails,
  // the same request is offered as a ready-to-send text message instead.
  var form = document.getElementById('estimate-form');
  if (form) {
    var endpoint = form.getAttribute('action');
    var formTitle = document.getElementById('form-title');
    var sendBtn = document.getElementById('estimate-send');
    var sendLabel = sendBtn.querySelector('.btn-label');
    var live = document.getElementById('form-live');
    var sent = document.getElementById('estimate-sent');
    var sentTitle = document.getElementById('sent-title');
    var sentHelp = document.getElementById('sent-help');
    var result = document.getElementById('estimate-result');
    var preview = document.getElementById('result-preview');
    var smsLink = document.getElementById('result-sms');
    var resultTitle = document.getElementById('result-title');
    var copyBtn = document.getElementById('result-copy');
    var f = {
      service: document.getElementById('est-service'),
      area: document.getElementById('est-area'),
      details: document.getElementById('est-details'),
      timeline: document.getElementById('est-timeline'),
      name: document.getElementById('est-name'),
      phone: document.getElementById('est-phone'),
      email: document.getElementById('est-email')
    };
    var sending = false;

    // Our own checks and messages replace the browser's, which still apply if scripts are off.
    form.noValidate = true;

    var setError = function (el, msg) {
      var err = document.getElementById(el.id + '-error');
      if (!err) return;
      err.textContent = msg || '';
      err.hidden = !msg;
      if (msg) el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
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
    // Checks the questions top to bottom; returns the first one to fix.
    var validate = function () {
      var first = null;
      var check = function (el, ok, msg) {
        setError(el, ok ? '' : msg);
        if (!ok && !first) first = el;
      };
      check(f.service, !!f.service.value, 'Choose the type of work.');
      check(f.area, !!f.area.value, 'Choose where the project is.');
      check(f.name, f.name.value.trim().length > 0, 'Enter your name.');
      check(f.phone, phoneDigits(f.phone.value).length === 10, 'Enter a 10-digit phone number, like (718) 555-0123.');
      var email = f.email.value.trim();
      var needEmail = contactMethod() === 'Email' && !email;
      var emailOk = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      check(f.email, emailOk && !needEmail, needEmail ? 'Add your email so we can write back.' : 'Check the email address, or leave it blank.');
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
      if (f.timeline.value) lines.push('When I’d like to start: ' + f.timeline.value);
      var details = f.details.value.trim();
      if (details) lines.push('', 'Project details:', details);
      lines.push('', 'Best way to reach me: ' + contactMethod());
      return lines.join('\n');
    };

    var show = function (panel) {
      form.hidden = panel !== form;
      sent.hidden = panel !== sent;
      result.hidden = panel !== result;
    };
    var setSending = function (on) {
      sending = on;
      sendBtn.disabled = on;
      form.classList.toggle('is-sending', on);
      sendLabel.textContent = on ? 'Sending…' : 'Send my request';
      live.textContent = on ? 'Sending your request…' : '';
    };
    // What arrives in the inbox: a clear subject, then one line per answer.
    var payload = function () {
      var name = f.name.value.trim();
      var email = f.email.value.trim();
      var details = f.details.value.trim();
      var data = {
        access_key: form.elements.access_key.value,
        subject: 'Estimate request from ' + name + ': ' + f.service.value + ', ' + f.area.value,
        from_name: 'Konbit Home Services website',
        'Name': name,
        'Phone': prettyPhone(phoneDigits(f.phone.value))
      };
      if (email) {
        data['Email'] = email;
        data.replyto = email;
      }
      data['Project location'] = f.area.value;
      data['Type of work'] = f.service.value;
      if (f.timeline.value) data['Timeline'] = f.timeline.value;
      if (details) data['Project details'] = details;
      data['Best way to reach them'] = contactMethod();
      return data;
    };
    var showSent = function () {
      var firstName = f.name.value.trim().split(/\s+/)[0];
      var phone = prettyPhone(phoneDigits(f.phone.value));
      var method = contactMethod();
      var how = method === 'Email' ? 'email you at ' + f.email.value.trim()
        : method === 'Text' ? 'text you at ' + phone
        : 'call you at ' + phone;
      sentTitle.textContent = 'Thank you, ' + firstName + '. We got your request.';
      sentHelp.textContent = 'We’ll ' + how + ' to talk it through and set up your free estimate.';
      form.reset();
      show(sent);
      sentTitle.focus();
    };
    var showTextBackup = function (msg) {
      preview.textContent = msg;
      smsLink.setAttribute('href', 'sms:' + PHONE_SMS + '?&body=' + encodeURIComponent(msg));
      show(result);
      resultTitle.focus();
    };

    // A link like /contact?service=Tile%20Installation picks that service.
    try {
      var wanted = new URLSearchParams(window.location.search).get('service');
      if (wanted && Array.prototype.some.call(f.service.options, function (o) { return o.value === wanted; })) {
        f.service.value = wanted;
      }
    } catch (err) { /* older browsers: leave the choice empty */ }

    // Tidy a typed number into (718) 555-0123 once it's complete.
    f.phone.addEventListener('blur', function () {
      var d = phoneDigits(f.phone.value);
      if (d.length === 10) f.phone.value = prettyPhone(d);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;
      var first = validate();
      if (first) { first.focus(); return; }
      var msg = compose();
      // The hidden spam trap is only ever ticked by bots: act as if it worked.
      if (form.elements.botcheck && form.elements.botcheck.checked) { showSent(); return; }
      if (!window.fetch || navigator.onLine === false) { showTextBackup(msg); return; }

      setSending(true);
      var controller = typeof AbortController === 'function' ? new AbortController() : null;
      var timer = controller ? setTimeout(function () { controller.abort(); }, 20000) : 0;
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload()),
        signal: controller ? controller.signal : undefined
      }).then(function (res) {
        return res.json().catch(function () { return null; }).then(function (json) {
          var ok = res.status === 200 && !(json && json.success === false);
          if (!ok && window.console) console.warn('Estimate request was not sent:', res.status, json && json.message);
          return ok;
        });
      }, function (err) {
        if (window.console) console.warn('Estimate request was not sent:', err);
        return false;
      }).then(function (ok) {
        clearTimeout(timer);
        setSending(false);
        if (ok) showSent(); else showTextBackup(msg);
      });
    });
    form.addEventListener('input', function (e) {
      if (e.target.getAttribute && e.target.getAttribute('aria-invalid') === 'true') setError(e.target, '');
    });
    form.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'contact') setError(f.email, '');
      else if (t.getAttribute && t.getAttribute('aria-invalid') === 'true') setError(t, '');
    });
    copyBtn.addEventListener('click', function () { copyText(preview.textContent, copyBtn, preview); });
    var backToForm = function () { show(form); formTitle.focus(); };
    document.getElementById('result-edit').addEventListener('click', backToForm);
    document.getElementById('sent-again').addEventListener('click', backToForm);
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
    // Show the large photo as WebP when this browser already chose WebP for the page's photos.
    var webpOk = function () {
      return Array.prototype.some.call(document.querySelectorAll('picture img'), function (img) {
        return /\.webp(\?|$)/.test(img.currentSrc || '');
      });
    };
    lbImg.addEventListener('error', function () {
      if (/\.webp$/.test(lbImg.src)) lbImg.src = lbImg.src.replace(/\.webp$/, '.jpg');
    });
    var showShot = function (i) {
      current = (i + group.length) % group.length;
      var s = group[current];
      var thumb = s.querySelector('img');
      var full = s.getAttribute('data-full');
      lbImg.src = webpOk() ? full.replace(/\.jpg$/, '.webp') : full;
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

  /* ---------- Phones: Call / Free Estimate bar ---------- */
  var bar = document.getElementById('action-bar');
  if (bar) {
    var pageTop = document.querySelector('.hero, .page-hero');
    if (pageTop && 'IntersectionObserver' in window) {
      bar.classList.add('is-waiting');
      new IntersectionObserver(function (entries) {
        bar.classList.toggle('is-waiting', entries[0].isIntersecting);
      }).observe(pageTop);
    }
    // Keep it out of the way of the on-screen keyboard while someone is typing.
    document.addEventListener('focusin', function (e) {
      if (e.target.matches && e.target.matches('input, select, textarea')) bar.classList.add('is-typing');
    });
    document.addEventListener('focusout', function () { bar.classList.remove('is-typing'); });
  }

  /* ---------- Our Work: filter by type of project ---------- */
  var filterBar = document.querySelector('[data-filter-bar]');
  if (filterBar) {
    var filterBtns = Array.prototype.slice.call(filterBar.querySelectorAll('button[data-filter]'));
    var projects = Array.prototype.slice.call(document.querySelectorAll('[data-cats]'));
    var groups = Array.prototype.slice.call(document.querySelectorAll('[data-filter-group]'));
    var filterStatus = document.getElementById('filter-status');
    filterBar.hidden = false;
    filterBar.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button[data-filter]') : null;
      if (!btn) return;
      var want = btn.getAttribute('data-filter');
      filterBtns.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      var shown = 0;
      projects.forEach(function (el) {
        var on = want === 'all' || el.getAttribute('data-cats').split(' ').indexOf(want) !== -1;
        el.hidden = !on;
        if (on) shown += 1;
      });
      groups.forEach(function (g) { g.hidden = !g.querySelector('[data-cats]:not([hidden])'); });
      if (filterStatus) filterStatus.textContent = 'Showing ' + shown + (shown === 1 ? ' project.' : ' projects.');
    });
  }

  /* ---------- Gentle reveal of cards as they scroll into view ---------- */
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!calm && 'IntersectionObserver' in window) {
    var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal, .why-item, .step, .mini-card'));
    revealEls.forEach(function (el) {
      el.classList.add('reveal');
      var i = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.style.setProperty('--reveal-delay', (Math.min(i, 3) * 0.08) + 's');
    });
    document.documentElement.classList.add('reveal-ready');
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        revealer.unobserve(el);
        el.classList.add('is-in');
        // Afterwards, hand the card back to its normal hover styles.
        setTimeout(function () {
          el.classList.remove('reveal', 'is-in');
          el.style.removeProperty('--reveal-delay');
        }, 1100);
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { revealer.observe(el); });
  }
})();
