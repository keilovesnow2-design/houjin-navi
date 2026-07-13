/* data.js — コンテンツ層（制度データ＋診断定義）
 * 法人ナビ v2.0 — 法人診断（4タイプ）＋ 手続きナビ（個人事業・合同会社）。
 * 制度改正時はこのファイルだけを更新し、META.lastVerified と source を差し替える。
 * 掲載する数値・期限は research/ でA(官公庁)/B(専門家)二源以上一致のもののみ。
 */
(function (global) {
  'use strict';

  var SOURCES = {
    MOJ_LLC: { label: '法務省：合同会社の設立手続について',
      url: 'https://www.moj.go.jp/MINJI/minji06_00141.html' },
    MOJ_HOUMUKYOKU: { label: '法務局：商業・法人登記の申請',
      url: 'https://houmukyoku.moj.go.jp/homu/COMMERCE_11-1.html' },
    MOJ_KK: { label: '法務省：株式会社の設立手続（発起設立）について',
      url: 'https://www.moj.go.jp/MINJI/minji06_00134.html' },
    KOSHONIN_FEE: { label: '日本公証人連合会：定款認証の費用（Q3）',
      url: 'https://www.koshonin.gr.jp/notary/ow09_4/9_4_q03' },
    KOSHONIN_SHADAN: { label: '日本公証人連合会：一般社団法人の定款認証（Q14）',
      url: 'https://www.koshonin.gr.jp/notary/ow09_4/9_4_q82' },
    NTA_TOROKU: { label: '国税庁：登録免許税の税額表（No.7191）',
      url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/inshi/7191.htm' },
    NTA: { label: '国税庁：法人設立届出書・青色申告の承認申請',
      url: 'https://www.nta.go.jp/taxes/tetsuzuki/shinsei/annai/hojin/annai/1554_11.htm' },
    NTA_KAIGYO: { label: '国税庁：個人事業を開業する場合（開業届）',
      url: 'https://www.nta.go.jp/taxes/tetsuzuki/shinsei/annai/shinkoku/annai/42.htm' },
    NTA_AOIRO: { label: '国税庁：所得税の青色申告承認申請手続（A1-8）',
      url: 'https://www.nta.go.jp/taxes/tetsuzuki/shinsei/annai/shinkoku/annai/09.htm' },
    NENKIN: { label: '日本年金機構：新規適用の手続き',
      url: 'https://www.nenkin.go.jp/service/kounen/tekiyo/jigyosho/20141203.html' },
    NENKIN_TEKIYO: { label: '日本年金機構：適用事業所と被保険者',
      url: 'https://www.nenkin.go.jp/service/kounen/tekiyo/jigyosho/20150518.html' },
    SOUMU_JUMINZEI: { label: '総務省：法人住民税（均等割）',
      url: 'https://www.soumu.go.jp/main_sosiki/jichi_zeisei/czaisei/czaisei_seido/150790_08.html' },
    EGOV: { label: 'e-Gov / 登記・供託オンライン申請システム',
      url: 'https://www.touki-kyoutaku-online.moj.go.jp/' },
    TOKYO_TAX: { label: '東京都主税局：法人設立・設置届出',
      url: 'https://www.tax.metro.tokyo.lg.jp/' },
    PREF_HOKKAIDO: { label: '北海道：法人二税の届出関係Q&A',
      url: 'https://www.pref.hokkaido.lg.jp/sm/zim/faq/faq_05.html' },
    PREF_CHIBA: { label: '千葉県：県税Q&A（法人設立の届出）',
      url: 'https://www.pref.chiba.lg.jp/zeimu/faq/010.html' },
    PREF_KANAGAWA: { label: '神奈川県：県税Q&A 法人県民税・事業税',
      url: 'https://www.pref.kanagawa.jp/zei/kenzei/a001/b006/004.html' },
    PREF_AICHI: { label: '愛知県：県税Q&A（法人県民税・法人事業税）',
      url: 'https://www.pref.aichi.jp/soshiki/zeimu/0000034242.html' },
    PREF_OSAKA: { label: '大阪府：法人府民税・事業税の法人設立等申告書',
      url: 'https://www.pref.osaka.lg.jp/faq/faq_000328.html' },
    PREF_SAITAMA: { label: '埼玉県：法人県民税・事業税「県内に事務所等を設置したら」',
      url: 'https://www.pref.saitama.lg.jp/a0209/z-kurashiindex/z-2-hojin.html' },
    PREF_KYOTO: { label: '京都府：府税Q&A 法人府民税・法人事業税（法人届出関係）',
      url: 'https://www.pref.kyoto.jp/zeimu/11600041.html' },
    PREF_HYOGO: { label: '兵庫県：法人県民税・法人事業税について（Q1）',
      url: 'https://web.pref.hyogo.lg.jp/kk22/faq/houjin/houjin1.html' }
  };

  var META = {
    appName: '法人ナビ',
    tagline: '理想の形から、開業・設立まで導く',
    version: '2.5',
    lastVerified: '2026-07-13',
    scopeNote: '手続きナビは「個人事業・合同会社・株式会社・一般社団法人」に対応。株式会社は発起設立・一人株式会社、一般社団法人は理事会非設置の通常型を基本形とし、現物出資・募集設立・取締役会設置・公益／非営利型認定・許認可業種などの特殊ケースは対象外です。',
    disclaimer: '本ツールは情報提供を目的とした支援ツールであり、法的助言・税務助言・登記代理ではありません。診断結果は「向いている傾向」の目安です。制度・税率・様式は改正されることがあります。実際の判断・提出前に必ず公式情報および税理士・司法書士等の専門家でご確認ください。'
  };

  // ============ 法人診断 ============
  var DIAGNOSIS = {
    sections: [
      { id: 'sec1', title: '1. 事業の形・体制' },
      { id: 'sec2', title: '2. お金のこと' },
      { id: 'sec3', title: '3. リスクと責任' },
      { id: 'sec4', title: '4. 将来と信用' }
    ],
    // options[i].weights は {kojin, llc, kk, shadan} への加点。answers[q.id]=選択index。
    questions: [
      { id: 'q1', section: 'sec1', text: 'いまの・これからの取り組み方に近いのは？',
        options: [
          { label: '副業・お小遣い稼ぎとして小さく', weights: { kojin: 3 } },
          { label: '独立して専業でやっていく', weights: { kojin: 2, llc: 2, kk: 1 } },
          { label: '仲間・共同経営で始める', weights: { llc: 2, kk: 2 },
            insight: '複数人で出資・経営するなら、もうけや責任の分け方を定款で決められる法人（合同会社・株式会社）が向く場面が多いです。' },
          { label: '非営利・社会貢献の活動として', weights: { shadan: 3 } }
        ] },
      { id: 'q2', section: 'sec1', text: '従業員（自分以外）は雇いますか？',
        hint: '法人は社長1人でも、会社から役員報酬を受け取るなら社会保険（健康保険・厚生年金）への加入が原則義務です。人を雇うとさらに手続きが増えます。',
        hintSource: SOURCES.NENKIN_TEKIYO,
        options: [
          { label: 'ずっと一人でやる', weights: { kojin: 2, llc: 1, shadan: 1 } },
          { label: '将来は雇うかもしれない', weights: { llc: 1, kk: 1 } },
          { label: 'すぐに雇う予定', weights: { kk: 1, llc: 1 },
            insight: '従業員を雇うと労働保険（労災・雇用保険）の加入手続きが必要になります。' }
        ] },
      { id: 'q3', section: 'sec1', text: '事業の内容に近いのは？',
        options: [
          { label: 'ネット / クリエイティブ / フリーランス系', weights: { kojin: 2, llc: 1 } },
          { label: '店舗・対面サービス', weights: { kojin: 1, llc: 1 } },
          { label: '企業向け(BtoB)・受託・IT開発', weights: { llc: 1, kk: 2 } },
          { label: '建設・人材・飲食など許認可が要る業種', weights: { llc: 1, kk: 1 },
            insight: '許認可が必要な業種は、資本金の額や法人形態の要件があることがあります。監督官庁の要件を事前に確認してください。' },
          { label: '会員制・地域・公益的な活動', weights: { shadan: 3 } }
        ] },
      { id: 'q4', section: 'sec2', text: '年間の利益（もうけ）の見込みは？',
        hint: '一般に、利益が大きくなるほど法人の方が税制メリットが出やすくなります（分岐点は事業により異なるため、具体的な判断は税理士等へご確認ください）。',
        hintSource: SOURCES.NTA,
        options: [
          { label: 'まだほとんど無い / 読めない', weights: { kojin: 3 } },
          { label: '数百万円くらい', weights: { kojin: 1, llc: 2, kk: 1 } },
          { label: '大きい見込み（目安1,000万円前後〜）', weights: { llc: 2, kk: 2 } }
        ] },
      { id: 'q5', section: 'sec2', text: '事業資金の集め方は？',
        hint: '投資家から出資を受けたり、株式で資金を集めて拡大・上場を目指すなら株式会社が基本です。',
        options: [
          { label: '自己資金の範囲でコツコツ', weights: { kojin: 2, llc: 1, shadan: 1 } },
          { label: '銀行などからの融資も使うかも', weights: { kojin: 1, llc: 2, kk: 1 } },
          { label: '投資家からの出資・株式発行・上場も視野', weights: { kk: 3 },
            insight: '出資・上場を本気で目指すなら株式会社。合同会社は株式による資金調達ができません。' }
        ] },
      { id: 'q6', section: 'sec2', text: '会社の「維持コスト・手間」についての考えは？',
        hint: '法人は赤字でも法人住民税の均等割（標準で最低・年約7万円／自治体・資本金による）がかかり、決算や社会保険の手間も生じます。',
        hintSource: SOURCES.SOUMU_JUMINZEI,
        options: [
          { label: 'とにかく身軽・低コストがいい', weights: { kojin: 3, llc: 1, shadan: 1 },
            insight: '個人事業は登記・維持費がほぼ不要で最も身軽。まず個人事業→軌道に乗ったら法人化（法人成り）という順番もあります。' },
          { label: '信用や節税のためなら手間・コストはかけてよい', weights: { llc: 1, kk: 1, shadan: 1 } }
        ] },
      { id: 'q7', section: 'sec3', text: '事業で抱える「借金・在庫・賠償」などのリスクは？',
        hint: '個人事業は無限責任（事業の負債に個人の財産まで責任）。法人は原則有限責任（出資の範囲）ですが、借入時の個人保証など例外もあります。',
        options: [
          { label: '小さい（大きな仕入れ・借入・賠償リスクは少ない）', weights: { kojin: 2, llc: 1, shadan: 1 } },
          { label: 'それなりにある（在庫・借入・対人賠償など）', weights: { llc: 2, kk: 2, shadan: 1 },
            insight: 'リスクが大きい事業ほど、有限責任の法人（合同会社・株式会社）を検討する価値があります。' }
        ] },
      { id: 'q8', section: 'sec4', text: '主な取引先・お客さんは？',
        hint: '取引先や公共案件では「相手が法人でないと契約できない」ことがあります。',
        options: [
          { label: '主に個人のお客さん', weights: { kojin: 2, llc: 1 } },
          { label: '企業・官公庁との取引が中心／増やしたい', weights: { kk: 3, llc: 1 } },
          { label: '会員・地域・支援者など（非営利的）', weights: { shadan: 3 } }
        ] },
      { id: 'q9', section: 'sec4', text: '事業をどれくらい続ける想定ですか？',
        options: [
          { label: 'まず試してみたい', weights: { kojin: 2, shadan: 1 } },
          { label: '長く本業として続けたい', weights: { llc: 2, kk: 1 } },
          { label: '家族や次世代に引き継ぎたい', weights: { kk: 2, llc: 1 },
            insight: '事業承継や出資者の参加を考えるなら、持分・株式で引き継げる法人が有利です。' }
        ] },
      { id: 'q10', section: 'sec4', text: '対外的な「会社の見え方」で希望に近いのは？',
        options: [
          { label: '屋号や個人名で十分', weights: { kojin: 2, llc: 1 } },
          { label: '「合同会社○○」で十分', weights: { llc: 3 } },
          { label: '「株式会社○○」の信用がほしい', weights: { kk: 3 } },
          { label: '「一般社団法人○○」など非営利の看板', weights: { shadan: 3 } }
        ] }
    ],
    // 診断で提示する4タイプ
    types: {
      kojin: { key: 'kojin', name: '個人事業主', short: '個人事業', flow: 'kojin', buildStatus: 'full',
        tagline: '登記も費用も不要。まず小さく始めたい人に。',
        costText: '0円（登記不要）',
        pros: ['設立費用0円・登記不要', '手続きは開業届などごく少数', '会計・事務がシンプル'],
        cons: ['社会的信用は法人に劣る場面がある', '無限責任（個人の財産まで責任）', '利益が大きいと税負担で不利になりやすい'],
        source: SOURCES.NTA_KAIGYO },
      llc: { key: 'llc', name: '合同会社（LLC）', short: '合同会社', flow: 'llc', buildStatus: 'full',
        tagline: '低コストで法人の信用と有限責任を得たい人に。',
        costText: '法定費用 約6万円〜（電子定款）',
        pros: ['株式会社より安く設立（法定 約6万円〜）', '定款の公証人認証が不要', '有限責任・法人の信用が得られる'],
        cons: ['株式会社より知名度・信用がやや劣る場合がある', '株式による資金調達はできない'],
        source: SOURCES.MOJ_LLC },
      kk: { key: 'kk', name: '株式会社', short: '株式会社', flow: 'kk', buildStatus: 'full',
        tagline: '信用・資金調達・拡大を重視する人に。',
        costText: '法定費用 約20〜25万円（電子定款で約19万円〜）',
        pros: ['社会的信用が高い', '株式発行で資金調達しやすい', '上場を目指せる'],
        cons: ['設立費用が高い', '定款の公証人認証が必要', '決算公告の義務がある'],
        source: SOURCES.MOJ_KK },
      shadan: { key: 'shadan', name: '一般社団法人', short: '一般社団', flow: 'shadan', buildStatus: 'full',
        tagline: '非営利・公益的な活動を法人でやりたい人に。',
        costText: '法定費用 約11万円（認証5万＋登録免許税6万・印紙不要）',
        pros: ['非営利活動の受け皿として信用が得やすい', '事業内容の制限が比較的ゆるい', '設立時社員2名以上で設立可'],
        cons: ['利益を構成員へ分配できない', '定款の公証人認証が必要', '設立に社員2名以上が必要'],
        source: SOURCES.MOJ_HOUMUKYOKU }
    }
  };

  // ============ 手続きフロー（タイプ別） ============
  var FLOWS = {
    // ---- 個人事業（フル対応・軽量） ----
    kojin: {
      dateField: 'kaigyoDate', dateLabel: '開業予定日',
      inputFields: [
        ['yago', '屋号（任意）', '例）カフェ○○（無くてもOK）', 'text', false],
        ['jigyo', '事業の内容', '例）Webサイトの制作', 'text', true],
        ['name', '氏名', '例）山田太郎', 'text', true],
        ['address', '納税地（住所）', '例）東京都渋谷区○○1-2-3', 'text', true],
        ['kaigyoDate', '開業予定日', '', 'date', true]
      ],
      steps: [
        { id: 'k1', phase: '開業', title: '1. 開業の基本を決める',
          desc: '屋号（任意）・事業内容・開業日を決めます。屋号は無くても開業できます。', source: SOURCES.NTA_KAIGYO },
        { id: 'k2', phase: '開業', title: '2. 開業届を税務署へ出す',
          desc: '「個人事業の開業・廃業等届出書」を提出します。開業日から1ヶ月以内。費用は無料です。', source: SOURCES.NTA_KAIGYO },
        { id: 'k3', phase: '節税', title: '3. 青色申告の承認申請を出す',
          desc: '「所得税の青色申告承認申請書」を提出すると最大65万円控除など節税に。開業届と同時提出が便利。', source: SOURCES.NTA_AOIRO },
        { id: 'k4', phase: '任意', title: '4. 必要に応じて追加の届出',
          desc: '人を雇うなら給与支払事務所の開設届など。都道府県へ事業開始等申告書が必要な場合も。', source: SOURCES.NTA_KAIGYO }
      ],
      filings: [
        { id: 'kf_kaigyo', office: '税務署', name: '個人事業の開業・廃業等届出書（開業届）',
          offsetMonths: 1, required: '必須', source: SOURCES.NTA_KAIGYO, note: '開業日から1ヶ月以内。費用は無料。' },
        { id: 'kf_aoiro', office: '税務署', name: '所得税の青色申告承認申請書',
          offsetMonths: 2, required: '推奨（節税）', source: SOURCES.NTA_AOIRO,
          note: 'その年から青色にするなら原則3月15日まで。1月16日以降の開業は開業日から2ヶ月以内（表示日は後者の目安）。' },
        { id: 'kf_kyuyo', office: '税務署', name: '給与支払事務所等の開設届出書',
          offsetMonths: 1, required: '人を雇う場合', source: SOURCES.NTA, note: '給与支払事務所の開設から1ヶ月以内。' }
      ],
      documents: [
        { id: 'kaigyo_guide', title: '開業届 記入ガイド（下書き）', fn: 'generateKaigyoGuide' },
        { id: 'aoiro_guide', title: '青色申告承認申請書 記入ガイド（下書き）', fn: 'generateAoiroGuide' }
      ]
    },

    // ---- 合同会社（フル対応） ----
    llc: {
      dateField: 'foundedDate', dateLabel: '設立予定日（登記申請日）',
      inputFields: [
        ['shomei', '商号', '例）テスト合同会社（「合同会社」を含めます）', 'text', true],
        ['mokuteki', '事業目的', '例）ソフトウェアの企画・開発・販売', 'text', true],
        ['honten', '本店所在地', '例）東京都渋谷区（定款は最小行政区画まで／申請書は番地まで）', 'text', true],
        ['shihonkin', '資本金（円）', '例）1000000', 'number', true],
        ['daihyoName', '代表社員 氏名', '例）山田太郎', 'text', true],
        ['daihyoAddr', '代表社員 住所', '例）東京都渋谷区○○1-2-3', 'text', true],
        ['fiscalEnd', '事業年度の末日', '例）3月31日', 'text', true],
        ['foundedDate', '設立予定日（登記申請日）', '', 'date', true]
      ],
      steps: [
        { id: 's1', phase: '設立', title: '1. 基本事項を決める',
          desc: '商号・事業目的・本店所在地・資本金・代表社員・事業年度を決めます。商号には「合同会社」を含めます。', source: SOURCES.MOJ_LLC },
        { id: 's2', phase: '設立', title: '2. 法人の実印を作る',
          desc: '会社の代表者印（実印）を作成します。実費の目安は1万〜1.5万円。', source: SOURCES.MOJ_LLC },
        { id: 's3', phase: '設立', title: '3. 定款を作成する',
          desc: '会社の基本規則を作成します。合同会社は公証人の認証は不要。電子定款なら収入印紙4万円が不要（紙は4万円必要）。', source: SOURCES.MOJ_LLC },
        { id: 's4', phase: '設立', title: '4. 出資金を払い込む',
          desc: '代表社員の個人口座へ資本金を払い込み、通帳のコピーで証明します。', source: SOURCES.MOJ_LLC },
        { id: 's5', phase: '設立', title: '5. 登記書類を作成・製本する',
          desc: '設立登記申請書・定款・払込証明書・印鑑届書・代表社員の印鑑証明書（3か月以内）等を揃えます。', source: SOURCES.MOJ_LLC },
        { id: 's6', phase: '設立', title: '6. 法務局へ登記申請する',
          desc: '書面（持参・郵送）またはオンラインで申請。登録免許税は資本金×0.7%、最低6万円。申請日が原則「設立日」。', source: SOURCES.MOJ_LLC },
        { id: 's7', phase: '設立後', title: '7. 設立後の届出をする',
          desc: '税務署・都道府県・年金事務所などへ期限内に届け出ます。「届出・期限」タブで確認してください。', source: SOURCES.NTA }
      ],
      filings: [
        { id: 'f_pension', office: '年金事務所', name: '健康保険・厚生年金保険 新規適用届',
          offsetDays: 5, required: '必須', source: SOURCES.NENKIN, note: '社会保険は法人に加入義務。設立から5日以内。' },
        { id: 'f_tax_setsuritsu', office: '税務署', name: '法人設立届出書',
          offsetMonths: 2, required: '必須', source: SOURCES.NTA, note: '設立日から2ヶ月以内。' },
        { id: 'f_tax_aoiro', office: '税務署', name: '青色申告の承認申請書',
          offsetMonths: 3, required: '推奨（節税）', source: SOURCES.NTA, note: '設立から3ヶ月 または 事業年度末の早い方の前日まで。実質的にほぼ必須。' },
        { id: 'f_tax_kyuyo', office: '税務署', name: '給与支払事務所等の開設届出書',
          offsetMonths: 1, required: '給与を支払う場合は必須', source: SOURCES.NTA, note: '給与支払事務所の開設から1ヶ月以内。役員報酬を出す場合も対象。' },
        { id: 'f_pref', office: '都道府県税事務所', name: '法人設立届出書（都道府県）',
          depends: 'municipal', muniRole: 'pref', required: '必須', source: SOURCES.TOKYO_TAX,
          note: '期限は自治体により異なる（例：東京都は事業開始日から15日以内）。お住まいの自治体で要確認。' },
        { id: 'f_city', office: '市区町村役場', name: '法人設立届出書（市区町村）',
          depends: 'municipal', muniRole: 'city', required: '必須（東京23区は不要）', source: SOURCES.TOKYO_TAX,
          note: '東京23区は区役所への提出不要（都税事務所に一本化）。その他は自治体で要確認。' },
        { id: 'f_rousai', office: '労働基準監督署', name: '労働保険 保険関係成立届',
          depends: 'employee', required: '従業員を雇う場合', source: SOURCES.EGOV, note: '従業員を雇用した日の翌日から10日以内。' },
        { id: 'f_hello', office: 'ハローワーク', name: '雇用保険 適用事業所設置届',
          depends: 'employee', required: '従業員を雇う場合', source: SOURCES.EGOV, note: '設置日の翌日から10日以内。' }
      ],
      documents: [
        { id: 'teikan', title: '定款（ドラフト）', fn: 'generateTeikan' },
        { id: 'shodakusho', title: '代表社員 就任承諾書（ドラフト）', fn: 'generateShodakusho' },
        { id: 'haraikomi', title: '払込証明書（ドラフト）', fn: 'generateHaraikomi' },
        { id: 'shinseisho', title: '合同会社設立登記申請書（ドラフト）', fn: 'generateShinseisho' },
        { id: 'tokijiko', title: '登記すべき事項（テキスト）', fn: 'generateTokijiko' }
      ]
    },

    // ---- 株式会社（フル対応・発起設立／一人株式会社を基本形に） ----
    kk: {
      dateField: 'foundedDate', dateLabel: '設立予定日（登記申請日）',
      inputFields: [
        ['shomei', '商号', '例）テスト株式会社（「株式会社」を含めます）', 'text', true],
        ['mokuteki', '事業目的', '例）ソフトウェアの企画・開発・販売', 'text', true],
        ['honten', '本店所在地', '例）東京都渋谷区（定款は最小行政区画まで／申請書は番地まで）', 'text', true],
        ['shihonkin', '資本金（円）', '例）1000000', 'number', true],
        ['hakkoStock', '設立時発行株式数', '例）100', 'number', true],
        ['daihyoName', '発起人＝設立時代表取締役 氏名', '例）山田太郎', 'text', true],
        ['daihyoAddr', '発起人＝設立時代表取締役 住所', '例）東京都渋谷区○○1-2-3', 'text', true],
        ['fiscalEnd', '事業年度の末日', '例）3月31日', 'text', true],
        ['foundedDate', '設立予定日（登記申請日）', '', 'date', true]
      ],
      steps: [
        { id: 'ks1', phase: '設立', title: '1. 基本事項を決める',
          desc: '商号・事業目的・本店所在地・資本金・設立時発行株式数・機関設計・事業年度を決めます。商号には「株式会社」を含めます。', source: SOURCES.MOJ_KK },
        { id: 'ks2', phase: '設立', title: '2. 会社の実印を作る',
          desc: '会社の代表者印（実印）を作成します。実費の目安は1万〜1.5万円。', source: SOURCES.MOJ_KK },
        { id: 'ks3', phase: '設立', title: '3. 定款を作成し、公証役場で認証を受ける',
          desc: '株式会社は公証人の認証が必須（合同会社と違う点）。認証手数料は資本金100万円未満3万円／100万円以上300万円未満4万円／それ以上5万円（一定要件で1.5万円）。電子定款なら収入印紙4万円が不要（紙は4万円必要）。', source: SOURCES.KOSHONIN_FEE },
        { id: 'ks4', phase: '設立', title: '4. 出資金を払い込む',
          desc: '発起人の個人口座へ資本金を払い込み、通帳のコピーで証明します。', source: SOURCES.MOJ_KK },
        { id: 'ks5', phase: '設立', title: '5. 設立時取締役を選任し、設立事項を調査する',
          desc: '設立時取締役等を選任し、出資の履行・設立手続が法令・定款に適合するか調査して調査報告書を作成します。', source: SOURCES.MOJ_KK },
        { id: 'ks6', phase: '設立', title: '6. 登記書類を作成・製本する',
          desc: '認証済み定款・発起人の同意書・設立時取締役等の就任承諾書・調査報告書・払込証明書・印鑑証明書・印鑑届書・資本金の額の計上に関する証明書 等を揃えます。', source: SOURCES.MOJ_KK },
        { id: 'ks7', phase: '設立', title: '7. 法務局へ設立登記を申請する',
          desc: '書面（持参・郵送）またはオンラインで申請。登録免許税は資本金×0.7%、最低15万円。申請日が原則「設立日」。', source: SOURCES.MOJ_KK },
        { id: 'ks8', phase: '設立後', title: '8. 設立後の届出をする',
          desc: '税務署・都道府県・年金事務所などへ期限内に届け出ます。「届出・期限」タブで確認してください。', source: SOURCES.NTA }
      ],
      filings: [
        { id: 'kkf_pension', office: '年金事務所', name: '健康保険・厚生年金保険 新規適用届',
          offsetDays: 5, required: '必須', source: SOURCES.NENKIN, note: '社会保険は法人に加入義務。設立から5日以内。' },
        { id: 'kkf_tax_setsuritsu', office: '税務署', name: '法人設立届出書',
          offsetMonths: 2, required: '必須', source: SOURCES.NTA, note: '設立日から2ヶ月以内。' },
        { id: 'kkf_tax_aoiro', office: '税務署', name: '青色申告の承認申請書',
          offsetMonths: 3, required: '推奨（節税）', source: SOURCES.NTA, note: '設立から3ヶ月 または 事業年度末の早い方の前日まで。実質的にほぼ必須。' },
        { id: 'kkf_tax_kyuyo', office: '税務署', name: '給与支払事務所等の開設届出書',
          offsetMonths: 1, required: '給与を支払う場合は必須', source: SOURCES.NTA, note: '給与支払事務所の開設から1ヶ月以内。役員報酬を出す場合も対象。' },
        { id: 'kkf_pref', office: '都道府県税事務所', name: '法人設立届出書（都道府県）',
          depends: 'municipal', muniRole: 'pref', required: '必須', source: SOURCES.TOKYO_TAX,
          note: '期限は自治体により異なる（例：東京都は事業開始日から15日以内）。お住まいの自治体で要確認。' },
        { id: 'kkf_city', office: '市区町村役場', name: '法人設立届出書（市区町村）',
          depends: 'municipal', muniRole: 'city', required: '必須（東京23区は不要）', source: SOURCES.TOKYO_TAX,
          note: '東京23区は区役所への提出不要（都税事務所に一本化）。その他は自治体で要確認。' },
        { id: 'kkf_rousai', office: '労働基準監督署', name: '労働保険 保険関係成立届',
          depends: 'employee', required: '従業員を雇う場合', source: SOURCES.EGOV, note: '従業員を雇用した日の翌日から10日以内。' },
        { id: 'kkf_hello', office: 'ハローワーク', name: '雇用保険 適用事業所設置届',
          depends: 'employee', required: '従業員を雇う場合', source: SOURCES.EGOV, note: '設置日の翌日から10日以内。' }
      ],
      documents: [
        { id: 'teikan_kk', title: '定款（ドラフト）', fn: 'generateTeikanKK' },
        { id: 'hokkinin_kk', title: '発起人決定書（ドラフト）', fn: 'generateHokkininKK' },
        { id: 'shodakusho_kk', title: '就任承諾書（設立時取締役・代表取締役／ドラフト）', fn: 'generateShodakushoKK' },
        { id: 'chosa_kk', title: '設立時取締役の調査報告書（ドラフト）', fn: 'generateChosaKK' },
        { id: 'haraikomi_kk', title: '払込証明書（ドラフト）', fn: 'generateHaraikomiKK' },
        { id: 'shinseisho_kk', title: '株式会社設立登記申請書（ドラフト）', fn: 'generateShinseishoKK' },
        { id: 'tokijiko_kk', title: '登記すべき事項（テキスト）', fn: 'generateTokijikoKK' }
      ]
    },

    // ---- 一般社団法人（フル対応・非営利型でない通常の一般社団を基本形に） ----
    shadan: {
      dateField: 'foundedDate', dateLabel: '設立予定日（登記申請日）',
      inputFields: [
        ['meisho', '名称', '例）一般社団法人テスト会（「一般社団法人」を含めます）', 'text', true],
        ['mokuteki', '目的・主な事業', '例）○○の普及・調査研究・広報活動', 'text', true],
        ['jimusho', '主たる事務所', '例）東京都渋谷区（定款は最小行政区画まで／申請書は番地まで）', 'text', true],
        ['daihyoName', '設立時代表理事 氏名（設立時社員を兼ねる）', '例）山田太郎', 'text', true],
        ['daihyoAddr', '設立時代表理事 住所', '例）東京都渋谷区○○1-2-3', 'text', true],
        ['shain2Name', 'もう一人の設立時社員 氏名（社員は2名以上必要）', '例）鈴木花子', 'text', true],
        ['fiscalEnd', '事業年度の末日', '例）3月31日', 'text', true],
        ['foundedDate', '設立予定日（登記申請日）', '', 'date', true]
      ],
      steps: [
        { id: 'sh1', phase: '設立', title: '1. 基本事項を決める',
          desc: '名称・目的・主たる事務所・機関設計・事業年度・設立時社員（2名以上必要）を決めます。名称には「一般社団法人」を含めます。', source: SOURCES.MOJ_HOUMUKYOKU },
        { id: 'sh2', phase: '設立', title: '2. 法人の実印を作る',
          desc: '法人の代表者印（実印）を作成します。実費の目安は1万〜1.5万円。', source: SOURCES.MOJ_HOUMUKYOKU },
        { id: 'sh3', phase: '設立', title: '3. 定款を作成し、公証役場で認証を受ける',
          desc: '設立時社員が定款を作成し、公証人の認証を受けます（必須）。認証手数料は5万円（資本金の概念がないため一律）。一般社団法人の定款には収入印紙4万円は不要（非課税）。', source: SOURCES.KOSHONIN_SHADAN },
        { id: 'sh4', phase: '設立', title: '4. 設立時理事の選任・代表理事の互選・設立手続の調査',
          desc: '設立時社員の決議で設立時理事を選任し、設立時理事の互選で代表理事を選定。設立時理事が設立手続の適法性を調査します。', source: SOURCES.MOJ_HOUMUKYOKU },
        { id: 'sh5', phase: '設立', title: '5. 登記書類を作成・製本する',
          desc: '認証済み定款・設立時社員の決議書・設立時代表理事の互選書・就任承諾書・設立時理事の印鑑証明書 等を揃えます。', source: SOURCES.MOJ_HOUMUKYOKU },
        { id: 'sh6', phase: '設立', title: '6. 法務局へ設立登記を申請する',
          desc: '書面（持参・郵送）またはオンラインで申請。登録免許税は6万円（定額）。申請日が原則「設立日」。', source: SOURCES.MOJ_HOUMUKYOKU },
        { id: 'sh7', phase: '設立後', title: '7. 設立後の届出をする',
          desc: '税務署・都道府県・年金事務所などへ期限内に届け出ます。「届出・期限」タブで確認してください。', source: SOURCES.NTA }
      ],
      filings: [
        { id: 'shf_pension', office: '年金事務所', name: '健康保険・厚生年金保険 新規適用届',
          offsetDays: 5, required: '原則必須', source: SOURCES.NENKIN, note: '社会保険は法人に加入義務（役員報酬・従業員がいる場合）。設立から5日以内。' },
        { id: 'shf_tax_setsuritsu', office: '税務署', name: '法人設立届出書',
          offsetMonths: 2, required: '必須', source: SOURCES.NTA, note: '設立日から2ヶ月以内。' },
        { id: 'shf_tax_aoiro', office: '税務署', name: '青色申告の承認申請書',
          offsetMonths: 3, required: '収益事業を行う場合', source: SOURCES.NTA, note: '収益事業を行う場合。設立から3ヶ月 または 事業年度末の早い方の前日まで。' },
        { id: 'shf_tax_kyuyo', office: '税務署', name: '給与支払事務所等の開設届出書',
          offsetMonths: 1, required: '給与を支払う場合は必須', source: SOURCES.NTA, note: '給与支払事務所の開設から1ヶ月以内。役員報酬を出す場合も対象。' },
        { id: 'shf_pref', office: '都道府県税事務所', name: '法人設立届出書（都道府県）',
          depends: 'municipal', muniRole: 'pref', required: '必須', source: SOURCES.TOKYO_TAX,
          note: '期限は自治体により異なる（例：東京都は事業開始日から15日以内）。非営利型で収益事業がない場合の均等割の扱いも含め、お住まいの自治体で要確認。' },
        { id: 'shf_city', office: '市区町村役場', name: '法人設立届出書（市区町村）',
          depends: 'municipal', muniRole: 'city', required: '必須（東京23区は不要）', source: SOURCES.TOKYO_TAX,
          note: '東京23区は区役所への提出不要（都税事務所に一本化）。その他は自治体で要確認。' },
        { id: 'shf_rousai', office: '労働基準監督署', name: '労働保険 保険関係成立届',
          depends: 'employee', required: '従業員を雇う場合', source: SOURCES.EGOV, note: '従業員を雇用した日の翌日から10日以内。' },
        { id: 'shf_hello', office: 'ハローワーク', name: '雇用保険 適用事業所設置届',
          depends: 'employee', required: '従業員を雇う場合', source: SOURCES.EGOV, note: '設置日の翌日から10日以内。' }
      ],
      documents: [
        { id: 'teikan_shadan', title: '定款（ドラフト）', fn: 'generateTeikanShadan' },
        { id: 'ketsugisho_shadan', title: '設立時社員の決議書（ドラフト）', fn: 'generateKetsugishoShadan' },
        { id: 'gosen_shadan', title: '設立時代表理事 選定書（ドラフト）', fn: 'generateGosenShadan' },
        { id: 'shodakusho_shadan', title: '就任承諾書（設立時理事・代表理事／ドラフト）', fn: 'generateShodakushoShadan' },
        { id: 'shinseisho_shadan', title: '一般社団法人設立登記申請書（ドラフト）', fn: 'generateShinseishoShadan' },
        { id: 'tokijiko_shadan', title: '登記すべき事項（テキスト）', fn: 'generateTokijikoShadan' }
      ]
    }
  };

  // 各質問に「わからない」回避ルートを追加（迷う人は身軽で後戻りできる個人事業へ軽く寄せる）
  DIAGNOSIS.questions.forEach(function (q) {
    q.options.push({ label: 'わからない・まだ決めていない', weights: { kojin: 1 }, unsure: true });
  });

  // 理想別「必要なこと・覚悟」（理想フィット診断の結果で表示。数値は一次情報で確認済み）
  var IDEAL_REQUIREMENTS = {
    kojin: [
      { text: '開業届を税務署へ提出する（費用0円・登記不要）', source: SOURCES.NTA_KAIGYO },
      { text: '確定申告を自分で行う（青色申告なら最大65万円控除も）', source: SOURCES.NTA_AOIRO },
      { text: '「無限責任」——事業の負債は個人の財産で負う点を理解しておく', source: null }
    ],
    llc: [
      { text: '設立費用 約6万円〜＋当面の運転資金を用意する', source: SOURCES.MOJ_LLC },
      { text: '社長ひとりでも社会保険（健康保険・厚生年金）に加入する', source: SOURCES.NENKIN_TEKIYO },
      { text: '赤字でも法人住民税の均等割（年約7万円〜）を払う覚悟', source: SOURCES.SOUMU_JUMINZEI },
      { text: '定款の作成・法務局への設立登記（自分で or 専門家に依頼）', source: SOURCES.MOJ_LLC }
    ],
    kk: [
      { text: '設立費用 約20〜25万円を用意する（電子定款なら約19万円〜）', source: SOURCES.NTA_TOROKU },
      { text: '定款は公証人の認証が必要（合同会社と違い必須。手数料3万〜5万円）', source: SOURCES.KOSHONIN_FEE },
      { text: '社長ひとりでも社会保険に加入する', source: SOURCES.NENKIN_TEKIYO },
      { text: '赤字でも法人住民税の均等割（年約7万円〜）を払う覚悟', source: SOURCES.SOUMU_JUMINZEI },
      { text: '決算公告など、会社としての運営義務を負う', source: null }
    ],
    shadan: [
      { text: '設立費用 約11万円（認証5万＋登録免許税6万・定款印紙は不要）', source: SOURCES.KOSHONIN_SHADAN },
      { text: '設立時に社員が2名以上必要', source: SOURCES.MOJ_HOUMUKYOKU },
      { text: '定款は公証人の認証が必要（手数料5万円）', source: SOURCES.KOSHONIN_SHADAN },
      { text: '利益を構成員へ分配できない（非営利）点を理解しておく', source: null },
      { text: '社会保険への加入が必要', source: SOURCES.NENKIN_TEKIYO }
    ]
  };

  // 自治体別の届出期限DB（法人設立時の都道府県税事務所・市区町村への設立届）。
  // 掲載は各自治体の公式ページで期限を直接確認できたもののみ（C-02）。未掲載の自治体は
  // UI上「要確認（都道府県を選択）」を表示する。pref: 都道府県税事務所への設立届。
  // city: 市区町村への設立届に関する注記。offsetDays/offsetMonths は設立日(dateField)起点。
  // prompt:true は「速やかに」＝明確な日数の定めがない自治体（日付は計算しない）。
  // 並び順は都道府県コード順。
  var MUNICIPAL = {
    lastVerified: '2026-07-13',
    note: '掲載は公式ページで確認できた都道府県のみ。「すみやかに」は明確な日数の定めがないことを示します。未掲載・不明の場合は各自治体の公式情報で必ずご確認ください。',
    prefectures: [
      { key: 'hokkaido', name: '北海道',
        pref: { offsetMonths: 2, source: SOURCES.PREF_HOKKAIDO,
          note: '道税事務所へ、設立の日から2か月以内（先に事業を開始した場合は開始日から10日以内）。' },
        city: { source: SOURCES.PREF_HOKKAIDO,
          note: '市区町村（札幌市など）にも別途「法人設立・設置届出書」を提出。' } },
      { key: 'saitama', name: '埼玉県',
        pref: { prompt: true, source: SOURCES.PREF_SAITAMA,
          note: '県税事務所へ、設立後すみやかに（明確な日数の定めなし）。' },
        city: { source: SOURCES.PREF_SAITAMA,
          note: '市区町村役場（政令市は市税事務所）にも別途「法人設立届出書」を提出。' } },
      { key: 'chiba', name: '千葉県',
        pref: { offsetMonths: 1, source: SOURCES.PREF_CHIBA,
          note: '県税事務所へ、設立の日から1か月以内。' },
        city: { source: SOURCES.PREF_CHIBA,
          note: '市区町村役場（政令市は市税事務所）にも別途「法人設立届出書」を提出。' } },
      { key: 'tokyo', name: '東京都',
        pref: { offsetDays: 15, source: SOURCES.TOKYO_TAX,
          note: '都税事務所へ、設立（事業開始）の日から15日以内。' },
        city: { source: SOURCES.TOKYO_TAX,
          note: '東京23区内は区役所への提出不要（都税事務所に一本化）。多摩地域など市部は各市区町村役場へも別途提出。' } },
      { key: 'kanagawa', name: '神奈川県',
        pref: { offsetMonths: 2, source: SOURCES.PREF_KANAGAWA,
          note: '県税事務所へ、事業を開始した日から2か月以内。' },
        city: { source: SOURCES.PREF_KANAGAWA,
          note: '市区町村役場（政令市は市税事務所）にも別途「法人設立届出書」を提出。' } },
      { key: 'aichi', name: '愛知県',
        pref: { offsetMonths: 2, source: SOURCES.PREF_AICHI,
          note: '県税事務所へ、設立の日から2か月以内。' },
        city: { source: SOURCES.PREF_AICHI,
          note: '市区町村役場（政令市は市税事務所）にも別途「法人設立届出書」を提出。' } },
      { key: 'kyoto', name: '京都府',
        pref: { prompt: true, source: SOURCES.PREF_KYOTO,
          note: '京都地方税機構（府税）へ、設立後すみやかに（明確な日数の定めなし）。' },
        city: { source: SOURCES.PREF_KYOTO,
          note: '市区町村役場（京都市は市税事務所）にも別途「法人設立届出書」を提出。' } },
      { key: 'osaka', name: '大阪府',
        pref: { offsetMonths: 2, source: SOURCES.PREF_OSAKA,
          note: '府税事務所へ、設立の日から2か月以内（法人設立等申告書）。' },
        city: { source: SOURCES.PREF_OSAKA,
          note: '市区町村役場（政令市は市税事務所）にも別途「法人設立届出書」を提出。' } },
      { key: 'hyogo', name: '兵庫県',
        pref: { prompt: true, source: SOURCES.PREF_HYOGO,
          note: '県税事務所へ、設立後すみやかに（明確な日数の定めなし）。' },
        city: { source: SOURCES.PREF_HYOGO,
          note: '市区町村役場（政令市は市税事務所）にも別途「法人設立届出書」を提出。' } }
    ]
  };

  var DATA = { SOURCES: SOURCES, META: META, DIAGNOSIS: DIAGNOSIS, FLOWS: FLOWS,
    IDEAL_REQUIREMENTS: IDEAL_REQUIREMENTS, MUNICIPAL: MUNICIPAL, TYPE_KEYS: ['kojin', 'llc', 'kk', 'shadan'] };

  global.HN_DATA = DATA;
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
