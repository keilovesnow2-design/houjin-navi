'use strict';
const test = require('node:test');
const assert = require('node:assert');
const HN = require('../../src/app.js');
const DATA = require('../../src/data.js');

const Q = DATA.DIAGNOSIS.questions;
const TYPES = DATA.TYPE_KEYS;

const LLC = {
  shomei: 'テスト合同会社', mokuteki: 'ソフトウェアの開発', honten: '東京都渋谷区',
  shihonkin: '1000000', daihyoName: '山田太郎', daihyoAddr: '東京都渋谷区1-2-3',
  fiscalStart: '4月1日', fiscalEnd: '3月31日', foundedDate: '2026-08-01'
};
const KOJIN = { jigyo: 'Web制作', name: '山田太郎', address: '東京都渋谷区1-2-3', kaigyoDate: '2026-08-01' };

// ---- 日付ユーティリティ ----
test('addDays 基本/月跨ぎ', () => {
  assert.strictEqual(HN.addDays('2026-08-01', 5), '2026-08-06');
  assert.strictEqual(HN.addDays('2026-08-30', 5), '2026-09-04');
});
test('addMonths 基本/月末クランプ/うるう年', () => {
  assert.strictEqual(HN.addMonths('2026-08-01', 2), '2026-10-01');
  assert.strictEqual(HN.addMonths('2026-12-31', 2), '2027-02-28');
  assert.strictEqual(HN.addMonths('2027-12-31', 2), '2028-02-29');
});

// ---- 合同会社 届出期限 ----
test('computeDeadlines(合同): 年金5日・法人設立届2ヶ月', () => {
  const dls = HN.computeDeadlines('2026-08-01', DATA.FLOWS.llc.filings);
  assert.strictEqual(dls.find(d => d.id === 'f_pension').dueISO, '2026-08-06');
  assert.strictEqual(dls.find(d => d.id === 'f_tax_setsuritsu').dueISO, '2026-10-01');
  assert.strictEqual(dls[0].id, 'f_pension'); // 締切最短が先頭
  assert.strictEqual(dls.find(d => d.id === 'f_pref').dueISO, null); // 自治体依存
});

// ---- 個人事業 届出期限 ----
test('computeDeadlines(個人): 開業届1ヶ月・青色2ヶ月(目安)', () => {
  const dls = HN.computeDeadlines('2026-08-01', DATA.FLOWS.kojin.filings);
  assert.strictEqual(dls.find(d => d.id === 'kf_kaigyo').dueISO, '2026-09-01');
  assert.strictEqual(dls.find(d => d.id === 'kf_aoiro').dueISO, '2026-10-01');
});

