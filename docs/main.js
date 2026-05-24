const ICONS = {
  '맑음':    '☀️',
  '구름조금': '🌤️',
  '구름많음': '⛅',
  '흐림':    '☁️',
  '비':      '🌧️',
  '소나기':  '🌦️',
  '눈':      '❄️',
  '눈비':    '🌨️',
  '천둥번개': '⛈️',
};

function getIcon(condition = '') {
  for (const [key, icon] of Object.entries(ICONS)) {
    if (condition.includes(key)) return icon;
  }
  return '🌤️';
}

function safe(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// KST 기준 YYYY-MM-DD / YYYY-MM
function kstDate() {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}
function kstMonth() { return kstDate().slice(0, 7); }

function parseCsv(text) {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    return Object.fromEntries(headers.map((h, i) => [h.trim(), (vals[i] ?? '').trim()]));
  });
}

async function loadWeather() {
  const loadingEl = document.getElementById('loading');
  const errorEl   = document.getElementById('error');
  const cardEl    = document.getElementById('weather-card');

  try {
    const res = await fetch('data/weather.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();

    loadingEl.classList.add('hidden');

    document.getElementById('location').textContent     = d.location || '서울';
    document.getElementById('condition').textContent    = d.current?.condition || '--';
    document.getElementById('temp').textContent         = `${d.current?.temp ?? '--'}°`;
    document.getElementById('feels-like').textContent   = d.current?.feelsLike ?? '--';
    document.getElementById('humidity').textContent     = d.current?.humidity !== '--' ? `${d.current.humidity}%` : '--%';
    document.getElementById('wind').textContent         = d.current?.wind !== '--' ? `${d.current.wind} m/s` : '-- m/s';
    document.getElementById('weather-icon').textContent = getIcon(d.current?.condition);

    if (d.updatedAt) {
      const date = new Date(d.updatedAt);
      document.getElementById('updated').textContent =
        `마지막 업데이트: ${date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`;
    }

    const forecastEl = document.getElementById('forecast');
    (d.forecast || []).forEach(item => {
      const row = document.createElement('div');
      row.className = 'forecast-row';
      row.innerHTML = `
        <span class="w-10 text-white/70 text-sm">${safe(item.day)}</span>
        <span class="flex-1 text-sm">${getIcon(item.condition)} ${safe(item.condition)}</span>
        <span class="text-sm text-white/70">${safe(item.low)}° <span class="text-white/30">/</span> <strong>${safe(item.high)}°</strong></span>
      `;
      forecastEl.appendChild(row);
    });

    cardEl.classList.remove('hidden');
  } catch (err) {
    loadingEl.classList.add('hidden');
    errorEl.textContent = `날씨 데이터를 불러올 수 없습니다: ${err.message}`;
    errorEl.classList.remove('hidden');
  }
}

async function loadHistory() {
  const section  = document.getElementById('history-section');
  const tbody    = document.getElementById('history-body');
  const emptyMsg = document.getElementById('history-empty');
  const dateEl   = document.getElementById('history-date');

  const date  = kstDate();
  const month = kstMonth();
  dateEl.textContent = date;

  try {
    const res = await fetch(`data/${month}/${date}.csv`);
    if (!res.ok) throw new Error('no csv');
    const text = await res.text();
    const rows = parseCsv(text);

    section.classList.remove('hidden');

    if (rows.length === 0) {
      emptyMsg.classList.remove('hidden');
      return;
    }

    // 최신순 정렬
    rows.reverse().forEach(row => {
      const time = row.time ? new Date(row.time).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' }) : '--';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="py-2 pr-4 text-white/80">${safe(time)}</td>
        <td class="py-2 pr-4 font-semibold">${safe(row.temp)}°</td>
        <td class="py-2 pr-4 text-white/70">${safe(row.feelsLike)}°</td>
        <td class="py-2 pr-4">${getIcon(row.condition)} ${safe(row.condition)}</td>
        <td class="py-2 pr-4 text-white/70">${safe(row.humidity)}%</td>
        <td class="py-2 text-white/70">${safe(row.wind)} m/s</td>
      `;
      tbody.appendChild(tr);
    });
  } catch {
    // CSV 없으면 섹션 숨김 유지
  }
}

loadWeather();
loadHistory();
