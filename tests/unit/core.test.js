'use strict';
const test = require('node:test');
const assert = require('node:assert');
const HN = require('../../src/app.js');
const DATA = require('../../src/data.js');

const COMPANY = {
  shomei: 'テスト合同会社', mokuteki: 'ソフトウェアの開発', honten: '東京都渋谷区',
  shihonkin: '1000000', daihyoName: '山田太郎', daihyoAddr: '東京都渋谷区1-2-3',
  fiscalEnd: '3月31日', foundedDate: '2026-08-01'
};

// TC-ADD-DAYS: 日付ユーティリティ
test('addDays 基本', () => {
  assert.strictEqual(HN.addDays('2026-08-01', 5), '2026-08-06');
});
test('addDays 月跨ぎ', () => {
  assert.strictEqual(HN.addDays('2026-08-30', 5), '2026-09-04');
});
test('addMonths 基本', () => {
  assert.strictEqual(HN.addMonths('2026-08-01', 2), '2026-10-01');
});
test('addMonths 月末クランプ(12/31 + 2ヶ月 → 2/28)', () => {
  assert.strictEqual(HN.addMonths('2026-12-31', 2), '2027-02-28');
});
test('addMonths うるう年(2027/12/31 + 2ヶ月 → 2028/02/29)', () => {
  assert.strictEqual(HN.addMonths('2027-12-31', 2), '2028-02-29');
});

// TC-FR-REMIND-001
test('computeDeadlines: 年金5日以内・税務署2ヶ月以内が正しい', () => {
  const dls = HN.computeDeadlines('2026-08-01', DATA.FILINGS);
  const pension = dls.find(d => d.id === 'f_pension');
  const tax = dls.find(d => d.id === 'f_tax_setsuritsu');
  assert.strictEqual(pension.dueISO, '2026-08-06');
  assert.strictEqual(tax.dueISO, '2026-10-01');
  // 締切順: 最初は年金(8/6)
  assert.strictEqual(dls[0].id, 'f_pension');
});
test('computeDeadlines: 自治体依存は期限日を出さない', () => {
  const dls = HN.computeDeadlines('2026-08-01', DATA.FILINGS);
  const pref = dls.find(d => d.id === 'f_pref');
  assert.strictEqual(pref.dueISO, null);
});

// TC-NFR-FUNC-001: 全届出に出典
test('NFR-FUNC-001: 全FILINGSに出典URLがある', () => {
  DATA.FILINGS.forEach(f => {
    assert.ok(f.source && /^https?:\/\//.test(f.source.url), '出典欠落: ' + f.id);
  });
});
test('NFR-FUNC-001: 全STEPSに出典がある', () => {
  DATA.STEPS.forEach(s => assert.ok(s.source && s.source.url, '出典欠落: ' + s.id));
});

// TC-FR-INPUT-001
test('validateCompany: 完全入力はok', () => {
  assert.deepStrictEqual(HN.validateCompany(COMPANY), { ok: true, missing: [] });
});
test('validateCompany: 欠落を検出', () => {
  const r = HN.validateCompany({ shomei: 'テスト合同会社' });
  assert.strictEqual(r.ok, false);
  assert.ok(r.missing.includes('資本金'));
  assert.ok(r.missing.includes('設立予定日'));
});

// TC-FR-STEP-001
test('computeProgress: 進捗率', () => {
  assert.strictEqual(HN.computeProgress({}, DATA.STEPS), 0);
  const all = {}; DATA.STEPS.forEach(s => all[s.id] = true);
  assert.strictEqual(HN.computeProgress(all, DATA.STEPS), 100);
  assert.strictEqual(HN.computeProgress({ s1: true }, DATA.STEPS), Math.round(100 / DATA.STEPS.length));
});

// TC-FR-DEC-001
test('recommendCompanyType: コスト重視→合同会社', () => {
  const r = HN.recommendCompanyType({ cost: true, simple: true });
  assert.strictEqual(r.type, 'llc');
});
test('recommendCompanyType: 投資/上場→株式会社', () => {
  const r = HN.recommendCompanyType({ invest: true, ipo: true });
  assert.strictEqual(r.type, 'kk');
});
test('recommendCompanyType: 無回答は既定で合同会社', () => {
  assert.strictEqual(HN.recommendCompanyType({}).type, 'llc');
});

// TC-FR-DOC-001: 入力値の差込
test('generateTeikan: 入力値が反映される', () => {
  const t = HN.generateTeikan(COMPANY);
  assert.ok(t.includes('テスト合同会社'));
  assert.ok(t.includes('ソフトウェアの開発'));
  assert.ok(t.includes('1000000'));
  assert.ok(t.includes('山田太郎'));
  assert.ok(t.includes('ドラフト'));
});
test('generateShinseisho: 商号と登録免許税の記載', () => {
  const t = HN.generateShinseisho(COMPANY);
  assert.ok(t.includes('テスト合同会社'));
  assert.ok(t.includes('登録免許税'));
  assert.ok(t.includes('6万円'));
});
// TC-FR-DOC-TOKIJIKO: 登記すべき事項の網羅
test('generateTokijiko: 法務省の登記事項を網羅', () => {
  const t = HN.generateTokijiko(COMPANY);
  ['商号', '本店', '目的', '資本金の額', '業務執行社員', '代表社員'].forEach(k => {
    assert.ok(t.includes(k), '欠落: ' + k);
  });
});
test('generate*: 未入力はプレースホルダで安全生成', () => {
  const t = HN.generateTeikan({});
  assert.ok(t.includes('【商号】'));
});

// TC-FR-REMIND-002: ICS
test('buildICS: 期限日のあるものだけVEVENT化', () => {
  const dls = HN.computeDeadlines('2026-08-01', DATA.FILINGS);
  const ics = HN.buildICS(dls);
  const vevents = (ics.match(/BEGIN:VEVENT/g) || []).length;
  const dated = dls.filter(d => d.dueISO).length;
  assert.strictEqual(vevents, dated);
  assert.ok(ics.includes('BEGIN:VCALENDAR'));
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20260806'));
});
