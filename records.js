// User-created records stay in this browser under the existing storage key.
const RecordStore = (() => {
  const KEY = 'play-notes.custom-games.v1';
  const groups = ['RPG', '액션', '로그라이크', '덱 빌딩', '전략 · 슈터', '리듬'];
  const clean = (v, max = 1000) => typeof v === 'string' ? v.trim().slice(0, max) : '';
  const safeUrl = value => {
    try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; }
    catch { return ''; }
  };
  function normalize(record) {
    if (!record || typeof record !== 'object' || !clean(record.name, 100)) throw new Error('게임명이 없는 기록이 있습니다.');
    const id = clean(record.id, 100);
    if (!/^user-[a-zA-Z0-9-]+$/.test(id)) throw new Error('올바르지 않은 기록 파일입니다.');
    const hours = record.hours === '' || record.hours == null ? undefined : Number(record.hours);
    if (hours !== undefined && (!Number.isFinite(hours) || hours < 0 || hours > 1000000)) throw new Error('플레이 시간을 확인해주세요.');
    if (typeof record.cover === 'string' && record.cover.length > 1000000) throw new Error('커버 이미지가 너무 큽니다. 더 작은 이미지를 선택해주세요.');
    let cover = clean(record.cover, 1000000);
    if (cover && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(cover)) throw new Error('올바르지 않은 커버 이미지입니다.');
    const docs = Array.isArray(record.docs) ? record.docs.slice(0, 20).map(d => {
      const title = clean(d?.title, 200), url = safeUrl(d?.url);
      if (!title || !url) throw new Error('기획 문서의 제목과 웹 주소를 확인해주세요.');
      return { title, url, type: clean(d.type, 40) || '기획 작업물' };
    }) : [];
    const period = clean(record.period, 100);
    return { id, custom: true, name: clean(record.name, 100), en: clean(record.en, 100),
      genres: Array.isArray(record.genres) ? record.genres.map(v => clean(v, 40)).filter(Boolean).slice(0, 10) : [],
      group: Array.isArray(record.group) ? [...new Set(record.group.filter(v => groups.includes(v)))] : [],
      hours, time: hours !== undefined ? hours.toLocaleString('ko-KR') + '시간+' : period || '플레이 시간 미기록',
      period, basis: clean(record.basis, 100), playing: record.playing === true,
      title: clean(record.title, 200), intro: clean(record.intro, 5000), body: clean(record.body, 15000), cover, docs };
  }
  let records = [], warning = '';
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const parsed = JSON.parse(raw); if (!Array.isArray(parsed)) throw new Error(); records = parsed.map(normalize); }
  } catch { warning = '저장된 기록을 읽지 못했습니다. 브라우저의 저장 설정을 확인해주세요.'; }
  function save(next) {
    if (warning) throw new Error('저장된 기록을 읽을 수 없어 덮어쓰기를 중단했습니다. 브라우저의 저장 설정을 확인해주세요.');
    try { localStorage.setItem(KEY, JSON.stringify(next)); }
    catch { throw new Error('이 브라우저에 저장하지 못했습니다. 저장 공간을 확인하거나 커버 이미지를 줄여주세요.'); }
    records = next; warning = '';
  }
  return { groups, normalize, safeUrl, get warning() { return warning; }, all: () => records,
    put(record) { const item = normalize(record), next = records.filter(v => v.id !== item.id); next.push(item); save(next); return item; },
    remove(id) { const removed = records.find(v => v.id === id); save(records.filter(v => v.id !== id)); return removed; }
  };
})();
