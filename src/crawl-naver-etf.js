import { writeFileSync, appendFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../docs/data/naver-etf');
const API_URL = 'https://finance.naver.com/api/sise/etfItemList.nhn?etfType=0&page=1&pageSize=2000';

function getKST() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const pad = n => String(n).padStart(2, '0');
  const y = kst.getUTCFullYear();
  const m = pad(kst.getUTCMonth() + 1);
  const d = pad(kst.getUTCDate());
  return { dateHyphen: `${y}-${m}-${d}`, monthHyphen: `${y}-${m}` };
}

async function fetchEtfs() {
  const res = await fetch(API_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Referer': 'https://finance.naver.com/',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.resultCode !== 'success') throw new Error(`API 오류: ${data.resultCode}`);
  return data.result.etfItemList ?? [];
}

async function main() {
  try {
    console.log('네이버 ETF API 호출...');
    const raw = await fetchEtfs();
    console.log(`수집: ${raw.length}개`);

    // risefall: '2'=상승, '3'=보합, '5'=하락
    const etfs = raw.map(e => ({
      code:       e.itemcode,
      name:       e.itemname,
      price:      e.nowVal,
      change:     e.risefall === '5' ? -Math.abs(e.changeVal) : Math.abs(e.changeVal ?? 0),
      changeRate: e.risefall === '5' ? -Math.abs(e.changeRate) : Math.abs(e.changeRate ?? 0),
      nav:        e.nav,
      return3m:   e.threeMonthEarnRate ?? null,
      volume:     e.quant,
      aum:        e.marketSum != null ? e.marketSum * 1e8 : null,  // 억원 → 원
    }));

    const kst = getKST();
    mkdirSync(DATA_DIR, { recursive: true });

    // latest.json
    writeFileSync(
      `${DATA_DIR}/latest.json`,
      JSON.stringify({ updatedAt: new Date().toISOString(), date: kst.dateHyphen, total: etfs.length, etfs }, null, 2),
      'utf-8'
    );

    // 월별 폴더 / 일별 CSV
    const csvDir  = `${DATA_DIR}/${kst.monthHyphen}`;
    const csvPath = `${csvDir}/${kst.dateHyphen}.csv`;
    mkdirSync(csvDir, { recursive: true });

    writeFileSync(csvPath, 'date,code,name,price,change,changeRate,nav,return3m,volume,aum\n', 'utf-8');
    appendFileSync(
      csvPath,
      etfs.map(e =>
        [kst.dateHyphen, e.code, `"${e.name}"`,
         e.price ?? '', e.change ?? '', e.changeRate ?? '',
         e.nav ?? '', e.return3m ?? '', e.volume ?? '', e.aum ?? ''].join(',')
      ).join('\n') + '\n',
      'utf-8'
    );

    console.log(`저장 완료 → latest.json + ${csvPath}`);
  } catch (err) {
    console.error('수집 실패:', err.message);
    process.exit(1);
  }
}

main();
