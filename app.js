const $ = selector => document.querySelector(selector);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let currentTab = 'all', genre = '전체', opener = null;
const allGames = () => [...games, ...RecordStore.all()];
const genreNames = ['전체', ...RecordStore.groups];
$('#genres').innerHTML = genreNames.map(g => `<button data-genre="${g}" aria-pressed="${g === genre}" class="${g === genre ? 'selected' : ''}">${g}</button>`).join('');
function imageHTML(g, lazy = false) {
  const src = g.custom ? g.cover : (g.image || `assets/${g.id}.img`);
  return src ? `<img ${lazy ? 'loading="lazy"' : ''} src="${escapeHTML(src)}" alt="${escapeHTML(g.name)} 커버">` : `<div class="cover-placeholder" aria-label="커버 이미지 없음"><span aria-hidden="true">${escapeHTML(g.name.slice(0, 2))}</span><small>PLAY NOTE</small></div>`;
}
function documentRows(items) {
  return items.map((d, i) => `<a class="document" href="${escapeHTML(d.url)}" target="_blank" rel="noopener noreferrer"><span class="document-no">${String(i + 1).padStart(2, '0')}</span><span class="document-name"><span>${escapeHTML(d.title)}</span><small>${escapeHTML(d.game)}</small></span><span class="document-visit">보러가기</span></a>`).join('');
}
function updateSummary() {
  $('#storage-warning').textContent = RecordStore.warning;
  $('#storage-warning').hidden = !RecordStore.warning;
  const list = allGames(), counts = [list.length, list.filter(g => g.playing).length];
  const documentMap = new Map();
  for (const g of list) for (const d of g.docs) {
    const gameLabel = g.name + (d.type === '레퍼런스 기획' ? ' (레퍼런스)' : '');
    if (documentMap.has(d.url)) documentMap.get(d.url).game += ' · ' + gameLabel;
    else documentMap.set(d.url, {...d, game: gameLabel});
  }
  const documentRanks = new Map(documentOrder.map((url, index) => [url, index]));
  const documents = [...documentMap.values()].sort((a, b) =>
    (documentRanks.get(a.url) ?? Number.MAX_SAFE_INTEGER) - (documentRanks.get(b.url) ?? Number.MAX_SAFE_INTEGER));
  [...document.querySelectorAll('.hero-stats strong')].forEach((node, i) => {
    node.replaceChildren(document.createTextNode(String(i === 2 ? documents.length : counts[i])));
    const unit = document.createElement('span'); unit.textContent = i === 2 ? '편' : '개'; node.append(unit);
  });
  $('[data-tab="all"] span').textContent = list.length;
  $('[data-tab="playing"] span').textContent = counts[1];
  $('[data-tab="docs"] span').textContent = list.filter(g => g.docs.length).length;
  $('#documents').innerHTML = documentRows(documents);
}
function render() {
  const all = allGames(), query = $('#search').value.trim().toLowerCase();
  let list = all.filter(g => (currentTab !== 'playing' || g.playing) && (currentTab !== 'docs' || g.docs.length) && (genre === '전체' || g.group.includes(genre)) && [g.name, g.en, ...g.genres, g.title, g.body, ...g.docs.map(d => d.title)].join(' ').toLowerCase().includes(query));
  if ($('#sort').value === 'hours') list.sort((a, b) => (b.hours ?? -1) - (a.hours ?? -1));
  if ($('#sort').value === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  $('#result-count').textContent = `${list.length}개의 게임`;
  $('#empty').hidden = !!list.length;
  $('#cards').innerHTML = list.map(g => `<article class="card"><button class="card-open" data-id="${g.id}" aria-label="${escapeHTML(g.name)} 상세 기록 보기${g.docs.length ? ' (기획 문서 있음)' : ''}"><div class="cover">${imageHTML(g, true)}${g.playing ? '<span class="playing">플레이 중</span>' : ''}<span class="cover-arrow" aria-hidden="true">↗</span></div><div class="card-body"><div class="card-title"><h3>${escapeHTML(g.name)}</h3>${g.docs.length ? '<span class="document-indicator" role="img" aria-label="기획 문서 있음" title="기획 문서 있음"><svg viewBox="0 0 20 22" fill="none" aria-hidden="true"><path d="M4 1.75h7.5L17 7.25v13H4z" fill="currentColor" fill-opacity=".08" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M11.5 1.75v5.5H17M7 11h7M7 14.5h7M7 18h4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' : ''}</div><p class="tags">${g.genres.map(t => `<span>${escapeHTML(t)}</span>`).join('')}</p><div class="card-bottom"><span>${escapeHTML(g.time)}</span></div></div></button></article>`).join('');
  updateSummary();
}
function openDetail(id, trigger) {
  const list = allGames(), g = list.find(g => g.id === id);
  if (!g) return;
  opener = trigger;
  const index = list.indexOf(g);
  $('#detail-content').innerHTML = `<div class="detail-cover">${imageHTML(g)}</div><div class="detail-body"><h2 id="detail-title">${escapeHTML(g.name)}</h2><p class="detail-meta">${g.playing ? '<span class="status-badge">플레이 중</span> · ' : ''}${escapeHTML(g.time)}${g.period && g.hours != null ? ' · ' + escapeHTML(g.period) : ''}${g.basis ? ' · ' + escapeHTML(g.basis) + ' 기준' : ''}</p><div class="detail-tags">${g.genres.map(t => `<span>${escapeHTML(t)}</span>`).join('')}</div>${g.intro ? `<p class="detail-intro">${escapeHTML(g.intro)}</p>` : ''}<p class="eyebrow">인상 깊었던 점</p><h3>${escapeHTML(g.title || '플레이의 기록')}</h3><p class="detail-text">${escapeHTML(g.body || '아직 감상을 남기지 않았습니다.')}</p>${g.docs.length ? `<div class="detail-docs"><h3>기획 작업물 <small>${g.docs.length}</small></h3>${g.docs.map(d => `<a href="${escapeHTML(d.url)}" target="_blank" rel="noopener noreferrer"><span><small>${escapeHTML(d.type)}</small>${escapeHTML(d.title)}</span><b>↗</b></a>`).join('')}</div>` : ''}${g.custom ? `<div class="custom-controls"><span>이 브라우저에 저장한 기록</span><button class="quiet-button" data-edit="${g.id}">기록 수정</button><button class="quiet-button danger" data-delete="${g.id}">기록 삭제</button></div>` : ''}<div class="detail-navigation"><button data-next="${list[(index + list.length - 1) % list.length].id}">← 이전 게임</button><button data-next="${list[(index + 1) % list.length].id}">다음 게임 →</button></div></div>`;
  if (!$('#detail').open) { $('#detail').showModal(); document.body.classList.add('modal-open'); }
  $('#detail').scrollTop = 0;
  $('#detail-title').setAttribute('tabindex', '-1');
  $('#detail-title').focus({preventScroll: true});
}
function resetFilters() {
  $('#search').value = ''; genre = '전체'; currentTab = 'all'; $('#sort').value = 'original';
  document.querySelectorAll('[data-tab]').forEach(t => { const active = t.dataset.tab === 'all'; t.classList.toggle('active', active); t.setAttribute('aria-pressed', active); });
  document.querySelectorAll('[data-genre]').forEach(t => { const active = t.dataset.genre === '전체'; t.classList.toggle('selected', active); t.setAttribute('aria-pressed', active); });
  render();
}
$('#cards').addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) openDetail(b.dataset.id, b); });
$('#detail').addEventListener('click', e => {
  if (e.target === $('#detail') || e.target.closest('.close')) $('#detail').close();
  const next = e.target.closest('[data-next]'); if (next) openDetail(next.dataset.next, opener);
});
$('#detail').addEventListener('close', () => { if (!document.querySelector('dialog[open]')) document.body.classList.remove('modal-open'); if (opener?.isConnected) opener.focus({preventScroll: true}); });
for (const b of document.querySelectorAll('[data-tab]')) b.addEventListener('click', () => {
  currentTab = b.dataset.tab;
  document.querySelectorAll('[data-tab]').forEach(t => { t.classList.toggle('active', t === b); t.setAttribute('aria-pressed', t === b); }); render();
});
$('#genres').addEventListener('click', e => {
  const b = e.target.closest('[data-genre]'); if (!b) return; genre = b.dataset.genre;
  document.querySelectorAll('[data-genre]').forEach(t => { t.classList.toggle('selected', t === b); t.setAttribute('aria-pressed', t === b); }); render();
});
$('#search').addEventListener('input', render);
$('#sort').addEventListener('change', render);
$('#reset').addEventListener('click', resetFilters);
// A slash typed in an editor should stay in the editor.
 document.addEventListener('keydown', e => { if (e.key === '/' && !document.querySelector('dialog[open]') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) { e.preventDefault(); $('#search').focus(); } });
if (RecordStore.warning) { $('#storage-warning').textContent = RecordStore.warning; $('#storage-warning').hidden = false; }
render();
