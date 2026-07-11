# SDD — 合同会社設立ナビ（houjin-navi）
準拠: IEEE 1016 / 作成日: 2026-07-11

## 論理ビュー（コンポーネント構成）
- `index.html`: 単一ページ。3ペイン（左:ステップナビ / 中央:内容 / 右:進捗）。
- `data.js`: **コンテンツ層**。制度データを集約（改正時はここだけ更新）。
  - `COMPANY_TYPES`（合同/株式の比較）, `STEPS`（設立6ステップ＋設立後届出）, `DOC_TEMPLATES`（5書類ひな形）, `FILINGS`（届出＋期限ルール＋出典）, `SOURCES`（出典URL）, `META.lastVerified='2026-07-11'`。
- `app.js`: **ロジック層**。状態管理・永続化・レンダリング・書類生成・期限計算・ICS生成。純粋関数を分離（テスト対象）。
- `app.css`: 表示＋印刷用CSS(`@media print`)。
- 依存ゼロ（フレームワーク/CDNなし）。

## プロセスビュー（主要フロー）
1. 起動→localStorage読込→初回なら免責同意モーダル→state復元。
2. 入力→`saveState()`→localStorage（debounce）。
3. 「書類生成」→`generateDocs(state)`→純関数で文字列生成→中央ペインに表示。
4. 設立日変更→`computeDeadlines(foundedDate)`→期限配列→一覧描画。
5. ICS出力→`buildICS(deadlines)`→Blob→ダウンロード。
- 破壊的操作は「データ全消去」のみ（確認ダイアログ必須／FR-STATE, golden #3）。外部送信は存在しない。

## データビュー
- 状態オブジェクト `AppState`:
```
{ agreed:bool, company:{shomei,mokuteki,honten,shihonkin,daihyoName,daihyoAddr,fiscalEnd,foundedDate},
  checks:{[stepId]:bool}, decision:{...answers}, version:1 }
```
- 永続化キー: `houjin-navi/v1`（JSON）。
- `FILINGS[i] = {id,name,office,offsetDays|offsetMonths, required, source, note}`。

## 物理ビュー（デプロイ）
- 配布=`src/`一式をZIP/フォルダで渡す→`index.html`をブラウザで開くだけ。サーバー不要・完全オフライン。

## モジュールIF（純粋関数=テスト対象）
- `computeDeadlines(foundedISO, filings) -> [{name, dueISO, required, source, note}]`
- `addDays(iso,n)` / `addMonths(iso,n)`
- `generateDoteikan(company)`, `generateShokuninShodakusho(company)`, `generateHaraikomi(company)`, `generateTokiShinsei(company)`, `generateTokiJiko(company)` -> string
- `buildICS(deadlines) -> string`
- `validateCompany(company) -> {ok, missing:[field]}`
- `computeProgress(checks, steps) -> percent`
- `recommendCompanyType(answers) -> {type, reasons:[]}`

## ADR
- ADR-001: フレームワーク不採用（Vanilla）。理由=依存ゼロ・オフライン・可搬性・改修容易。代替(React)は無料ローカル完結の趣旨とビルド不要要件に反する。
- ADR-002: コンテンツ(data.js)とロジック(app.js)の分離。理由=制度改正時の更新局所化・正確性維持（RISK-004）。
- ADR-003: 純粋関数を`window.HN`名前空間にexport→Nodeからも読めるようにしテスト可能に。

## トレーサビリティ（要件↔モジュール↔TC）
| 要件 | モジュール | TC |
|---|---|---|
| FR-REMIND-001 | computeDeadlines/addDays/addMonths | TC-FR-REMIND-001 |
| FR-DOC-001 | generate*系 | TC-FR-DOC-001 |
| FR-STATE-001 | saveState/loadState | TC-FR-STATE-001 |
| FR-STEP-001 | computeProgress | TC-FR-STEP-001 |
| FR-INPUT-001 | validateCompany | TC-FR-INPUT-001 |
| FR-SAFETY-001 | data.SOURCES/META + フッター描画 | TC-FR-SAFETY-001 |
| FR-DEC-001 | recommendCompanyType | TC-FR-DEC-001 |
