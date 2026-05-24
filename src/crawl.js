import axios from 'axios';
import * as cheerio from 'cheerio';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '../data/result.json');

// 크롤링 대상 URL (필요에 따라 수정)
const TARGET_URL = 'https://example.com';

async function crawl() {
  console.log(`크롤링 시작: ${TARGET_URL}`);

  const { data: html } = await axios.get(TARGET_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
    timeout: 10000,
  });

  const $ = cheerio.load(html);
  const results = [];

  // 예시: <h2> 태그 수집 (실제 사용 시 선택자 수정)
  $('h2').each((_, el) => {
    results.push({
      title: $(el).text().trim(),
      crawledAt: new Date().toISOString(),
    });
  });

  writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`완료: ${results.length}건 저장 → ${OUTPUT_PATH}`);
}

crawl().catch((err) => {
  console.error('크롤링 실패:', err.message);
  process.exit(1);
});
