# TEST_PLAN — houjin-navi（IEEE 829準拠・簡約）
作成日: 2026-07-11 / カバレッジ目標: 純粋関数80%+

## テストピラミッド
- 単体(Node `node:test`): 純粋関数（computeDeadlines, addDays/Months, generate*, buildICS, validateCompany, computeProgress, recommendCompanyType）
- 統合/E2E(手動+スクリプト): ブラウザ操作は E2E_SCENARIOS.md に手順化（ローカルオフライン確認）

## Entry Criteria
- src/app.js の純粋関数が `window.HN`/module.exports 経由で参照可能。

## Exit Criteria
- 全Must要件のTCがPASS。単体テスト全緑。オフライン動作をE2Eで確認。

## テストケース（要件トレース）
| TC | 対象要件 | 検証内容 | 期待 |
|---|---|---|---|
| TC-FR-REMIND-001 | FR-REMIND-001 | 設立日2026-08-01の期限計算 | 新規適用届=2026-08-06 / 法人設立届=2026-10-01 |
| TC-ADD-DAYS | addDays/addMonths | 月跨ぎ・うるう年境界 | 正しい日付 |
| TC-FR-DOC-001 | FR-DOC-001 | 定款/申請書に入力値差込 | 商号・目的・資本金・社員・設立日が全書類に反映 |
| TC-FR-DOC-TOKIJIKO | FR-DOC-001 | 登記すべき事項の網羅 | 目的/商号/本店/資本金/社員/代表社員を含む |
| TC-FR-INPUT-001 | FR-INPUT-001 | 必須欠落検出 | missingに欠落フィールド、ok=false |
| TC-FR-STEP-001 | FR-STEP-001 | 進捗率計算 | チェック数/総数の%が正確 |
| TC-FR-REMIND-002 | FR-REMIND-002 | ICS生成 | VEVENT数=期限数、DTSTART整合 |
| TC-FR-DEC-001 | FR-DEC-001 | 形態推奨 | コスト重視→合同会社推奨＋理由 |
| TC-NFR-FUNC-001 | NFR-FUNC-001 | 全FILINGSにsource | source URLが全項目に存在 |
| TC-FR-STATE-001 | FR-STATE-001 | (E2E)保存復元 | リロードで復元 |
| TC-SEC-001 | SEC-001 | (E2E)通信ゼロ | Networkリクエスト0、外部参照なし |
| TC-NFR-PORT-001 | NFR-PORT-001 | (E2E)オフライン動作 | ネット遮断で全機能可 |

## Suspension
- Must要件TCが1件でもFAILなら実装完了を宣言しない。
