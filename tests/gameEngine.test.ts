import assert from 'node:assert/strict';
import {
  evaluateCham,
  evaluateRPS,
  incrementDamage,
} from '../src/core/engine/rules.ts';
import {
  createInitialState,
  gameReducer,
} from '../src/core/engine/fsm.ts';

console.log('--- 1. RPS 규칙 검증 ---');
// 가위 바위 보 승패
assert.deepEqual(evaluateRPS('ROCK', 'SCISSORS'), { p1Role: 'ATTACKER', p2Role: 'DEFENDER' });
assert.deepEqual(evaluateRPS('SCISSORS', 'PAPER'), { p1Role: 'ATTACKER', p2Role: 'DEFENDER' });
assert.deepEqual(evaluateRPS('PAPER', 'ROCK'), { p1Role: 'ATTACKER', p2Role: 'DEFENDER' });
assert.deepEqual(evaluateRPS('SCISSORS', 'ROCK'), { p1Role: 'DEFENDER', p2Role: 'ATTACKER' });
assert.deepEqual(evaluateRPS('PAPER', 'SCISSORS'), { p1Role: 'DEFENDER', p2Role: 'ATTACKER' });
assert.deepEqual(evaluateRPS('ROCK', 'PAPER'), { p1Role: 'DEFENDER', p2Role: 'ATTACKER' });
assert.deepEqual(evaluateRPS('ROCK', 'ROCK'), { p1Role: 'TIE', p2Role: 'TIE' });
assert.deepEqual(evaluateRPS('SCISSORS', 'SCISSORS'), { p1Role: 'TIE', p2Role: 'TIE' });
assert.deepEqual(evaluateRPS('PAPER', 'PAPER'), { p1Role: 'TIE', p2Role: 'TIE' });
console.log('✅ RPS 9대 경우의 수 및 무승부 검증 통과');

console.log('--- 2. 참참참 좌/상/우 3방향 좌표계 및 타격/회피 검증 ---');
// 규칙: 같은 방향이면 가드 방어 성공 (DODGE, isHit = false), 다른 방향이면 타격 피격 (HIT, isHit = true)
assert.equal(evaluateCham('LEFT', 'LEFT').isHit, false);
assert.equal(evaluateCham('UP', 'UP').isHit, false);
assert.equal(evaluateCham('RIGHT', 'RIGHT').isHit, false);
assert.equal(evaluateCham('LEFT', 'RIGHT').isHit, true);
assert.equal(evaluateCham('UP', 'LEFT').isHit, true);
assert.equal(evaluateCham('RIGHT', 'UP').isHit, true);
console.log('✅ 참참참 좌/상/우 3방향 타격 및 가드 판정 통과');

console.log('--- 3. 데미지 누적 및 상한선 (5) 검증 ---');
assert.equal(incrementDamage(0), 1);
assert.equal(incrementDamage(4), 5);
assert.equal(incrementDamage(5), 5); // 오버플로우 차단
console.log('✅ 데미지 0~5 상한선 검증 통과');

console.log('--- 4. FSM 상태 전이 시뮬레이션 ---');
let state = createInitialState('1P_CPU');
assert.equal(state.phase, 'TITLE');

// 1. 게임 시작
state = gameReducer(state, { type: 'START_GAME', mode: '1P_CPU' });
assert.equal(state.phase, 'READY');
assert.equal(state.countdown, 3);

// 2. 가위바위보 진입
state = gameReducer(state, { type: 'START_RPS' });
assert.equal(state.phase, 'RPS_INPUT');

// 2-1. 가위바위보 무승부(TIE) 및 재시도 검증
state = gameReducer(state, { type: 'SET_RPS_INPUT', playerId: 'p1', choice: 'ROCK' });
state = gameReducer(state, { type: 'SET_RPS_INPUT', playerId: 'p2', choice: 'ROCK' });
state = gameReducer(state, { type: 'RESOLVE_RPS' });
assert.equal(state.phase, 'RPS_RESULT');
assert.equal(state.lastOutcome, 'TIE');
assert.equal(state.p1.role, 'TIE');
assert.equal(state.p2.role, 'TIE');

// 무승부 후 재시도 액션
state = gameReducer(state, { type: 'RETRY_RPS_TIE' });
assert.equal(state.phase, 'RPS_INPUT');
assert.equal(state.p1.rpsChoice, null);
assert.equal(state.p2.rpsChoice, null);
assert.equal(state.lastOutcome, null);

