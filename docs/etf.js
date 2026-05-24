let allFunds = [];

function safe(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtAum(v) {
  if (!v) return '-';
  const b = v / 1e8;
  return b >= 10000 ? `${(b / 10000).toFixed(0)}조` : `${b.toFixed(0)}억`;
}

function fmtRt(v) {
  if (v == null) return '<span class="text-gray-300">-</span>';
  const cls = v > 0 ? 'text-red-500' : v < 0 ? 'text-blue-500' : 'text-gray-400';
  return `<span class="${cls}">${v > 0 ? '+' : ''}${v.toFixed(2)}%</span>`;
}

function renderList(funds) {
  const listEl = document.getElementById('fund-list');
  document.getElementById('count').textContent = `${funds.length}개`;
  listEl.innerHTML = '';

  funds.forEach(f => {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition cursor-pointer';
    card.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-gray-800 text-sm leading-snug">${safe(f.fundNm)}</p>
          <p class="text-xs text-gray-400 mt-0.5">${safe(f.stockCd?.slice(3, 9) ?? '')} · ${safe(f.type)} · AUM ${fmtAum(f.aum)}</p>
        </div>
        <div class="text-right text-xs shrink-0">
          <p class="text-gray-400">1주 ${fmtRt(f.wk1)}</p>
          <p class="text-gray-400">1개월 ${fmtRt(f.mm1)}</p>
        </div>
      </div>
    `;
    card.addEventListener('click', () => openModal(f));
    listEl.appendChild(card);
  });
}

function applyFilter() {
  const q    = document.getElementById('search').value.trim().toLowerCase();
  const type = document.getElementById('type-filter').value;
  const filtered = allFunds.filter(f =>
    (!q    || f.fundNm.toLowerCase().includes(q)) &&
    (!type || f.type?.includes(type))
  );
  renderList(filtered);
}

async function openModal(fund) {
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modal-title').textContent = fund.fundNm;
  document.getElementById('modal-date').textContent  = '';
  document.getElementById('modal-body').innerHTML    = '<div class="text-center text-gray-400 py-8">불러오는 중...</div>';

  try {
    const res = await fetch(`data/etf/${fund.fundCd}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();

    document.getElementById('modal-date').textContent = d.stdDt ? `기준일: ${d.stdDt}` : '';

    const body = document.getElementById('modal-body');
    if (!d.holdings?.length) {
      body.innerHTML = '<p class="text-center text-gray-400 py-8">구성종목 데이터 없음</p>';
      return;
    }

    body.innerHTML = `
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-gray-400 border-b text-xs">
            <th class="pb-2 pr-2">#</th>
            <th class="pb-2 pr-4">종목명</th>
            <th class="pb-2 pr-4">티커</th>
            <th class="pb-2 text-right">비중</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          ${d.holdings.map(h => `
            <tr class="hover:bg-gray-50">
              <td class="py-2 pr-2 text-gray-300 text-xs">${h.rank}</td>
              <td class="py-2 pr-4 font-medium text-gray-800">${safe(h.name)}</td>
              <td class="py-2 pr-4 text-gray-500 text-xs">${safe(h.ticker)}</td>
              <td class="py-2 text-right font-semibold ${h.weight >= 10 ? 'text-blue-600' : 'text-gray-700'}">${h.weight?.toFixed(2)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    document.getElementById('modal-body').innerHTML =
      `<p class="text-center text-red-400 py-8">데이터 로드 실패: ${safe(err.message)}</p>`;
  }
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

document.getElementById('modal').addEventListener('click', e => {
  if (e.target === document.getElementById('modal')) closeModal();
});

async function init() {
  try {
    const res = await fetch('data/etf/funds.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allFunds = data.funds ?? [];

    if (data.updatedAt) {
      document.getElementById('updated').textContent =
        new Date(data.updatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    }

    document.getElementById('loading').classList.add('hidden');
    document.getElementById('fund-list').classList.remove('hidden');
    renderList(allFunds);

    document.getElementById('search').addEventListener('input', applyFilter);
    document.getElementById('type-filter').addEventListener('change', applyFilter);
  } catch (err) {
    document.getElementById('loading').classList.add('hidden');
    const errEl = document.getElementById('error');
    errEl.textContent = `데이터를 불러올 수 없습니다: ${err.message}`;
    errEl.classList.remove('hidden');
  }
}

init();
