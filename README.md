# Google AI Crawler

GitHub Pages 기반 정적 웹사이트 + 매일 자동 크롤링 프로젝트.

## 기술 스택

- **Frontend**: Vanilla JavaScript + Tailwind CSS (CDN)
- **Crawler**: Node.js + axios + cheerio
- **패키지 매니저**: pnpm
- **호스팅**: GitHub Pages (`docs/` 폴더)
- **자동화**: GitHub Actions (매일 UTC 00:00)

## 시작하기

```bash
# 의존성 설치
pnpm install

# 크롤링 수동 실행
pnpm crawl
```

## GitHub Pages 설정

1. 저장소 Settings → Pages
2. Source: `Deploy from a branch`
3. Branch: `main` / Folder: `/docs`

## 크롤링 커스터마이징

[src/crawl.js](src/crawl.js) 파일에서 `TARGET_URL`과 CSS 선택자를 수정하세요.

크롤링 결과는 `data/result.json`에 저장되며, GitHub Actions가 매일 자동으로 커밋합니다.

## 폴더 구조

```
project-root/
├── .github/workflows/crawl.yml   # 매일 크롤링 자동화
├── data/result.json               # 크롤링 결과
├── src/crawl.js                   # 크롤링 스크립트
├── docs/                          # GitHub Pages 배포 폴더
│   ├── index.html
│   ├── style.css
│   └── main.js
├── package.json
└── README.md
```
