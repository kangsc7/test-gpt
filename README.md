# AI 유튜브 자동 제작 스튜디오

대본 입력만으로 장르별 씬 분할, 이미지 프롬프트/이미지 생성, 썸네일 3종 제안, Google TTS 합성, 자막 스타일링, 로컬 영상 생성/다운로드까지 연결하는 웹앱입니다.

## 실행
```bash
python3 -m http.server 4173
# 브라우저: http://localhost:4173
```

## 구현 기능
- Google 이메일 계정 전환 UX 제공(OAuth Client ID 없이 계정 선택창 열기)
- 장르 선택: 야담, 시니어, 성인로멘스, 무협애니메이션, 경제뉴스(졸라맨 케릭터), 코인뉴스
- Gemini 기반 씬 분할 + 이미지 프롬프트 + 썸네일 3종 생성
- 무료 이미지 생성(Pollinations) + 재생성 + 드래그앤드롭 업로드
- Google Cloud TTS API Key 저장/삭제/연결확인 + 씬별 TTS 생성
- Google Cloud TTS 화자 목록(한국어 + 성별 표기)
- 자막 스타일: 폰트 10종, 크기/위치/색상/배경/1줄·2줄
- Web Worker + OffscreenCanvas 기반 로컬 영상 렌더링 + 자동 다운로드
- 씬 이미지/TTS/프롬프트/프로젝트 JSON 일괄 ZIP 다운로드
- Antigravity/Genspark 재구현용 문서 포함(`docs/genspark-agent-instructions.md`)

## 보안/운영 권장
- 실제 운영에서는 API Key를 프런트에 두지 말고 백엔드 토큰 프록시 사용 권장
- 사용량 초과 시 계정 순환 정책(계정풀, 쿨다운, 백오프) 서버에서 관리 권장
- 생성물 저작권/정책 필터 체인 추가 권장
