/* app.js — ロジック層（純粋関数）＋UI
 * 純粋関数は window.HN と module.exports に公開し、Nodeからテスト可能にする（ADR-003）。
 * 外部送信は一切行わない（CONSTRAINTS C-01）。
 */
(function (global) {
  'use strict';

  var DATA = global.HN_DATA || (typeof require !== 'undefined' ? require('./data.js') : {});

  // ---------- 日付ユーティリティ（純粋） ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function addDays(iso, n) {
    var p = iso.split('-');
    var dt = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    dt.setUTCDate(dt.getUTCDate() + n);
    return dt.getUTCFullYear() + '-' + pad(dt.getUTCMonth() + 1) + '-' + pad(dt.getUTCDate());
  }

  // n ヶ月後。存在しない日は月末に丸める（例: 12/31 + 2ヶ月 → 2/28）。
  function addMonths(iso, n) {
    var p = iso.split('-');
    var y = +p[0], m = +p[1], d = +p[2];
    var total = y * 12 + (m - 1) + n;
    var ny = Math.floor(total / 12);
    var nm = total - ny * 12; // 0-based month
    var lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
    var nd = Math.min(d, lastDay);
    return ny + '-' + pad(nm + 1) + '-' + pad(nd);
  }

  // ---------- 届出期限（純粋） ----------
  function computeDeadlines(foundedISO, filings) {
    filings = filings || DATA.FILINGS;
    var out = filings.map(function (f) {
      var dueISO = null;
      if (foundedISO && typeof f.offsetDays === 'number') dueISO = addDays(foundedISO, f.offsetDays);
      else if (foundedISO && typeof f.offsetMonths === 'number') dueISO = addMonths(foundedISO, f.offsetMonths);
      return {
        id: f.id, office: f.office, name: f.name, dueISO: dueISO,
        required: f.required, note: f.note, source: f.source, depends: f.depends || null
      };
    });
    // 期限日がある順→自治体/従業員依存は後ろ
    out.sort(function (a, b) {
      if (a.dueISO && b.dueISO) return a.dueISO < b.dueISO ? -1 : (a.dueISO > b.dueISO ? 1 : 0);
      if (a.dueISO) return -1;
      if (b.dueISO) return 1;
      return 0;
    });
    return out;
  }

  // ---------- 入力検証（純粋） ----------
  var REQUIRED_FIELDS = [
    ['shomei', '商号'], ['mokuteki', '事業目的'], ['honten', '本店所在地'],
    ['shihonkin', '資本金'], ['daihyoName', '代表社員氏名'],
    ['daihyoAddr', '代表社員住所'], ['foundedDate', '設立予定日']
  ];
  function validateCompany(company) {
    company = company || {};
    var missing = [];
    REQUIRED_FIELDS.forEach(function (f) {
      var v = company[f[0]];
      if (v === undefined || v === null || String(v).trim() === '') missing.push(f[1]);
    });
    return { ok: missing.length === 0, missing: missing };
  }

  // ---------- 進捗（純粋） ----------
  function computeProgress(checks, steps) {
    steps = steps || DATA.STEPS;
    checks = checks || {};
    var total = steps.length;
    if (total === 0) return 0;
    var done = 0;
    steps.forEach(function (s) { if (checks[s.id]) done++; });
    return Math.round((done / total) * 100);
  }

  // ---------- 形態診断（純粋） ----------
  function recommendCompanyType(answers) {
    answers = answers || {};
    var qs = DATA.DECISION_QUESTIONS;
    var llc = 0, kk = 0, reasons = [];
    qs.forEach(function (q) {
      if (answers[q.id]) {
        llc += q.llc; kk += q.kk;
        reasons.push(q.text);
      }
    });
    var type = kk > llc ? 'kk' : 'llc'; // 同点は合同会社（本ツールの主対象）
    return { type: type, llc: llc, kk: kk, reasons: reasons };
  }

  // ---------- 書類生成（純粋） ----------
  var DRAFT_NOTE =
    '※ これはドラフト（下書き）です。文言・記載事項は必ず法務局の公式様式・専門家でご確認のうえ提出してください。';

  function g(company, key, ph) {
    var v = company && company[key];
    return (v === undefined || v === null || String(v).trim() === '') ? ('【' + ph + '】') : String(v);
  }

  function generateTeikan(c) {
    c = c || {};
    var year = '____', y2 = '__', d2 = '__';
    return [
      g(c, 'shomei', '商号') + '　定款',
      '',
      '第1章　総則',
      '（商号）',
      '第1条　当会社は、' + g(c, 'shomei', '商号') + 'と称する。',
      '（目的）',
      '第2条　当会社は、次の事業を営むことを目的とする。',
      '　　' + g(c, 'mokuteki', '事業目的（例：ソフトウェアの企画開発・販売）'),
      '　　前各号に附帯関連する一切の事業',
      '（本店の所在地）',
      '第3条　当会社は、本店を' + g(c, 'honten', '本店所在地（最小行政区画まで）') + 'に置く。',
      '（公告方法）',
      '第4条　当会社の公告は、官報に掲載する方法により行う。',
      '',
      '第2章　社員及び出資',
      '（社員の氏名、住所、出資及び責任）',
      '第5条　社員の氏名、住所、出資の目的及びその価額並びに責任は次のとおりである。',
      '　　金 ' + g(c, 'shihonkin', '資本金額') + ' 円　　有限責任社員　' +
        g(c, 'daihyoName', '代表社員氏名') + '（住所：' + g(c, 'daihyoAddr', '代表社員住所') + '）',
      '（社員全員の有限責任）',
      '第6条　当会社の社員は、全て有限責任社員とする。',
      '',
      '第3章　業務の執行及び会社の代表',
      '（業務執行社員）',
      '第7条　当会社の業務執行社員は、' + g(c, 'daihyoName', '代表社員氏名') + 'とする。',
      '（代表社員）',
      '第8条　当会社の代表社員は、' + g(c, 'daihyoName', '代表社員氏名') + 'とする。',
      '',
      '第4章　計算',
      '（事業年度）',
      '第9条　当会社の事業年度は、毎年 ' + g(c, 'fiscalStart', '4月1日') + ' から ' +
        g(c, 'fiscalEnd', '3月31日') + ' までとする。',
      '',
      '第5章　附則',
      '（最初の事業年度）',
      '第10条　当会社の最初の事業年度は、当会社成立の日から ' + g(c, 'fiscalEnd', '3月31日') + ' までとする。',
      '（定款に定めのない事項）',
      '第11条　この定款に定めのない事項は、すべて会社法その他の法令の定めるところによる。',
      '',
      '　以上、' + g(c, 'shomei', '商号') + 'を設立するため、社員が定款を作成し、記名押印する。',
      '',
      '　　令和__年__月__日',
      '　　　　有限責任社員　' + g(c, 'daihyoName', '代表社員氏名') + '　　印',
      '',
      DRAFT_NOTE
    ].join('\n');
  }

  function generateShodakusho(c) {
    c = c || {};
    return [
      '就任承諾書',
      '',
      '　私は、' + g(c, 'shomei', '商号') + 'の代表社員に就任することを承諾します。',
      '',
      '　　令和__年__月__日',
      '',
      '　　住所：' + g(c, 'daihyoAddr', '代表社員住所'),
      '　　氏名：' + g(c, 'daihyoName', '代表社員氏名') + '　　印',
      '',
      DRAFT_NOTE
    ].join('\n');
  }

  function generateHaraikomi(c) {
    c = c || {};
    return [
      '払込証明書',
      '',
      '　当会社の資本金については、以下のとおり、全額の払込みがあったことを証明します。',
      '',
      '　　払込みを受けた金額の総額　金 ' + g(c, 'shihonkin', '資本金額') + ' 円',
      '',
      '　　令和__年__月__日',
      '',
      '　　' + g(c, 'shomei', '商号'),
      '　　代表社員　' + g(c, 'daihyoName', '代表社員氏名') + '　　印',
      '',
      '（注）本証明書に、代表社員個人口座の通帳の表紙・見開き・払込みが記帳されたページのコピーを合綴します。',
      '',
      DRAFT_NOTE
    ].join('\n');
  }

  function generateShinseisho(c) {
    c = c || {};
    return [
      '合同会社設立登記申請書',
      '',
      '１．商　　号　　' + g(c, 'shomei', '商号'),
      '１．本　　店　　' + g(c, 'honten', '本店所在地'),
      '１．登記の事由　　設立の手続終了',
      '１．登記すべき事項　　別紙のとおり（「登記すべき事項」を参照）',
      '１．課税標準金額　　金 ' + g(c, 'shihonkin', '資本金額') + ' 円',
      '１．登録免許税　　金 ______ 円（資本金の額×0.7％、最低6万円）',
      '１．添付書類',
      '　　　定款　　　　　　　　　　　　１通',
      '　　　代表社員の就任承諾書　　　　１通',
      '　　　払込みがあったことを証する書面　１通',
      '　　　印鑑証明書（代表社員個人・3か月以内）　１通',
      '　　　印鑑届書　　　　　　　　　　１通',
      '',
      '　上記のとおり登記の申請をします。',
      '　　令和__年__月__日',
      '',
      '　　申請人　　' + g(c, 'shomei', '商号'),
      '　　代表社員　' + g(c, 'daihyoName', '代表社員氏名') + '　　印',
      '',
      '　　' + '○○法務局　御中',
      '',
      DRAFT_NOTE
    ].join('\n');
  }

  // 登記すべき事項（オンライン申請/別紙用）— 法務省の登記事項に対応
  function generateTokijiko(c) {
    c = c || {};
    return [
      '「登記すべき事項」',
      '',
      '商号　' + g(c, 'shomei', '商号'),
      '本店　' + g(c, 'honten', '本店所在地'),
      '公告をする方法　官報に掲載してする',
      '目的',
      '　' + g(c, 'mokuteki', '事業目的'),
      '　前号に附帯関連する一切の事業',
      '資本金の額　金 ' + g(c, 'shihonkin', '資本金額') + ' 円',
      '社員に関する事項',
      '　「資格」業務執行社員',
      '　「氏名」' + g(c, 'daihyoName', '代表社員氏名'),
      '社員に関する事項',
      '　「資格」代表社員',
      '　「住所」' + g(c, 'daihyoAddr', '代表社員住所'),
      '　「氏名」' + g(c, 'daihyoName', '代表社員氏名'),
      '登記記録に関する事項　設立',
      '',
      DRAFT_NOTE
    ].join('\n');
  }

  var GENERATORS = {
    generateTeikan: generateTeikan, generateShodakusho: generateShodakusho,
    generateHaraikomi: generateHaraikomi, generateShinseisho: generateShinseisho,
    generateTokijiko: generateTokijiko
  };

  // ---------- ICS生成（純粋） ----------
  function icsDate(iso) { return iso.replace(/-/g, ''); }
  function buildICS(deadlines) {
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//houjin-navi//JP', 'CALSCALE:GREGORIAN'];
    (deadlines || []).forEach(function (d, i) {
      if (!d.dueISO) return; // 期限日が確定しないものは除外
      lines.push('BEGIN:VEVENT');
      lines.push('UID:houjin-navi-' + d.id + '-' + i + '@local');
      lines.push('DTSTART;VALUE=DATE:' + icsDate(d.dueISO));
      lines.push('SUMMARY:【提出期限】' + d.office + ' ' + d.name);
      lines.push('DESCRIPTION:' + (d.note || '') + ' / 出典: ' + (d.source ? d.source.url : ''));
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  // ---------- 純粋関数を公開 ----------
  var HN = {
    addDays: addDays, addMonths: addMonths, computeDeadlines: computeDeadlines,
    validateCompany: validateCompany, computeProgress: computeProgress,
    recommendCompanyType: recommendCompanyType, buildICS: buildICS,
    generateTeikan: generateTeikan, generateShodakusho: generateShodakusho,
    generateHaraikomi: generateHaraikomi, generateShinseisho: generateShinseisho,
    generateTokijiko: generateTokijiko, GENERATORS: GENERATORS,
    REQUIRED_FIELDS: REQUIRED_FIELDS
  };
  global.HN = HN;
  if (typeof module !== 'undefined' && module.exports) module.exports = HN;

  // ===================================================================
  // 以下はブラウザ専用のUI（Nodeテスト時は実行されない）
  // ===================================================================
  if (typeof document === 'undefined') return;

  var STORE_KEY = 'houjin-navi/v1';
  var state = loadState();

  function defaultState() {
    return {
      agreed: false,
      company: { fiscalStart: '4月1日', fiscalEnd: '3月31日' },
      checks: {},
      decision: {},
      tab: 'intro'
    };
  }
  function loadState() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaultState();
      var s = JSON.parse(raw);
      var d = defaultState();
      return Object.assign(d, s, { company: Object.assign(d.company, s.company || {}) });
    } catch (e) { return defaultState(); }
  }
  var saveTimer = null;
  function saveState() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
    }, 150);
  }

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m];
    });
  }
  function jdate(iso) {
    if (!iso) return '—';
    var p = iso.split('-');
    return p[0] + '年' + (+p[1]) + '月' + (+p[2]) + '日';
  }
  function srcLink(src) {
    if (!src) return '';
    return '<a class="src" href="' + esc(src.url) + '" target="_blank" rel="noopener">出典: ' + esc(src.label) + '</a>';
  }

  // ---------- レンダリング ----------
  function render() {
    var M = DATA.META;
    el('app').innerHTML =
      header(M) +
      '<nav class="tabs">' + tabs() + '</nav>' +
      '<main id="view">' + view() + '</main>' +
      footer(M) +
      '<div id="print-area"></div>';
    bind();
  }

  function header(M) {
    return '<header class="hd">' +
      '<div class="hd-main"><span class="logo">🏢</span><h1>' + esc(M.appName) + '</h1>' +
      '<span class="ver">v' + esc(M.version) + '</span></div>' +
      '<div class="verified">📌 情報の最終確認日: <b>' + esc(M.lastVerified) + '</b>（制度改正で変わることがあります）</div>' +
      '</header>';
  }

  var TABS = [
    ['intro', 'はじめに・形態診断'],
    ['steps', '設立ステップ'],
    ['input', '基本情報入力'],
    ['docs', '書類を作る'],
    ['deadlines', '届出・期限'],
    ['data', 'データ']
  ];
  function tabs() {
    return TABS.map(function (t) {
      return '<button class="tab' + (state.tab === t[0] ? ' active' : '') + '" data-tab="' + t[0] + '">' + esc(t[1]) + '</button>';
    }).join('');
  }

  function footer(M) {
    return '<footer class="ft">' +
      '<p class="disclaimer">⚠ ' + esc(M.disclaimer) + '</p>' +
      '<p class="scope">対象範囲: ' + esc(M.scopeNote) + '</p>' +
      '</footer>';
  }

  function view() {
    switch (state.tab) {
      case 'intro': return viewIntro();
      case 'steps': return viewSteps();
      case 'input': return viewInput();
      case 'docs': return viewDocs();
      case 'deadlines': return viewDeadlines();
      case 'data': return viewData();
      default: return viewIntro();
    }
  }

  function viewIntro() {
    var rec = HN.recommendCompanyType(state.decision);
    var ct = DATA.COMPANY_TYPES[rec.type];
    var qs = DATA.DECISION_QUESTIONS.map(function (q) {
      return '<label class="chk"><input type="checkbox" data-dec="' + q.id + '"' +
        (state.decision[q.id] ? ' checked' : '') + '> ' + esc(q.text) + '</label>';
    }).join('');
    return '<section class="card">' +
      '<h2>このツールについて</h2>' +
      '<p>合同会社（LLC）を<b>ご自身で設立する</b>ための手順・書類・届出期限を、公式情報の出典つきでご案内します。入力内容はこの端末内（ブラウザ）だけに保存され、外部には送信されません。</p>' +
      '</section>' +
      '<section class="card">' +
      '<h2>会社形態かんたん診断</h2>' +
      '<p class="muted">当てはまるものにチェックしてください。</p>' +
      '<div class="qlist">' + qs + '</div>' +
      '<div class="result"><h3>おすすめ: <span class="badge">' + esc(ct.name) + '</span></h3>' +
      '<div class="cols"><div><b>メリット</b><ul>' + ct.pros.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div>' +
      '<div><b>注意点</b><ul>' + ct.cons.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div></div>' +
      srcLink(ct.source) +
      '<p class="muted small">※ 本ツールは合同会社の設立を主対象にしています。株式会社を選ぶ場合の書類生成は対象外です。</p>' +
      '</div></section>';
  }

  function viewSteps() {
    var prog = HN.computeProgress(state.checks, DATA.STEPS);
    var items = DATA.STEPS.map(function (s) {
      return '<li class="step' + (state.checks[s.id] ? ' done' : '') + '">' +
        '<label class="chk"><input type="checkbox" data-step="' + s.id + '"' + (state.checks[s.id] ? ' checked' : '') + '>' +
        '<span class="step-ph">' + esc(s.phase) + '</span><span class="step-title">' + esc(s.title) + '</span></label>' +
        '<p class="step-desc">' + esc(s.desc) + '</p>' + srcLink(s.source) + '</li>';
    }).join('');
    return '<section class="card">' +
      '<h2>設立ステップ</h2>' +
      '<div class="progress"><div class="bar"><span style="width:' + prog + '%"></span></div><b>' + prog + '%</b> 完了</div>' +
      '<ol class="steps">' + items + '</ol>' +
      '</section>';
  }

  var INPUT_FIELDS = [
    ['shomei', '商号', '例）テスト合同会社（「合同会社」を含めます）', 'text'],
    ['mokuteki', '事業目的', '例）ソフトウェアの企画・開発・販売', 'text'],
    ['honten', '本店所在地', '例）東京都渋谷区（定款は最小行政区画まで／申請書は番地まで）', 'text'],
    ['shihonkin', '資本金（円）', '例）1000000', 'number'],
    ['daihyoName', '代表社員 氏名', '例）山田太郎', 'text'],
    ['daihyoAddr', '代表社員 住所', '例）東京都渋谷区○○1-2-3', 'text'],
    ['fiscalEnd', '事業年度の末日', '例）3月31日', 'text'],
    ['foundedDate', '設立予定日（登記申請日）', '', 'date']
  ];
  function viewInput() {
    var v = HN.validateCompany(state.company);
    var fields = INPUT_FIELDS.map(function (f) {
      var val = state.company[f[0]] != null ? state.company[f[0]] : '';
      var miss = v.missing.indexOf(f[1]) >= 0;
      return '<label class="field' + (miss ? ' miss' : '') + '"><span>' + esc(f[1]) + '</span>' +
        '<input type="' + f[3] + '" data-co="' + f[0] + '" value="' + esc(val) + '" placeholder="' + esc(f[2]) + '"></label>';
    }).join('');
    return '<section class="card">' +
      '<h2>会社の基本情報</h2>' +
      '<p class="muted">ここで入力した内容が「書類を作る」タブと「届出・期限」タブに反映されます。</p>' +
      '<div class="form">' + fields + '</div>' +
      '<p id="input-msg" class="' + (v.ok ? 'ok' : 'warn') + '">' + (v.ok ? '✅ 必須項目はすべて入力済みです。' : '⚠ 未入力: ' + v.missing.join('、')) + '</p>' +
      '</section>';
  }

  function viewDocs() {
    var v = HN.validateCompany(state.company);
    if (!v.ok) {
      return '<section class="card"><h2>書類を作る</h2>' +
        '<p class="warn">⚠ 先に「基本情報入力」を完了してください。未入力: ' + esc(v.missing.join('、')) + '</p></section>';
    }
    var docs = DATA.DOCUMENTS.map(function (d) {
      var text = HN[d.fn](state.company);
      return '<section class="card doc">' +
        '<div class="doc-hd"><h3>' + esc(d.title) + '</h3>' +
        '<div class="doc-btns"><button data-copy="' + d.id + '">コピー</button>' +
        '<button data-print="' + d.id + '">印刷/PDF</button></div></div>' +
        '<pre class="doc-body" id="doc-' + d.id + '">' + esc(text) + '</pre></section>';
    }).join('');
    return '<section class="card"><h2>書類を作る</h2>' +
      '<p class="muted">入力内容から下書きを生成しました。各書類は<b>ドラフト</b>です。提出前に必ず公式様式・専門家でご確認ください。' +
      srcLink(DATA.SOURCES.MOJ_LLC) + '</p></section>' + docs;
  }

  function viewDeadlines() {
    var founded = state.company.foundedDate;
    var dls = HN.computeDeadlines(founded, DATA.FILINGS);
    var rows = dls.map(function (d) {
      var due = d.dueISO ? jdate(d.dueISO) : '<span class="muted">要確認（' + (d.depends === 'employee' ? '従業員雇用時' : '自治体により異なる') + '）</span>';
      return '<tr' + (d.dueISO ? '' : ' class="soft"') + '>' +
        '<td>' + esc(d.office) + '</td>' +
        '<td>' + esc(d.name) + '<div class="note">' + esc(d.note || '') + '</div>' + srcLink(d.source) + '</td>' +
        '<td class="req">' + esc(d.required) + '</td>' +
        '<td class="due">' + due + '</td></tr>';
    }).join('');
    var warn = founded ? '' : '<p class="warn">⚠ 「基本情報入力」で設立予定日を入れると、各届出の期限日が自動計算されます。</p>';
    var icsBtn = founded ? '<button id="ics-btn" class="primary">📅 期限をカレンダー(.ics)に書き出す</button>' : '';
    return '<section class="card"><h2>設立後の届出・期限</h2>' + warn +
      '<div class="tablewrap"><table class="deadlines"><thead><tr><th>提出先</th><th>書類・注記</th><th>要否</th><th>期限</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>' + icsBtn +
      '<p class="muted small">※ 期限は一般的な標準ケースの目安です。自治体・個別事情により異なることがあります。各行の出典と自治体の公式情報で必ずご確認ください。</p>' +
      '</section>';
  }

  function viewData() {
    return '<section class="card"><h2>データ管理</h2>' +
      '<p>入力内容はこの端末のブラウザ内（localStorage）にのみ保存されます。外部送信は行いません。</p>' +
      '<button id="clear-btn" class="danger">🗑 入力データをすべて消去する</button>' +
      '</section>';
  }

  // 入力欄を作り直さずに検証表示だけ差分更新する（フォーカス・入力途中を壊さない）
  function refreshInputValidation() {
    var v = HN.validateCompany(state.company);
    INPUT_FIELDS.forEach(function (f) {
      var inp = document.querySelector('[data-co="' + f[0] + '"]');
      if (!inp) return;
      var label = inp.closest('.field');
      if (label) label.classList.toggle('miss', v.missing.indexOf(f[1]) >= 0);
    });
    var msg = el('input-msg');
    if (msg) {
      msg.className = v.ok ? 'ok' : 'warn';
      msg.textContent = v.ok ? '✅ 必須項目はすべて入力済みです。' : '⚠ 未入力: ' + v.missing.join('、');
    }
  }

  // ---------- イベント ----------
  function bind() {
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
      b.onclick = function () { state.tab = b.getAttribute('data-tab'); saveState(); render(); };
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-dec]'), function (c) {
      c.onchange = function () { state.decision[c.getAttribute('data-dec')] = c.checked; saveState(); render(); };
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-step]'), function (c) {
      c.onchange = function () { state.checks[c.getAttribute('data-step')] = c.checked; saveState(); render(); };
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-co]'), function (inp) {
      inp.oninput = function () {
        state.company[inp.getAttribute('data-co')] = inp.value;
        saveState();
        if (state.tab === 'input') refreshInputValidation();
      };
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (b) {
      b.onclick = function () {
        var t = el('doc-' + b.getAttribute('data-copy')).textContent;
        copyText(t, b);
      };
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-print]'), function (b) {
      b.onclick = function () {
        var t = el('doc-' + b.getAttribute('data-print')).textContent;
        el('print-area').textContent = t;
        document.body.classList.add('printing');
        window.print();
        document.body.classList.remove('printing');
      };
    });
    if (el('ics-btn')) el('ics-btn').onclick = function () {
      var ics = HN.buildICS(HN.computeDeadlines(state.company.foundedDate, DATA.FILINGS));
      downloadFile('houjin-todokede.ics', ics, 'text/calendar');
    };
    if (el('clear-btn')) el('clear-btn').onclick = function () {
      if (window.confirm('入力データをすべて消去します。よろしいですか？（元に戻せません）')) {
        localStorage.removeItem(STORE_KEY);
        state = defaultState(); render();
      }
    };
  }

  function copyText(t, btn) {
    var done = function () { var o = btn.textContent; btn.textContent = 'コピー✓'; setTimeout(function () { btn.textContent = o; }, 1200); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(done, function () { fallbackCopy(t); done(); });
    } else { fallbackCopy(t); done(); }
  }
  function fallbackCopy(t) {
    var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta);
    ta.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta);
  }
  function downloadFile(name, content, mime) {
    var blob = new Blob([content], { type: mime + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // ---------- 初回同意モーダル ----------
  function ensureConsent() {
    if (state.agreed) { render(); return; }
    var M = DATA.META;
    el('app').innerHTML =
      '<div class="modal"><div class="modal-box">' +
      '<h2>🏢 ' + esc(M.appName) + ' へようこそ</h2>' +
      '<p class="disclaimer">⚠ ' + esc(M.disclaimer) + '</p>' +
      '<p class="scope">対象範囲: ' + esc(M.scopeNote) + '</p>' +
      '<p>情報の最終確認日: <b>' + esc(M.lastVerified) + '</b></p>' +
      '<button id="agree-btn" class="primary">理解して利用を始める</button>' +
      '</div></div>';
    el('agree-btn').onclick = function () { state.agreed = true; saveState(); render(); };
  }

  document.addEventListener('DOMContentLoaded', ensureConsent);
})(typeof window !== 'undefined' ? window : globalThis);
