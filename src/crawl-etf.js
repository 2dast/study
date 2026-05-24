import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ETF_DIR = resolve(__dirname, '../docs/data/etf');
const BASE = 'https://papi.aceetf.co.kr/api';
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

async function main() {
  console.log('ETF 데이터 수집 시작...');
  mkdirSync(ETF_DIR, { recursive: true });

  // 1. 펀드 목록
  const funds = await fetchFundList();
  console.log(`펀드 목록: ${funds.length}개`);

  writeFileSync(`${ETF_DIR}/funds.json`, JSON.stringify({
    updatedAt: new Date().toISOString(),
    total: funds.length,
    funds,
  }, null, 2), 'utf-8');

  // 2. 개별 구성종목
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
