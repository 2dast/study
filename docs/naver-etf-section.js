// 대시보드 "전체 ETF" 섹션 전용 (netf- 접두사 ID 사용)
(function () {
  let allEtfs = [];
  let sortKey  = 'name';
  let sortDir  = 'asc';
  let initialized = false;

  // ── 포맷 헬퍼 ─────────────────────────────────────────
  function safe(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function fmtPrice(v) {
    return v == null ? '<span class="text-slate-600">-</span>' : v.toLocaleString('ko-KR');
  }
  function fmtRate(v) {
    if (v == null) return '<span class="text-slate-600">-</span>';
    const cls  = v > 0 ? 'text-red-400' : v < 0 ? 'text-blue-400' : 'text-slate-500';
    const sign = v > 0 ? '+' : '';
    return `<span class="${cls}">${sign}${v.toFixed(2)}%</span>`;
  }
  function fmtAum(v) {
    if (!v) return '<span class="text-slate-600">-</span>';
    const t = v / 1e12, h = (v % 1e12) / 1e8;
    return t >= 1
      ? `<span class="text-slate-300">${t.toFixed(1)}조</span>`
      : `<span class="text-slate-300">${h.toFixed(0)}억</span>`;
  }
  function fmtVol(v) {
    if (!v) return '<span class="text-slate-600">-</span>';
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
    return v.toLocaleString();
  }

  // ── 렌더 ──────────────────────────────────────────────
  function renderTable(etfs) {
    const tbody = document.getElementById('netf-tbody');
    if (!tbody) return;
    document.getElementById('netf-count').textContent = `${etfs.length.toLocaleString()}개`;

    if (!etfs.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-slate-600 py-12">검색 결과 없음</td></tr>';
      return;
    }

    tbody.innerHTML = etfs.map(e => `
      <tr class="hover:bg-white/5 transition">
        <td class="py-2.5 pr-4">
          <a href="https://finance.naver.com/item/main.naver?code=${safe(e.code)}"
             target="_blank" rel="noopener"
             class="font-medium text-slate-200 hover:text-blue-400 hover:underline text-sm">${safe(e.name)}</a>
          <span class="ml-1.5 text-xs text-slate-600">${safe(e.code)}</span>
        </td>
        <td class="py-2.5 pr-3 text-right font-mono text-sm text-slate-300">${fmtPrice(e.price)}</td>
        <td class="py-2.5 pr-3 text-right text-sm">${fmtRate(e.changeRate)}</td>
        <td class="py-2.5 pr-3 text-right font-mono text-sm text-slate-400">${fmtPrice(e.nav)}</td>
        <td class="py-2.5 pr-3 text-right text-sm">${fmtRate(e.return3m)}</td>
        <td class="py-2.5 pr-3 text-right text-sm text-slate-400">${fmtVol(e.volume)}</td>
        <td class="py-2.5 text-right text-sm">${fmtAum(e.aum)}</td>
      </tr>
    `).join('');
  }

  function sorted(etfs) {
    return [...etfs].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'ko');
      const av = a[sortKey] ?? -Infinity, bv = b[sortKey] ?? -Infinity;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }

  function applyFilter() {
    const q = document.getElementById('netf-search')?.value.trim().toLowerCase() ?? '';
    const filtered = allEtfs.filter(e =>
      !q || e.name.toLowerCase().includes(q) || e.code.includes(q)
    );
    renderTable(sorted(filtered));
  }

  // ── CSV 파싱 ──────────────────────────────────────────
  function parseCsv(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const cols = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) ?? line.split(',');
      const o = {};
      headers.forEach((h, i) => {
        const v = (cols[i] ?? '').replace(/^"|"$/g, '').trim();
        o[h.trim()] = v === '' ? null : isNaN(v) ? v : parseFloat(v);
      });
      return { code: o.code, name: o.name, price: o.price, change: o.change, changeRate: o.changeRate, nav: o.nav, return3m: o.return3m, volume: o.volume, aum: o.aum };
    }).filter(e => e.code && e.name);
  }

  // ── 이력 로드 ─────────────────────────────────────────
  async function loadHistory() {
    const month = document.getElementById('netf-month')?.value;
    const date  = document.getElementById('netf-date')?.value;
    if (!month || !date) return;

    setLoading(true);
    try {
      const res = await fetch(`data/naver-etf/${month}/${date}.csv`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      allEtfs = parseCsv(await res.text());
      document.getElementById('netf-updated').textContent = `이력: ${date}`;
      document.getElementById('netf-clear-history').classList.remove('hidden');
      setLoading(false);
      applyFilter();
    } catch (err) {
      setError(`이력 로드 실패: ${err.message}`);
    }
  }

  async function loadLatest() {
    setLoading(true);
    try {
      const res = await fetch('data/naver-etf/latest.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      allEtfs = data.etfs ?? [];

      if (data.updatedAt) {
        document.getElementById('netf-updated').textContent =
          new Date(data.updatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
      }

      // 월 선택 옵션
      const monthSel = document.getElementById('netf-month');
      const base = data.date ? new Date(data.date) : new Date();
      for (let i = 0; i < 3; i++) {
        const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthSel.querySelector(`option[value="${val}"]`)) {
          const opt = document.createElement('option');
          opt.value = val; opt.textContent = val;
          monthSel.appendChild(opt);
        }
      }

      setLoading(false);
      applyFilter();
    } catch (err) {
      setError(`데이터를 불러올 수 없습니다: ${err.message}`);
    }
  }

  function setLoading(on) {
    document.getElementById('netf-loading')?.classList.toggle('hidden', !on);
    document.getElementById('netf-table-wrap')?.classList.toggle('hidden', on);
    document.getElementById('netf-error')?.classList.add('hidden');
  }

  function setError(msg) {
    document.getElementById('netf-loading')?.classList.add('hidden');
    document.getElementById('netf-table-wrap')?.classList.add('hidden');
    const el = document.getElementById('netf-error');
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
  }

  // ── 이벤트 바인딩 ─────────────────────────────────────
  function bindEvents() {
    document.getElementById('netf-search')?.addEventListener('input', applyFilter);

    document.getElementById('netf-sort')?.addEventListener('change', e => {
      const [key, dir] = e.target.value.split('_');
      sortKey = key; sortDir = dir ?? 'asc';
      applyFilter();
    });

    document.querySelectorAll('th[data-netf-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.netfSort;
        if (sortKey === key) sortDir = sortDir === 'desc' ? 'asc' : 'desc';
        else { sortKey = key; sortDir = 'desc'; }
        applyFilter();
      });
    });

    document.getElementById('netf-month')?.addEventListener('change', async e => {
      const month     = e.target.value;
      const dateSel   = document.getElementById('netf-date');
      const loadBtn   = document.getElementById('netf-load-history');
      if (!dateSel || !loadBtn) return;
      dateSel.innerHTML = '<option value="">-- 날짜 --</option>';
      dateSel.disabled = true; loadBtn.disabled = true;
      if (!month) return;

      try {
        const latestRes  = await fetch('data/naver-etf/latest.json');
        const latestData = latestRes.ok ? await latestRes.json() : null;
        const [y, m] = month.split('-').map(Number);
        const today = latestData?.date ? new Date(latestData.date) : new Date();
        const daysInMonth = new Date(y, m, 0).getDate();
        const maxDay = (y === today.getFullYear() && m === today.getMonth() + 1) ? today.getDate() : daysInMonth;
        const pad = n => String(n).padStart(2, '0');
        const candidates = Array.from({ length: maxDay }, (_, i) => `${month}-${pad(i + 1)}`);

        const checks = await Promise.all(
          candidates.map(dt =>
            fetch(`data/naver-etf/${month}/${dt}.csv`, { method: 'HEAD' })
              .then(r => r.ok ? dt : null).catch(() => null)
          )
        );
        checks.filter(Boolean).reverse().forEach(dt => {
          const opt = document.createElement('option');
          opt.value = dt; opt.textContent = dt;
          dateSel.appendChild(opt);
        });
        if (dateSel.options.length > 1) { dateSel.disabled = false; loadBtn.disabled = false; }
      } catch { /* 무시 */ }
    });

    document.getElementById('netf-load-history')?.addEventListener('click', loadHistory);

    document.getElementById('netf-clear-history')?.addEventListener('click', async () => {
      document.getElementById('netf-clear-history').classList.add('hidden');
      const m = document.getElementById('netf-month');
      const d = document.getElementById('netf-date');
      if (m) m.value = '';
      if (d) { d.innerHTML = '<option value="">-- 날짜 --</option>'; d.disabled = true; }
      document.getElementById('netf-load-history').disabled = true;
      await loadLatest();
    });
  }

  // ── 사이드바 탭 전환 시 초기화 ───────────────────────
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (item.dataset.section === 'all-etf' && !initialized) {
        initialized = true;
        bindEvents();
        loadLatest();
      }
    });
  });

  // URL 해시로 직접 진입한 경우
  if (location.hash === '#all-etf') {
    initialized = true;
    bindEvents();
    loadLatest();
  }
})();
