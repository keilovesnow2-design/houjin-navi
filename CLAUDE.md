# CLAUDE.md — houjin-navi（合同会社設立ナビ）

## 1. これは何か
合同会社(LLC)を個人が自力設立するのを、意思決定→ステップ→書類ドラフト→届出期限まで導く、**ローカル完結・無料・インストール不要のWebアプリ**。

## 2. 最重要原則（最優先リスク）
**法的に誤った案内をしない。** 数値・期限・書類は必ず出典付き。免責と最終確認日を常時表示。断定を避け、公式・専門家確認へ誘導する。→ CONSTRAINTS.md C-02〜C-05。

## 3. 技術スタック
Vanilla JS + HTML + CSS。依存ゼロ・ビルド不要。永続化=localStorage。テスト=Node標準`node:test`（追加パッケージ不要）。

## 4. ディレクトリ
- `src/index.html` `src/app.css` `src/app.js` `src/data.js`
- `tests/unit/*.test.js`（純粋関数）
- `docs/`（SRS/SDD/TEST_PLAN/E2E） `research/` `harness/`

## 5. 実行・確認
- 使う: `src/index.html` をブラウザで開く。
- テスト: プロジェクト直下で `node --test`（または `npm test`）。

## 6. コンテンツ更新の作法
制度が変わったら **`src/data.js` だけ** を更新し、`META.lastVerified` を更新、出典URLを差し替える。app.jsのロジックは触らない（ADR-002）。

## 7. スコープ外（やらない）
株式会社/現物出資/法人社員/許認可業種、e-Gov連携、電子署名、税務助言、外部送信。

## 8. 出典（一次情報）
- 法務省 合同会社の設立手続: https://www.moj.go.jp/MINJI/minji06_00141.html
- 国税庁 法人設立届出書: https://www.nta.go.jp/
- 日本年金機構 新規適用: https://www.nenkin.go.jp/
- e-Gov / 登記・供託オンライン申請システム

## 9. 不変条件
CONSTRAINTS.md を必ず遵守（外部送信禁止・出典必須・免責常時表示）。

## 10. テストの扱い
テストを改ざんして通さない。純粋関数を`window.HN`にexportしテスト可能に保つ。

## 11. 破壊的操作
「データ全消去」のみ。確認ダイアログ必須。

## 12. 現状
Phase 6実装→Phase 7検証済み。詳細は PROGRESS.md。

## 13. 参照
docs/SRS.md（要件・ID）, docs/SDD.md（設計）, docs/TEST_PLAN.md, research/research_v2.md（確定事項）。
