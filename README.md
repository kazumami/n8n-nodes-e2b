# n8n-nodes-e2b 開発依頼書

## 概要

E2B Code Interpreter をラップした n8n コミュニティノードを作成する。
サンドボックスのライフサイクルを個別操作として分離し、ワークフロー内で自由に組み合わせられる設計とする。

## 技術要件

### スキャフォールド

- n8n-nodes-starter テンプレート（https://github.com/n8n-io/n8n-nodes-starter）を使用
- パッケージ名: `n8n-nodes-e2b`
- 依存: `@e2b/code-interpreter`

### Credential: `E2bApi.credentials.ts`

- 表示名: "E2B API"
- フィールド: `apiKey`（type: string, password: true）
- テスト用リクエスト: E2B API で疎通確認できるエンドポイントがあれば使う、なければ省略可

---

### Node: `E2b.node.ts`

- 表示名: "E2B"
- Resource: "Sandbox"
- 以下の Operation を持つ単一ノード

---

## Operations

### 1. Create Sandbox

サンドボックスを作成し、以降の操作に必要な sandboxId を返す。

**入力パラメータ:**

| Name     | Type   | Required | Default | Description                 |
| -------- | ------ | -------- | ------- | --------------------------- |
| template | string | -        | 空       | カスタムテンプレートID                |
| timeout  | number | -        | 300     | タイムアウト秒（最大86400。Pro未満は3600） |
| envVars  | json   | -        | {}      | サンドボックスに渡す環境変数              |

**出力:**

```json
{
  "sandboxId": "sandbox-xxxx"
}
```

### 2. Execute Code

サンドボックス内でコードを実行する。

**入力パラメータ:**

| Name      | Type            | Required | Default | Description             |
| --------- | --------------- | -------- | ------- | ----------------------- |
| sandboxId | string          | ○        | -       | 対象サンドボックスID             |
| code      | string (多行エディタ) | ○        | -       | 実行するコード                 |
| language  | options         | -        | python  | `python` / `javascript` |

**出力:**

```json
{
  "sandboxId": "sandbox-xxxx",
  "stdout": "...",
  "stderr": "...",
  "results": [],
  "error": ""
}
```

- `results`: runCode の戻り値（チャート・画像等の構造化データ）
- `error`: 実行時エラーがあれば格納

### 3. Run Command

サンドボックス内でシェルコマンドを実行する。

**入力パラメータ:**

| Name       | Type   | Required | Default | Description |
| ---------- | ------ | -------- | ------- | ----------- |
| sandboxId  | string | ○        | -       | 対象サンドボックスID |
| command    | string | ○        | -       | 実行するコマンド    |
| workingDir | string | -        | /       | 作業ディレクトリ    |

**出力:**

```json
{
  "sandboxId": "sandbox-xxxx",
  "stdout": "...",
  "stderr": "...",
  "exitCode": 0
}
```

### 4. Upload File

サンドボックスにファイルをアップロードする。

**入力パラメータ:**

| Name       | Type   | Required | Default | Description    |
| ---------- | ------ | -------- | ------- | -------------- |
| sandboxId  | string | ○        | -       | 対象サンドボックスID    |
| remotePath | string | ○        | -       | サンドボックス内の保存先パス |
| content    | string | ○        | -       | ファイル内容（テキスト）   |

※ バイナリファイル対応: n8n のバイナリ入力があればそちらを優先する（オプション `binaryProperty` フィールドで指定）

**出力:**

```json
{
  "sandboxId": "sandbox-xxxx",
  "remotePath": "/home/user/data.csv",
  "success": true
}
```

### 5. Download File

サンドボックスからファイルをダウンロードする。

**入力パラメータ:**

| Name         | Type    | Required | Default | Description                  |
| ------------ | ------- | -------- | ------- | ---------------------------- |
| sandboxId    | string  | ○        | -       | 対象サンドボックスID                  |
| remotePath   | string  | ○        | -       | サンドボックス内のファイルパス              |
| binaryOutput | boolean | -        | false   | true ならバイナリ出力、false ならテキスト出力 |

**出力（テキスト時）:**

```json
{
  "sandboxId": "sandbox-xxxx",
  "remotePath": "/home/user/result.txt",
  "content": "..."
}
```

**出力（バイナリ時）:**

- n8n のバイナリデータとして出力（後続ノードでファイル保存等が可能）

### 6. List Files

サンドボックス内のファイル一覧を取得する。

**入力パラメータ:**

