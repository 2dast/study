import puppeteer from 'puppeteer';
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../docs/data');
const TARGET_URL = 'https://weather.naver.com/';

function getKST() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const pad = n => String(n).padStart(2, '0');
  const y = kst.getUTCFullYear();
  const m = pad(kst.getUTCMonth() + 1);
  const d = pad(kst.getUTCDate());
  return {
    dateHyphen: `${y}-${m}-${d}`,
    monthHyphen: `${y}-${m}`,
  };
}

async function fetchWeather() {
  console.log(`브라우저 시작 → ${TARGET_URL}`);

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  const browser = await puppeteer.launch({
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
    ],
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });

    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 기온 로드 대기
    await page.waitForSelector('.card_now_temperature', { timeout: 20000 }).catch(() => {});

    const weather = await page.evaluate(() => {
      const txt = sel => document.querySelector(sel)?.textContent?.trim() ?? '--';

      // 현재 기온
      const tempRaw = txt('.card_now_temperature');
      const temp = tempRaw.replace(/[^0-9.\-]/g, '') || '--';

      // 날씨 상태 (첫 줄만 추출)
      const condRaw = txt('.card_detail_date');
      const condition = condRaw.split('\n')[0].trim() || '--';

      // title → data 맵 생성 (체감/풍속/습도 등)
      const detailMap = {};
      document.querySelectorAll('.card_description_title').forEach(title => {
        const data = title.nextElementSibling;
        if (data?.classList.contains('card_description_data')) {
          detailMap[title.textContent.trim()] = data.textContent.trim();
        }
      });

      const feelsLike = (detailMap['체감'] || '--').replace(/[^0-9.\-]/g, '') || '--';
      const humidity  = (detailMap['습도'] || '--').replace(/[^0-9]/g, '') || '--';
      // 풍향 키("서풍","북풍" 등)에서 속도만 추출
      const windEntry = Object.entries(detailMap).find(([k]) => k.includes('풍'));
      const wind = windEntry ? windEntry[1].replace(/[^0-9.]/g, '') || '--' : '--';

      // 위치
      const location = txt('.location_name') || txt('.select_box .option_current') || '서울';

      // 주간 예보
      const forecast = [];
      document.querySelectorAll('.week_item').forEach(el => {
        const day  = el.querySelector('.day')?.textContent?.trim() ?? '';
        const cond = el.querySelector('.weather_text')?.textContent?.trim()
          || el.querySelector('.weather_icon')?.getAttribute('title') || '';
        const low  = (el.querySelector('[class*="low"]')?.textContent?.trim() ?? '').replace(/[^0-9\-]/g, '');
        const high = (el.querySelector('[class*="high"]')?.textContent?.trim() ?? '').replace(/[^0-9\-]/g, '');
        if (day) forecast.push({ day, condition: cond, low, high });
      });

      return { location, temp, feelsLike, condition, humidity, wind, forecast };
    });

    return weather;
  } finally {
    await browser.close();
  }
}

async function main() {
  try {
    const raw = await fetchWeather();
    const kst = getKST();

    const data = {
      updatedAt: new Date().toISOString(),
      location: raw.location,
      current: {
        temp:      raw.temp,
        feelsLike: raw.feelsLike,
        condition: raw.condition,
        humidity:  raw.humidity,
        wind:      raw.wind,
      },
      forecast: raw.forecast,
    };

    // weather.json (최신)
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(`${DATA_DIR}/weather.json`, JSON.stringify(data, null, 2), 'utf-8');

    // 월별/일별 CSV
    const csvDir  = `${DATA_DIR}/${kst.monthHyphen}`;
    const csvPath = `${csvDir}/${kst.dateHyphen}.csv`;
    mkdirSync(csvDir, { recursive: true });

    const header = 'time,location,temp,feelsLike,condition,humidity,wind\n';
    if (!existsSync(csvPath)) writeFileSync(csvPath, header, 'utf-8');

    const row = [
      new Date().toISOString(),
      data.location,
      data.current.temp,
      data.current.feelsLike,
      data.current.condition,
      data.current.humidity,
      data.current.wind,
    ].join(',') + '\n';

    appendFileSync(csvPath, row, 'utf-8');

    console.log(`완료 → weather.json + ${csvPath}`);
    console.log(`위치: ${data.location} | 기온: ${data.current.temp}° | 날씨: ${data.current.condition}`);
  } catch (err) {
    console.error('날씨 수집 실패:', err.message);
    process.exit(1);
  }
}

main();
