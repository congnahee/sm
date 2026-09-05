# congsim-v28 Vercel 배포 방법

이 패키지는 ZIP을 풀었을 때 최상위에 `index.html`, `vercel.json`, `api`, `js`가 바로 나오도록 구성되어 있습니다.

1. `congsim-v28-filter-preview.zip`을 압축 해제합니다.
2. 압축을 푼 폴더 자체를 Vercel 프로젝트 루트로 배포합니다.
3. `congsim-v28` 같은 상위 폴더를 한 번 더 감싸서 업로드하지 않습니다.
4. 배포 파일 목록 최상위에 반드시 `index.html`과 `vercel.json`이 보여야 합니다.
5. 이전 배포 탭이 열려 있다면 배포 완료 후 한 번 새로고침합니다.

v28은 JavaScript 주소에 `?v=28`을 붙이고 HTML/JS 응답에 재검증 헤더를 적용하여 이전 버전이 브라우저 캐시에 남는 문제를 줄였습니다.

`index.html`을 파일 탐색기에서 직접 더블클릭하면 `/api/verify` 서버 기능이 없어 로그인이 정상 작동하지 않습니다. Vercel 또는 로컬 HTTP 서버로 실행해야 합니다.
