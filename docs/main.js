const DATA_URL = '../data/result.json';

const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const listEl = document.getElementById('result-list');
const updatedEl = document.getElementById('last-updated');

async function loadData() {
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const items = await res.json();

    loadingEl.classList.add('hidden');

    if (items.length === 0) {
      errorEl.textContent = '아직 크롤링 데이터가 없습니다.';
      errorEl.classList.remove('hidden');
      return;
    }

    if (items[0]?.crawledAt) {
      const date = new Date(items[0].crawledAt);
      updatedEl.textContent = `최종 업데이트: ${date.toLocaleString('ko-KR')}`;
    }

    items.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'bg-white rounded-lg p-4 shadow-sm border border-gray-100';
      li.innerHTML = `<p class="text-gray-800 font-medium">${escapeHtml(item.title ?? '')}</p>`;
      listEl.appendChild(li);
    });

    listEl.classList.remove('hidden');
  } catch (err) {
    loadingEl.classList.add('hidden');
    errorEl.textContent = `데이터 로드 실패: ${err.message}`;
    errorEl.classList.remove('hidden');
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

loadData();
