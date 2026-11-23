// Asset kit page: renders kit/data.json (built from Deliver's manifest) with copy and download actions.
const $ = (s, r = document) => r.querySelector(s);
const ROOT = '../';
const url = (p) => ROOT + p;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const base = (p) => p.split('/').pop();

let toastTimer;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2200); }
async function copyText(text, what) { try { await navigator.clipboard.writeText(text); toast(`${what} copied`); } catch { toast('Copying is blocked in this browser'); } }
// SVG as vectors where the browser allows it (pastes as shapes in Figma, Illustrator, Canva), plain text otherwise
async function copySvg(href) {
  const txt = await fetch(url(href)).then((r) => r.text()); let done = false;
  try {
    if (window.ClipboardItem && navigator.clipboard.write && (!ClipboardItem.supports || ClipboardItem.supports('image/svg+xml'))) {
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([txt], { type: 'text/plain' }), 'image/svg+xml': new Blob([txt], { type: 'image/svg+xml' }) })]); done = true;
    }
  } catch {}
  if (!done) { try { await navigator.clipboard.writeText(txt); done = true; } catch {} }
  toast(done ? 'SVG copied: paste it into Canva, Figma or Illustrator' : 'Copying is blocked in this browser');
}
async function zip(entries, name) {
  if (!window.JSZip) return toast('The zip tool did not load; try again');
  const z = new JSZip(); toast(`Preparing ${entries.length} files…`);
  for (const [path, href] of entries) z.file(path, await fetch(url(href)).then((r) => r.blob()));
  const blob = await z.generateAsync({ type: 'blob' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name + '.zip'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('Download ready');
}
const dl = (href, label, cls = 'btn ghost btn-s') => `<a class="${cls}" href="${url(href)}" download="${esc(base(href))}">${label}</a>`;

fetch('data.json').then((r) => r.json()).then((D) => {
  // top actions
  $('#kitTop').innerHTML = `<a class="btn" href="${D.zip.href}">Download everything <small>ZIP &middot; ${D.zip.mb} MB</small></a>
    <a class="btn ghost" href="${url(D.sheets.logos)}" target="_blank" rel="noopener">Logo sheet <small>PDF</small></a>
    <a class="btn ghost" href="${url(D.sheets.elements)}" target="_blank" rel="noopener">Elements sheet <small>PDF</small></a>
    <a class="btn ghost" href="${url(D.readme)}" target="_blank" rel="noopener">Read me</a>`;

  // colours
  for (const c of D.palette) {
    const el = h(`<article class="swatch"><div class="swatch-chip" style="background:${c.hex}"></div><div class="swatch-body">
      <h3 class="card-title">${esc(c.name)}</h3>
      <button type="button" class="val" data-v="${c.hex}">HEX <b>${c.hex}</b></button>
      <button type="button" class="val" data-v="${c.rgb}">RGB <b>${c.rgb}</b></button>
      <button type="button" class="val" data-v="${c.cmyk}">CMYK <b>${c.cmyk}</b></button></div></article>`);
    el.querySelectorAll('.val').forEach((b) => b.onclick = () => copyText(b.dataset.v, `${c.name} ${b.textContent.trim().split(' ')[0]}`));
    $('#swatches').append(el);
  }

  // logos & title
  const COLS = ['Orange', 'Charcoal', 'Light grey', 'White'];
  const BGS = [['dark', 'Dark'], ['light', 'Light'], ['orange', 'Orange']];
  for (const L of D.logos) {
    const cols = COLS.filter((c) => L.colours[c]);
    let col = cols.includes('Orange') ? 'Orange' : cols[0], bg = 'dark';
    if (L.id === 'title-3-lines' || L.id === 'title-1-line' || L.id === 'title-block') col = 'Light grey';
    const card = h(`<article class="card kit-card"><div class="kit-view bg-dark"><img alt="${esc(L.label)}"></div><div class="card-body">
      <h3 class="card-title">${esc(L.label)}</h3>
      <div class="chips" role="group" aria-label="Colour">${cols.map((c) => `<button type="button" data-c="${c}"><i style="background:${D.palette.find((p) => p.name === c).hex}"></i>${c}</button>`).join('')}</div>
      <div class="chips chips--bg" role="group" aria-label="Preview background">${BGS.map(([k, n]) => `<button type="button" data-b="${k}">${n}</button>`).join('')}</div>
      <div class="actions acts"></div></div></article>`);
    const render = () => {
      const f = L.colours[col];
      card.querySelector('img').src = url(f.svg);
      card.querySelector('.kit-view').className = 'kit-view bg-' + bg;
      card.querySelectorAll('[data-c]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.c === col));
      card.querySelectorAll('[data-b]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.b === bg));
      const acts = card.querySelector('.acts');
      acts.innerHTML = `<button type="button" class="btn btn-s" data-copy>Copy SVG</button>${dl(f.svg, 'SVG')}${dl(f.png2048, 'PNG')}${dl(f.pdf, 'PDF')}`;
      acts.querySelector('[data-copy]').onclick = () => copySvg(f.svg);
    };
    card.querySelectorAll('[data-c]').forEach((b) => b.onclick = () => { col = b.dataset.c; render(); });
    card.querySelectorAll('[data-b]').forEach((b) => b.onclick = () => { bg = b.dataset.b; render(); });
    render(); $('#logoGrid').append(card);
  }

  // elements
  for (const G of D.elementGroups) {
    const wrap = h(`<div class="el-group"><div class="el-head"><h3 class="card-title">${esc(G.name)} <span class="count">${G.items.length}</span></h3><button type="button" class="btn ghost btn-s">Download group <small>ZIP</small></button></div><div class="kit-grid"></div></div>`);
    wrap.querySelector('.el-head .btn').onclick = () => zip(G.items.flatMap((e) => [[`${G.name}/svg/${base(e.files['t-svg'])}`, e.files['t-svg']], [`${G.name}/png/${base(e.files['t-png1080'])}`, e.files['t-png1080']]]), `Hybrid TT US 2027 - ${G.name}`);
    for (const e of G.items) {
      const f = e.files, [w, hh] = e.tsize;
      const tile = h(`<article class="card tile"><a class="tile-view bg-dark" href="${url(f['t-png2160'] || f['t-png1080'])}" target="_blank" rel="noopener"><img src="${url(e.thumb)}" width="${w}" height="${hh}" loading="lazy" alt="${esc(e.label)}"></a>
        <div class="card-body"><h4 class="tile-title">${esc(e.label)}</h4>
        <div class="actions"><button type="button" class="btn btn-s" data-copy>Copy SVG</button>${dl(f['t-svg'], 'SVG')}${dl(f['t-png1080'], 'PNG')}${f['t-png2160'] ? dl(f['t-png2160'], 'PNG 2&times;') : ''}${f['c-png1080'] ? dl(f['c-png1080'], 'On charcoal') : ''}</div></div></article>`);
      tile.querySelector('[data-copy]').onclick = () => copySvg(f['t-svg']);
      wrap.querySelector('.kit-grid').append(tile);
    }
    $('#elementGroups').append(wrap);
  }

  // social backgrounds
  const SIZES = [['story', 'Story 1080 × 1920'], ['portrait', 'Portrait 1080 × 1350'], ['square', 'Square 1080 × 1080'], ['open-graph', 'Link preview 1200 × 630']];
  let size = 'story';
  const sRender = () => {
    $('#socialFilter').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.s === size));
    const g = $('#socialGrid'); g.innerHTML = ''; g.dataset.size = size;
    for (const s of D.social.filter((x) => x.size === size)) {
      g.append(h(`<article class="card tile"><a class="tile-view" href="${url(s.href)}" target="_blank" rel="noopener"><img src="${url(s.thumb)}" loading="lazy" alt="${esc(s.label)}, ${esc(s.colour)} on ${esc(s.bg)}"></a>
        <div class="card-body"><h4 class="tile-title">${esc(s.label)}</h4><p class="card-note">${esc(s.colour)} ${esc(s.bg)}</p><div class="actions">${dl(s.href, 'PNG')}</div></div></article>`));
    }
  };
  for (const [k, n] of SIZES) { const b = h(`<button type="button" data-s="${k}">${n}</button>`); b.onclick = () => { size = k; sRender(); }; $('#socialFilter').append(b); }
  sRender();

  // photos
  const groups = [...new Set(D.photos.map((p) => p.group))];
  $('#photoSpec').textContent = `${D.photos.length} photos, JPEG`;
  for (const gname of groups) {
    const items = D.photos.filter((p) => p.group === gname);
    const wrap = h(`<div class="el-group"><div class="el-head"><h3 class="card-title">${esc(gname)} <span class="count">${items.length}</span></h3><button type="button" class="btn ghost btn-s">Download all <small>ZIP</small></button></div><div class="kit-grid kit-grid--photos"></div></div>`);
    wrap.querySelector('.el-head .btn').onclick = () => zip(items.map((p) => [base(p.href), p.href]), `Hybrid TT US 2027 - ${gname}`);
    for (const p of items) wrap.querySelector('.kit-grid').append(h(`<article class="card tile"><a class="tile-view photo" href="${url(p.href)}" target="_blank" rel="noopener"><img src="${url(p.thumb)}" loading="lazy" alt="${esc(p.label)}"></a>
      <div class="card-body"><h4 class="tile-title">${esc(p.label)}</h4><p class="card-note">${p.w} &times; ${p.h} px</p><div class="actions">${dl(p.href, 'JPG')}</div></div></article>`));
    $('#photoGroups').append(wrap);
  }

  // fonts
  $('#fontBody').innerHTML = `<p class="font-sample">Aa Bb Cc 0123</p>
    <p class="card-note">Weights in the kit: ${D.fonts.map((f) => esc(f.name)).join(', ')}. Titles and headings use ExtraBold in capitals with wide letter spacing; buttons and numbers Bold; dates SemiBold.</p>
    <div class="actions"><button type="button" class="btn btn-s" data-fz>Download fonts <small>ZIP</small></button><a class="btn ghost btn-s" href="https://fonts.google.com/specimen/Montserrat" target="_blank" rel="noopener">Google Fonts</a></div>`;
  $('[data-fz]').onclick = () => zip(D.fonts.map((f) => [base(f.href), f.href]), 'Montserrat');
}).catch(() => { $('#logoGrid').innerHTML = '<p class="card-note">The kit did not load. Refresh the page to try again.</p>'; });
