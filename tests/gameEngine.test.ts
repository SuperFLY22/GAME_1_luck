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

console.log('--- 2. 참참참 좌표계 및 타격/회피 검증 ---');
// 절대 좌표계: 같은 방향이면 HIT, 다르면 DODGE
assert.equal(evaluateCham('LEFT', 'LEFT').isHit, true);
assert.equal(evaluateCham('RIGHT', 'RIGHT').isHit, true);
assert.equal(evaluateCham('LEFT', 'RIGHT').isHit, false);
assert.equal(evaluateCham('RIGHT', 'LEFT').isHit, false);
console.log('✅ 참참참 화면 절대 좌표 판정 통과');

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

// 3. 입력: 1P 바위, 2P 가위 -> 1P 공격수
state = gameReducer(state, { type: 'SET_RPS_INPUT', playerId: 'p1', choice: 'ROCK' });
state = gameReducer(state, { type: 'SET_RPS_INPUT', playerId: 'p2', choice: 'SCISSORS' });
state = gameReducer(state, { type: 'RESOLVE_RPS' });
assert.equal(state.phase, 'CHAM_INPUT');
assert.equal(state.p1.role, 'ATTACKER');
assert.equal(state.p2.role, 'DEFENDER');

// 4. 참참참 입력: 공격수 1P=LEFT, 수비수 2P=LEFT -> HIT!
state = gameReducer(state, { type: 'SET_CHAM_INPUT', playerId: 'p1', direction: 'LEFT' });
state = gameReducer(state, { type: 'SET_CHAM_INPUT', playerId: 'p2', direction: 'LEFT' });
state = gameReducer(state, { type: 'RESOLVE_CHAM' });
assert.equal(state.phase, 'RESOLVE');
assert.equal(state.lastOutcome, 'HIT');
assert.equal(state.hitTarget, 'p2');
assert.equal(state.p2.damage, 1);

// 5. 라운드 종료 체크 -> 다음 라운드 준비
state = gameReducer(state, { type: 'CHECK_ROUND_RESULT' });
assert.equal(state.phase, 'READY');
assert.equal(state.round, 2);

// 6. 5회 피격 KO 체크
state.p2.damage = 5;
state = gameReducer(state, { type: 'CHECK_ROUND_RESULT' });
assert.equal(state.phase, 'GAME_OVER');
assert.equal(state.winner, 'p1');

console.log('✅ FSM 전체 상태 전이 사이클 및 KO 판정 검증 통과');
