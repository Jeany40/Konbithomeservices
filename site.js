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
      service: document.getElementById('est-service'), // group of choices
      area: document.getElementById('est-area'),       // group of choices
      details: document.getElementById('est-details'),
      name: document.getElementById('est-name'),
      phone: document.getElementById('est-phone'),
      email: document.getElementById('est-email')
    };
    var sending = false;

    // Our own checks and messages replace the browser's, which still apply if scripts are off.
    form.noValidate = true;

    // The chosen answer in a group of choices, or ''.
    var picked = function (name) {
      var c = form.querySelector('input[name="' + name + '"]:checked');
      return c ? c.value : '';
    };
    var setError = function (el, msg) {
      var err = document.getElementById(el.id + '-error');
      if (!err) return;
      err.textContent = msg || '';
      err.hidden = !msg;
      if (el.tagName === 'FIELDSET') {
        el.classList.toggle('is-invalid', !!msg);
      } else if (msg) {
        el.setAttribute('aria-invalid', 'true');
      } else {
        el.removeAttribute('aria-invalid');
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
    var contactMethod = function () { return picked('contact') || 'Call'; };
    // Checks the questions top to bottom; returns where to put the cursor for the first problem.
    var validate = function () {
      var first = null;
      var check = function (el, ok, msg) {
        setError(el, ok ? '' : msg);
        if (!ok && !first) first = el;
      };
      check(f.service, !!picked('service'), 'Choose the type of work.');
      check(f.area, !!picked('area'), 'Choose where the project is.');
      check(f.name, f.name.value.trim().length > 0, 'Enter your name.');
      check(f.phone, phoneDigits(f.phone.value).length === 10, 'Enter a 10-digit phone number, like (718) 555-0123.');
      var email = f.email.value.trim();
      var needEmail = contactMethod() === 'Email' && !email;
      var emailOk = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      check(f.email, emailOk && !needEmail, needEmail ? 'Add your email so we can write back.' : 'Check the email address, or leave it blank.');
      if (first && first.tagName === 'FIELDSET') return first.querySelector('input');
      return first;
    };
    var compose = function () {
      var lines = ['Estimate request for Konbit Home Services', ''];
      lines.push('Name: ' + f.name.value.trim());
      lines.push('Phone: ' + prettyPhone(phoneDigits(f.phone.value)));
      var email = f.email.value.trim();
      if (email) lines.push('Email: ' + email);
      lines.push('Project location: ' + picked('area'));
      lines.push('Type of work: ' + picked('service'));
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
        subject: 'Estimate request from ' + name + ': ' + picked('service') + ', ' + picked('area'),
        from_name: 'Konbit Home Services website',
        'Name': name,
        'Phone': prettyPhone(phoneDigits(f.phone.value))
      };
      if (email) {
        data['Email'] = email;
        data.replyto = email;
      }
      data['Project location'] = picked('area');
      data['Type of work'] = picked('service');
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

    // A link like contact.html?service=Tile%20Installation picks that service.
    try {
      var wanted = new URLSearchParams(window.location.search).get('service');
      Array.prototype.forEach.call(form.querySelectorAll('input[name="service"]'), function (r) {
        if (r.value === wanted) r.checked = true;
      });
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
      else if (t.name === 'service') setError(f.service, '');
      else if (t.name === 'area') setError(f.area, '');
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
