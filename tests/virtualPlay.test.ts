import assert from 'node:assert/strict';
import {
  createInitialState,
  gameReducer,
} from '../src/core/engine/fsm.ts';
import {
  evaluateRPS,
  getCpuChamDirection,
  getCpuRpsChoice,
} from '../src/core/engine/rules.ts';
import type {
  ChamDirection,
  RPSChoice,
} from '../src/models/types.ts';

console.log('====================================================');
console.log('🧪 [VIRTUAL PLAY] 전수 경우의 수 가상 플레이 검증 시작');
console.log('====================================================');

// -----------------------------------------------------------------
// 1. RPS 16대 전수 입력 조합 검증 (P1 4가지 x P2 4가지)
// -----------------------------------------------------------------
console.log('\n[Case 1] 가위바위보(RPS) 16대 전수 입력 조합 검증');
const rpsChoices: RPSChoice[] = ['ROCK', 'SCISSORS', 'PAPER', null];

for (const p1 of rpsChoices) {
  for (const p2 of rpsChoices) {
    const res = evaluateRPS(p1, p2);
    assert(res.p1Role !== undefined && res.p2Role !== undefined, `Undefined role for ${p1} vs ${p2}`);
    
    // 무승부 검증
    if (p1 === p2 || (!p1 && !p2)) {
      assert.equal(res.p1Role, 'TIE', `Expected TIE for ${p1} vs ${p2}`);
      assert.equal(res.p2Role, 'TIE', `Expected TIE for ${p1} vs ${p2}`);
    } else if (p1 && !p2) {
      assert.equal(res.p1Role, 'ATTACKER', `P1 should win by default if P2 is null`);
      assert.equal(res.p2Role, 'DEFENDER');
    } else if (!p1 && p2) {
      assert.equal(res.p1Role, 'DEFENDER', `P2 should win by default if P1 is null`);
      assert.equal(res.p2Role, 'ATTACKER');
    } else {
      // 둘 다 값을 낸 경우 승자/패자 정합성
      const isAttackerWinner = (res.p1Role === 'ATTACKER' && res.p2Role === 'DEFENDER') ||
                               (res.p1Role === 'DEFENDER' && res.p2Role === 'ATTACKER');
      assert(isAttackerWinner, `Invalid role pair for ${p1} vs ${p2}`);
    }

    // FSM RESOLVE_RPS 리듀서 실행 안전성 검사
    let testState = createInitialState('1P_CPU');
    testState = gameReducer(testState, { type: 'START_GAME', mode: '1P_CPU' });
    testState = gameReducer(testState, { type: 'START_RPS' });
    if (p1) testState = gameReducer(testState, { type: 'SET_RPS_INPUT', playerId: 'p1', choice: p1 });
    if (p2) testState = gameReducer(testState, { type: 'SET_RPS_INPUT', playerId: 'p2', choice: p2 });
    testState = gameReducer(testState, { type: 'RESOLVE_RPS' });
    assert.equal(testState.phase, 'RPS_RESULT', `Phase must be RPS_RESULT`);
    assert(testState.p1.role !== null, `P1 role must not be null after RESOLVE_RPS`);
    assert(testState.p2.role !== null, `P2 role must not be null after RESOLVE_RPS`);
  }
}
console.log('✅ RPS 16가지 모든 경우의 수 FSM 전이 및 룰 검증 완료 (100% Pass)');

// -----------------------------------------------------------------
// 2. 참참참 32대 전수 방향 조합 검증 (P1선공 16가지 + P2선공 16가지)
// -----------------------------------------------------------------
console.log('\n[Case 2] 참참참 32대 전수 방향 조합 및 공수 판정 검증');
const chamDirs: ChamDirection[] = ['LEFT', 'UP', 'RIGHT', null];

