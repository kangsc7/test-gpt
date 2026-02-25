# Genspark Agent 재구현용 상세 지침

## 목표
사용자가 대본만 넣고 다음을 원클릭으로 완료:
1. 장르별 씬 분할
2. 씬별 이미지 생성/수동교체
3. 썸네일 3개 생성
4. TTS 나레이션 합성
5. 자막 스타일 반영
6. 로컬 영상 렌더링 + 다운로드
7. Antigravity 재편집 호환

## 필수 모듈
- Auth: Google OAuth(다중 계정 전환 지원)
- LLM: Gemini Flash 계열 모델 + 한도 초과 감지 후 계정 전환 흐름
- Image: 무료 생성 API + 수동 업로드(드래그앤드롭)
- TTS: Google Cloud Text-to-Speech 유료 API
- Render: Web Worker + OffscreenCanvas + MediaRecorder
- Export: ZIP 번들 + 프로젝트 JSON(antigravity import)

## 구현 우선순위
1. Project/Scene 데이터 모델 고정
2. OAuth 및 API 키 관리 UI
3. Script→Scene 파이프라인
4. Scene 이미지 생성 파이프라인
5. TTS 파이프라인
6. Render 파이프라인
7. 다운로드/복구/재시도

## 권장 데이터 스키마
```json
{
  "projectId": "uuid",
  "genre": "경제뉴스(졸라맨 케릭터)",
  "script": "...",
  "scenes": [
    {
      "id": 1,
      "text": "씬 내레이션",
      "imagePrompt": "이미지 프롬프트",
      "imageAsset": "path-or-blob",
      "audioAsset": "path-or-blob",
      "durationSec": 4
    }
  ],
  "thumbnails": [
    {"title": "", "hookText": "", "imagePrompt": ""}
  ],
  "subtitleStyle": {
    "font": "Noto Sans KR",
    "sizePx": 48,
    "lineMode": 2,
    "color": "#fff",
    "bgColor": "#000"
  }
}
```

## 메모리/성능 전략
- Blob URL 즉시 revoke
- 미리보기 해상도/출력 해상도 분리
- 씬 단위 스트리밍 렌더링(전체 프레임 캐싱 금지)
- 실패 씬만 재시도 큐
- 백그라운드 탭 타이머 쓰로틀 회피를 위해 Worker 기반 렌더

## Antigravity 연동 포맷
- `export/antigravity-project.json` 포함
- 씬 순서, 타임라인, 자막 스타일, asset 매핑 정보를 직렬화

## 품질 보증
- 장르별 템플릿 프롬프트 유지
- 썸네일 문구 길이 제한(모바일 우선)
- 혐오/선정성/허위정보 검수 체인 추가
