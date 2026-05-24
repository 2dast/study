import axios from 'axios';
import * as cheerio from 'cheerio';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '../docs/data/weather.json');
const TARGET_URL = 'https://weather.naver.com/';

async function fetchWeather() {
  console.log(`날씨 수집 시작: ${TARGET_URL}`);

  const { data: html } = await axios.get(TARGET_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'ko-KR,ko;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    timeout: 15000,
  });

  const $ = cheerio.load(html);

  const weather = {
    updatedAt: new Date().toISOString(),
    location: '서울',
    current: { temp: '--', feelsLike: '--', condition: '--', humidity: '--', wind: '--' },
    forecast: [],
  };

  // 위치
  const locationText = $('.location_name').first().text().trim()
    || $('.select_box .option_current').first().text().trim();
  if (locationText) weather.location = locationText;

  // 현재 기온
  const tempRaw = $('.temperature_text strong').first().text().trim()
    || $('.today_area .temperature').first().text().trim();
  weather.current.temp = tempRaw.replace(/[^0-9\-]/g, '') || '--';

  // 날씨 상태 (맑음, 흐림 등)
  const condRaw = $('p.description').first().text().trim()
    || $('.weather_area .weather_text').first().text().trim()
    || $('.summary').first().text().trim();
  if (condRaw) weather.current.condition = condRaw;

  // 체감 온도
  const feelsRaw = $('[class*="feels"], [class*="feel"]').first().text().trim()
    || $('.temperature_info .temperature').eq(1).text().trim();
  weather.current.feelsLike = feelsRaw.replace(/[^0-9\-]/g, '') || '--';

  // 습도
  const humRaw = $('[class*="humidity"] em, .humidity').first().text().trim();
  weather.current.humidity = humRaw.replace(/[^0-9]/g, '') || '--';

  // 풍속
  const windRaw = $('[class*="wind_speed"], [class*="windspeed"]').first().text().trim()
    || $('.wind_area em').first().text().trim();
  weather.current.wind = windRaw.replace(/[^0-9.]/g, '') || '--';

  // 주간 예보
  $('.week_item').each((_, el) => {
    const day       = $(el).find('.day').text().trim() || $(el).find('[class*="date"]').first().text().trim();
    const condition = $(el).find('.weather_text').text().trim() || $(el).find('.weather_icon').attr('title') || '';
    const low       = $(el).find('[class*="low"]').text().trim().replace(/[^0-9\-]/g, '');
    const high      = $(el).find('[class*="high"]').text().trim().replace(/[^0-9\-]/g, '');
    if (day) weather.forecast.push({ day, condition, low, high });
  });

  return weather;
}

async function main() {
  try {
    const weather = await fetchWeather();
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, JSON.stringify(weather, null, 2), 'utf-8');
    console.log(`완료 → ${OUTPUT_PATH}`);
    console.log(`위치: ${weather.location} | 기온: ${weather.current.temp}° | 날씨: ${weather.current.condition}`);
  } catch (err) {
    console.error('날씨 수집 실패:', err.message);
    process.exit(1);
  }
}

main();
