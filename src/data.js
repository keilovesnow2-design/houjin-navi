/* data.js — コンテンツ層（制度データ）
 * 制度改正時はこのファイルだけを更新し、META.lastVerified と source を差し替える。
 * 掲載する数値・期限は research/ でA(官公庁)/B(専門家)二源以上一致のもののみ。
 */
(function (global) {
  'use strict';

  var SOURCES = {
    MOJ_LLC: {
      label: '法務省：合同会社の設立手続について',
      url: 'https://www.moj.go.jp/MINJI/minji06_00141.html'
    },
    MOJ_HOUMUKYOKU: {
      label: '法務局：商業・法人登記の申請様式（印鑑届書等）',
      url: 'https://houmukyoku.moj.go.jp/homu/COMMERCE_11-1.html'
    },
    NTA: {
      label: '国税庁：法人設立届出書・青色申告の承認申請',
      url: 'https://www.nta.go.jp/taxes/tetsuzuki/shinsei/annai/hojin/annai/1554_11.htm'
    },
    NENKIN: {
      label: '日本年金機構：新規適用の手続き',
      url: 'https://www.nenkin.go.jp/service/kounen/tekiyo/jigyosho/20141203.html'
    },
    EGOV: {
      label: 'e-Gov / 登記・供託オンライン申請システム',
      url: 'https://www.touki-kyoutaku-online.moj.go.jp/'
    },
    TOKYO_TAX: {
      label: '東京都主税局：法人設立・設置届出',
      url: 'https://www.tax.metro.tokyo.lg.jp/'
    }
  };

  var META = {
    appName: '合同会社設立ナビ',
    version: '1.0',
    lastVerified: '2026-07-11',
    scopeNote: '対象は「合同会社・金銭出資・社員1名」の標準的なケースです。株式会社／現物出資／法人が社員／許認可が必要な業種は対象外です。',
    disclaimer: '本ツールは情報提供を目的とした支援ツールであり、法的助言・登記代理・税務代理ではありません。制度・税率・様式は改正されることがあります。実際の提出前に必ず公式情報および司法書士・税理士等の専門家でご確認ください。'
  };

  // 会社形態の意思決定サポート用
  var COMPANY_TYPES = {
    llc: {
      name: '合同会社（LLC）',
      pros: ['設立費用が安い（法定実費 約6万円〜）', '定款の公証人認証が不要', '手続きがシンプル', '決算公告の義務なし'],
      cons: ['株式会社より社会的知名度・信用度が低い場合がある', '株式発行による資金調達ができない'],
      source: SOURCES.MOJ_LLC
    },
    kk: {
      name: '株式会社',
      pros: ['社会的信用が高い', '株式発行で資金調達しやすい', '上場を目指せる'],
      cons: ['設立費用が高い（約20〜25万円）', '定款の公証人認証が必要', '決算公告の義務がある'],
      source: SOURCES.MOJ_LLC
    }
  };

  // 形態診断の質問（重み付け）
  var DECISION_QUESTIONS = [
    { id: 'cost', text: '設立費用はできるだけ抑えたい', llc: 2, kk: 0 },
    { id: 'credit', text: '取引先や採用で「株式会社」の信用が重要', llc: 0, kk: 2 },
    { id: 'invest', text: '将来ベンチャー投資・株式での資金調達を予定', llc: 0, kk: 3 },
    { id: 'simple', text: '手続きをできるだけシンプルにしたい', llc: 2, kk: 0 },
    { id: 'ipo', text: '将来の上場（IPO）を視野に入れている', llc: 0, kk: 3 }
  ];

  // 設立ステップ（合同会社・6ステップ＋設立後）
  var STEPS = [
    { id: 's1', phase: '設立', title: '1. 基本事項を決める',
      desc: '商号・事業目的・本店所在地・資本金・代表社員・事業年度を決めます。商号には「合同会社」を含めます。',
      source: SOURCES.MOJ_LLC },
    { id: 's2', phase: '設立', title: '2. 法人の実印を作る',
      desc: '会社の代表者印（実印）を作成します。実費の目安は1万〜1.5万円。', source: SOURCES.MOJ_LLC },
    { id: 's3', phase: '設立', title: '3. 定款を作成する',
      desc: '会社の基本規則を作成します。合同会社は公証人の認証は不要です。電子定款なら収入印紙4万円が不要（紙の定款は4万円必要）。',
      source: SOURCES.MOJ_LLC },
    { id: 's4', phase: '設立', title: '4. 出資金を払い込む',
      desc: '代表社員の個人口座へ資本金を払い込み、通帳のコピーで証明します。', source: SOURCES.MOJ_LLC },
    { id: 's5', phase: '設立', title: '5. 登記書類を作成・製本する',
      desc: '設立登記申請書・定款・払込証明書・印鑑届書・代表社員の印鑑証明書（3か月以内）等を揃えます。',
      source: SOURCES.MOJ_LLC },
    { id: 's6', phase: '設立', title: '6. 法務局へ登記申請する',
      desc: '書面（持参・郵送）またはオンラインで申請します。登録免許税は資本金×0.7%、最低6万円。この申請日が原則「設立日」になります。',
      source: SOURCES.MOJ_LLC },
    { id: 's7', phase: '設立後', title: '7. 設立後の届出をする',
      desc: '税務署・都道府県・年金事務所などへ期限内に届け出ます。右の「届出・期限」タブで期限を確認してください。',
      source: SOURCES.NTA }
  ];

  // 生成対象の書類ID（体裁はapp.jsのgenerate*が担当）
  var DOCUMENTS = [
    { id: 'teikan', title: '定款（ドラフト）', fn: 'generateTeikan' },
    { id: 'shodakusho', title: '代表社員 就任承諾書（ドラフト）', fn: 'generateShodakusho' },
    { id: 'haraikomi', title: '払込証明書（ドラフト）', fn: 'generateHaraikomi' },
    { id: 'shinseisho', title: '合同会社設立登記申請書（ドラフト）', fn: 'generateShinseisho' },
    { id: 'tokijiko', title: '登記すべき事項（テキスト）', fn: 'generateTokijiko' }
  ];

  // 届出（期限ルール付き）。offsetDays / offsetMonths があるものだけ日付計算する。
  // depends: 'municipal'（自治体依存） / 'employee'（従業員雇用時のみ）は日付を出さず注記表示。
  var FILINGS = [
    { id: 'f_pension', office: '年金事務所', name: '健康保険・厚生年金保険 新規適用届',
      offsetDays: 5, required: '必須', source: SOURCES.NENKIN,
      note: '社会保険は法人に加入義務。設立から5日以内。' },
    { id: 'f_tax_setsuritsu', office: '税務署', name: '法人設立届出書',
      offsetMonths: 2, required: '必須', source: SOURCES.NTA,
      note: '設立日から2ヶ月以内。' },
    { id: 'f_tax_aoiro', office: '税務署', name: '青色申告の承認申請書',
      offsetMonths: 3, required: '推奨（節税）', source: SOURCES.NTA,
      note: '設立から3ヶ月 または 事業年度末の早い方の前日まで。実質的にほぼ必須。' },
    { id: 'f_tax_kyuyo', office: '税務署', name: '給与支払事務所等の開設届出書',
      offsetMonths: 1, required: '給与を支払う場合は必須', source: SOURCES.NTA,
      note: '給与支払事務所の開設から1ヶ月以内。役員報酬を出す場合も対象。' },
    { id: 'f_pref', office: '都道府県税事務所', name: '法人設立届出書（都道府県）',
      depends: 'municipal', required: '必須', source: SOURCES.TOKYO_TAX,
      note: '期限は自治体により異なる（例：東京都は事業開始日から15日以内）。お住まいの自治体で要確認。' },
    { id: 'f_city', office: '市区町村役場', name: '法人設立届出書（市区町村）',
      depends: 'municipal', required: '必須（東京23区は不要）', source: SOURCES.TOKYO_TAX,
      note: '東京23区は区役所への提出不要（都税事務所に一本化）。その他は自治体で要確認。' },
    { id: 'f_rousai', office: '労働基準監督署', name: '労働保険 保険関係成立届',
      depends: 'employee', required: '従業員を雇う場合', source: SOURCES.EGOV,
      note: '従業員を雇用した日の翌日から10日以内。' },
    { id: 'f_hello', office: 'ハローワーク', name: '雇用保険 適用事業所設置届',
      depends: 'employee', required: '従業員を雇う場合', source: SOURCES.EGOV,
      note: '設置日の翌日から10日以内。' }
  ];

  var DATA = {
    SOURCES: SOURCES, META: META, COMPANY_TYPES: COMPANY_TYPES,
    DECISION_QUESTIONS: DECISION_QUESTIONS, STEPS: STEPS,
    DOCUMENTS: DOCUMENTS, FILINGS: FILINGS
  };

  global.HN_DATA = DATA;
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
