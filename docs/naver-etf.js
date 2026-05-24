let allEtfs = [];
let sortKey = 'name';
let sortDir = 'asc';

// ── 포맷 헬퍼 ──────────────────────────────────────────────
function safe(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtPrice(v) {
  if (v == null) return '<span class="text-gray-300">-</span>';
  return v.toLocaleString('ko-KR');
}

function fmtRate(v) {
  if (v == null) return '<span class="text-gray-300">-</span>';
  const cls = v > 0 ? 'text-red-500' : v < 0 ? 'text-blue-500' : 'text-gray-400';
  const sign = v > 0 ? '+' : '';
  return `<span class="${cls}">${sign}${v.toFixed(2)}%</span>`;
}

function fmtAum(v) {
  if (!v) return '<span class="text-gray-300">-</span>';
  const t = v / 1e12;
  const h = (v % 1e12) / 1e8;
  if (t >= 1) return `<span class="text-gray-700">${t.toFixed(1)}조</span>`;
  return `<span class="text-gray-700">${h.toFixed(0)}억</span>`;
}

function fmtVol(v) {
  if (!v) return '<span class="text-gray-300">-</span>';
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toLocaleString();
}

// ── 렌더링 ─────────────────────────────────────────────────
function renderTable(etfs) {
  const tbody = document.getElementById('etf-tbody');
  document.getElementById('count').textContent = `${etfs.length.toLocaleString()}개`;

  if (!etfs.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-gray-400 py-12">검색 결과 없음</td></tr>';
    return;
  }

  tbody.innerHTML = etfs.map(e => `
    <tr class="hover:bg-blue-50/30 transition">
      <td class="px-4 py-2.5">
        <a href="https://finance.naver.com/item/main.naver?code=${safe(e.code)}"
           target="_blank" rel="noopener"
           class="font-medium text-gray-800 hover:text-blue-600 hover:underline text-sm">${safe(e.name)}</a>
        <span class="ml-1.5 text-xs text-gray-400">${safe(e.code)}</span>
      </td>
      <td class="px-3 py-2.5 text-right font-mono text-sm text-gray-700">${fmtPrice(e.price)}</td>
      <td class="px-3 py-2.5 text-right text-sm">${fmtRate(e.changeRate)}</td>
      <td class="px-3 py-2.5 text-right font-mono text-sm text-gray-600">${fmtPrice(e.nav)}</td>
      <td class="px-3 py-2.5 text-right text-sm">${fmtRate(e.return3m)}</td>
      <td class="px-3 py-2.5 text-right text-sm text-gray-500">${fmtVol(e.volume)}</td>
      <td class="px-3 py-2.5 text-right text-sm">${fmtAum(e.aum)}</td>
    </tr>
  `).join('');
}

// ── 정렬 ───────────────────────────────────────────────────
function sortedEtfs(etfs) {
  return [...etfs].sort((a, b) => {
    if (sortKey === 'name') return a.name.localeCompare(b.name, 'ko');
    const av = a[sortKey] ?? -Infinity;
    const bv = b[sortKey] ?? -Infinity;
    return sortDir === 'asc' ? av - bv : bv - av;
  });
}

function applyFilter() {
  const q = document.getElementById('search').value.trim().toLowerCase();
  const filtered = allEtfs.filter(e =>
    !q || e.name.toLowerCase().includes(q) || e.code.includes(q)
  );
  renderTable(sortedEtfs(filtered));
}

// ── 정렬 select 동기화 ─────────────────────────────────────
document.getElementById('sort').addEventListener('change', e => {
  const val = e.target.value;
  const [key, dir] = val.includes('_') ? val.split('_') : [val, 'asc'];
  sortKey = key;
  sortDir = dir ?? 'asc';
  applyFilter();
});

document.querySelectorAll('th[data-sort]').forEach(th => {
  th.addEventListener('click', () => {
    const key = th.dataset.sort;
    if (sortKey === key) {
      sortDir = sortDir === 'desc' ? 'asc' : 'desc';
    } else {
      sortKey = key;
      sortDir = 'desc';
    }
    applyFilter();
  });
});

document.getElementById('search').addEventListener('input', applyFilter);

// ── CSV 이력 ───────────────────────────────────────────────
function parseCsv(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const cols = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) ?? line.split(',');
    const obj = {};
    headers.forEach((h, i) => {
      const v = (cols[i] ?? '').replace(/^"|"$/g, '').trim();
      obj[h.trim()] = v === '' ? null : isNaN(v) ? v : parseFloat(v);
    });
    return { code: obj.code, name: obj.name, price: obj.price, change: obj.change, changeRate: obj.changeRate, nav: obj.nav, return3m: obj.return3m, volume: obj.volume, aum: obj.aum };
  }).filter(e => e.code && e.name);
}

