/* app.js — ロジック層（純粋関数）＋UI  法人ナビ v2.1（理想ドリブン診断）
 * 純粋関数は window.HN と module.exports に公開しNodeからテスト可能に。
 * 外部送信は一切行わない（C-01）。UIの全体再描画は入力/クリックを壊すため差分更新を用いる（FP-001）。
 */
(function (global) {
  'use strict';
  var DATA = global.HN_DATA || (typeof require !== 'undefined' ? require('./data.js') : {});

  // ================= 純粋関数 =================
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function addDays(iso, n) {
    var p = iso.split('-'); var dt = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    dt.setUTCDate(dt.getUTCDate() + n);
    return dt.getUTCFullYear() + '-' + pad(dt.getUTCMonth() + 1) + '-' + pad(dt.getUTCDate());
  }
  function addMonths(iso, n) {
    var p = iso.split('-'); var y = +p[0], m = +p[1], d = +p[2];
    var total = y * 12 + (m - 1) + n; var ny = Math.floor(total / 12); var nm = total - ny * 12;
    var lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
    return ny + '-' + pad(nm + 1) + '-' + pad(Math.min(d, lastDay));
  }
  function computeDeadlines(baseISO, filings) {
    filings = filings || [];
    var out = filings.map(function (f) {
      var dueISO = null;
      if (baseISO && typeof f.offsetDays === 'number') dueISO = addDays(baseISO, f.offsetDays);
      else if (baseISO && typeof f.offsetMonths === 'number') dueISO = addMonths(baseISO, f.offsetMonths);
      return { id: f.id, office: f.office, name: f.name, dueISO: dueISO, required: f.required, note: f.note, source: f.source, depends: f.depends || null };
    });
    out.sort(function (a, b) {
      if (a.dueISO && b.dueISO) return a.dueISO < b.dueISO ? -1 : (a.dueISO > b.dueISO ? 1 : 0);
      if (a.dueISO) return -1; if (b.dueISO) return 1; return 0;
    });
    return out;
  }
  function requiredOf(inputFields) {
    return (inputFields || []).filter(function (f) { return f[4]; }).map(function (f) { return [f[0], f[1]]; });
  }
  var LLC_REQUIRED = DATA.FLOWS ? requiredOf(DATA.FLOWS.llc.inputFields) : [];
  function validateCompany(company, requiredFields) {
    company = company || {}; requiredFields = requiredFields || LLC_REQUIRED;
    var missing = [];
    requiredFields.forEach(function (f) { var v = company[f[0]]; if (v === undefined || v === null || String(v).trim() === '') missing.push(f[1]); });
    return { ok: missing.length === 0, missing: missing };
  }
  function computeProgress(checks, steps) {
    steps = steps || []; checks = checks || {}; if (steps.length === 0) return 0;
    var done = 0; steps.forEach(function (s) { if (checks[s.id]) done++; });
    return Math.round((done / steps.length) * 100);
  }
  function countAnswered(answers, questions) { var n = 0; (questions || []).forEach(function (q) { if (answers[q.id] != null) n++; }); return n; }
  function countUnsure(answers, questions) {
    var n = 0; (questions || []).forEach(function (q) { var i = answers[q.id]; if (i != null && q.options[i] && q.options[i].unsure) n++; }); return n;
  }
  // 各タイプに取り得る満点（その道に一番寄せた理想回答の合計）
  function typeMax(questions, typeKeys) {
    var max = {}; typeKeys.forEach(function (t) { max[t] = 0; });
    (questions || []).forEach(function (q) {
      typeKeys.forEach(function (t) {
        var best = 0; q.options.forEach(function (o) { var w = (o.weights && o.weights[t]) || 0; if (w > best) best = w; });
        max[t] += best;
      });
    });
    return max;
  }
  function scoreDiagnosis(answers, questions, typeKeys) {
    answers = answers || {}; questions = questions || []; typeKeys = typeKeys || [];
    var scores = {}; typeKeys.forEach(function (t) { scores[t] = 0; });
    questions.forEach(function (q) {
      var idx = answers[q.id]; if (idx == null) return; var opt = q.options[idx]; if (!opt || !opt.weights) return;
      Object.keys(opt.weights).forEach(function (t) { if (scores[t] != null) scores[t] += opt.weights[t]; });
    });
    var total = 0; typeKeys.forEach(function (t) { total += scores[t]; });
    var maxes = typeMax(questions, typeKeys);
    // match = その道への近さ（満点比）。100%到達可能。表示はこちらを使う。
    var ranked = typeKeys.map(function (t) {
      return { type: t, score: scores[t], match: maxes[t] > 0 ? Math.round(scores[t] / maxes[t] * 100) : 0, pct: total > 0 ? Math.round(scores[t] / total * 100) : 0 };
    });
    ranked.sort(function (a, b) { if (b.match !== a.match) return b.match - a.match; if (b.score !== a.score) return b.score - a.score; return typeKeys.indexOf(a.type) - typeKeys.indexOf(b.type); });
    return { scores: scores, maxes: maxes, ranked: ranked, total: total, answered: countAnswered(answers, questions) };
  }
  // 理想フィット分析：理想への近さ(match)と、いま一番合うタイプ（希望を持てる代替）を返す
  function analyzeIdeal(answers, questions, typeKeys, ideal) {
    var s = scoreDiagnosis(answers, questions, typeKeys);
    var byType = {}; s.ranked.forEach(function (r) { byType[r.type] = r; });
    var entry = byType[ideal] || { type: ideal, score: 0, match: 0 };
    var top = s.ranked[0];
    var aligned = top.type === ideal;
    var alt = aligned ? (s.ranked[1] ? s.ranked[1].type : ideal) : top.type;
    return { ranked: s.ranked, idealMatch: entry.match, idealScore: entry.score, aligned: aligned,
      alt: alt, altMatch: (byType[alt] || { match: 0 }).match, total: s.total, answered: s.answered };
  }
  // 理想に「既に合っている点」（前向きに褒めるため）
  function idealStrengths(answers, questions, ideal) {
    var out = [];
    (questions || []).forEach(function (q) {
      var idx = answers[q.id]; if (idx == null) return; var o = q.options[idx];
      if (o && o.weights && o.weights[ideal] > 0) out.push(o.label);
    });
    return out;
  }
  // 「こうなると理想に近づく」ヒント：理想と離れている回答→より近い状態を提示（差の大きい順）
  function gapHints(answers, questions, ideal, limit) {
    limit = limit || 3;
    var hints = [];
    (questions || []).forEach(function (q) {
      var idx = answers[q.id];
      var chosen = (idx != null && q.options[idx].weights) ? (q.options[idx].weights[ideal] || 0) : 0;
      var best = 0, bestOpt = null;
      q.options.forEach(function (o) { var w = (o.weights && o.weights[ideal]) || 0; if (w > best) { best = w; bestOpt = o; } });
      if (bestOpt && best > chosen) hints.push({ q: q.text, target: bestOpt.label, gap: best - chosen });
    });
    hints.sort(function (a, b) { return b.gap - a.gap; });
    return hints.slice(0, limit);
  }
  function collectDiagnosisInsights(answers, questions) {
    var out = [];
    (questions || []).forEach(function (q) { var idx = answers[q.id]; if (idx == null) return; var opt = q.options[idx]; if (opt && opt.insight) out.push(opt.insight); });
    return out;
  }

  // ----- 書類生成（合同会社） -----
  var DRAFT_NOTE = '※ これはドラフト（下書き）です。文言・記載事項は必ず公式様式・専門家でご確認のうえ提出してください。';
  function g(c, k, ph) { var v = c && c[k]; return (v === undefined || v === null || String(v).trim() === '') ? ('【' + ph + '】') : String(v); }
  function generateTeikan(c) {
    c = c || {};
    return [g(c, 'shomei', '商号') + '　定款', '', '第1章　総則', '（商号）', '第1条　当会社は、' + g(c, 'shomei', '商号') + 'と称する。',
      '（目的）', '第2条　当会社は、次の事業を営むことを目的とする。', '　　' + g(c, 'mokuteki', '事業目的'), '　　前各号に附帯関連する一切の事業',
      '（本店の所在地）', '第3条　当会社は、本店を' + g(c, 'honten', '本店所在地') + 'に置く。', '（公告方法）', '第4条　当会社の公告は、官報に掲載する方法により行う。', '',
      '第2章　社員及び出資', '第5条　金 ' + g(c, 'shihonkin', '資本金額') + ' 円　　有限責任社員　' + g(c, 'daihyoName', '代表社員氏名') + '（住所：' + g(c, 'daihyoAddr', '代表社員住所') + '）',
      '第6条　当会社の社員は、全て有限責任社員とする。', '', '第3章　業務の執行及び会社の代表',
      '第7条　当会社の業務執行社員は、' + g(c, 'daihyoName', '代表社員氏名') + 'とする。', '第8条　当会社の代表社員は、' + g(c, 'daihyoName', '代表社員氏名') + 'とする。', '',
      '第4章　計算', '第9条　当会社の事業年度は、毎年 ' + g(c, 'fiscalStart', '4月1日') + ' から ' + g(c, 'fiscalEnd', '3月31日') + ' までとする。', '',
      '第5章　附則', '第10条　最初の事業年度は、当会社成立の日から ' + g(c, 'fiscalEnd', '3月31日') + ' までとする。',
      '第11条　この定款に定めのない事項は、すべて会社法その他の法令の定めるところによる。', '',
      '　以上、' + g(c, 'shomei', '商号') + 'を設立するため、社員が定款を作成し、記名押印する。', '', '　　令和__年__月__日', '　　　　有限責任社員　' + g(c, 'daihyoName', '代表社員氏名') + '　　印', '', DRAFT_NOTE].join('\n');
  }
  function generateShodakusho(c) {
    c = c || {};
    return ['就任承諾書', '', '　私は、' + g(c, 'shomei', '商号') + 'の代表社員に就任することを承諾します。', '', '　　令和__年__月__日', '',
      '　　住所：' + g(c, 'daihyoAddr', '代表社員住所'), '　　氏名：' + g(c, 'daihyoName', '代表社員氏名') + '　　印', '', DRAFT_NOTE].join('\n');
  }
  function generateHaraikomi(c) {
    c = c || {};
    return ['払込証明書', '', '　当会社の資本金については、以下のとおり全額の払込みがあったことを証明します。', '', '　　払込みを受けた金額の総額　金 ' + g(c, 'shihonkin', '資本金額') + ' 円', '', '　　令和__年__月__日', '',
      '　　' + g(c, 'shomei', '商号'), '　　代表社員　' + g(c, 'daihyoName', '代表社員氏名') + '　　印', '', '（注）代表社員個人口座の通帳の表紙・見開き・払込ページのコピーを合綴します。', '', DRAFT_NOTE].join('\n');
  }
  function generateShinseisho(c) {
    c = c || {};
    return ['合同会社設立登記申請書', '', '１．商　　号　　' + g(c, 'shomei', '商号'), '１．本　　店　　' + g(c, 'honten', '本店所在地'), '１．登記の事由　　設立の手続終了', '１．登記すべき事項　　別紙のとおり',
      '１．課税標準金額　　金 ' + g(c, 'shihonkin', '資本金額') + ' 円', '１．登録免許税　　金 ______ 円（資本金の額×0.7％、最低6万円）',
      '１．添付書類　　定款／代表社員の就任承諾書／払込みを証する書面／印鑑証明書／印鑑届書', '', '　上記のとおり登記の申請をします。', '　　令和__年__月__日', '',
      '　　申請人　　' + g(c, 'shomei', '商号'), '　　代表社員　' + g(c, 'daihyoName', '代表社員氏名') + '　　印', '', '　　○○法務局　御中', '', DRAFT_NOTE].join('\n');
  }
  function generateTokijiko(c) {
    c = c || {};
    return ['「登記すべき事項」', '', '商号　' + g(c, 'shomei', '商号'), '本店　' + g(c, 'honten', '本店所在地'), '公告をする方法　官報に掲載してする',
      '目的', '　' + g(c, 'mokuteki', '事業目的'), '　前号に附帯関連する一切の事業', '資本金の額　金 ' + g(c, 'shihonkin', '資本金額') + ' 円',
      '社員に関する事項', '　「資格」業務執行社員', '　「氏名」' + g(c, 'daihyoName', '代表社員氏名'),
      '社員に関する事項', '　「資格」代表社員', '　「住所」' + g(c, 'daihyoAddr', '代表社員住所'), '　「氏名」' + g(c, 'daihyoName', '代表社員氏名'),
      '登記記録に関する事項　設立', '', DRAFT_NOTE].join('\n');
  }
  function generateKaigyoGuide(c) {
    c = c || {};
    return ['「個人事業の開業・廃業等届出書」記入ガイド（下書き）', '', '提出先：納税地を管轄する税務署 ／ 提出期限：開業日から1ヶ月以内 ／ 手数料：無料', '',
      '■ 主な記入内容', '納税地　　　：' + g(c, 'address', '住所'), '氏名　　　　：' + g(c, 'name', '氏名'), '届出の区分　：開業', '所得の種類　：事業所得',
      '開業・廃業日：' + g(c, 'kaigyoDate', '開業日'), '屋号　　　　：' + (c.yago && String(c.yago).trim() ? c.yago : '（任意・空欄可）'), '事業の概要　：' + g(c, 'jigyo', '事業の内容'), '',
      '（注）正式な様式は国税庁サイトからダウンロードして記入・提出してください。青色申告承認申請書と同時提出が便利です。', '', DRAFT_NOTE].join('\n');
  }
  function generateAoiroGuide(c) {
    c = c || {};
    return ['「所得税の青色申告承認申請書」記入ガイド（下書き）', '', '提出先：納税地を管轄する税務署', '提出期限：その年から青色にするなら原則3月15日まで（1月16日以降の開業は開業日から2ヶ月以内）', '',
      '■ 主な記入内容', '納税地　　　：' + g(c, 'address', '住所'), '氏名　　　　：' + g(c, 'name', '氏名'), '事業の内容　：' + g(c, 'jigyo', '事業の内容'),
      '簿記方式　　：複式簿記（最大65万円控除を狙う場合）', '備付帳簿　　：総勘定元帳、仕訳帳 など', '', '（注）正式な様式は国税庁サイトからダウンロードして記入・提出してください。', '', DRAFT_NOTE].join('\n');
  }

  function icsDate(iso) { return iso.replace(/-/g, ''); }
  function buildICS(deadlines) {
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//houjin-navi//JP', 'CALSCALE:GREGORIAN'];
    (deadlines || []).forEach(function (d, i) {
      if (!d.dueISO) return;
      lines.push('BEGIN:VEVENT', 'UID:houjin-navi-' + d.id + '-' + i + '@local', 'DTSTART;VALUE=DATE:' + icsDate(d.dueISO),
        'SUMMARY:【提出期限】' + d.office + ' ' + d.name, 'DESCRIPTION:' + (d.note || '') + ' / 出典: ' + (d.source ? d.source.url : ''), 'END:VEVENT');
    });
    lines.push('END:VCALENDAR'); return lines.join('\r\n');
  }

  var HN = {
    addDays: addDays, addMonths: addMonths, computeDeadlines: computeDeadlines, validateCompany: validateCompany, computeProgress: computeProgress,
    scoreDiagnosis: scoreDiagnosis, analyzeIdeal: analyzeIdeal, typeMax: typeMax, idealStrengths: idealStrengths, gapHints: gapHints,
    collectDiagnosisInsights: collectDiagnosisInsights,
    countAnswered: countAnswered, countUnsure: countUnsure, buildICS: buildICS, requiredOf: requiredOf,
    generateTeikan: generateTeikan, generateShodakusho: generateShodakusho, generateHaraikomi: generateHaraikomi,
    generateShinseisho: generateShinseisho, generateTokijiko: generateTokijiko, generateKaigyoGuide: generateKaigyoGuide, generateAoiroGuide: generateAoiroGuide
  };
  global.HN = HN;
  if (typeof module !== 'undefined' && module.exports) module.exports = HN;

  // ================= UI =================
  if (typeof document === 'undefined') return;
  var Q = DATA.DIAGNOSIS, TYPES = DATA.DIAGNOSIS.types, TK = DATA.TYPE_KEYS;
  var STORE_KEY = 'houjin-navi/v3';
  var state = loadState();

  function defaultState() {
    return { agreed: false, mode: 'landing', diagMode: 'ideal', idealType: null, selectedType: null,
      diag: {}, company: { fiscalStart: '4月1日', fiscalEnd: '3月31日' }, checks: {}, tab: 'steps' };
  }
  function loadState() {
    try {
      var raw = localStorage.getItem(STORE_KEY); if (!raw) return defaultState();
      var s = JSON.parse(raw); var d = defaultState();
      return Object.assign(d, s, { company: Object.assign(d.company, s.company || {}), diag: s.diag || {}, checks: s.checks || {} });
    } catch (e) { return defaultState(); }
  }
  var saveTimer = null;
  function saveState() { clearTimeout(saveTimer); saveTimer = setTimeout(function () { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {} }, 120); }

  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
  function jdate(iso) { if (!iso) return '—'; var p = iso.split('-'); return p[0] + '年' + (+p[1]) + '月' + (+p[2]) + '日'; }
  function srcLink(src) { return src ? '<a class="src" href="' + esc(src.url) + '" target="_blank" rel="noopener">出典: ' + esc(src.label) + '</a>' : ''; }

  function render() {
    var M = DATA.META;
    el('app').innerHTML = header(M) + '<main id="view">' + view() + '</main>' + footer(M) + '<div id="print-area"></div>';
    bind(); window.scrollTo(0, 0);
  }
  function header(M) {
    var home = state.mode !== 'landing' ? '<button id="home-btn" class="home">🏠 最初に戻る</button>' : '';
    return '<header class="hd"><div class="hd-main"><span class="logo">🏢</span><div><h1>' + esc(M.appName) + '</h1><span class="tagline">' + esc(M.tagline) + '</span></div><span class="ver">v' + esc(M.version) + '</span></div>' +
      '<div class="hd-row"><div class="verified">📌 情報の最終確認日: <b>' + esc(M.lastVerified) + '</b></div>' + home + '</div></header>';
  }
  function footer(M) { return '<footer class="ft"><p class="disclaimer">⚠ ' + esc(M.disclaimer) + '</p><p class="scope">対象範囲: ' + esc(M.scopeNote) + '</p></footer>'; }
  function view() {
    switch (state.mode) {
      case 'landing': return viewLanding();
      case 'diagnosis': return viewDiagnosis();
      case 'result': return viewResult();
      case 'flow': return viewFlow();
      default: return viewLanding();
    }
  }

  // ---------- ランディング（理想を先に選ぶ） ----------
  function viewLanding() {
    var ideals = TK.map(function (k) {
      var t = TYPES[k];
      return '<button class="idealcard" data-ideal="' + k + '"><b>' + esc(t.name) + '</b><span class="ic-tag">' + esc(t.tagline) + '</span><span class="ic-go">この理想で診断する →</span></button>';
    }).join('');
    var chips = TK.map(function (k) {
      var t = TYPES[k]; var badge = t.buildStatus === 'full' ? '<span class="pill ok">手続き対応</span>' : '<span class="pill soft">概要</span>';
      return '<button class="typechip" data-type="' + k + '">' + esc(t.short) + ' ' + badge + '</button>';
    }).join('');
    return '<section class="card hero"><h2>まず「目指したい形（理想）」から始めましょう</h2>' +
      '<p>「合同会社にしたい」など理想がある方は、それを選ぶと<b>その理想に向けて必要なこと・覚悟</b>が分かる診断になります。理想と現実がズレていても大丈夫。正直な代替案も一緒にお見せします。</p></section>' +
      '<section class="card"><h3>🎯 目指したい形は決まっていますか？（選ぶとその理想で診断）</h3><div class="idealgrid">' + ideals + '</div>' +
      '<button id="explore-diag" class="ghost wide">🧭 まだ決まっていない → どれが合うか探る診断へ</button></section>' +
      '<section class="card"><h3>すでに決めていて、手続きだけ始めたい方はこちら（診断スキップ）</h3><div class="chips">' + chips + '</div></section>';
  }

  // ---------- 診断 ----------
  function viewDiagnosis() {
    var total = Q.questions.length, answered = HN.countAnswered(state.diag, Q.questions);
    var head = state.diagMode === 'ideal'
      ? '<div class="mode-banner ideal">🎯 理想「<b>' + esc(TYPES[state.idealType].name) + '</b>」に向けた診断 — 答えるほど必要なこと・覚悟が見えてきます</div>'
      : '<div class="mode-banner">🧭 どの形が合うかを探る診断</div>';
    var secHtml = Q.sections.map(function (sec) {
      var qs = Q.questions.filter(function (q) { return q.section === sec.id; }).map(questionHtml).join('');
      return '<div class="diag-sec"><h3 class="sec-h">' + esc(sec.title) + '</h3>' + qs + '</div>';
    }).join('');
    return '<section class="card"><h2>診断</h2>' + head +
      '<div class="progress"><div class="bar"><span id="diag-bar" style="width:' + Math.round(answered / total * 100) + '%"></span></div><b id="diag-count">' + answered + ' / ' + total + '</b> 問</div>' +
      secHtml +
      '<div class="diag-actions"><button id="see-result" class="primary big"' + (answered < total ? ' disabled' : '') + '>診断結果を見る</button><span id="diag-remain" class="muted">' + (answered < total ? 'あと ' + (total - answered) + ' 問' : 'すべて回答済み！') + '</span></div></section>';
  }
  function questionHtml(q) {
    var opts = q.options.map(function (o, i) {
      var sel = state.diag[q.id] === i ? ' sel' : '';
      return '<label class="opt' + sel + '"><input type="radio" name="' + q.id + '" data-q="' + q.id + '" value="' + i + '"' + (state.diag[q.id] === i ? ' checked' : '') + '><span>' + esc(o.label) + '</span></label>';
    }).join('');
    var hint = q.hint ? '<div class="hint">💡 ' + esc(q.hint) + ' ' + srcLink(q.hintSource) + '</div>' : '';
    return '<fieldset class="q"><legend>' + esc(q.text) + '</legend>' + hint + '<div class="opts">' + opts + '</div></fieldset>';
  }

  // ---------- 結果 ----------
  function viewResult() {
    return '<div id="result-dynamic">' + resultDynamic() + '</div>' + answerEditor() + resultFooter();
  }
  function resultDynamic() { return state.diagMode === 'ideal' ? resultIdeal() : resultExplore(); }

  function tier(match) {
    if (match >= 80) return { emoji: '🎉', msg: 'この理想にとても近いです！自信を持って進んで大丈夫。' };
    if (match >= 60) return { emoji: '👍', msg: 'いい線いっています！あと少しで理想に届きます。' };
    if (match >= 40) return { emoji: '🌱', msg: '今は準備段階。ここを押さえれば着実に近づけます。' };
    return { emoji: '🌱', msg: '今はスタート地点。あなたの理想は、これから十分に目指せます。' };
  }
  // 結果の最後に必ず入れる安心メッセージ（良くても悪くても）
  function reassureBlock() {
    return '<section class="card reassure"><p>🍀 <b>大丈夫です。安心してください。</b>結果が良くても・そうでなくても、あなたの「やってみたい」という気持ちがいちばんの原動力です。ここから一歩ずつ、ちゃんと進めます。</p></section>';
  }
  function resultIdeal() {
    var ideal = state.idealType, t = TYPES[ideal];
    var A = HN.analyzeIdeal(state.diag, Q.questions, TK, ideal);
    var tr = tier(A.idealMatch);
    var strengths = HN.idealStrengths(state.diag, Q.questions, ideal);
    var reqs = (DATA.IDEAL_REQUIREMENTS[ideal] || []).map(function (r) { return '<li>' + esc(r.text) + ' ' + srcLink(r.source) + '</li>'; }).join('');
    var insights = HN.collectDiagnosisInsights(state.diag, Q.questions);
    var unsure = HN.countUnsure(state.diag, Q.questions);
    var altShort = TYPES[A.alt].short;
    var strengthsHtml = strengths.length
      ? '<section class="card good"><h3>✅ あなたが既に「' + esc(t.short) + '向き」な点</h3><ul class="reqs">' + strengths.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul><p class="muted small">この強みを活かせば理想に近づけます。</p></section>'
      : '';
    var msg = A.aligned
      ? '🎉 あなたの回答は理想とバッチリ同じ方向です。下の「準備すること」を整えれば、そのまま' + esc(t.short) + 'を目指せます。'
      : 'あなたの理想「' + esc(t.name) + '」はすてきな目標です。いまのあなたには「<b>' + esc(TYPES[A.alt].name) + '</b>」もよく合っています（相性 <b>' + A.altMatch + '%</b>）。理想に届くかは<b>順番とタイミングの問題</b>。<b>まず' + esc(altShort) + 'から始めて、将来' + esc(t.short) + 'へ（法人成り）</b>という道も王道です。<b>理想は変えなくて大丈夫。</b>';
    var unsureNote = unsure >= 4 ? '<p class="muted small">「わからない」が多め（' + unsure + '問）です。焦らず、まずは身軽な個人事業から始めるのも良い一手です。</p>' : '';
    var insHtml = insights.length ? '<div class="ins-box"><b>👀 あわせて知っておきたい点</b><ul class="ins">' + insights.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul></div>' : '';
    var altCta = A.alt !== ideal ? '<button class="ghost" data-type="' + A.alt + '">まず' + esc(altShort) + 'から始める（相性' + A.altMatch + '%）→</button>' : '';
    var hints = HN.gapHints(state.diag, Q.questions, ideal, 3);
    var hintsHtml = (A.idealMatch < 100 && hints.length)
      ? '<section class="card grow"><h3>🌱 こうなると「' + esc(t.short) + '」にもっと近づきます</h3><ul class="reqs">' +
        hints.map(function (h) { return '<li>「' + esc(h.q) + '」→ <b>' + esc(h.target) + '</b> の状況になったとき</li>'; }).join('') +
        '</ul><p class="muted small">今すぐでなくてOK。タイミングが来たら踏み出せます。</p></section>'
      : '';
    return '<section class="card ideal-hero"><h2>🎯 あなたの理想：' + esc(t.name) + '</h2>' +
      '<div class="fitrow big"><span class="fitname">' + esc(t.short) + 'との相性</span><div class="fitbar"><span style="width:' + A.idealMatch + '%"></span></div><b>' + A.idealMatch + '%</b></div>' +
      '<p class="tiermsg">' + tr.emoji + ' ' + esc(tr.msg) + '</p>' +
      '<p class="canline">💪 相性は「今の状況との近さ」で、「できる・できない」ではありません。<b>やると決めれば実現できます</b>（' + esc(t.short) + 'は ' + esc(t.costText) + '・自分でも手続き可能）。</p></section>' +
      strengthsHtml +
      hintsHtml +
      '<section class="card"><h3>🧭 近づくために準備しておくと安心なこと</h3><ul class="reqs">' + reqs + '</ul>' + srcLink(t.source) + '</section>' +
      '<section class="card"><h3>💬 あなたへのおすすめ</h3><p>' + msg + '</p>' + unsureNote + insHtml +
      '<div class="cta"><button class="primary" data-type="' + ideal + '">' + esc(t.short) + 'の手続きに進む →</button> ' + altCta + '</div></section>' +
      reassureBlock();
  }

  function resultExplore() {
    var res = HN.scoreDiagnosis(state.diag, Q.questions, TK);
    var insights = HN.collectDiagnosisInsights(state.diag, Q.questions);
    var unsure = HN.countUnsure(state.diag, Q.questions);
    var bars = res.ranked.map(function (r) {
      return '<div class="fitrow"><span class="fitname">' + esc(TYPES[r.type].name) + '</span><div class="fitbar"><span style="width:' + r.match + '%"></span></div><b>' + r.match + '%</b></div>';
    }).join('');
    var top = res.ranked[0];
    var lead = '🎉 あなたに一番合うのは「<b>' + esc(TYPES[top.type].name) + '</b>」（相性 <b>' + top.match + '%</b>）です！';
    var lowConf = (res.ranked[0].match - res.ranked[1].match) <= 8 || unsure >= 4;
    var note = lowConf ? '<p class="muted small">近いタイプが複数あります。迷ったら、身軽な個人事業から始めて、決まってきたら法人化（法人成り）する道もあります。どれも良いスタートです。</p>' : '';
    var insHtml = insights.length ? '<div class="ins-box"><b>👀 あわせて知っておきたい点</b><ul class="ins">' + insights.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul></div>' : '';
    return '<section class="card"><h2>診断結果</h2><p class="lead2">' + lead + '</p><p class="muted small">各タイプとの相性です（あなたの回答が、その道に理想的な答えにどれだけ近いか）。</p><div class="fit">' + bars + '</div>' + note + '</section>' +
      resultCard(res.ranked[0]) +
      '<section class="card alt"><h3>💡 あなたなら、こういう選択肢も（相性 ' + res.ranked[1].match + '%）</h3>' + resultCardInner(res.ranked[1]) + '</section>' +
      (insHtml ? '<section class="card">' + insHtml + '</section>' : '') +
      '<p class="muted small canline">💪 相性は「今の状況との近さ」です。どの形も、やると決めれば実現できます。</p>' +
      reassureBlock();
  }
  function resultCard(r) {
    var t = TYPES[r.type];
    return '<section class="card primary-card"><div class="pc-h"><span class="crown">👑</span><div><span class="pc-label">あなたに一番合うのは</span><h3>' + esc(t.name) + '</h3></div><span class="pc-pct">' + r.match + '%</span></div>' + resultCardInner(r) + '</section>';
  }
  function resultCardInner(r) {
    var t = TYPES[r.type];
    var badge = t.buildStatus === 'full' ? '<span class="pill ok">手続きガイド対応</span>' : '<span class="pill soft">概要のみ（詳細は順次対応）</span>';
    return '<p class="pc-tag">' + esc(t.tagline) + '　' + badge + '</p>' +
      '<div class="cols"><div><b>メリット</b><ul>' + t.pros.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div><div><b>注意点</b><ul>' + t.cons.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div></div>' +
      '<p class="cost">法定費用の目安: <b>' + esc(t.costText) + '</b></p>' + srcLink(t.source) +
      '<div class="cta"><button class="primary" data-type="' + r.type + '">この形（' + esc(t.short) + '）で進む →</button></div>';
  }

  // what-if：結果画面で回答を変えて即再計算
  function answerEditor() {
    var rows = Q.questions.map(function (q) {
      var opts = q.options.map(function (o, i) { return '<option value="' + i + '"' + (state.diag[q.id] === i ? ' selected' : '') + '>' + esc(o.label) + '</option>'; }).join('');
      return '<label class="editrow"><span>' + esc(q.text) + '</span><select data-edit="' + q.id + '">' + opts + '</select></label>';
    }).join('');
    return '<section class="card editor"><h3>🔧 回答を変えて試す</h3><p class="muted small">答えを変えると上の結果がその場で更新されます（「もし◯◯だったら？」を試せます）。</p>' + rows + '</section>';
  }
  function resultFooter() {
    return '<section class="card"><div class="cta">' +
      '<button id="review-ans" class="ghost">← 回答を見直す（今の回答のまま診断へ）</button> ' +
      (state.diagMode === 'ideal' ? '<button id="change-ideal" class="ghost">別の理想を選ぶ</button> ' : '') +
      '<button id="restart-all" class="ghost">最初からやり直す</button></div></section>';
  }

  // ---------- フロー ----------
  function currentFlow() { return DATA.FLOWS[state.selectedType]; }
  function viewFlow() {
    var flow = currentFlow(); if (!flow) return viewLanding();
    if (flow.overview) return viewOverview();
    var t = TYPES[state.selectedType];
    var tabs = [['steps', 'ステップ'], ['input', '基本情報'], ['docs', '書類'], ['deadlines', '届出・期限']];
    var tabsHtml = tabs.map(function (tb) { return '<button class="tab' + (state.tab === tb[0] ? ' active' : '') + '" data-tab="' + tb[0] + '">' + esc(tb[1]) + '</button>'; }).join('');
    return '<section class="card flow-h"><h2>' + esc(t.name) + 'の手続き</h2><p class="muted">' + esc(t.tagline) + '</p></section><nav class="tabs">' + tabsHtml + '</nav><div id="flowview">' + flowTab() + '</div>';
  }
  function flowTab() { switch (state.tab) { case 'input': return tabInput(); case 'docs': return tabDocs(); case 'deadlines': return tabDeadlines(); default: return tabSteps(); } }
  function tabSteps() {
    var flow = currentFlow(); var prog = HN.computeProgress(state.checks, flow.steps);
    var items = flow.steps.map(function (s) {
      return '<li class="step' + (state.checks[s.id] ? ' done' : '') + '"><label class="chk"><input type="checkbox" data-step="' + s.id + '"' + (state.checks[s.id] ? ' checked' : '') + '><span class="step-ph">' + esc(s.phase) + '</span><span class="step-title">' + esc(s.title) + '</span></label><p class="step-desc">' + esc(s.desc) + '</p>' + srcLink(s.source) + '</li>';
    }).join('');
    return '<section class="card"><h3>手続きステップ</h3><div class="progress"><div class="bar"><span style="width:' + prog + '%"></span></div><b>' + prog + '%</b> 完了</div><ol class="steps">' + items + '</ol></section>';
  }
  function tabInput() {
    var flow = currentFlow(); var req = requiredOf(flow.inputFields); var v = HN.validateCompany(state.company, req);
    var fields = flow.inputFields.map(function (f) {
      var val = state.company[f[0]] != null ? state.company[f[0]] : ''; var miss = v.missing.indexOf(f[1]) >= 0;
      return '<label class="field' + (miss ? ' miss' : '') + '"><span>' + esc(f[1]) + '</span><input type="' + f[3] + '" data-co="' + f[0] + '" value="' + esc(val) + '" placeholder="' + esc(f[2]) + '"></label>';
    }).join('');
    return '<section class="card"><h3>基本情報</h3><p class="muted">入力内容が「書類」と「届出・期限」に反映されます。</p><div class="form">' + fields + '</div><p id="input-msg" class="' + (v.ok ? 'ok' : 'warn') + '">' + (v.ok ? '✅ 必須項目はすべて入力済みです。' : '⚠ 未入力: ' + v.missing.join('、')) + '</p></section>';
  }
  function tabDocs() {
    var flow = currentFlow(); var req = requiredOf(flow.inputFields); var v = HN.validateCompany(state.company, req);
    if (!v.ok) return '<section class="card"><h3>書類</h3><p class="warn">⚠ 先に「基本情報」を入力してください。未入力: ' + esc(v.missing.join('、')) + '</p></section>';
    var docs = flow.documents.map(function (d) {
      var text = HN[d.fn](state.company);
      return '<section class="card doc"><div class="doc-hd"><h3>' + esc(d.title) + '</h3><div class="doc-btns"><button data-copy="' + d.id + '">コピー</button><button data-print="' + d.id + '">印刷/PDF</button></div></div><pre class="doc-body" id="doc-' + d.id + '">' + esc(text) + '</pre></section>';
    }).join('');
    return '<section class="card"><h3>書類の作成</h3><p class="muted">入力内容から下書きを生成しました。各書類は<b>ドラフト</b>です。提出前に必ず公式様式・専門家でご確認ください。</p></section>' + docs;
  }
  function tabDeadlines() {
    var flow = currentFlow(); var base = state.company[flow.dateField]; var dls = HN.computeDeadlines(base, flow.filings);
    var rows = dls.map(function (d) {
      var due = d.dueISO ? jdate(d.dueISO) : '<span class="muted">要確認（' + (d.depends === 'employee' ? '従業員雇用時' : '自治体により異なる') + '）</span>';
      return '<tr' + (d.dueISO ? '' : ' class="soft"') + '><td>' + esc(d.office) + '</td><td>' + esc(d.name) + '<div class="note">' + esc(d.note || '') + '</div>' + srcLink(d.source) + '</td><td class="req">' + esc(d.required) + '</td><td class="due">' + due + '</td></tr>';
    }).join('');
    var warn = base ? '' : '<p class="warn">⚠ 「基本情報」で' + esc(flow.dateLabel) + 'を入れると、各届出の期限が自動計算されます。</p>';
    var icsBtn = base ? '<button id="ics-btn" class="primary">📅 期限をカレンダー(.ics)に書き出す</button>' : '';
    return '<section class="card"><h3>届出・期限</h3>' + warn + '<div class="tablewrap"><table class="deadlines"><thead><tr><th>提出先</th><th>書類・注記</th><th>要否</th><th>期限</th></tr></thead><tbody>' + rows + '</tbody></table></div>' + icsBtn + '<p class="muted small">※ 期限は一般的な標準ケースの目安です。各行の出典と自治体の公式情報で必ずご確認ください。</p></section>';
  }
  function viewOverview() {
    var flow = currentFlow(); var t = TYPES[state.selectedType]; var o = flow.overview;
    var steps = o.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    return '<section class="card"><h2>' + esc(t.name) + '（概要）</h2><p>' + esc(o.summary) + '</p>' +
      '<div class="cols"><div><b>メリット</b><ul>' + t.pros.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div><div><b>注意点</b><ul>' + t.cons.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div></div>' +
      '<h3>おおまかな手続きの流れ</h3><ol class="ovsteps">' + steps + '</ol><p class="cost">法定費用の目安: <b>' + esc(t.costText) + '</b></p><p class="warn">🚧 ' + esc(o.note) + '</p>' + srcLink(flow.source) +
      '<div class="cta"><button id="back-pick" class="ghost">← 最初に戻る</button></div></section>';
  }

  // ---------- イベント ----------
  function bind() {
    if (el('home-btn')) el('home-btn').onclick = function () { state.mode = 'landing'; saveState(); render(); };
    if (el('explore-diag')) el('explore-diag').onclick = function () { state.diagMode = 'explore'; state.idealType = null; state.mode = 'diagnosis'; saveState(); render(); };
    Array.prototype.forEach.call(document.querySelectorAll('[data-ideal]'), function (b) {
      b.onclick = function () { state.diagMode = 'ideal'; state.idealType = b.getAttribute('data-ideal'); state.mode = 'diagnosis'; saveState(); render(); };
    });
    if (el('see-result')) el('see-result').onclick = function () { state.mode = 'result'; saveState(); render(); };
    if (el('review-ans')) el('review-ans').onclick = function () { state.mode = 'diagnosis'; saveState(); render(); };
    if (el('change-ideal')) el('change-ideal').onclick = function () { state.mode = 'landing'; saveState(); render(); };
    if (el('restart-all')) el('restart-all').onclick = function () { if (window.confirm('回答をすべて消して最初からやり直しますか？')) { state.diag = {}; state.idealType = null; state.mode = 'landing'; saveState(); render(); } };
    if (el('back-pick')) el('back-pick').onclick = function () { state.mode = 'landing'; saveState(); render(); };

    Array.prototype.forEach.call(document.querySelectorAll('[data-q]'), function (r) {
      r.onchange = function () { state.diag[r.getAttribute('data-q')] = parseInt(r.value, 10); saveState(); refreshDiagProgress(); markSelected(r); };
    });
    // what-if セレクト：結果を差分更新（エディタ自身は作り直さない）
    Array.prototype.forEach.call(document.querySelectorAll('[data-edit]'), function (s) {
      s.onchange = function () {
        state.diag[s.getAttribute('data-edit')] = parseInt(s.value, 10); saveState();
        var host = el('result-dynamic'); if (host) { host.innerHTML = resultDynamic(); bindTypeButtons(); window.scrollTo(0, 0); }
      };
    });
    bindTypeButtons();
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) { b.onclick = function () { state.tab = b.getAttribute('data-tab'); saveState(); render(); }; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-step]'), function (c) { c.onchange = function () { state.checks[c.getAttribute('data-step')] = c.checked; saveState(); render(); }; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-co]'), function (inp) { inp.oninput = function () { state.company[inp.getAttribute('data-co')] = inp.value; saveState(); if (state.tab === 'input') refreshInputValidation(); }; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (b) { b.onclick = function () { copyText(el('doc-' + b.getAttribute('data-copy')).textContent, b); }; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-print]'), function (b) {
      b.onclick = function () { el('print-area').textContent = el('doc-' + b.getAttribute('data-print')).textContent; document.body.classList.add('printing'); window.print(); document.body.classList.remove('printing'); };
    });
    if (el('ics-btn')) el('ics-btn').onclick = function () { var flow = currentFlow(); downloadFile('todokede.ics', HN.buildICS(HN.computeDeadlines(state.company[flow.dateField], flow.filings)), 'text/calendar'); };
  }
  function bindTypeButtons() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-type]'), function (b) {
      b.onclick = function () { state.selectedType = b.getAttribute('data-type'); state.mode = 'flow'; state.tab = 'steps'; saveState(); render(); };
    });
  }
  function refreshDiagProgress() {
    var total = Q.questions.length, answered = HN.countAnswered(state.diag, Q.questions);
    if (el('diag-bar')) el('diag-bar').style.width = Math.round(answered / total * 100) + '%';
    if (el('diag-count')) el('diag-count').textContent = answered + ' / ' + total;
    if (el('diag-remain')) el('diag-remain').textContent = answered < total ? 'あと ' + (total - answered) + ' 問' : 'すべて回答済み！';
    if (el('see-result')) el('see-result').disabled = answered < total;
  }
  function markSelected(radio) {
    var name = radio.getAttribute('name');
    Array.prototype.forEach.call(document.querySelectorAll('input[name="' + name + '"]'), function (r) { r.parentNode.classList.toggle('sel', r.checked); });
  }
  function refreshInputValidation() {
    var flow = currentFlow(); var req = requiredOf(flow.inputFields); var v = HN.validateCompany(state.company, req);
    flow.inputFields.forEach(function (f) { var inp = document.querySelector('[data-co="' + f[0] + '"]'); if (!inp) return; var label = inp.closest('.field'); if (label) label.classList.toggle('miss', v.missing.indexOf(f[1]) >= 0); });
    var msg = el('input-msg'); if (msg) { msg.className = v.ok ? 'ok' : 'warn'; msg.textContent = v.ok ? '✅ 必須項目はすべて入力済みです。' : '⚠ 未入力: ' + v.missing.join('、'); }
  }
  function copyText(t, btn) {
    var done = function () { var o = btn.textContent; btn.textContent = 'コピー✓'; setTimeout(function () { btn.textContent = o; }, 1200); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { fallbackCopy(t); done(); }); else { fallbackCopy(t); done(); }
  }
  function fallbackCopy(t) { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta); }
  function downloadFile(name, content, mime) {
    var blob = new Blob([content], { type: mime + ';charset=utf-8' }); var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function ensureConsent() {
    if (state.agreed) { render(); return; }
    var M = DATA.META;
    el('app').innerHTML = '<div class="modal"><div class="modal-box"><h2>🏢 ' + esc(M.appName) + '</h2><p class="lead">' + esc(M.tagline) + '</p><p class="disclaimer">⚠ ' + esc(M.disclaimer) + '</p><p class="scope">対象範囲: ' + esc(M.scopeNote) + '</p><p>情報の最終確認日: <b>' + esc(M.lastVerified) + '</b></p><button id="agree-btn" class="primary big">理解して利用を始める</button></div></div>';
    el('agree-btn').onclick = function () { state.agreed = true; saveState(); render(); };
  }
  document.addEventListener('DOMContentLoaded', ensureConsent);
})(typeof window !== 'undefined' ? window : globalThis);
