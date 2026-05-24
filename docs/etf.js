let allFunds = [];
let selectedFundCd = null;

function safe(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtAum(v) {
  if (!v) return '-';
  const b = v / 1e8;
  return b >= 10000 ? `${(b / 10000).toFixed(0)}조` : `${b.toFixed(0)}억`;
}

function fmtRt(v) {
  if (v == null) return '<span class="text-slate-600">-</span>';
  const cls = v > 0 ? 'text-red-400' : v < 0 ? 'text-blue-400' : 'text-slate-500';
  return `<span class="${cls}">${v > 0 ? '+' : ''}${v.toFixed(2)}%</span>`;
}

function renderEtfList(funds) {
  const listEl = document.getElementById('etf-list');
  document.getElementById('etf-count').textContent = `${funds.length}개`;
  listEl.innerHTML = '';

  funds.forEach(f => {
    const card = document.createElement('div');
    card.className = 'bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-4 cursor-pointer transition etf-card';
    card.dataset.fundCd = f.fundCd;
    if (f.fundCd === selectedFundCd) card.classList.add('ring-1', 'ring-blue-500/50', 'bg-white/10');
    card.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-white text-sm leading-snug">${safe(f.fundNm)}</p>
          <p class="text-xs text-slate-500 mt-1">${safe(f.stockCd?.slice(3, 9) ?? '')} · ${safe(f.type)} · AUM ${fmtAum(f.aum)}</p>
        </div>
        <div class="text-right text-xs shrink-0 space-y-0.5">
          <p>1주 ${fmtRt(f.wk1)}</p>
          <p>1개월 ${fmtRt(f.mm1)}</p>
        </div>
      </div>
    `;
    card.addEventListener('click', () => loadHoldings(f));
    listEl.appendChild(card);
  });
}

function applyEtfFilter() {
  const q    = document.getElementById('etf-search').value.trim().toLowerCase();
  const type = document.getElementById('etf-type').value;
  const filtered = allFunds.filter(f =>
    (!q    || f.fundNm.toLowerCase().includes(q)) &&
    (!type || f.type?.includes(type))
  );
  renderEtfList(filtered);
}

async function loadHoldings(fund) {
  selectedFundCd = fund.fundCd;

  // 선택 상태 하이라이트
  document.querySelectorAll('.etf-card').forEach(el => {
    const isSelected = el.dataset.fundCd === fund.fundCd;
    el.classList.toggle('ring-1', isSelected);
    el.classList.toggle('ring-blue-500/50', isSelected);
    el.classList.toggle('bg-white/10', isSelected);
  });

  document.getElementById('holdings-empty').classList.add('hidden');
  document.getElementById('holdings-content').classList.add('hidden');
  document.getElementById('holdings-loading').classList.remove('hidden');

  try {
    const res = await fetch(`data/etf/${fund.fundCd}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();

    document.getElementById('holdings-loading').classList.add('hidden');
    document.getElementById('holdings-title').textContent = fund.fundNm;
    document.getElementById('holdings-date').textContent = d.stdDt ? `기준일: ${d.stdDt}` : '';

    const tbody = document.getElementById('holdings-body');
    if (!d.holdings?.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="py-8 text-center text-slate-500">구성종목 데이터 없음</td></tr>';
    } else {
      tbody.innerHTML = d.holdings.map(h => `
        <tr class="hover:bg-white/5">
          <td class="py-2 pr-2 text-slate-600 text-xs">${h.rank}</td>
          <td class="py-2 pr-4 text-white font-medium">${safe(h.name)}</td>
          <td class="py-2 pr-4 text-slate-400 text-xs">${safe(h.ticker)}</td>
          <td class="py-2 text-right font-semibold ${h.weight >= 10 ? 'text-blue-400' : 'text-slate-300'}">${h.weight?.toFixed(2)}%</td>
        </tr>
      `).join('');
    }

    document.getElementById('holdings-content').classList.remove('hidden');
  } catch (err) {
    document.getElementById('holdings-loading').classList.add('hidden');
    document.getElementById('holdings-title').textContent = fund.fundNm;
    document.getElementById('holdings-date').textContent = '';
    document.getElementById('holdings-body').innerHTML =
      `<tr><td colspan="4" class="py-8 text-center text-red-400">로드 실패: ${safe(err.message)}</td></tr>`;
    document.getElementById('holdings-content').classList.remove('hidden');
  }
}

function closeHoldings() {
  selectedFundCd = null;
  document.querySelectorAll('.etf-card').forEach(el => {
    el.classList.remove('ring-1', 'ring-blue-500/50', 'bg-white/10');
  });
  document.getElementById('holdings-content').classList.add('hidden');
  document.getElementById('holdings-empty').classList.remove('hidden');
}

async function initEtf() {
  try {
    const res = await fetch('data/etf/funds.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allFunds = data.funds ?? [];

    if (data.updatedAt) {
      document.getElementById('etf-updated').textContent =
        new Date(data.updatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    }

    document.getElementById('etf-loading').classList.add('hidden');
    document.getElementById('etf-list').classList.remove('hidden');
    renderEtfList(allFunds);

    document.getElementById('etf-search').addEventListener('input', applyEtfFilter);
    document.getElementById('etf-type').addEventListener('change', applyEtfFilter);
    document.getElementById('holdings-close').addEventListener('click', closeHoldings);
  } catch (err) {
    document.getElementById('etf-loading').classList.add('hidden');
    const errEl = document.getElementById('etf-error');
    errEl.textContent = `데이터를 불러올 수 없습니다: ${err.message}`;
    errEl.classList.remove('hidden');
  }
}

initEtf();
