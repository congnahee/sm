# congsim-v25 Vercel 배포 방법

이 패키지는 ZIP을 풀었을 때 최상위에 `index.html`, `vercel.json`, `api`, `js`가 바로 나오도록 구성되어 있습니다.

1. `congsim-v25-vercel-ready.zip`을 압축 해제합니다.
2. 압축을 푼 폴더 자체를 Vercel 프로젝트 루트로 배포합니다.
3. `congsim-v25` 같은 상위 폴더를 한 번 더 감싸서 업로드하지 않습니다.
4. 배포 파일 목록 최상위에 반드시 `index.html`과 `vercel.json`이 보여야 합니다.
5. 배포 후 강력 새로고침(Ctrl+F5)을 실행합니다.

`index.html`을 파일 탐색기에서 직접 더블클릭하면 `/api/verify` 서버 기능이 없어 로그인이 정상 작동하지 않습니다. Vercel 또는 로컬 HTTP 서버로 실행해야 합니다.