async function loadHistory() {
  const month = document.getElementById('month-select').value;
  const date  = document.getElementById('date-select').value;
  if (!month || !date) return;

  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('table-wrap').classList.add('hidden');

  try {
    const res = await fetch(`data/naver-etf/${month}/${date}.csv`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    allEtfs = parseCsv(text);
    document.getElementById('updated').textContent = `이력: ${date}`;
    document.getElementById('clear-history').classList.remove('hidden');
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('table-wrap').classList.remove('hidden');
    applyFilter();
  } catch (err) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').textContent = `이력 로드 실패: ${err.message}`;
    document.getElementById('error').classList.remove('hidden');
  }
}

document.getElementById('load-history').addEventListener('click', loadHistory);

document.getElementById('month-select').addEventListener('change', async e => {
  const month = e.target.value;
  const dateSelect = document.getElementById('date-select');
  const loadBtn    = document.getElementById('load-history');
  dateSelect.innerHTML = '<option value="">-- 날짜 --</option>';
  dateSelect.disabled = true;
  loadBtn.disabled = true;

  if (!month) return;

  // 해당 월의 가능한 날짜를 추정 (1~31일 시도)
  // 실제로는 서버에 파일 목록 API가 없으므로, 알려진 날짜 범위로 시도
  // latest.json의 date를 기준으로 현재 월이면 오늘까지
  try {
    const latestRes = await fetch('data/naver-etf/latest.json');
    const latestData = latestRes.ok ? await latestRes.json() : null;
    const latestDate = latestData?.date ?? '';

    const [y, m] = month.split('-').map(Number);
    const today = latestDate ? new Date(latestDate) : new Date();
    const daysInMonth = new Date(y, m, 0).getDate();
    const maxDay = (y === today.getFullYear() && m === today.getMonth() + 1)
      ? today.getDate() : daysInMonth;

    const pad = n => String(n).padStart(2, '0');
    const candidates = [];
    for (let d = 1; d <= maxDay; d++) {
      candidates.push(`${month}-${pad(d)}`);
    }

    // HEAD 요청으로 실제 파일 존재 확인 (병렬)
    const checks = await Promise.all(
      candidates.map(dt =>
        fetch(`data/naver-etf/${month}/${dt}.csv`, { method: 'HEAD' })
          .then(r => r.ok ? dt : null).catch(() => null)
      )
    );
    const dates = checks.filter(Boolean).reverse();

    if (dates.length) {
      dates.forEach(dt => {
        const opt = document.createElement('option');
        opt.value = dt;
        opt.textContent = dt;
        dateSelect.appendChild(opt);
      });
      dateSelect.disabled = false;
      loadBtn.disabled = false;
    }
  } catch {
    // 날짜 목록 로드 실패 시 무시
  }
});

document.getElementById('clear-history').addEventListener('click', async () => {
  document.getElementById('clear-history').classList.add('hidden');
  document.getElementById('month-select').value = '';
  document.getElementById('date-select').innerHTML = '<option value="">-- 날짜 --</option>';
  document.getElementById('date-select').disabled = true;
  document.getElementById('load-history').disabled = true;
  await loadLatest();
});

// ── 초기 로드 ──────────────────────────────────────────────
async function loadLatest() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('table-wrap').classList.add('hidden');
  document.getElementById('error').classList.add('hidden');

  try {
    const res = await fetch('data/naver-etf/latest.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allEtfs = data.etfs ?? [];

    if (data.updatedAt) {
      document.getElementById('updated').textContent =
        new Date(data.updatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    }

    // 월 선택 옵션 생성 (latest.json의 date 기준으로 최근 3개월)
    const monthSel = document.getElementById('month-select');
    const baseDate = data.date ? new Date(data.date) : new Date();
    for (let i = 0; i < 3; i++) {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      monthSel.appendChild(opt);
    }

    document.getElementById('loading').classList.add('hidden');
    document.getElementById('table-wrap').classList.remove('hidden');
    applyFilter();
  } catch (err) {
    document.getElementById('loading').classList.add('hidden');
    const errEl = document.getElementById('error');
    errEl.textContent = `데이터를 불러올 수 없습니다: ${err.message}`;
    errEl.classList.remove('hidden');
  }
}

loadLatest();
