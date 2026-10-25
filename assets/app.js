/* The Value of Zero: interactive site */
(function () {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const h = (tag, attrs = {}, html = '') => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    if (html) el.innerHTML = html;
    return el;
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- Number helpers (BigInt, exact) ---------- */
  const DIG = '0123456789abcdef';
  const fmt = n => BigInt(n).toLocaleString('en-US');
  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  const sup = n => String(n).split('').map(c => SUP[c] || c).join('');
  const SUB = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
  const sub = n => String(n).split('').map(c => SUB[c] || c).join('');
  const pow = (b, e) => BigInt(b) ** BigInt(e);
  const groupDigits = s => s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const numeral = (s, b) => b === 10 ? groupDigits(s) : s.toUpperCase() + sub(b);

  function valueOf(digits, b) {
    const B = BigInt(b);
    let v = 0n;
    for (const d of digits) v = v * B + BigInt(d);
    return v;
  }

  function parseNumeral(raw, b) {
    let s = String(raw).replace(/[\s,_]/g, '').toLowerCase();
    if (!s) return { err: 'Type a number to begin.' };
    if (s.includes('.')) return { err: 'For numbers with a decimal point, open “After the point” in the side panel.', dec: true };
    for (const ch of s) {
      const v = DIG.indexOf(ch);
      if (v < 0 || v >= b) {
        const allowed = b <= 10 ? `0 to ${b - 1}` : `0 to 9 and A to ${DIG[b - 1].toUpperCase()}`;
        return { err: `“${ch}” is not a digit in base ${b}. Use only ${allowed}.` };
      }
    }
    let lead = 0;
    while (s.length > 1 && s[0] === '0') { s = s.slice(1); lead++; }
    if (/^0+$/.test(s)) return { err: 'Zero on its own has no digits to lift. Try a number like 2030.' };
    return { s, lead, digits: [...s].map(c => DIG.indexOf(c)) };
  }

  // Core of the paper: Z(N) = N - D(N) = sum over nonzero digits of d * b^(i-z) * (b^z - 1)
  function analyze(digits, b) {
    const B = BigInt(b);
    const L = digits.length;
    const N = valueOf(digits, b);
    const nz = digits.filter(d => d !== 0);
    const D = valueOf(nz, b);
    const Z = N - D;
    const terms = [];
    const zerosRight = new Array(L).fill(0);
    let z = 0;
    for (let idx = L - 1; idx >= 0; idx--) {
      zerosRight[idx] = z;
      if (digits[idx] === 0) z++;
    }
    digits.forEach((d, idx) => {
      if (d === 0) return;
      const i = L - 1 - idx, zr = zerosRight[idx];
      const without = BigInt(d) * pow(B, i - zr);
      const withZ = BigInt(d) * pow(B, i);
      terms.push({ d, idx, i, z: zr, without, withZ, lift: withZ - without });
    });
    const zeroCount = L - nz.length;
    let sumCheck = 0n;
    for (const t of terms) sumCheck += t.lift;
    return { N, D, Z, terms, zerosRight, zeroCount, L, nzStr: nz.map(d => DIG[d]).join(''), ok: sumCheck === Z };
  }

  /* ---------- Toast ---------- */
  let toastT;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ---------- Navigation ---------- */
  const panels = $$('.panel');
  const ids = panels.map(p => p.id);
  const navList = $('#navList');
  const dots = $('#dots');
  panels.forEach((p, i) => {
    const li = h('li');
    li.appendChild(h('a', { href: '#' + p.id, 'data-go': p.id },
      `<span class="ms">${p.dataset.icon}</span><span>${p.dataset.title}</span><span class="num">${i + 1}</span>`));
    navList.appendChild(li);
    dots.appendChild(h('button', { 'aria-label': p.dataset.title, 'data-go': p.id }));
  });

  let current = null;
  const onShow = {};
  function go(id, push = true) {
    if (!ids.includes(id)) id = ids[0];
    if (id === current) { closeNav(); return; }
    current = id;
    panels.forEach(p => p.classList.toggle('on', p.id === id));
    $$('#navList a').forEach(a => a.classList.toggle('on', a.dataset.go === id));
    $$('#dots button').forEach(b => b.classList.toggle('on', b.dataset.go === id));
    const i = ids.indexOf(id);
    $('#prevBtn').disabled = i === 0;
    $('#nextBtn').disabled = i === ids.length - 1;
    const p = $('#' + id);
    document.title = (i === 0 ? '' : p.dataset.title + ' · ') + 'The Value of Zero';
    if (push && location.hash !== '#' + id) history.pushState(null, '', '#' + id);
    closeNav();
    if (onShow[id]) onShow[id]();
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-go]');
    if (!a) return;
    e.preventDefault();
    go(a.dataset.go);
  });
  window.addEventListener('popstate', () => go(location.hash.slice(1).split('?')[0], false));
  $('#prevBtn').addEventListener('click', () => go(ids[Math.max(0, ids.indexOf(current) - 1)]));
  $('#nextBtn').addEventListener('click', () => go(ids[Math.min(ids.length - 1, ids.indexOf(current) + 1)]));
  document.addEventListener('keydown', e => {
    if (e.target.closest('input, select, textarea') || e.altKey || e.ctrlKey || e.metaKey) return;
    if (!$('#citeDialog').hidden) { if (e.key === 'Escape') closeCite(); return; }
    const i = ids.indexOf(current);
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { if (current !== 'paper') { e.preventDefault(); go(ids[Math.min(ids.length - 1, i + 1)]); } }
    if (e.key === 'ArrowUp' || e.key === 'PageUp') { if (current !== 'paper') { e.preventDefault(); go(ids[Math.max(0, i - 1)]); } }
  });

  // Swipe between sections on touch screens
  let touch = null;
  document.addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || e.target.closest('.scroll-x, .paper-view, .chart-wrap, .seg, .tiles, .formula, .sidenav')) { touch = null; return; }
    touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!touch) return;
    const dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8 && Date.now() - touch.t < 600) {
      const i = ids.indexOf(current);
      go(ids[Math.max(0, Math.min(ids.length - 1, i + (dx < 0 ? 1 : -1)))]);
    }
    touch = null;
  }, { passive: true });

  const sidenav = $('#sidenav'), scrim = $('#scrim');
  function closeNav() { sidenav.classList.remove('open'); scrim.classList.remove('open'); }
  $('#menuBtn').addEventListener('click', () => { sidenav.classList.add('open'); scrim.classList.add('open'); });
  scrim.addEventListener('click', closeNav);

  /* ---------- 1. Calculator ---------- */
  const calcInput = $('#calcInput'), calcBase = $('#calcBase');
  const CHIPS10 = ['10', '101', '2030', '5073', '1100', '1001', '7000', '10203', '1002030400'];
  const CHIPS2 = ['10', '100', '1010', '1001', '110100', '100000'];

  function renderCalcChips() {
    const b = +calcBase.value;
    const list = b === 2 ? CHIPS2 : CHIPS10.filter(s => [...s].every(c => DIG.indexOf(c) < b));
    const box = $('#calcChips');
    box.innerHTML = '';
    list.forEach(s => box.appendChild(h('button', {
      class: 'chip', type: 'button', 'data-v': s,
      onclick: () => { calcInput.value = b === 10 ? groupDigits(s) : s; runCalc(true); }
    }, b === 10 ? groupDigits(s) : s)));
  }

  function tileSize(n) { return n > 30 ? 's3' : n > 20 ? 's2' : n > 12 ? 's1' : ''; }

  function renderTiles(box, digits, zerosRight, anim) {
    box.className = 'tiles ' + tileSize(digits.length);
    box.innerHTML = '';
    digits.forEach((d, idx) => {
      const isZero = d === 0;
      const z = zerosRight ? zerosRight[idx] : 0;
      const tag = !zerosRight ? '' : isZero ? '' : z > 0 ? `<span class="tag up" title="pushed up ${z} place${z > 1 ? 's' : ''}">↑${z}</span>` : '<span class="tag"></span>';
      box.appendChild(h('div', { class: 'tile' + (isZero ? ' zero' : '') + (anim ? ' pop' : '') },
        `<span class="d">${DIG[d].toUpperCase()}</span>${zerosRight ? tag || '<span class="tag"></span>' : ''}`));
    });
  }

  function placeWord(z) { return z === 1 ? 'place' : 'places'; }

  function runCalc(anim) {
    const b = +calcBase.value;
    const parsed = parseNumeral(calcInput.value, b);
    const msg = $('#calcMsg');
    $$('#calcChips .chip').forEach(c => c.classList.toggle('on', c.dataset.v === String(calcInput.value).replace(/[\s,_]/g, '').toLowerCase()));
    if (parsed.err) {
      msg.textContent = parsed.err;
      msg.className = 'calc-msg err';
      if (parsed.dec) { msg.innerHTML = 'Numbers with a decimal point have their own section: <a href="#decimals" data-go="decimals">After the point</a>.'; }
      return;
    }
    msg.className = 'calc-msg';
    msg.textContent = parsed.lead ? `Zeros at the front push nothing, so they are worth 0. We left out ${parsed.lead === 1 ? 'that zero' : 'those ' + parsed.lead + ' zeros'}.` : '';

    const { s, digits } = parsed;
    const r = analyze(digits, b);
    renderTiles($('#tilesN'), digits, r.zerosRight, anim);
    renderTiles($('#tilesD'), [...r.nzStr].map(c => DIG.indexOf(c)), null, anim);

    const big = $('#resZ');
    big.textContent = fmt(r.Z);
    big.className = 'result-big' + (big.textContent.length > 22 ? ' tiny' : big.textContent.length > 14 ? ' small' : '');
    if (b === 10) {
      $('#resEq').textContent = `${fmt(r.N)} − ${fmt(r.D)} = ${fmt(r.Z)}`;
    } else {
      $('#resEq').textContent = `${numeral(s, b)} = ${fmt(r.N)}, without zeros ${numeral(r.nzStr, b)} = ${fmt(r.D)}, so ${fmt(r.N)} − ${fmt(r.D)} = ${fmt(r.Z)}`;
    }

    const badges = $('#resBadges');
    badges.innerHTML = '';
    const bm1 = BigInt(b - 1);
    if (r.zeroCount === 0) {
      badges.appendChild(h('span', { class: 'badge info' }, '<span class="ms">info</span>No zeros here, so they are worth 0'));
    } else {
      if (b > 2) badges.appendChild(h('span', { class: 'badge' }, `<span class="ms">check_circle</span>Multiple of ${b - 1}: ${fmt(r.Z)} = ${b - 1} × ${fmt(r.Z / bm1)}`));
      const pct = Number((r.Z * 100000n) / r.N) / 1000;
      badges.appendChild(h('span', { class: 'badge info' }, `<span class="ms">pie_chart</span>Zeros make up ${pct.toLocaleString('en-US', { maximumFractionDigits: 3 })}% of the number`));
      badges.appendChild(h('span', { class: 'badge info' }, `<span class="ms">tag</span>${r.zeroCount} zero${r.zeroCount > 1 ? 's' : ''} in ${r.L} digits`));
    }
    if (b !== 10) badges.appendChild(h('span', { class: 'badge info' }, `<span class="ms">translate</span>Values shown as everyday numbers`));

    const zw = r.zeroCount === 1 ? 'zero is' : r.zeroCount + ' zeros are';
    $('#summaryList').innerHTML = r.zeroCount === 0
      ? `<li><span class="sn">1</span><span>Your number is <b>${fmt(r.N)}</b>.</span></li><li><span class="sn">2</span><span>It has no zeros, so removing them leaves <b>${fmt(r.D)}</b>.</span></li><li><span class="sn">3</span><span>Nothing changed, so the value is <b>0</b>.</span></li>`
      : `<li><span class="sn">1</span><span>Your number is <b>${fmt(r.N)}</b>.</span></li>
         <li><span class="sn">2</span><span>Remove every zero and it shrinks to <b>${fmt(r.D)}</b>.</span></li>
         <li><span class="sn">3</span><span>The difference is ${fmt(r.N)} − ${fmt(r.D)} = <b class="lift">${fmt(r.Z)}</b>. So the ${zw} worth ${fmt(r.Z)}.</span></li>`;

    const list = $('#stepsList');
    list.innerHTML = '';
    if (r.zeroCount === 0) {
      list.appendChild(h('li', { class: 'muted' }, `<span class="sd">✓</span><span>Removing zeros changes nothing because there are none. Try 2,030 or 101.</span>`));
    }
    const lifted = [];
    r.terms.forEach(t => {
      const D = DIG[t.d].toUpperCase();
      if (r.zeroCount === 0) return;
      if (t.z === 0) {
        list.appendChild(h('li', { class: 'muted' }, `<span class="sd">${D}</span><span>This ${D} has no zeros on its right, so the zeros do not move it.</span>`));
        return;
      }
      lifted.push(t.lift);
      list.appendChild(h('li', {}, `<span class="sd">${D}</span><span>This ${D} has <b>${t.z} zero${t.z > 1 ? 's' : ''}</b> on its right, which push it up ${t.z} ${placeWord(t.z)}. Without them it is worth ${fmt(t.without)}; with them it is worth ${fmt(t.withZ)}. The zeros add <span class="lift">${fmt(t.lift)}</span>.<span class="sm">${D} × ${b}${sup(t.i - t.z)} × (${b}${sup(t.z)} − 1) = ${fmt(t.lift)}</span></span>`));
    });
    if (lifted.length) {
      const sum = lifted.length <= 6 ? lifted.map(fmt).join(' + ') + ' = ' : 'All lifts added together = ';
      list.appendChild(h('li', { class: 'total' }, `<span class="sd">Σ</span><span>${sum}<span class="lift">${fmt(r.Z)}</span>. Same answer as ${fmt(r.N)} − ${fmt(r.D)}${r.ok ? ' ✓' : ''}</span>`));
    }
    const clean = s;
    if (b === 10 && location.hash.startsWith('#calculator')) history.replaceState(null, '', '#calculator?n=' + clean);
  }

  calcInput.addEventListener('input', () => runCalc(false));
  $('#calcForm').addEventListener('submit', e => { e.preventDefault(); calcInput.blur(); runCalc(true); });
  $('#calcClear').addEventListener('click', () => { calcInput.value = ''; calcInput.focus(); runCalc(false); });
  calcBase.addEventListener('change', () => {
    const b = +calcBase.value;
    calcInput.setAttribute('inputmode', b <= 10 ? 'numeric' : 'text');
    renderCalcChips();
    calcInput.value = b === 2 ? '1010' : '2030';
    runCalc(true);
  });

  function openInCalc(n, b = 10) {
    calcBase.value = String(b);
    renderCalcChips();
    calcInput.value = b === 10 ? groupDigits(String(n)) : String(n);
    go('calculator');
    runCalc(true);
  }

  /* ---------- 2. Big idea ---------- */
  const IDEA_STARTS = ['12', '5', '340'];
  const IDEA_OPS = [
    { k: 'add', label: 'Add 0' },
    { k: 'after', label: 'Write 0 after it' },
    { k: 'seven', label: 'Write 7 after it' },
    { k: 'before', label: 'Write 0 before it' }
  ];
  let ideaN = '12', ideaOp = 'after';
  function renderIdea() {
    const n = BigInt(ideaN), f = fmt(n);
    let big = '', text = '';
    const parts = s => [...s].map(c => c).join('');
    if (ideaOp === 'add') {
      big = `<span>${f} + 0</span><span class="arrow">→</span><span class="new">${f}</span>`;
      text = `Adding zero puts nothing together with ${f}, so it stays ${f}. Zero is the amount “nothing”.`;
    } else if (ideaOp === 'after') {
      big = `<span>${f}</span><span class="arrow">→</span><span class="new">${parts(ideaN)}<span class="z">0</span></span>`;
      text = `The 0 takes the last place, so every digit of ${f} moves one place up and becomes 10 times bigger: 10 × ${f} = ${fmt(n * 10n)}. That is a jump of ${fmt(n * 9n)}, which is 9 × ${f}.`;
    } else if (ideaOp === 'seven') {
      big = `<span>${f}</span><span class="arrow">→</span><span class="new">${parts(ideaN)}<span class="seven">7</span></span>`;
      text = `Any digit causes the same push: 10 × ${f} = ${fmt(n * 10n)}, and then the 7 adds 7 more, giving ${fmt(n * 10n + 7n)}. Zero is the only digit that adds nothing on top of the push, which is why it shows the push so clearly.`;
    } else {
      big = `<span>${f}</span><span class="arrow">→</span><span class="new"><span class="z">0</span>${parts(ideaN)}</span><span class="arrow">=</span><span>${f}</span>`;
      text = `A zero at the very front has no digits on its left to push, so ${'0' + ideaN} is still just ${f}. Its value is 0.`;
    }
    $('#ideaBig').innerHTML = big;
    $('#ideaText').textContent = text;
    $$('#ideaStart .chip').forEach(c => c.classList.toggle('on', c.dataset.v === ideaN));
    $$('#ideaOps button').forEach(c => c.classList.toggle('on', c.dataset.k === ideaOp));
  }
  IDEA_STARTS.forEach(s => $('#ideaStart').appendChild(h('button', { class: 'chip', 'data-v': s, onclick: () => { ideaN = s; renderIdea(); } }, 'Start with ' + s)));
  IDEA_OPS.forEach(o => $('#ideaOps').appendChild(h('button', { 'data-k': o.k, role: 'tab', onclick: () => { ideaOp = o.k; renderIdea(); } }, o.label)));
  renderIdea();

  /* ---------- 4. Rules ---------- */
  const ln = (n, html) => `<div class="wl"><span class="wn">${n}</span><span>${html}</span></div>`;
  const m = s => `<span class="m">${s}</span>`;

  function workTrailing(s) {
    const t = s.length - s.replace(/0+$/, '').length;
    const M = s.slice(0, s.length - t);
    const Mv = BigInt(M), res = Mv * (pow(10, t) - 1n);
    const r = analyze([...s].map(Number), 10);
    return [
      ln(1, `${fmt(BigInt(s))} ends in <b>${t} zero${t > 1 ? 's' : ''}</b>, so t = ${t}.`),
      ln(2, `The part before them is <b>M = ${fmt(Mv)}</b>.`),
      ln(3, `${m(`${fmt(Mv)} × (10${sup(t)} − 1) = ${fmt(Mv)} × ${fmt(pow(10, t) - 1n)} = `)}<span class="ans">${fmt(res)}</span>`),
      ln(4, `Check by removing the zeros: ${m(`${fmt(r.N)} − ${fmt(r.D)} = ${fmt(r.Z)}`)} <span class="ok">✓</span>`)
    ].join('');
  }
  function workSingle(s) {
    const idx = s.indexOf('0');
    const p = s.length - 1 - idx;
    const H = BigInt(s.slice(0, idx));
    const right = s.slice(idx + 1);
    const res = 9n * H * pow(10, p);
    const r = analyze([...s].map(Number), 10);
    return [
      ln(1, `The only zero in ${fmt(BigInt(s))} is in place <b>p = ${p}</b> (counting from the right, starting at 0).`),
      ln(2, `The digits on its left make <b>H = ${fmt(H)}</b>.${right ? ` The digits on its right (${right}) do not matter.` : ''}`),
      ln(3, `${m(`9 × ${fmt(H)} × 10${sup(p)} = `)}<span class="ans">${fmt(res)}</span>`),
      ln(4, `Check: ${m(`${fmt(r.N)} − ${fmt(r.D)} = ${fmt(r.Z)}`)} <span class="ok">✓</span>`)
    ].join('');
  }
  function workUniversal(s, b = 10) {
    const digits = [...s].map(c => DIG.indexOf(c));
    const r = analyze(digits, b);
    const lines = [];
    let k = 1;
    if (b !== 10) lines.push(ln(k++, `${numeral(s, b)} is ${fmt(r.N)} in everyday numbers. Removing its zeros gives ${numeral(r.nzStr, b)} = ${fmt(r.D)}.`));
    r.terms.forEach(t => {
      if (t.z === 0) { lines.push(ln(k++, `The ${t.d} has no zeros on its right: lift 0.`)); return; }
      lines.push(ln(k++, `The ${t.d} (place ${t.i}) has ${t.z} zero${t.z > 1 ? 's' : ''} on its right: ${m(`${t.d} × ${b}${sup(t.i - t.z)} × (${b}${sup(t.z)} − 1) = ${fmt(t.lift)}`)}`));
    });
    const lifts = r.terms.filter(t => t.z).map(t => fmt(t.lift));
    lines.push(ln(k++, `Add the lifts: ${m(lifts.join(' + ') + ' = ')}<span class="ans">${fmt(r.Z)}</span>`));
    lines.push(ln(k, `Check: ${m(`${fmt(r.N)} − ${fmt(r.D)} = ${fmt(r.Z)}`)} <span class="ok">✓</span>`));
    return lines.join('');
  }
  function workNine(s) {
    const r = analyze([...s].map(Number), 10);
    const ds = x => [...x].reduce((a, c) => a + +c, 0);
    return [
      ln(1, `Digit sum of ${fmt(r.N)}: ${m([...s].join(' + ') + ' = ' + ds(s))}`),
      ln(2, `Digit sum of ${fmt(r.D)} (zeros removed): ${m([...r.nzStr].join(' + ') + ' = ' + ds(r.nzStr))}. The same, because zeros add nothing to a digit sum.`),
      ln(3, `So both leave the same remainder when divided by 9, and their difference ${fmt(r.Z)} divides exactly by 9.`),
      ln(4, `${m(`${fmt(r.Z)} ÷ 9 = `)}<span class="ans">${fmt(r.Z / 9n)}</span> <span class="ok">✓ no remainder</span>`)
    ].join('');
  }
  function workLimits(s) {
    if (s === '1001|1100') {
      const a = analyze([1, 0, 0, 1], 10), c = analyze([1, 1, 0, 0], 10);
      return [
        ln(1, `1,001 and 1,100 both have <b>4 digits</b> and <b>2 zeros</b>.`),
        ln(2, `1,001 → ${m('1,001 − 11 = ')}<span class="ans">${fmt(a.Z)}</span>`),
        ln(3, `1,100 → ${m('1,100 − 11 = ')}<span class="ans">${fmt(c.Z)}</span>`),
        ln(4, `Different answers. So length and number of zeros are not enough: <b>where</b> the zeros sit matters. In 1,100 both zeros push both 1s; in 1,001 they push only the first 1.`)
      ].join('');
    }
    const r = analyze([...s].map(Number), 10);
    if (r.zeroCount === 0) {
      return [
        ln(1, `${fmt(r.N)} has no zero digit.`),
        ln(2, `Removing zeros leaves ${fmt(r.D)}, the same number.`),
        ln(3, `${m(`${fmt(r.N)} − ${fmt(r.D)} = `)}<span class="ans">0</span>. The value is 0 only when there are no zeros.`)
      ].join('');
    }
    return [
      ln(1, `${fmt(r.N)} without zeros is ${fmt(r.D)}, and that is always at least 1.`),
      ln(2, `${m(`${fmt(r.N)} − ${fmt(r.D)} = `)}<span class="ans">${fmt(r.Z)}</span>`),
      ln(3, `So the zeros are worth a lot, ${(Number(r.Z * 100000n / r.N) / 1000).toLocaleString('en-US')}% of the number, but never all of it: ${fmt(r.Z)} &lt; ${fmt(r.N)}.`)
    ].join('');
  }

  const RULES = [
    {
      tab: 'Zeros at the end', tag: 'Rule 1 · Trailing zeros',
      title: 'Zeros at the end of a number',
      plain: 'If a number ends in zeros, take the part before them and call it M. The zeros are worth M × 9, or M × 99, or M × 999, and so on: one 9 for each zero.',
      formula: 'value = M × (10<sup>t</sup> − 1)   where t = number of end zeros',
      why: 'Removing the end zeros divides the number by 10 for each zero, which leaves M. So the number drops from M × 10ᵗ to M.',
      ex: ['10', '100', '7000', '4500', '120'], work: workTrailing
    },
    {
      tab: 'One zero', tag: 'Rule 2 · A single zero anywhere',
      title: 'A number with just one zero',
      plain: 'Only the digits on the left of the zero matter. Call them H. The zero is worth 9 × H × the place value of the zero. The digits on its right make no difference at all.',
      formula: 'value = 9 × H × 10<sup>p</sup>   where p = place of the zero, from the right, starting at 0',
      why: 'The zero lifts the left part H by one place. The digits on the right stay where they are. That is why 101, 102, … 109 are all worth exactly 90.',
      ex: ['101', '109', '5073', '20345', '1203'], work: workSingle
    },
    {
      tab: 'Any number', tag: 'Rule 3 · The universal formula',
      title: 'One formula for every number',
      plain: 'Look at each non-zero digit. Count the zeros on its right; that is how many places they push it up. Work out how much bigger that makes the digit, then add it all up.',
      formula: 'value = Σ d × b<sup>i−z</sup> × (b<sup>z</sup> − 1)',
      why: 'd is a non-zero digit, i is its place, z is the number of zeros on its right and b is the base (10 for everyday numbers). Rules 1 and 2 are special cases. It works in every base, even binary.',
      ex: ['2030', '10203', '1002030400', '1010|2'], work: s => { const [n, b] = s.split('|'); return workUniversal(n, b ? +b : 10); }
    },
    {
      tab: 'Always × 9', tag: 'Rule 4 · Divisibility',
      title: 'The answer is always a multiple of 9',
      plain: 'Whatever number you pick, the zeros are worth a multiple of 9. In other bases it is a multiple of (base − 1), for example a multiple of 7 in base 8.',
      formula: 'value ÷ 9 = a whole number, always',
      why: 'Removing zeros does not change the sum of the digits. Numbers with the same digit sum leave the same remainder when divided by 9. This is the old “casting out nines” check.',
      ex: ['2030', '7000', '1100', '10203'], work: workNine
    },
    {
      tab: 'Limits', tag: 'Rule 5 · Bounds',
      title: 'Never negative, never the whole number',
      plain: 'For whole numbers the zeros are worth at least 0 and always less than the number itself. They are worth exactly 0 only when there is no zero. And knowing just the length and how many zeros is not enough.',
      formula: '0 ≤ value < number',
      why: 'Every lift in the universal formula is 0 or more, and removing zeros always leaves at least one digit, so something is always left over.',
      ex: ['1001|1100', '123', '1000000'], work: workLimits, label: { '1001|1100': '1,001 vs 1,100' }
    }
  ];
  let ruleI = 0, ruleEx = 0;
  RULES.forEach((r, i) => $('#ruleTabs').appendChild(h('button', {
    class: 'tab', role: 'tab', onclick: () => { ruleI = i; ruleEx = 0; renderRule(); }
  }, `${r.tab}<small>Rule ${i + 1}</small>`)));
  function exLabel(r, s) {
    if (r.label && r.label[s]) return r.label[s];
    const [n, b] = s.split('|');
    return b ? n + sub(b) : groupDigits(n);
  }
  function renderRule() {
    const r = RULES[ruleI];
    $$('#ruleTabs .tab').forEach((t, i) => t.classList.toggle('on', i === ruleI));
    $('#ruleTag').textContent = r.tag;
    $('#ruleTitle').textContent = r.title;
    $('#rulePlain').textContent = r.plain;
    $('#ruleFormula').innerHTML = r.formula;
    $('#ruleWhy').textContent = r.why;
    const chips = $('#ruleChips');
    chips.innerHTML = '';
    r.ex.forEach((s, i) => chips.appendChild(h('button', { class: 'chip' + (i === ruleEx ? ' on' : ''), onclick: () => { ruleEx = i; renderRule(); } }, exLabel(r, s))));
    $('#ruleWork').innerHTML = r.work(r.ex[ruleEx]);
  }
  $('#ruleOpen').addEventListener('click', () => {
    const s = RULES[ruleI].ex[ruleEx];
    const [n, b] = s.split('|');
    if (b && b.length > 2) openInCalc(b); else openInCalc(n, b ? +b : 10);
  });
  renderRule();

  /* ---------- 5. Sharing (Shapley value) ---------- */
  const PLACES = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands', 'millions', 'ten millions', 'hundred millions', 'billions', 'ten billions', 'hundred billions'];
  const SHARE_EX = ['2030', '1005', '100', '10203', '30005', '1002030400'];
  let shareN = '2030';
  const fact = n => { let f = 1n; for (let i = 2n; i <= BigInt(n); i++) f *= i; return f; };

  function shapley(s) {
    const digits = [...s].map(Number);
    const zeroIdx = digits.map((d, i) => d === 0 ? i : -1).filter(i => i >= 0);
    const k = zeroIdx.length;
    const D = valueOf(digits.filter(d => d), 10);
    // worth of a set of kept zeros: number with only those zeros, minus D
    const worth = mask => valueOf(digits.filter((d, i) => d !== 0 || (mask >> zeroIdx.indexOf(i)) & 1), 10) - D;
    const full = (1 << k) - 1;
    const kf = fact(k);
    const W = [];
    for (let mask = 0; mask <= full; mask++) W[mask] = worth(mask);
    return zeroIdx.map((idx, j) => {
      let num = 0n;
      for (let mask = 0; mask <= full; mask++) {
        if ((mask >> j) & 1) continue;
        let size = 0; for (let t = mask; t; t >>= 1) size += t & 1;
        num += fact(size) * fact(k - size - 1) * (W[mask | (1 << j)] - W[mask]);
      }
      const alone = W[full] - W[full & ~(1 << j)];
      return { idx, place: digits.length - 1 - idx, num, den: kf, alone };
    });
  }
  function fmtFrac(num, den) {
    if (num % den === 0n) return fmt(num / den);
    const q = (num * 100n + den / 2n) / den;
    const whole = q / 100n, frac = String(q % 100n).padStart(2, '0');
    return fmt(whole) + '.' + frac.replace(/0$/, '');
  }
  function renderShare() {
    const s = shareN;
    const r = analyze([...s].map(Number), 10);
    const rows = shapley(s);
    $$('#shareChips .chip').forEach(c => c.classList.toggle('on', c.dataset.v === s));
    let zn = 0;
    $('#shareNum').innerHTML = [...s].map(c => c === '0' ? `<span class="z">0<sub>#${++zn}</sub></span>` : `<span>${c}</span>`).join('');
    const max = rows.reduce((a, x) => x.num / x.den > a ? x.num / x.den : a, 1n);
    let sumAlone = 0n, sumFair = 0n;
    const body = rows.map((x, i) => {
      sumAlone += x.alone; sumFair += x.num;
      const w = Math.max(1, Number((x.num * 1000n) / (x.den * (max > 0n ? max : 1n))) / 10);
      return `<tr><td>Zero #${i + 1} <span style="color:var(--ink-3)">· ${PLACES[x.place] || 'place ' + x.place}</span></td>
        <td class="n">${fmt(x.alone)}</td><td class="n"><b>${fmtFrac(x.num, x.den)}</b></td>
        <td class="barcell"><div class="bar" style="width:${w}%"></div></td></tr>`;
    }).join('');
    const den = rows.length ? rows[0].den : 1n;
    const over = sumAlone > r.Z;
    $('#shareTable').innerHTML = `
      <thead><tr><th>Zero</th><th class="n">Removed alone</th><th class="n">Fair share</th><th class="barcell"></th></tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr><td>Total · all zeros are worth ${fmt(r.Z)}</td>
        <td class="n ${over ? 'warn' : ''}">${fmt(sumAlone)}${over ? ' ✗' : ''}</td>
        <td class="n">${fmtFrac(sumFair, den)} ✓</td><td class="barcell"></td></tr></tfoot>`;
  }
  SHARE_EX.forEach(s => $('#shareChips').appendChild(h('button', { class: 'chip', 'data-v': s, onclick: () => { shareN = s; renderShare(); } }, groupDigits(s))));
  renderShare();

  /* ---------- 6. Decimals ---------- */
  const DEC_EX = ['0.05', '0.005', '10.05', '2.50', '1.0203', '007', '0.101'];
  let decS = '0.05';
  function decParse(s, scale) {
    const [ip, fp = ''] = s.split('.');
    return BigInt((ip || '0') + fp.padEnd(scale, '0'));
  }
  function decFmt(v, scale) {
    const neg = v < 0n; if (neg) v = -v;
    let str = v.toString().padStart(scale + 1, '0');
    let ip = scale ? str.slice(0, -scale) : str, fp = scale ? str.slice(-scale) : '';
    fp = fp.replace(/0+$/, '');
    return (neg ? '−' : '') + groupDigits(ip) + (fp ? '.' + fp : '');
  }
  function renderDec() {
    const s = decS;
    const scale = (s.split('.')[1] || '').length;
    const x = decParse(s, scale);
    $$('#decChips .chip').forEach(c => c.classList.toggle('on', c.dataset.v === s));
    const info = [];
    [...s].forEach((c, i) => {
      if (c !== '0') return;
      const without = s.slice(0, i) + s.slice(i + 1);
      const diff = x - decParse(without, scale);
      info.push({ i, diff, without });
    });
    const cls = d => d > 0n ? 'pos' : d < 0n ? 'neg' : 'nil';
    $('#decTiles').innerHTML = [...s].map((c, i) => {
      if (c === '.') return '<span class="pt">.</span>';
      const z = info.find(o => o.i === i);
      return `<span class="${z ? cls(z.diff) : ''}">${c}</span>`;
    }).join('');
    const mark = i => esc(s.slice(0, i)) + '<u><b>0</b></u>' + esc(s.slice(i + 1));
    const list = info.map((o, n) => {
      const c = cls(o.diff);
      const pointAt = s.indexOf('.');
      let why;
      if (c === 'nil') why = (pointAt === -1 || o.i < pointAt) ? 'It is at the front, with no digits on its left to push.' : 'It is at the very end after the point, with nothing on its right to push.';
      else if (c === 'pos') why = 'It pushes the digits on its left one place up.';
      else {
        const T = BigInt(s.slice(o.i + 1).replace('.', '') || '0');
        why = `It pushes the digits on its right one place down. Part on its right: ${decFmt(T, scale)}, so −9 × ${decFmt(T, scale)}.`;
      }
      const sign = o.diff > 0n ? '+' : '';
      return `<li>Zero #${n + 1} in <span class="mono">${mark(o.i)}</span> is worth <span class="v ${c}">${sign}${decFmt(o.diff, scale)}</span>. ${why}
        <span class="m">${esc(s)} − ${esc(o.without)} = ${decFmt(o.diff, scale)}</span></li>`;
    });
    const [ip, fp = ''] = s.split('.');
    const dz = (ip.replace(/0/g, '') || '0') + (s.includes('.') ? '.' + fp.replace(/0/g, '') : '');
    const tot = x - decParse(dz.replace(/\.$/, ''), scale);
    list.push(`<li class="total">All zeros together: <span class="mono">${esc(s)} − ${esc(dz.replace(/\.$/, ''))} = </span><span class="v ${cls(tot)}">${tot > 0n ? '+' : ''}${decFmt(tot, scale)}</span></li>`);
    $('#decList').innerHTML = list.join('');
  }
  DEC_EX.forEach(s => $('#decChips').appendChild(h('button', { class: 'chip', 'data-v': s, onclick: () => { decS = s; renderDec(); } }, s)));
  renderDec();

  /* ---------- 7. Examples ---------- */
  const EX = [
    ['10', 'Rule 1'], ['100', 'Rule 1'], ['101', 'Rule 2'], ['1001', 'Rule 3'], ['1005', 'Rule 3'],
    ['1100', 'Rules 1, 3'], ['2030', 'Rule 3'], ['5073', 'Rule 2'], ['7000', 'Rule 1'], ['10203', 'Rule 3'], ['1002030400', 'Rule 3 · large example']
  ];
  $('#exTable').innerHTML = `<thead><tr><th>Number</th><th>Zeros removed</th><th>Zeros worth</th><th class="hide-m">÷ 9</th><th>Rule</th></tr></thead><tbody>` +
    EX.map(([s, rule]) => {
      const r = analyze([...s].map(Number), 10);
      return `<tr data-n="${s}" title="Open ${groupDigits(s)} in the calculator"><td>${fmt(r.N)}</td><td>${fmt(r.D)}</td><td class="z">${fmt(r.Z)}</td><td class="hide-m">${fmt(r.Z / 9n)}</td><td>${rule}</td></tr>`;
    }).join('') + '</tbody>';
  $('#exTable').addEventListener('click', e => { const tr = e.target.closest('tr[data-n]'); if (tr) openInCalc(tr.dataset.n); });
  $$('#exView button').forEach(b => b.addEventListener('click', () => {
    $$('#exView button').forEach(x => x.classList.toggle('on', x === b));
    const chart = b.dataset.v === 'chart';
    $('#exChartCard').hidden = !chart;
    $('#exTableCard').hidden = chart;
    if (chart) drawChart();
  }));

  function drawChart() {
    const wrap = $('#chartWrap');
    const W = wrap.clientWidth, H = wrap.clientHeight;
    if (!W || !H) return;
    const pad = { l: 40, r: 12, t: 8, b: 26 };
    const xs = v => pad.l + (v / 300) * (W - pad.l - pad.r);
    const ys = v => H - pad.b - (v / 300) * (H - pad.t - pad.b);
    let g = '<g class="grid">';
    [0, 100, 200, 300].forEach(v => { g += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${ys(v)}" y2="${ys(v)}"/>`; });
    g += '</g><g class="axis">';
    [0, 100, 200, 300].forEach(v => {
      g += `<text x="${pad.l - 6}" y="${ys(v) + 4}" text-anchor="end">${v}</text>`;
      g += `<text x="${xs(v)}" y="${H - 8}" text-anchor="middle">${v}</text>`;
    });
    g += '</g>';
    g += `<line class="ref" x1="${xs(0)}" y1="${ys(0)}" x2="${xs(300)}" y2="${ys(270)}"/>`;
    g += `<text x="${xs(300) - 4}" y="${ys(270) - 6}" text-anchor="end" style="fill:var(--ink-3);font-size:11px">90% of the number</text>`;
    let pts = '', hits = '';
    for (let n = 1; n <= 300; n++) {
      const r = analyze([...String(n)].map(Number), 10);
      if (r.Z === 0n) continue;
      const cls = n % 10 === 0 ? 'a' : 'b';
      pts += `<circle class="${cls}" cx="${xs(n)}" cy="${ys(Number(r.Z))}" r="4"/>`;
      hits += `<circle class="hit" cx="${xs(n)}" cy="${ys(Number(r.Z))}" r="9" data-n="${n}" data-z="${r.Z}" data-d="${r.D}"/>`;
    }
    wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Scatter chart of the value of zeros for numbers 1 to 300">${g}${pts}${hits}</svg><div class="chart-tip"></div>`;
    const tip = $('.chart-tip', wrap);
    $$('circle.hit', wrap).forEach(c => {
      const show = () => {
        tip.innerHTML = `<b>${c.dataset.n}</b> → without zeros ${c.dataset.d} · zeros worth <b>${c.dataset.z}</b>`;
        tip.style.left = Math.min(Math.max(c.getAttribute('cx'), 110), W - 110) + 'px';
        tip.style.top = c.getAttribute('cy') + 'px';
        tip.style.display = 'block';
      };
      c.addEventListener('mouseenter', show);
      c.addEventListener('touchstart', show, { passive: true });
      c.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
      c.addEventListener('click', () => openInCalc(c.dataset.n));
    });
  }
  let resizeT;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { if (current === 'examples' && !$('#exChartCard').hidden) drawChart(); if (current === 'paper' && pdfDoc) renderPdf(); }, 200);
  });

  /* ---------- 8. History ---------- */
  const HISTORY = [
    ['c. 300 BCE', 'Babylon', 'Scribes write two slanted wedges to mark an empty place inside a number. A placeholder only, never an amount.', 'placeholder'],
    ['2nd century CE', 'Greek astronomers', 'Ptolemy uses a small circle for empty places in his tables of numbers.', 'placeholder'],
    ['c. 4th century CE', 'The Maya', 'Independently, the Maya use a shell-like zero sign in their Long Count calendar dates.', 'placeholder'],
    ['3rd–4th century CE', 'Bakhshali manuscript', 'An Indian manuscript uses a dot for zero. Some leaves were carbon dated to this time, though dates are debated.', 'symbol'],
    ['628 CE', 'Brahmagupta, India', 'First known author to treat zero as a number in its own right, with rules like “a number plus zero is that number”.', 'number', true],
    ['c. 825 CE', 'al-Khwārizmī', 'Writes on calculating with the Indian numerals, spreading them across the Islamic world.', 'spread'],
    ['876 CE', 'Gwalior, India', 'A temple inscription contains one of the oldest securely dated round zeros in India.', 'symbol'],
    ['1202 CE', 'Fibonacci, Italy', 'Liber Abaci introduces the numerals and their zero to European merchants. They slowly replace Roman numerals.', 'spread']
  ];
  $('#timeline').innerHTML = HISTORY.map(([when, where, text, role, key]) =>
    `<li class="${key ? 'key' : ''}"><span class="role">${role}</span><div class="when">${when}</div><div class="where">${where}</div><p>${text}</p></li>`).join('');

  /* ---------- 9. Paper viewer ---------- */
  const PDF_URL = 'paper/value-of-zero-paper.pdf';
  const PDFJS = 'assets/vendor/pdfjs/';
  let pdfDoc = null, pdfLoading = false, zoom = 1, renderToken = 0;

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  function paperFallback(reason) {
    const view = $('#paperView');
    view.innerHTML = '';
    if (reason === 'missing') {
      view.appendChild(h('div', { class: 'paper-status' }, '<span class="ms" style="font-size:40px;width:auto">description</span>The paper file is not in the paper folder yet.'));
      return;
    }
    view.appendChild(h('iframe', { src: PDF_URL, title: 'The Value of Zero paper' }));
  }
  async function loadPaper() {
    if (pdfDoc || pdfLoading) return;
    pdfLoading = true;
    try {
      if (!window.pdfjsLib) await loadScript(PDFJS + 'pdf.min.js');
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
      const resp = await fetch(PDF_URL, { cache: 'no-cache' });
      if (!resp.ok) { paperFallback('missing'); return; }
      const data = await resp.arrayBuffer();
      pdfDoc = await window.pdfjsLib.getDocument({ data }).promise;
      await renderPdf();
    } catch (err) {
      paperFallback();
    } finally {
      pdfLoading = false;
    }
  }
  async function renderPdf() {
    if (!pdfDoc) return;
    const token = ++renderToken;
    const view = $('#paperView');
    const avail = Math.min(view.clientWidth - 32, 900);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const frag = [];
    for (let p = 1; p <= pdfDoc.numPages; p++) {
      const page = await pdfDoc.getPage(p);
      if (token !== renderToken) return;
      const base = page.getViewport({ scale: 1 });
      const scale = (avail * zoom) / base.width;
      const vp = page.getViewport({ scale: scale * dpr });
      const c = document.createElement('canvas');
      c.width = vp.width; c.height = vp.height;
      c.style.width = (vp.width / dpr) + 'px';
      c.style.height = (vp.height / dpr) + 'px';
      c.setAttribute('aria-label', 'Page ' + p);
      frag.push({ c, page, vp });
    }
    if (token !== renderToken) return;
    view.innerHTML = '';
    view.style.alignItems = zoom > 1 ? 'flex-start' : 'center';
    for (const f of frag) {
      view.appendChild(f.c);
      await f.page.render({ canvasContext: f.c.getContext('2d'), viewport: f.vp }).promise;
      if (token !== renderToken) return;
    }
  }
  $('#zoomIn').addEventListener('click', () => { zoom = Math.min(2.5, +(zoom + 0.25).toFixed(2)); renderPdf(); });
  $('#zoomOut').addEventListener('click', () => { zoom = Math.max(0.5, +(zoom - 0.25).toFixed(2)); renderPdf(); });
  onShow.paper = loadPaper;
  onShow.examples = () => { if (!$('#exChartCard').hidden) drawChart(); };

  // Cite
  const citeDialog = $('#citeDialog');
  function closeCite() { citeDialog.hidden = true; }
  $('#citeBtn').addEventListener('click', () => { citeDialog.hidden = false; $('#citeCopy').focus(); });
  $('#citeClose').addEventListener('click', closeCite);
  citeDialog.addEventListener('click', e => { if (e.target === citeDialog) closeCite(); });
  $('#citeCopy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#citeText').textContent); toast('Citation copied'); }
    catch (e) { toast('Select the text to copy it'); }
  });

  /* ---------- Start ---------- */
  renderCalcChips();
  const hash = location.hash.slice(1);
  const [hid, query] = hash.split('?');
  const qn = new URLSearchParams(query || '').get('n');
  if (qn && /^\d{1,40}$/.test(qn)) calcInput.value = groupDigits(qn);
  else calcInput.value = '2,030';
  runCalc(false);
  go(hid || 'calculator', false);
})();
