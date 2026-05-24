import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ETF_DIR   = resolve(__dirname, '../docs/data/etf');
const BASE      = 'https://papi.aceetf.co.kr/api';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  'Referer': 'https://www.aceetf.co.kr/fund',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchJson(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function fetchFundList() {
  const data = await fetchJson(`${BASE}/funds?page=1&size=200`);
  return data.data.map(f => ({
    fundCd:   f.fundCd,
    fundNm:   f.fundNm,
    stockCd:  f.stockCd,
    type:     f.fundTypeNm,
    area:     f.fundAreaNm ?? '',
    aum:      f.nastAmt,
    lstdDt:   f.lstdDt,
    wk1:      f.wk1ErnRt ?? null,
    mm1:      f.mm1ErnRt ?? null,
    mm3:      f.mm3ErnRt ?? null,
    pension:  f.pensionType ?? '',
  }));
}

async function fetchHoldings(fundCd) {
  try {
    const data = await fetchJson(`${BASE}/funds/${fundCd}/pdf?page=1&size=1000&std_dt=`);
    return {
      stdDt:    data.pdfList?.[0]?.std_DT ?? '',
      holdings: (data.pdfList ?? []).map(h => ({
        rank:   h.rank,
        name:   h.sec_NM,
        ticker: h.jm_KSC_CD,
        weight: h.wg,
        value:  h.val_AM,
        qty:    Number(h.cu_ITEM_CNT),
      })),
      sectors: (data.sectorList ?? []).map(s => ({
        rank:   Number(s.RANK),
        name:   s.TITLE,
        weight: Math.round(s.METRIC_VALUE * 10000) / 100,
      })),
    };
  } catch {
    return { stdDt: '', holdings: [], sectors: [] };
  }
}

function saveDailyCsv(funds, now) {
  const yyyymm = now.toISOString().slice(0, 7);           // 2025-05
  const yyyymmdd = now.toISOString().slice(0, 10);        // 2025-05-24
  const monthDir = `${ETF_DIR}/${yyyymm}`;
  mkdirSync(monthDir, { recursive: true });

  const csvPath = `${monthDir}/${yyyymmdd}.csv`;
  const header  = 'fundCd,fundNm,stockCd,type,area,aum,wk1,mm1,mm3,pension';
  const rows    = funds.map(f => [
    f.fundCd,
    `"${(f.fundNm ?? '').replace(/"/g, '""')}"`,
    f.stockCd?.slice(3, 9) ?? '',
    `"${(f.type ?? '').replace(/"/g, '""')}"`,
    `"${(f.area ?? '').replace(/"/g, '""')}"`,
    f.aum ?? '',
    f.wk1 ?? '',
    f.mm1 ?? '',
    f.mm3 ?? '',
    `"${(f.pension ?? '').replace(/"/g, '""')}"`,
  ].join(','));

  const csvContent = [header, ...rows].join('\n');
  writeFileSync(csvPath, csvContent, 'utf-8');
  console.log(`일별 CSV 저장 → ${csvPath}`);
}

async function main() {
  console.log('ETF 데이터 수집 시작...');
  mkdirSync(ETF_DIR, { recursive: true });

  const now = new Date();

  // 1. 펀드 목록
  const funds = await fetchFundList();
  console.log(`펀드 목록: ${funds.length}개`);

  writeFileSync(`${ETF_DIR}/funds.json`, JSON.stringify({
    updatedAt: now.toISOString(),
    total: funds.length,
    funds,
  }, null, 2), 'utf-8');

  // 2. 일별 CSV 저장
  saveDailyCsv(funds, now);

  // 3. 개별 구성종목
  let success = 0;
  for (const fund of funds) {
    const holdings = await fetchHoldings(fund.fundCd);
    writeFileSync(
      `${ETF_DIR}/${fund.fundCd}.json`,
      JSON.stringify({ fundCd: fund.fundCd, fundNm: fund.fundNm, ...holdings }, null, 2),
      'utf-8'
    );
    success++;
    process.stdout.write(`\r구성종목 수집: ${success}/${funds.length} (${fund.fundNm.slice(0, 20)})`);
    await sleep(200);
  }

  console.log(`\n완료 → ${ETF_DIR}`);
}

main().catch(err => {
  console.error('실패:', err.message);
  process.exit(1);
});