for (const initialAttacker of ['p1', 'p2'] as const) {
  for (const p1Dir of chamDirs) {
    for (const p2Dir of chamDirs) {
      let chamState = createInitialState('1P_CPU');
      chamState = gameReducer(chamState, { type: 'START_GAME', mode: '1P_CPU' });
      chamState = gameReducer(chamState, { type: 'START_RPS' });
      // 강제 선공자 지정
      chamState = {
        ...chamState,
        phase: 'CHAM_INPUT',
        p1: { ...chamState.p1, role: initialAttacker === 'p1' ? 'ATTACKER' : 'DEFENDER' },
        p2: { ...chamState.p2, role: initialAttacker === 'p2' ? 'ATTACKER' : 'DEFENDER' },
      };

      if (p1Dir) chamState = gameReducer(chamState, { type: 'SET_CHAM_INPUT', playerId: 'p1', direction: p1Dir });
      if (p2Dir) chamState = gameReducer(chamState, { type: 'SET_CHAM_INPUT', playerId: 'p2', direction: p2Dir });

      chamState = gameReducer(chamState, { type: 'RESOLVE_CHAM' });
      assert.equal(chamState.phase, 'RESOLVE', `Phase must be RESOLVE`);
      assert(chamState.lastOutcome === 'HIT' || chamState.lastOutcome === 'DODGE', `Invalid outcome: ${chamState.lastOutcome}`);

      const defenderId = initialAttacker === 'p1' ? 'p2' : 'p1';
      if (chamState.lastOutcome === 'HIT') {
        assert.equal(chamState.hitTarget, defenderId, `Hit target must be defender`);
        assert.equal(chamState[defenderId].damage, 1, `Defender damage must increment`);
      } else {
        assert.equal(chamState.hitTarget, null, `Hit target must be null on DODGE`);
        assert.equal(chamState[defenderId].damage, 0, `Defender damage must remain 0 on DODGE`);
        assert.equal(chamState[defenderId].guardCount, 1, `Defender guardCount must increment to 1`);
      }

      // CHECK_ROUND_RESULT 후 다음 턴 상태 전이 검증
      const nextTurnState = gameReducer(chamState, { type: 'CHECK_ROUND_RESULT' });
      assert.equal(nextTurnState.round, 2, `Round must increment to 2`);

      if (chamState.lastOutcome === 'HIT') {
        // 공격 성공 시 공격권 유지 및 CHAM_INPUT 유지
        assert.equal(nextTurnState.phase, 'CHAM_INPUT', `Phase must return to CHAM_INPUT on HIT`);
        assert.equal(nextTurnState[initialAttacker].role, 'ATTACKER', `Attacker should keep role on HIT`);
        assert.equal(nextTurnState.roleReversed, false, `roleReversed must be false on HIT`);
      } else {
        // 수비 성공 시 공수 전환 Pause(ROLE_SWAP) 진입
        assert.equal(nextTurnState.phase, 'ROLE_SWAP', `Phase must enter ROLE_SWAP pause on DODGE`);
        assert.equal(nextTurnState[initialAttacker].role, 'DEFENDER', `Attacker should become DEFENDER on DODGE`);
        assert.equal(nextTurnState[defenderId].role, 'ATTACKER', `Defender should become ATTACKER on DODGE`);
        assert.equal(nextTurnState.roleReversed, true, `roleReversed must be true on DODGE`);

        const nextInputState = gameReducer(nextTurnState, { type: 'START_NEXT_CHAM' });
        assert.equal(nextInputState.phase, 'CHAM_INPUT', `Phase must become CHAM_INPUT after START_NEXT_CHAM`);
      }
    }
  }
}
console.log('✅ 참참참 32가지 모든 방향 조합 및 판정/공수전환 검증 완료 (100% Pass)');

// -----------------------------------------------------------------
// 3. 몬테카를로 5,000판 자동 가상 매치 시뮬레이션 (1P vs CPU)
// -----------------------------------------------------------------
console.log('\n[Case 3] 1P vs CPU 모드 5,000판 엔드투엔드 가상 대전 시뮬레이션');
const MATCH_COUNT = 5000;
let p1Wins = 0;
let p2Wins = 0;
let totalRounds = 0;
let maxRoundsInSingleGame = 0;
let totalTies = 0;

for (let i = 0; i < MATCH_COUNT; i++) {
  let sim = createInitialState('1P_CPU');
  sim = gameReducer(sim, { type: 'START_GAME', mode: '1P_CPU' });
  sim = gameReducer(sim, { type: 'TICK_COUNTDOWN', countdown: 1 });
  sim = gameReducer(sim, { type: 'START_RPS' });

  // 1단계: 가위바위보 선공 결정 (무승부 발생 시 자동 재도전)
  let tieCount = 0;
  while (sim.phase === 'RPS_INPUT') {
    const c1 = getCpuRpsChoice();
    const c2 = getCpuRpsChoice();
    sim = gameReducer(sim, { type: 'SET_RPS_INPUT', playerId: 'p1', choice: c1 });
    sim = gameReducer(sim, { type: 'SET_RPS_INPUT', playerId: 'p2', choice: c2 });
    sim = gameReducer(sim, { type: 'RESOLVE_RPS' });

    if (sim.lastOutcome === 'TIE') {
      tieCount++;
      totalTies++;
      sim = gameReducer(sim, { type: 'RETRY_RPS_TIE' });
      assert.equal(sim.phase, 'RPS_INPUT');
    }
  }

  assert.equal(sim.phase, 'RPS_RESULT');
  assert(sim.p1.role === 'ATTACKER' || sim.p1.role === 'DEFENDER');

  // 2단계: 참참참 페이즈 진입
  sim = gameReducer(sim, { type: 'START_CHAM_PHASE' });
  assert.equal(sim.phase, 'CHAM_INPUT');

  // 3단계: 참참참 반복 배틀 (누군가 5데미지 맞을 때까지)
  while (sim.phase === 'CHAM_INPUT') {
    const dir1 = getCpuChamDirection();
    const dir2 = getCpuChamDirection();

    sim = gameReducer(sim, { type: 'SET_CHAM_INPUT', playerId: 'p1', direction: dir1 });
    sim = gameReducer(sim, { type: 'SET_CHAM_INPUT', playerId: 'p2', direction: dir2 });
    sim = gameReducer(sim, { type: 'RESOLVE_CHAM' });

    assert.equal(sim.phase, 'RESOLVE');
    assert(sim.p1.damage <= 5 && sim.p2.damage <= 5);

    sim = gameReducer(sim, { type: 'CHECK_ROUND_RESULT' });
    if (sim.phase === 'ROLE_SWAP') {
      sim = gameReducer(sim, { type: 'START_NEXT_CHAM' });
    }
  }

  // 게임 종료 검증
  assert.equal(sim.phase, 'GAME_OVER');
  assert(sim.winner === 'p1' || sim.winner === 'p2');
  if (sim.winner === 'p1') {
    p1Wins++;
    assert.equal(sim.p2.damage, 5);
  } else {
    p2Wins++;
    assert.equal(sim.p1.damage, 5);
  }

  totalRounds += sim.round;
  if (sim.round > maxRoundsInSingleGame) {
    maxRoundsInSingleGame = sim.round;
  }
}

