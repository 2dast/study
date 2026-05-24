const WEATHER_URL = 'data/weather.json';

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

async function loadWeather() {
  const loadingEl = document.getElementById('loading');
  const errorEl   = document.getElementById('error');
  const cardEl    = document.getElementById('weather-card');

  try {
    const res = await fetch(WEATHER_URL);
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

loadWeather();
