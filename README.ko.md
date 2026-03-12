# Unreal Master Agent

[English](./README.md) | [Korean](./README.ko.md)

Unreal Engine 내부를 Claude Code에서 양방향으로 제어할 수 있게 해주는 자율형 AI 에이전트입니다. 블루프린트 그래프 조작, Slate UI 코드 생성, Live Coding 트리거, 컴파일 오류 자가 복구까지 한 흐름으로 연결합니다.

---

## 개요

자연어로 원하는 작업을 설명하면 Claude Code가 적절한 MCP 도구들을 순서대로 호출하고, Unreal Engine이 변경 사항을 실시간으로 실행합니다.

**예시:**

> "BP_TestActor의 BeginPlay 다음에 PrintString 노드를 연결하고, 메시지를 'Hello World'로 설정한 뒤 컴파일해줘."

에이전트는 블루프린트를 JSON으로 직렬화하고, 노드를 만들고, 실행 핀을 연결하고, 기본값을 설정한 뒤 Live Coding을 트리거합니다. 컴파일 오류가 나면 self-healing 루프로 다시 수정과 재시도를 진행할 수 있습니다.

## 핵심 기능

- 블루프린트 그래프 직렬화 (`UEdGraph` -> 구조화된 JSON AST)
- C++ UE API 기반 동적 노드 생성 및 핀 연결
- RAG 보조 템플릿 검색을 활용한 Slate UI 코드 생성
- Live Coding 컴파일 트리거 및 컴파일 로그 수집
- 컴파일 오류 파싱 -> 수정 적용 -> 재시도(최대 3회) self-healing 루프
- 파괴적 작업 전 human-in-the-loop 승인 게이트
- 액터 생성/삭제, 속성 편집, 트랜스폼 제어
- 머티리얼 생성, 파라미터 설정, 텍스처 할당
- 레벨 관리, 에셋 파이프라인, 애니메이션, 데이터테이블, 게임플레이 도구 지원
- Python 자동화 스크립트 166개와 MCP 도구 185개 제공

## 빠른 시작

### 1. 의존성 설치

```bash
cd mcp-server
npm install
```

### 2. MCP 설정

프로젝트 루트의 `.claude/mcp.json`에 서버를 등록합니다.

```json
{
  "mcpServers": {
    "unreal-master": {
      "command": "node",
      "args": ["mcp-server/dist/index.js"],
      "env": {
        "UE_WS_PORT": "9877"
      }
    }
  }
}
```

### 3. MCP 서버 빌드

```bash
cd mcp-server
npm run build
```

### 4. UE 플러그인 설치

`UnrealMasterAgent/`를 Unreal 프로젝트의 `Plugins/` 폴더에 복사하거나 심볼릭 링크로 연결한 뒤 `.uproject`에서 활성화합니다.

### 5. Python Editor Script Plugin 활성화

UE 에디터에서 **Edit -> Plugins -> Scripting**으로 이동해 **Python Editor Script Plugin**을 켜고 에디터를 재시작합니다.

### 6. 연결 확인

Claude Code에서 `editor.ping`을 호출해 연결 상태를 확인합니다.

예상 응답:

```text
{ "status": "ok", "ueVersion": "5.4.x" }
```

## 주요 문서

- 전체 구조: [ARCHITECTURE.md](./ARCHITECTURE.md)
- 설치/설정 가이드: [docs/setup-guide.md](./docs/setup-guide.md)
- MCP 도구 API 레퍼런스: [docs/api-reference/mcp-tools.md](./docs/api-reference/mcp-tools.md)
- 전체 영어 README: [README.md](./README.md)

## 문제 해결

- `WebSocket connection failed`: UE 플러그인이 실행 중인지, `UE_WS_PORT`가 양쪽에서 같은지 확인합니다.
- `editor-ping` 응답 없음: UE 에디터를 재시작하고 Output Log에서 WebSocket 연결 로그를 확인합니다.
- Python 스크립트 관련 오류: `Python Editor Script Plugin` 활성화 여부를 확인합니다.

## 라이선스

MIT License. 자세한 내용은 [LICENSE](./LICENSE)를 참고하세요.
