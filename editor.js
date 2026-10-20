document.body.insertAdjacentHTML('beforeend', `
<dialog id="record-editor" class="editor-dialog" aria-labelledby="editor-title">
  <button type="button" class="close" id="close-editor" aria-label="게임 입력 창 닫기">×</button>
  <form id="game-form" class="editor-form">
    <h2 id="editor-title">새로운 게임 기록</h2>
    <p class="editor-description">플레이하며 기억에 남은 순간을 남겨보세요. 게임명만 입력해도 저장할 수 있습니다.</p>
    <div class="form-grid"><label class="wide">게임명 <span class="required">필수</span><input name="name" required maxlength="100" placeholder="예: 하데스"></label>
    <label>영문명<input name="en" maxlength="100" placeholder="예: HADES"></label>
    <label>장르<input name="genres" maxlength="300" placeholder="예: 액션, 로그라이크"></label></div>
    <fieldset class="group-field"><legend>목록에서 사용할 장르 필터 <small>여러 개 선택 가능</small></legend><div class="group-options">${RecordStore.groups.map(g => `<label><input type="checkbox" name="group" value="${g}"><span>${g}</span></label>`).join('')}</div></fieldset>
    <div class="form-grid"><label>플레이 시간<input type="number" name="hours" min="0" max="1000000" step="0.1" placeholder="시간 단위 · 예: 120"></label><label>플레이 기간<input name="period" maxlength="100" placeholder="예: 2025년 ~ 현재"></label>
    <label>시간 측정 기준<input name="basis" maxlength="100" placeholder="예: 스팀"></label><label class="checkbox-field"><input type="checkbox" name="playing"> 현재 플레이 중</label></div>
    <div class="cover-field"><label for="game-cover">커버 이미지 <small>JPG, PNG, WebP · 5MB 이하</small></label><div class="cover-input-row"><div id="cover-preview" class="upload-preview">이미지<br>선택</div><div><input id="game-cover" type="file" accept="image/jpeg,image/png,image/webp"><button id="remove-cover" type="button" class="text-button" hidden>이미지 제거</button></div></div></div>
    <label>게임 소개<textarea name="intro" maxlength="5000" rows="2" placeholder="어떤 게임인지 간단하게 소개해주세요."></textarea></label>
    <label>인상 깊었던 점 · 제목<input name="title" maxlength="200" placeholder="예: 실패가 다음 도전의 동기가 되는 성장 구조"></label>
    <label>플레이 경험<textarea name="body" maxlength="15000" rows="5" placeholder="어떤 부분이 재미있었나요? 기억에 남은 시스템이나 기획의 아이디어를 자유롭게 남겨보세요."></textarea></label>
    <div class="form-doc-header"><h3>기획 작업물 <small>선택</small></h3><button id="add-document" class="quiet-button" type="button">+ 문서 링크</button></div><div id="form-documents"></div>
    <p class="editor-storage-note">저장한 기록은 현재 브라우저에서 다시 볼 수 있습니다.</p>
    <p id="form-error" class="form-error" role="alert" hidden></p>
    <div class="editor-actions"><button id="cancel-editor" class="quiet-button" type="button">취소</button><button id="save-game" class="primary-button" type="submit">기록 저장</button></div>
  </form>
</dialog>
<dialog id="delete-record" class="delete-dialog" aria-labelledby="delete-title"><h2 id="delete-title">게임 기록을 삭제할까요?</h2><p>직접 추가한 이 기록과 커버 이미지가 이 브라우저에서 삭제됩니다.</p><p id="delete-error" class="form-error" role="alert" hidden></p><div class="editor-actions"><button class="quiet-button" id="cancel-delete">취소</button><button class="primary-button" id="confirm-delete">삭제</button></div></dialog>
<div id="record-toast" class="record-toast" role="status" aria-live="polite" hidden></div>`);
let editingId = null, editingCover = '', coverVersion = 0, coverPending = false, deletingId = null, editorTrigger = null, toastTimer;
const form = $('#game-form');
function toast(message) { clearTimeout(toastTimer); $('#record-toast').textContent = message; $('#record-toast').hidden = false; toastTimer = setTimeout(() => { $('#record-toast').hidden = true; }, 6000); }
function formError(message) { $('#form-error').textContent = message; $('#form-error').hidden = !message; }
function showCover() {
  $('#cover-preview').innerHTML = editingCover ? `<img src="${editingCover}" alt="선택한 커버 미리보기">` : '이미지<br>선택';
  $('#remove-cover').hidden = !editingCover;
}
function addDocRow(doc = {}) {
  if ($('#form-documents').children.length >= 20) { formError('문서 링크는 최대 20개까지 추가할 수 있습니다.'); return; }
  const row = document.createElement('div'); row.className = 'form-document-row';
  row.innerHTML = `<label>문서 제목<input class="doc-title" maxlength="200" required value="${escapeHTML(doc.title || '')}" placeholder="문서 제목"></label><label>웹 주소<input class="doc-url" type="url" required value="${escapeHTML(doc.url || '')}" placeholder="https://..."></label><label>분류<input class="doc-type" maxlength="40" value="${escapeHTML(doc.type || '')}" placeholder="예: 창작 기획"></label><button type="button" class="remove-document" aria-label="문서 링크 제거">×</button>`;
  $('#form-documents').append(row);
}
function openEditor(game = null) {
  editorTrigger = document.activeElement;
  editingId = game?.id || null; editingCover = game?.cover || ''; coverVersion++; coverPending = false;
  form.reset(); $('#form-documents').replaceChildren(); formError('');
  for (const key of ['name', 'en', 'hours', 'period', 'basis', 'intro', 'title', 'body']) form.elements.namedItem(key).value = game?.[key] ?? '';
  // When only a period was entered it is stored as the card's time label.
  if (game && game.hours == null) form.elements.namedItem('period').value = game.time === '플레이 시간 미기록' ? '' : game.time;
  form.elements.namedItem('genres').value = game?.genres.join(', ') || '';
  form.elements.namedItem('playing').checked = !!game?.playing;
  form.querySelectorAll('[name="group"]').forEach(c => { c.checked = !!game?.group.includes(c.value); });
  for (const doc of game?.docs || []) addDocRow(doc);
  $('#editor-title').textContent = game ? '게임 기록 수정' : '새로운 게임 기록';
  $('#save-game').textContent = game ? '수정 내용 저장' : '기록 저장'; $('#save-game').disabled = false;
  showCover(); $('#record-editor').showModal(); $('#record-editor').scrollTop = 0; document.body.classList.add('modal-open');
  form.elements.namedItem('name').focus({preventScroll: true});
}
function closeEditor() { $('#record-editor').close(); }
$('#add-game').addEventListener('click', () => openEditor());
$('#close-editor').addEventListener('click', closeEditor);
$('#cancel-editor').addEventListener('click', closeEditor);
$('#record-editor').addEventListener('click', e => { if (e.target === $('#record-editor')) closeEditor(); });
$('#record-editor').addEventListener('close', () => { coverVersion++; if (!document.querySelector('dialog[open]')) document.body.classList.remove('modal-open'); if (editorTrigger?.isConnected) editorTrigger.focus({preventScroll: true}); });
$('#add-document').addEventListener('click', () => { addDocRow(); $('#form-documents .form-document-row:last-child input')?.focus(); });
$('#form-documents').addEventListener('click', e => { if (e.target.closest('.remove-document')) e.target.closest('.form-document-row').remove(); });
$('#remove-cover').addEventListener('click', () => { editingCover = ''; coverVersion++; coverPending = false; $('#game-cover').value = ''; $('#save-game').disabled = false; showCover(); });
$('#game-cover').addEventListener('change', async () => {
  const file = $('#game-cover').files[0]; if (!file) return;
  const version = ++coverVersion; coverPending = true; $('#save-game').disabled = true; formError('');
  try {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error('5MB 이하의 JPG, PNG, WebP 이미지를 선택해주세요.');
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * ratio)); canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#eaf2fa'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
    const cover = canvas.toDataURL('image/jpeg', 0.85);
    if (cover.length > 1000000) throw new Error('이미지가 너무 큽니다. 더 작은 이미지를 선택해주세요.');
    if (version === coverVersion) { editingCover = cover; showCover(); }
  } catch (error) { if (version === coverVersion) { formError(error.message || '이미지를 읽을 수 없습니다. 다른 파일을 선택해주세요.'); $('#game-cover').value = ''; } }
  finally { if (version === coverVersion) { coverPending = false; $('#save-game').disabled = false; } }
});
form.addEventListener('submit', e => {
  e.preventDefault(); if (coverPending) return; formError('');
  const data = new FormData(form);
  const docs = [...document.querySelectorAll('.form-document-row')].map(row => ({title: row.querySelector('.doc-title').value, url: row.querySelector('.doc-url').value, type: row.querySelector('.doc-type').value}));
  try {
    const id = editingId || 'user-' + (globalThis.crypto?.randomUUID?.() || Date.now() + '-' + Math.random().toString(36).slice(2));
    const record = {id, cover: editingCover, docs, playing: data.has('playing'), group: data.getAll('group'), genres: data.get('genres').split(/[,，]/).map(v => v.trim()).filter(Boolean)};
    for (const key of ['name', 'en', 'hours', 'period', 'basis', 'intro', 'title', 'body']) record[key] = data.get(key);
    const item = RecordStore.put(record); const isEdit = !!editingId;
    closeEditor(); resetFilters();
    openDetail(item.id, document.querySelector(`[data-id="${item.id}"]`));
    toast(isEdit ? '수정한 내용을 저장했습니다.' : '새로운 게임 기록을 저장했습니다.');
  } catch (error) { formError(error.message); }
});
$('#detail').addEventListener('click', e => {
  const edit = e.target.closest('[data-edit]');
  if (edit) { const game = RecordStore.all().find(g => g.id === edit.dataset.edit); if (game) { $('#detail').close(); openEditor(game); } }
  const remove = e.target.closest('[data-delete]');
  if (remove) { deletingId = remove.dataset.delete; $('#delete-error').hidden = true; $('#delete-record').showModal(); }
});
$('#cancel-delete').addEventListener('click', () => $('#delete-record').close());
$('#confirm-delete').addEventListener('click', () => {
  try { const record = RecordStore.remove(deletingId); $('#delete-record').close(); $('#detail').close(); render(); $('#add-game').focus({preventScroll: true}); toast(`${record.name} 기록을 삭제했습니다.`); }
  catch (error) { $('#delete-error').textContent = error.message; $('#delete-error').hidden = false; }
});
