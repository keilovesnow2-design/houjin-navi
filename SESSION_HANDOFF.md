# SESSION_HANDOFF — houjin-navi（法人ナビ）

次セッションはこのファイルを最初に読んでください。

## 0. 最初に読むファイル（順序）
1. `SESSION_HANDOFF.md`（本ファイル）
2. `PROGRESS.md`（進捗・DoD・フェーズ履歴）
3. `ログ/2026-07-12_houjin-navi-セッションログ.md`（直近セッションの詳細）
4. `CLAUDE.md`（プロジェクト規約・不変条件）／`CONSTRAINTS.md`
5. 実装: `src/data.js`（コンテンツ・診断定義）→ `src/app.js`（ロジック・UI）

## 1. 現在の状態（実測 2026-07-13）
- ブランチ: `main`。**未コミットの変更あり**（v2.2 株式会社の本ナビ化：`src/data.js` `src/app.js` `tests/unit/core.test.js` `PROGRESS.md` `SESSION_HANDOFF.md`）。まだ commit/push していない＝**本番未反映**。
- 最新の機能コミット（HEAD）: `a73a01d`（docs）。機能実体は `75b3a10`。
- 単体テスト: `node --test` → **36 pass / 0 fail**
- 本番: https://houjin-navi.kei-love-snow2.workers.dev （HTTP 200・ただし v2.1 状態）
- GitHub: https://github.com/keilovesnow2-design/houjin-navi （push で自動デプロイ）
- チェックポイントtag: `checkpoint-2026-07-12`（v2.1 完成状態）

## 2. 完成している機能
- 理想ドリブン法人診断（10問4セクション／個人事業・合同・株式・一般社団）
- 相性=「その道への近さ」(満点比・100%到達可能)／強みを先に褒める／近づくヒント(上位理想のみ)／必要な準備(出典付き)／what-if(結果で回答変更)／「大丈夫・安心してください」を要所配置
- 探索診断モード／診断スキップ直行
- 手続きナビ フル対応: 個人事業（開業届・青色）・合同会社・**株式会社（v2.2 新規：定款〜認証〜登記〜届出＋書類ドラフト7種＋期限計算＋ICS）**
- 一般社団法人: 概要のみ

## 3. 次セッションの最優先アクション（優先順）
1. **（未反映なら先に）v2.2 を commit → push**（自動デプロイで本番反映）。push 前に `node --test` 緑を再確認。
2. **一般社団法人の本ナビ化**: `FLOWS.shadan` を株式会社と同様にフル構造へ。社員2名以上・定款認証（手数料は資本金区分ではなく別。要一次情報リサーチ）・登録免許税6万円。書類生成関数を `app.js` に追加。
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