// ---- 出典必須（正確性） ----
test('全フローの届出に出典URLがある', () => {
  ['kojin', 'llc'].forEach(fk => DATA.FLOWS[fk].filings.forEach(f => {
    assert.ok(f.source && /^https?:\/\//.test(f.source.url), '出典欠落: ' + fk + '/' + f.id);
  }));
});
test('全ステップ・全診断タイプに出典がある', () => {
  ['kojin', 'llc'].forEach(fk => DATA.FLOWS[fk].steps.forEach(s => assert.ok(s.source && s.source.url, '出典欠落step: ' + s.id)));
  TYPES.forEach(t => assert.ok(DATA.DIAGNOSIS.types[t].source && DATA.DIAGNOSIS.types[t].source.url, '出典欠落type: ' + t));
});
test('数値ヒントのある質問に出典がある', () => {
  Q.forEach(q => { if (q.hint && /\d/.test(q.hint) && q.hintSource) assert.ok(/^https?:\/\//.test(q.hintSource.url)); });
  // 均等割・社保の質問に出典必須
  assert.ok(Q.find(q => q.id === 'q2').hintSource, 'q2(社保)に出典なし');
  assert.ok(Q.find(q => q.id === 'q6').hintSource, 'q6(均等割)に出典なし');
});

// ---- 入力検証（フロー別） ----
test('validateCompany(合同): 完全/欠落', () => {
  const req = HN.requiredOf(DATA.FLOWS.llc.inputFields);
  assert.strictEqual(HN.validateCompany(LLC, req).ok, true);
  const r = HN.validateCompany({ shomei: 'X' }, req);
  assert.strictEqual(r.ok, false);
  assert.ok(r.missing.includes('資本金（円）'));
});
test('validateCompany(個人): 屋号は任意、他は必須', () => {
  const req = HN.requiredOf(DATA.FLOWS.kojin.inputFields);
  assert.strictEqual(HN.validateCompany(KOJIN, req).ok, true); // 屋号なしでもOK
  const r = HN.validateCompany({ name: '山田太郎' }, req);
  assert.ok(r.missing.includes('事業の内容'));
  assert.ok(!r.missing.includes('屋号（任意）'));
});

// ---- 進捗 ----
test('computeProgress', () => {
  const steps = DATA.FLOWS.kojin.steps;
  assert.strictEqual(HN.computeProgress({}, steps), 0);
  const all = {}; steps.forEach(s => all[s.id] = true);
  assert.strictEqual(HN.computeProgress(all, steps), 100);
});

// ---- 診断スコアリング ----
test('scoreDiagnosis: コスト・小規模志向→個人事業が上位', () => {
  // q1 副業(0), q6 身軽(0), q7 リスク小(0), q10 屋号で十分(0)
  const ans = { q1: 0, q2: 0, q5: 0, q6: 0, q7: 0, q8: 0, q9: 0, q10: 0, q3: 0, q4: 0 };
  const res = HN.scoreDiagnosis(ans, Q, TYPES);
  assert.strictEqual(res.ranked[0].type, 'kojin');
  assert.strictEqual(res.answered, 10);
});
test('scoreDiagnosis: 信用・出資・上場志向→株式会社が上位', () => {
  const ans = { q1: 1, q2: 2, q3: 2, q4: 2, q5: 2, q6: 1, q7: 1, q8: 1, q9: 2, q10: 2 };
  const res = HN.scoreDiagnosis(ans, Q, TYPES);
  assert.strictEqual(res.ranked[0].type, 'kk');
});
test('scoreDiagnosis: 非営利志向→一般社団が上位', () => {
  const ans = { q1: 3, q3: 4, q8: 2, q10: 3 };
  const res = HN.scoreDiagnosis(ans, Q, TYPES);
  assert.strictEqual(res.ranked[0].type, 'shadan');
});
test('scoreDiagnosis: 適合度%は合計100前後、未回答は0点', () => {
  const res = HN.scoreDiagnosis({}, Q, TYPES);
  assert.strictEqual(res.total, 0);
  assert.strictEqual(res.ranked[0].pct, 0);
});
test('collectDiagnosisInsights: 選んだ選択肢のinsightを集める', () => {
  const ins = HN.collectDiagnosisInsights({ q6: 0, q7: 1 }, Q); // 両方insightあり
  assert.ok(ins.length >= 2);
  assert.ok(ins.some(s => s.includes('法人成り')));
});

// ---- 書類生成 ----
test('generateTeikan(合同): 入力反映＋ドラフト注記', () => {
  const t = HN.generateTeikan(LLC);
  ['テスト合同会社', 'ソフトウェアの開発', '1000000', '山田太郎', 'ドラフト'].forEach(k => assert.ok(t.includes(k), '欠落: ' + k));
});
test('generateTokijiko(合同): 登記事項を網羅', () => {
  const t = HN.generateTokijiko(LLC);
  ['商号', '本店', '目的', '資本金の額', '業務執行社員', '代表社員'].forEach(k => assert.ok(t.includes(k)));
});
test('generateKaigyoGuide(個人): 開業届の要点＋入力反映', () => {
  const t = HN.generateKaigyoGuide(KOJIN);
  assert.ok(t.includes('開業日から1ヶ月以内'));
  assert.ok(t.includes('Web制作'));
  assert.ok(t.includes('山田太郎'));
  assert.ok(t.includes('（任意・空欄可）')); // 屋号未入力
});
test('generateAoiroGuide(個人): 期限の記載', () => {
  assert.ok(HN.generateAoiroGuide(KOJIN).includes('3月15日'));
});

// ---- ICS ----
test('buildICS: 期限日のあるものだけVEVENT', () => {
  const dls = HN.computeDeadlines('2026-08-01', DATA.FLOWS.llc.filings);
  const ics = HN.buildICS(dls);
  assert.strictEqual((ics.match(/BEGIN:VEVENT/g) || []).length, dls.filter(d => d.dueISO).length);
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20260806'));
});
