# n8n-nodes-e2b

Unofficial n8n community node for [E2B Code Interpreter](https://e2b.dev). Run Python and JavaScript code in secure cloud sandboxes directly from your n8n workflows.

This node wraps the [`@e2b/code-interpreter`](https://www.npmjs.com/package/@e2b/code-interpreter) SDK and exposes sandbox lifecycle operations as individual n8n actions, allowing you to freely compose them within your workflows.

## Installation

1. Open your n8n instance
2. Go to **Settings** > **Community Nodes**
3. Click **Install a community node**
4. Enter `n8n-nodes-e2b`
5. Click **Install**

## Prerequisites

You need an E2B API key. Sign up at [e2b.dev](https://e2b.dev) and get your API key from the dashboard.

### Credential Setup

1. In n8n, go to **Credentials** > **Add Credential**
2. Search for **E2B API**
3. Enter your API key
4. Click **Save**

## Operations

The node provides a single **Sandbox** resource with 7 operations:

### Create Sandbox

Create a new sandbox and return its ID for subsequent operations.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| Template | string | _(empty)_ | Custom sandbox template ID |
| Timeout (Seconds) | number | 300 | Auto-kill timeout (max 86400; requires Pro plan for >3600) |
| Environment Variables | key-value | _(empty)_ | Environment variables passed to the sandbox |

**Output:**
```json
{ "sandboxId": "sandbox-xxxx" }
```

### Execute Code

Execute Python or JavaScript code inside a sandbox.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| Sandbox ID | string | _(required)_ | Target sandbox ID |
| Code | string | _(required)_ | Code to execute (multiline) |
| Language | options | python | `python` or `javascript` |

**Output:**
```json
{
  "sandboxId": "sandbox-xxxx",
  "stdout": "...",
  "stderr": "...",
  "results": [],
  "error": ""
}
```

- `results` contains structured data from code execution (charts, images, etc.)
- `error` contains the error message if execution failed

### Run Command

Run a shell command inside a sandbox.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| Sandbox ID | string | _(required)_ | Target sandbox ID |
| Command | string | _(required)_ | Shell command to run |
| Working Directory | string | `/` | Working directory for the command |

**Output:**
```json
{
  "sandboxId": "sandbox-xxxx",
  "stdout": "...",
  "stderr": "...",
  "exitCode": 0
}
```

### Upload File

Upload a file to a sandbox. Supports both text content and binary data from previous n8n nodes.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| Sandbox ID | string | _(required)_ | Target sandbox ID |
| Remote Path | string | _(required)_ | Destination path inside the sandbox |
| Content | string | _(empty)_ | File content as text (ignored when binary input is used) |
| Binary Property | string | `data` | Name of the input binary property. Binary data takes priority over Content. |

**Output:**
```json
{
  "sandboxId": "sandbox-xxxx",
  "remotePath": "/home/user/data.csv",
  "success": true
}
```

### Download File

Download a file from a sandbox as text or binary data.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| Sandbox ID | string | _(required)_ | Target sandbox ID |
| Remote Path | string | _(required)_ | File path inside the sandbox |
| Binary Output | boolean | false | Output as n8n binary data instead of text |

**Output (text):**
```json
{
  "sandboxId": "sandbox-xxxx",
  "remotePath": "/home/user/result.txt",
  "content": "..."
}
```

**Output (binary):** Returns n8n binary data that can be used by downstream nodes (e.g., Write Binary File).

### List Files

List files and directories in a sandbox.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| Sandbox ID | string | _(required)_ | Target sandbox ID |
| Path | string | `/` | Directory path to list |

**Output:**
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

### Kill Sandbox

Terminate a sandbox and release its resources.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| Sandbox ID | string | _(required)_ | Target sandbox ID |

**Output:**
```json
{
  "sandboxId": "sandbox-xxxx",
  "killed": true
}
```

## Workflow Examples

### Simple Code Execution

```
Create Sandbox -> Execute Code -> Kill Sandbox
```

### Data Analysis Pipeline

```
Create Sandbox -> Upload File -> Execute Code -> Execute Code -> Download File -> Kill Sandbox
```

### Environment Setup + Multiple Tasks

```
Create Sandbox -> Run Command (pip install) -> Execute Code -> Execute Code -> List Files -> Download File -> Kill Sandbox
```

## Compatibility

- **n8n version:** 1.0+
- **Node.js version:** 18+

## Resources

- [E2B Documentation](https://e2b.dev/docs)
- [E2B Code Interpreter SDK](https://www.npmjs.com/package/@e2b/code-interpreter)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE)