| Name      | Type   | Required | Default | Description |
| --------- | ------ | -------- | ------- | ----------- |
| sandboxId | string | ○        | -       | 対象サンドボックスID |
| path      | string | -        | /       | 対象ディレクトリ    |

**出力:**

```json
{
  "sandboxId": "sandbox-xxxx",
  "path": "/home/user",
  "files": [
    { "name": "data.csv", "type": "file" },
    { "name": "output", "type": "dir" }
  ]
}
```

### 7. Kill Sandbox

サンドボックスを破棄する。

**入力パラメータ:**

| Name      | Type   | Required | Default | Description |
| --------- | ------ | -------- | ------- | ----------- |
| sandboxId | string | ○        | -       | 対象サンドボックスID |

**出力:**

```json
{
  "sandboxId": "sandbox-xxxx",
  "killed": true
}
```

---

## バリデーション（各 Operation 共通）

- sandboxId が必要な Operation で空ならエラー
- Execute Code: `code` が空ならエラー、`language` が python/javascript 以外ならエラー
- Run Command: `command` が空ならエラー
- Upload File: `remotePath` と `content`（またはバイナリ入力）が空ならエラー
- Download File: `remotePath` が空ならエラー
- Create Sandbox: `timeout` が 0以下 or 86400超 ならエラー

## execute メソッドの疑似コード

```
credential = getCredential('e2bApi')
operation = getParam('operation')

for each item:
  switch operation:
    case 'createSandbox':
      sandbox = Sandbox.create({ template?, timeout, apiKey, envVars })
      output = { sandboxId: sandbox.sandboxId }

    case 'executeCode':
      sandbox = Sandbox.connect(sandboxId, { apiKey })
      execution = sandbox.runCode(code, { language })
      output = { sandboxId, stdout, stderr, results, error }

    case 'runCommand':
      sandbox = Sandbox.connect(sandboxId, { apiKey })
      result = sandbox.commands.run(command, { cwd: workingDir })
      output = { sandboxId, stdout, stderr, exitCode }

    case 'uploadFile':
      sandbox = Sandbox.connect(sandboxId, { apiKey })
      sandbox.files.write(remotePath, content)
      output = { sandboxId, remotePath, success: true }

    case 'downloadFile':
      sandbox = Sandbox.connect(sandboxId, { apiKey })
      content = sandbox.files.read(remotePath)
      output = { sandboxId, remotePath, content } or binary

    case 'listFiles':
      sandbox = Sandbox.connect(sandboxId, { apiKey })
      files = sandbox.files.list(path)
      output = { sandboxId, path, files }

    case 'killSandbox':
      sandbox = Sandbox.connect(sandboxId, { apiKey })
      sandbox.kill()
      output = { sandboxId, killed: true }

  push output
return outputs
```

※ Create 以外の Operation では `Sandbox.connect()` で既存サンドボックスに接続する。
※ 各 Operation のエラーは n8n 標準の continueOnFail に従い処理する。

---

## 想定ワークフロー例

### パターン1: 単発実行（サブワークフロー化向き）

```
Create → Execute Code → Kill
```

### パターン2: データ分析パイプライン

```
Create → Upload File → Execute Code → Execute Code → Download File → Kill
```

### パターン3: 環境構築 + 複数タスク

```
Create → Run Command (pip install) → Execute Code → Execute Code → List Files → Download File → Kill
```

---

## 注意事項

### n8n 2.x の制約

- n8n 2.x 以降、Code ノードは task runner 内で隔離実行されるため、外部 npm モジュールを Code ノードで直接使うことはできない。
- そのためコミュニティノードとしてパッケージ化する必要がある（本依頼の背景）。

### E2B API アーキテクチャ

- E2B はサンドボックスのライフサイクル管理に REST API、データ操作（ファイル・コマンド実行）に gRPC を使うハイブリッド構成。
- HTTP Request ノードだけではコード実行ができないため、SDK（`@e2b/code-interpreter`）の使用が必須。

---

## 公開

- npm に公開（public）
- n8n GUI の「コミュニティノード」からインストールできる状態にする

## 参考

- E2B ドキュメント: https://e2b.dev/docs
- E2B Code Interpreter SDK: https://www.npmjs.com/package/@e2b/code-interpreter
- E2B SDK Reference (Sandbox.connect): https://e2b.dev/docs/sdk-reference/js-sdk/v1.2.0/sandbox
- n8n コミュニティノード開発: https://docs.n8n.io/integrations/community-nodes/build-community-nodes/
- n8n-nodes-starter: https://github.com/n8n-io/n8n-nodes-starter
