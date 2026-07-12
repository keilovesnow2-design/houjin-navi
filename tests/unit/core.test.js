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
const KK = {
  shomei: 'テスト株式会社', mokuteki: 'ソフトウェアの開発', honten: '東京都渋谷区',
  shihonkin: '1000000', hakkoStock: '100', daihyoName: '山田太郎', daihyoAddr: '東京都渋谷区1-2-3',
  fiscalStart: '4月1日', fiscalEnd: '3月31日', foundedDate: '2026-08-01'
};
const SHADAN = {
  meisho: '一般社団法人テスト会', mokuteki: '○○の普及・調査研究', jimusho: '東京都渋谷区',
  daihyoName: '山田太郎', daihyoAddr: '東京都渋谷区1-2-3', shain2Name: '鈴木花子',
  fiscalStart: '4月1日', fiscalEnd: '3月31日', foundedDate: '2026-08-01'
};

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
  ['kojin', 'llc', 'kk', 'shadan'].forEach(fk => DATA.FLOWS[fk].filings.forEach(f => {
    assert.ok(f.source && /^https?:\/\//.test(f.source.url), '出典欠落: ' + fk + '/' + f.id);
  }));
});
test('全ステップ・全診断タイプに出典がある', () => {
  ['kojin', 'llc', 'kk', 'shadan'].forEach(fk => DATA.FLOWS[fk].steps.forEach(s => assert.ok(s.source && s.source.url, '出典欠落step: ' + s.id)));
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

// ---- 「わからない」回避ルート ----
test('全質問に「わからない」選択肢(unsure)が末尾に付く', () => {
  Q.forEach(q => {
    const last = q.options[q.options.length - 1];
    assert.ok(last.unsure === true, q.id + 'にunsureなし');
    assert.ok(last.label.includes('わからない'));
  });
});
test('countUnsure: わからない選択数を数える', () => {
  const lastIdx = id => Q.find(q => q.id === id).options.length - 1; // 質問ごとに末尾index
  const ans = { q1: lastIdx('q1'), q2: lastIdx('q2'), q3: 0 }; // q1,q2 がわからない
  assert.strictEqual(HN.countUnsure(ans, Q), 2);
});

// ---- 満点・相性（100点到達可能） ----
test('typeMax: 各タイプの満点（合同=17・個人=23・一般社団=17）', () => {
  const mx = HN.typeMax(Q, TYPES);
  assert.strictEqual(mx.llc, 17);
  assert.strictEqual(mx.kojin, 23);
  assert.strictEqual(mx.shadan, 17); // 実務系5問へのshadan加点で llc と対称化
});
test('scoreDiagnosis: 非営利志向＋実務は身軽 → 一般社団が個人事業を上回る（是正）', () => {
  // 価値観系(q1/q3/q8/q10)は全て非営利、実務系は一人・自己資金・身軽・低リスク・まず試す
  const ans = { q1: 3, q2: 0, q3: 4, q4: 0, q5: 0, q6: 0, q7: 0, q8: 2, q9: 0, q10: 3 };
  const res = HN.scoreDiagnosis(ans, Q, TYPES);
  assert.strictEqual(res.ranked[0].type, 'shadan');
  const shadan = res.ranked.find(r => r.type === 'shadan').score;
  const kojin = res.ranked.find(r => r.type === 'kojin').score;
  assert.ok(shadan > kojin, '一般社団(' + shadan + ')が個人事業(' + kojin + ')を上回るべき');
});
test('相性は100%に到達できる（合同一直線の回答）', () => {
  const ans = { q1: 1, q2: 0, q3: 0, q4: 1, q5: 1, q6: 0, q7: 1, q8: 0, q9: 1, q10: 1 }; // 各問の合同最大
  const A = HN.analyzeIdeal(ans, Q, TYPES, 'llc');
  assert.strictEqual(A.idealMatch, 100); // 100点が出る
  assert.strictEqual(A.aligned, true);
});
test('idealStrengths: 理想に合っている回答を集める', () => {
  const ans = { q1: 1, q2: 0, q3: 0, q4: 1, q5: 1, q6: 0, q7: 1, q8: 0, q9: 1, q10: 1 };
  const st = HN.idealStrengths(ans, Q, 'llc');
  assert.ok(st.length >= 8); // 合同向きの強みが多数
  assert.ok(st.some(s => s.includes('合同会社')));
});
test('gapHints: 理想と離れた回答に「こうなると近づく」ヒントを出す', () => {
  const ans = { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, q8: 0, q9: 0, q10: 0 }; // 個人事業寄り
  const hints = HN.gapHints(ans, Q, 'llc', 3);
  assert.strictEqual(hints.length, 3);          // 上位3件
  hints.forEach(h => { assert.ok(h.q && h.target); });
  // 差が大きい順（最初のギャップが最大）
  assert.ok(hints[0].gap >= hints[1].gap);
});
test('gapHints: 完全に理想一致ならヒントは空', () => {
  const ans = { q1: 1, q2: 0, q3: 0, q4: 1, q5: 1, q6: 0, q7: 1, q8: 0, q9: 1, q10: 1 }; // 合同満点
  assert.strictEqual(HN.gapHints(ans, Q, 'llc', 3).length, 0);
});

// ---- 理想フィット分析 ----
test('analyzeIdeal: 理想=株式 だが超堅実回答→alignedでなく個人事業を提案（希望を残す）', () => {
  const ideal = 'kk';
  const ans = { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, q8: 0, q9: 0, q10: 0 };
  const A = HN.analyzeIdeal(ans, Q, TYPES, ideal);
  assert.strictEqual(A.aligned, false);
  assert.strictEqual(A.alt, 'kojin');       // 現実的な代替案
  assert.ok(A.altMatch >= 80);              // 代替は高相性＝希望が持てる数字
  assert.ok(typeof A.idealMatch === 'number');
});
test('IDEAL_REQUIREMENTS: 全タイプに項目があり、数値項目に出典', () => {
  TYPES.forEach(t => {
    const reqs = DATA.IDEAL_REQUIREMENTS[t];
    assert.ok(Array.isArray(reqs) && reqs.length > 0, t + 'の必要事項なし');
    reqs.forEach(r => { if (/\d/.test(r.text) && r.source) assert.ok(/^https?:\/\//.test(r.source.url)); });
  });
  // 法人の維持コスト（均等割）に出典が付いているか
  const llcReq = DATA.IDEAL_REQUIREMENTS.llc.find(r => r.text.includes('均等割'));
  assert.ok(llcReq && llcReq.source, '均等割に出典なし');
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

// ---- 株式会社 届出期限・検証・書類 ----
test('computeDeadlines(株式): 年金5日・法人設立届2ヶ月', () => {
  const dls = HN.computeDeadlines('2026-08-01', DATA.FLOWS.kk.filings);
  assert.strictEqual(dls.find(d => d.id === 'kkf_pension').dueISO, '2026-08-06');
  assert.strictEqual(dls.find(d => d.id === 'kkf_tax_setsuritsu').dueISO, '2026-10-01');
  assert.strictEqual(dls[0].id, 'kkf_pension'); // 締切最短が先頭
  assert.strictEqual(dls.find(d => d.id === 'kkf_pref').dueISO, null); // 自治体依存
});
test('validateCompany(株式): 発行株式数を含む必須／欠落検出', () => {
  const req = HN.requiredOf(DATA.FLOWS.kk.inputFields);
  assert.strictEqual(HN.validateCompany(KK, req).ok, true);
  const r = HN.validateCompany({ shomei: 'X' }, req);
  assert.strictEqual(r.ok, false);
  assert.ok(r.missing.includes('設立時発行株式数'));
});
test('株式会社はフル対応（buildStatus=full／overviewなし）', () => {
  assert.strictEqual(DATA.DIAGNOSIS.types.kk.buildStatus, 'full');
  assert.ok(!DATA.FLOWS.kk.overview, 'kkにoverviewが残存');
  assert.ok(DATA.FLOWS.kk.documents.length >= 5);
});
test('generateTeikanKK(株式): 公証人認証・株式・入力反映', () => {
  const t = HN.generateTeikanKK(KK);
  ['テスト株式会社', 'ソフトウェアの開発', '公証人の認証', '発行可能株式総数', '譲渡', 'ドラフト'].forEach(k => assert.ok(t.includes(k), '欠落: ' + k));
});
test('generateShinseishoKK(株式): 登録免許税 最低15万円の注記', () => {
  const t = HN.generateShinseishoKK(KK);
  assert.ok(t.includes('最低15万円'));
  assert.ok(t.includes('発起設立'));
  assert.ok(t.includes('印鑑届書'));
});
test('generateTokijikoKK(株式): 株式・資本金・役員を網羅', () => {
  const t = HN.generateTokijikoKK(KK);
  ['発行可能株式総数', '発行済株式の総数', '資本金の額', '取締役', '代表取締役', '譲渡'].forEach(k => assert.ok(t.includes(k), '欠落: ' + k));
});
test('generateChosaKK/HokkininKK/HaraikomiKK/ShodakushoKK(株式): 要点＋ドラフト注記', () => {
  assert.ok(HN.generateChosaKK(KK).includes('調査報告書'));
  assert.ok(HN.generateChosaKK(KK).includes('払込み'));
  assert.ok(HN.generateHokkininKK(KK).includes('設立時代表取締役'));
  assert.ok(HN.generateHaraikomiKK(KK).includes('設立時発行株式数'));
  assert.ok(HN.generateShodakushoKK(KK).includes('就任を承諾'));
  [HN.generateChosaKK, HN.generateHokkininKK, HN.generateHaraikomiKK, HN.generateShodakushoKK].forEach(fn => assert.ok(fn(KK).includes('ドラフト')));
});

// ---- 一般社団法人 届出期限・検証・書類 ----
test('computeDeadlines(一般社団): 年金5日・法人設立届2ヶ月', () => {
  const dls = HN.computeDeadlines('2026-08-01', DATA.FLOWS.shadan.filings);
  assert.strictEqual(dls.find(d => d.id === 'shf_pension').dueISO, '2026-08-06');
  assert.strictEqual(dls.find(d => d.id === 'shf_tax_setsuritsu').dueISO, '2026-10-01');
  assert.strictEqual(dls[0].id, 'shf_pension'); // 締切最短が先頭
  assert.strictEqual(dls.find(d => d.id === 'shf_pref').dueISO, null); // 自治体依存
});
test('validateCompany(一般社団): 社員2人目を含む必須／欠落検出', () => {
  const req = HN.requiredOf(DATA.FLOWS.shadan.inputFields);
  assert.strictEqual(HN.validateCompany(SHADAN, req).ok, true);
  const r = HN.validateCompany({ meisho: 'X' }, req);
  assert.strictEqual(r.ok, false);
  assert.ok(r.missing.includes('もう一人の設立時社員 氏名（社員は2名以上必要）'));
});
test('一般社団法人はフル対応（buildStatus=full／overviewなし）', () => {
  assert.strictEqual(DATA.DIAGNOSIS.types.shadan.buildStatus, 'full');
  assert.ok(!DATA.FLOWS.shadan.overview, 'shadanにoverviewが残存');
  assert.ok(DATA.FLOWS.shadan.documents.length >= 5);
});
test('generateTeikanShadan(一般社団): 公証人認証・社員2名・入力反映', () => {
  const t = HN.generateTeikanShadan(SHADAN);
  ['一般社団法人テスト会', '○○の普及・調査研究', '公証人の認証', '鈴木花子', '設立時社員', 'ドラフト'].forEach(k => assert.ok(t.includes(k), '欠落: ' + k));
});
test('generateShinseishoShadan(一般社団): 登録免許税6万円の定額表記', () => {
  const t = HN.generateShinseishoShadan(SHADAN);
  assert.ok(t.includes('60,000'));
  assert.ok(t.includes('定額6万円'));
  assert.ok(t.includes('設立時社員の決議書'));
});
test('generateTokijikoShadan(一般社団): 名称・目的・理事・代表理事を網羅', () => {
  const t = HN.generateTokijikoShadan(SHADAN);
  ['名称', '主たる事務所', '目的等', '理事', '代表理事', '公告方法'].forEach(k => assert.ok(t.includes(k), '欠落: ' + k));
});
test('generateKetsugishoShadan/GosenShadan/ShodakushoShadan(一般社団): 要点＋ドラフト注記', () => {
  assert.ok(HN.generateKetsugishoShadan(SHADAN).includes('設立時理事'));
  assert.ok(HN.generateGosenShadan(SHADAN).includes('設立時代表理事'));
  assert.ok(HN.generateShodakushoShadan(SHADAN).includes('就任を承諾'));
  [HN.generateKetsugishoShadan, HN.generateGosenShadan, HN.generateShodakushoShadan].forEach(fn => assert.ok(fn(SHADAN).includes('ドラフト')));
});

// ---- ICS ----
test('buildICS: 期限日のあるものだけVEVENT', () => {
  const dls = HN.computeDeadlines('2026-08-01', DATA.FLOWS.llc.filings);
  const ics = HN.buildICS(dls);
  assert.strictEqual((ics.match(/BEGIN:VEVENT/g) || []).length, dls.filter(d => d.dueISO).length);
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20260806'));
});