// 3. 재입력: 1P 바위, 2P 가위 -> 1P 공격수 승리
state = gameReducer(state, { type: 'SET_RPS_INPUT', playerId: 'p1', choice: 'ROCK' });
state = gameReducer(state, { type: 'SET_RPS_INPUT', playerId: 'p2', choice: 'SCISSORS' });
state = gameReducer(state, { type: 'RESOLVE_RPS' });
assert.equal(state.phase, 'RPS_RESULT');
assert.equal(state.p1.role, 'ATTACKER');
assert.equal(state.p2.role, 'DEFENDER');

// 3-1. 참참참 시작 단계로 전이
state = gameReducer(state, { type: 'START_CHAM_PHASE' });
assert.equal(state.phase, 'CHAM_INPUT');

// 4. 참참참 입력: 공격수 1P=LEFT, 수비수 2P=RIGHT (방향 불일치) -> HIT!
state = gameReducer(state, { type: 'SET_CHAM_INPUT', playerId: 'p1', direction: 'LEFT' });
state = gameReducer(state, { type: 'SET_CHAM_INPUT', playerId: 'p2', direction: 'RIGHT' });
state = gameReducer(state, { type: 'RESOLVE_CHAM' });
assert.equal(state.phase, 'RESOLVE');
assert.equal(state.lastOutcome, 'HIT');
assert.equal(state.hitTarget, 'p2');
assert.equal(state.p2.damage, 1);

// 5. 라운드 종료 체크: 공격 성공 시 공격권 유지 및 가위바위보 없이 바로 다음 참참참(CHAM_INPUT) 진입
state = gameReducer(state, { type: 'CHECK_ROUND_RESULT' });
assert.equal(state.phase, 'CHAM_INPUT');
assert.equal(state.round, 2);
assert.equal(state.p1.role, 'ATTACKER'); // 공격 성공자 계속 공격!
assert.equal(state.p2.role, 'DEFENDER');

// 6. 2턴: 1P(공격) LEFT, 2P(수비) LEFT (방향 일치) -> DODGE! (가드 방어 성공)
state = gameReducer(state, { type: 'SET_CHAM_INPUT', playerId: 'p1', direction: 'LEFT' });
state = gameReducer(state, { type: 'SET_CHAM_INPUT', playerId: 'p2', direction: 'LEFT' });
state = gameReducer(state, { type: 'RESOLVE_CHAM' });
assert.equal(state.phase, 'RESOLVE');
assert.equal(state.lastOutcome, 'DODGE');
assert.equal(state.p2.damage, 1); // 데미지 증가 없음

// 7. 수비 성공 시 다음 턴: 공수 전환 Pause(ROLE_SWAP) 검증 (P2가 공격수로 전환!)
state = gameReducer(state, { type: 'CHECK_ROUND_RESULT' });
assert.equal(state.phase, 'ROLE_SWAP'); // 공수 전환 pause 단계
assert.equal(state.round, 3);
assert.equal(state.p1.role, 'DEFENDER'); // 공수 전환!
assert.equal(state.p2.role, 'ATTACKER'); // 공수 전환!

// Pause 종료 후 다음 참참참 시작
state = gameReducer(state, { type: 'START_NEXT_CHAM' });
assert.equal(state.phase, 'CHAM_INPUT');

// 7-1. 공격자 3초 타임아웃 패널티 검증: 공격수(P2)가 미입력 시 공수 전환 패널티!
state = gameReducer(state, { type: 'SET_CHAM_INPUT', playerId: 'p1', direction: 'UP' }); // 수비자만 입력
// P2(공격수) 미입력
state = gameReducer(state, { type: 'RESOLVE_CHAM' });
assert.equal(state.phase, 'RESOLVE');
assert.equal(state.lastOutcome, 'DODGE'); // 공격 실패

state = gameReducer(state, { type: 'CHECK_ROUND_RESULT' });
assert.equal(state.phase, 'ROLE_SWAP');
assert.equal(state.p1.role, 'ATTACKER'); // 다시 P1에게 공격권 복귀!
assert.equal(state.p2.role, 'DEFENDER');

// 8. 5회 피격 KO 체크
state.p2.damage = 5;
state = gameReducer(state, { type: 'CHECK_ROUND_RESULT' });
assert.equal(state.phase, 'GAME_OVER');
assert.equal(state.winner, 'p1');

console.log('✅ FSM 시작 시 1회 가위바위보 + 공격 성공 시 공격 유지 + 수비 성공 시 공수 전환 사이클 검증 통과');
