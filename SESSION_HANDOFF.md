# SESSION_HANDOFF — houjin-navi（法人ナビ）

次セッションはこのファイルを最初に読んでください。

## 0. 最初に読むファイル（順序）
1. `SESSION_HANDOFF.md`（本ファイル）
2. `PROGRESS.md`（進捗・DoD・フェーズ履歴）
3. `ログ/2026-07-12_houjin-navi-セッションログ.md`（直近セッションの詳細）
4. `CLAUDE.md`（プロジェクト規約・不変条件）／`CONSTRAINTS.md`
5. 実装: `src/data.js`（コンテンツ・診断定義）→ `src/app.js`（ロジック・UI）

## 1. 現在の状態（実測 2026-07-12）
- ブランチ: `main`（`origin/main` と一致・差分なし）
- 最新コミット: `75b3a10`
- 単体テスト: `node --test` → 29 pass / 0 fail
- 本番: https://houjin-navi.kei-love-snow2.workers.dev （HTTP 200）
- GitHub: https://github.com/keilovesnow2-design/houjin-navi （push で自動デプロイ）
- チェックポイントtag: `checkpoint-2026-07-12`（本セッション完成点）

## 2. 完成している機能
- 理想ドリブン法人診断（10問4セクション／個人事業・合同・株式・一般社団）
- 相性=「その道への近さ」(満点比・100%到達可能)／強みを先に褒める／近づくヒント(上位理想のみ)／必要な準備(出典付き)／what-if(結果で回答変更)／「大丈夫・安心してください」を要所配置
- 探索診断モード／診断スキップ直行
- 手続きナビ フル対応: 個人事業（開業届・青色）・合同会社（定款〜登記〜届出＋書類ドラフト生成＋期限計算＋ICS）
- 株式会社・一般社団法人: 概要のみ

## 3. 次セッションの最優先アクション（優先順）
1. **株式会社の本ナビ化**: `src/data.js` の `FLOWS.kk` を `overview` から `steps/filings/documents/inputFields` を持つフル構造へ。書類生成関数を `app.js` に追加。**着手前に一次情報リサーチ必須**（登録免許税 最低15万・定款認証必要 等）。
2. **一般社団法人の本ナビ化**: `FLOWS.shadan` 同様。社員2名以上・定款認証。
3. 診断の重み微調整（`DIAGNOSIS.questions[].options[].weights`）。

## 4. やってはいけないこと
- 数値・期限を出典なしで `data.js` に書かない（CONSTRAINTS C-02）。掲載はA/B二源以上一致のみ。
- 外部送信コード（fetch/CDN/解析タグ）を追加しない（C-01）。
- 免責・最終確認日の常時表示を外さない（C-03/C-04）。
- 入力/クリック中に対象を含むDOMを全体再描画しない（FP-001／差分更新で）。
- `Desktop/指示書.md`（6/26・別プロジェクト）を上書きしない。

## 5. 品質ゲート
- 変更後: `node --test` 緑 → ブラウザで `src/index.html` を開き診断→結果→フローを目視 → `git push`（自動デプロイ）→ 本番で相性計算・出典・免責を確認。

## 6. 更新の作法
- 制度・診断は原則 `src/data.js` のみ編集。`META.lastVerified` と `source` を更新。
