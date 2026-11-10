import assert from 'node:assert/strict';

interface MockPlayer {
  id: string;
  name: string;
  status: 'WAITING' | 'PLAYING';
  joinedAt: number;
}

function selectMatchPairs(pool: MockPlayer[]): { leader: MockPlayer; opponent: MockPlayer } | null {
  const waiting = pool.filter((p) => p.status === 'WAITING');
  if (waiting.length < 2) return null;

  // 1. 들어온 순서대로 정렬 (FIFO)
  waiting.sort((a, b) => a.joinedAt - b.joinedAt);

  // 2. 가장 오래 대기한 유저가 Leader
  const leader = waiting[0];
  const candidates = waiting.slice(1);

  // 3. 대기 풀 내에서 무작위 선택 (고정 AB, BC 순번 탈피)
  const chosenIndex = Math.floor(Math.random() * candidates.length);
  const opponent = candidates[chosenIndex];

  return { leader, opponent };
}

console.log('--- 매칭 알고리즘 검증 ---');

// 4명 대기자 시뮬레이션 (A, B, C, D)
const players: MockPlayer[] = [
  { id: 'p_a', name: 'A', status: 'WAITING', joinedAt: 1000 },
  { id: 'p_b', name: 'B', status: 'WAITING', joinedAt: 2000 },
  { id: 'p_c', name: 'C', status: 'WAITING', joinedAt: 3000 },
  { id: 'p_d', name: 'D', status: 'WAITING', joinedAt: 4000 },
];

// Leader는 항상 FIFO 1순위인 A
const match1 = selectMatchPairs(players);
assert(match1 !== null);
assert.equal(match1.leader.id, 'p_a');
// 상대는 B, C, D 중 1명
assert(['p_b', 'p_c', 'p_d'].includes(match1.opponent.id));
console.log(`✅ 1차 매칭: ${match1.leader.name} vs ${match1.opponent.name}`);

// 매칭된 둘은 PLAYING 전환
match1.leader.status = 'PLAYING';
match1.opponent.status = 'PLAYING';

// 남은 대기자 확인 (예: C, D)
const remainingWaiting = players.filter((p) => p.status === 'WAITING');
assert.equal(remainingWaiting.length, 2);

// 2차 매칭
const match2 = selectMatchPairs(players);
assert(match2 !== null);
match2.leader.status = 'PLAYING';
match2.opponent.status = 'PLAYING';
console.log(`✅ 2차 매칭: ${match2.leader.name} vs ${match2.opponent.name}`);

// 게임 종료 시 한 명(A)이 퇴장하고 한 명(B)이 대기열로 복귀한 시나리오
match1.opponent.status = 'WAITING';
match1.opponent.joinedAt = 5000; // 새로 진입

const newWaiters = players.filter((p) => p.status === 'WAITING');
assert.equal(newWaiters.length, 1);
assert.equal(selectMatchPairs(players), null); // 혼자 대기 중

// 새 유저 E가 들어왔을 때 즉시 매칭
players.push({ id: 'p_e', name: 'E', status: 'WAITING', joinedAt: 5500 });
const match3 = selectMatchPairs(players);
assert(match3 !== null);
console.log(`✅ 대기열 재진입 후 매칭: ${match3.leader.name} vs ${match3.opponent.name}`);

console.log('✅ 대기열 랜덤 매칭 및 재진입 알고리즘 검증 100% 통과');