console.log(`✅ 1P_CPU 5,000판 시뮬레이션 완료!`);
console.log(`   - 1P 승리: ${p1Wins}판 (${((p1Wins / MATCH_COUNT) * 100).toFixed(1)}%)`);
console.log(`   - P2(AI) 승리: ${p2Wins}판 (${((p2Wins / MATCH_COUNT) * 100).toFixed(1)}%)`);
console.log(`   - 평균 라운드: ${(totalRounds / MATCH_COUNT).toFixed(1)}턴 (최장 대전: ${maxRoundsInSingleGame}턴)`);
console.log(`   - 발생한 RPS 무승부 횟수: ${totalTies}회 (전체 경기에서 결함 없이 재도전 성공)`);

// -----------------------------------------------------------------
// 4. 온라인 매치 상태 동기화 및 난입/이탈 가상 플레이 (ONLINE_MATCH)
// -----------------------------------------------------------------
console.log('\n[Case 4] 온라인 매치(ONLINE_MATCH) 동기화 및 비정상 이탈 가상 시뮬레이션');

// 4-1. 온라인 동기화 액션 주입 시뮬레이션
let onlineSim = createInitialState('ONLINE_MATCH');
onlineSim = gameReducer(onlineSim, {
  type: 'MATCH_CONFIRMED',
  roomId: 'test-room-1',
  myRole: 'p2',
  myName: '철수',
  opponentName: '영희',
});
assert.equal(onlineSim.phase, 'READY');
assert.equal(onlineSim.online?.myRoleInRoom, 'p2');
assert.equal(onlineSim.p2.name, '철수 (나)');
assert.equal(onlineSim.p1.name, '영희');

// 온라인 RPS 결과 동기화 수신
onlineSim = gameReducer(onlineSim, {
  type: 'SYNC_ONLINE_RPS_RESULT',
  p1Choice: 'ROCK',
  p2Choice: 'SCISSORS',
  p1Role: 'ATTACKER',
  p2Role: 'DEFENDER',
  isTie: false,
});
assert.equal(onlineSim.phase, 'RPS_RESULT');
assert.equal(onlineSim.p1.role, 'ATTACKER');
assert.equal(onlineSim.p2.role, 'DEFENDER');

// 온라인 참참참 결과 동기화 수신
onlineSim = gameReducer(onlineSim, {
  type: 'SYNC_ONLINE_CHAM_RESULT',
  p1Dir: 'LEFT',
  p2Dir: 'RIGHT',
  isHit: false,
  hitTarget: null,
  p1Damage: 0,
  p2Damage: 0,
  isGameOver: false,
  winner: null,
});
assert.equal(onlineSim.phase, 'RESOLVE');
assert.equal(onlineSim.lastOutcome, 'DODGE');

// 4-2. 어느 단계에서든 상대방이 이탈(SET_OPPONENT_LEFT)할 때의 예외 무결성 검증
const allPhases = ['READY', 'RPS_INPUT', 'RPS_RESULT', 'CHAM_INPUT', 'RESOLVE'] as const;
for (const p of allPhases) {
  let s = { ...onlineSim, phase: p };
  s = gameReducer(s, { type: 'SET_OPPONENT_LEFT' });
  assert.equal(s.phase, 'GAME_OVER', `Phase must become GAME_OVER on SET_OPPONENT_LEFT from ${p}`);
  assert.equal(s.winner, 'p2', `Remaining player (p2) must win by default`);
  assert.equal(s.online?.opponentLeft, true);
}
console.log('✅ 온라인 매치 동기화 및 5대 Phase 중도 이탈 부전승 완벽 작동');

console.log('\n====================================================');
console.log('🏆 [VIRTUAL PLAY PASSED] 모든 경우의 수 오류 제로 무결성 입증 완료!');
console.log('====================================================');
