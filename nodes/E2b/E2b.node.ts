import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { Sandbox } from '@e2b/code-interpreter';

export class E2b implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'E2B',
		name: 'e2b',
		icon: 'file:e2b.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'E2B Code Interpreter - Run code in cloud sandboxes',
		defaults: {
			name: 'E2B',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'e2bApi',
				required: true,
			},
		],
		properties: [
			// ------ Resource ------
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Sandbox',
						value: 'sandbox',
					},
				],
				default: 'sandbox',
			},

			// ------ Operation ------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['sandbox'],
					},
				},
				options: [
					{
						name: 'Create Sandbox',
						value: 'createSandbox',
						action: 'Create a sandbox',
						description: 'Create a new sandbox and return its ID',
					},
					{
						name: 'Execute Code',
						value: 'executeCode',
						action: 'Execute code in a sandbox',
						description: 'Execute code in an existing sandbox',
					},
					{
						name: 'Run Command',
						value: 'runCommand',
						action: 'Run a shell command',
						description: 'Run a shell command in an existing sandbox',
					},
					{
						name: 'Upload File',
						value: 'uploadFile',
						action: 'Upload a file to a sandbox',
						description: 'Upload a file to an existing sandbox',
					},
					{
						name: 'Download File',
						value: 'downloadFile',
						action: 'Download a file from a sandbox',
						description: 'Download a file from an existing sandbox',
					},
					{
						name: 'List Files',
						value: 'listFiles',
						action: 'List files in a sandbox',
						description: 'List files in an existing sandbox directory',
					},
					{
						name: 'Kill Sandbox',
						value: 'killSandbox',
						action: 'Kill a sandbox',
						description: 'Kill an existing sandbox',
					},
				],
				default: 'createSandbox',
			},

			// ------ Create Sandbox Parameters ------
			{
				displayName: 'Template',
				name: 'template',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['createSandbox'],
					},
				},
				description: 'Custom sandbox template ID (leave empty for default)',
			},
			{
				displayName: 'Timeout (Seconds)',
				name: 'timeout',
				type: 'number',
				default: 300,
				displayOptions: {
					show: {
						operation: ['createSandbox'],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 86400,
				},
				description: 'Sandbox auto-kill timeout in seconds (max 86400, Pro plan required for >3600)',
			},
			{
				displayName: 'Environment Variables',
				name: 'envVars',
				type: 'fixedCollection',
				default: {},
				displayOptions: {
					show: {
						operation: ['createSandbox'],
					},
				},
				typeOptions: {
					multipleValues: true,
				},
				description: 'Environment variables to pass to the sandbox',
				options: [
					{
						name: 'env',
						displayName: 'Variable',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},

			// ------ Sandbox ID (shared) ------
			{
				displayName: 'Sandbox ID',
				name: 'sandboxId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						operation: [
							'executeCode',
							'runCommand',
							'uploadFile',
							'downloadFile',
							'listFiles',
							'killSandbox',
						],
					},
				},
				description: 'The ID of the sandbox to operate on',
			},

			// ------ Execute Code Parameters ------
			{
				displayName: 'Code',
				name: 'code',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						operation: ['executeCode'],
					},
				},
				typeOptions: {
					rows: 10,
				},
				description: 'The code to execute in the sandbox',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				default: 'python',
				displayOptions: {
					show: {
						operation: ['executeCode'],
					},
				},
				options: [
					{
						name: 'Python',
						value: 'python',
					},
					{
						name: 'JavaScript',
						value: 'javascript',
					},
				],
				description: 'The programming language of the code',
			},
			{
				displayName: 'Code Timeout (Seconds)',
				name: 'codeTimeout',
				type: 'number',
				default: 0,
				displayOptions: {
					show: {
						operation: ['executeCode'],
					},
				},
				description: 'Per-execution runtime cap in seconds. 0 = no timeout (otherwise the E2B SDK default of 60s applies — short-circuiting long-running code).',
			},

			// ------ Run Command Parameters ------
			{
				displayName: 'Command',
				name: 'command',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						operation: ['runCommand'],
					},
				},
				description: 'The shell command to run',
			},
			{
				displayName: 'Working Directory',
				name: 'workingDir',
				type: 'string',
				default: '/',
				displayOptions: {
					show: {
						operation: ['runCommand'],
					},
				},
				description: 'The working directory for the command',
			},
			{
				displayName: 'Command Timeout (Seconds)',
				name: 'commandTimeout',
				type: 'number',
				default: 0,
				displayOptions: {
					show: {
						operation: ['runCommand'],
					},
				},
				description: 'Per-command runtime cap in seconds. 0 = no timeout (otherwise the E2B SDK default of 60s applies — short-circuiting long-running scripts).',
			},

			// ------ Upload File Parameters ------
			{
				displayName: 'Remote Path',
				name: 'remotePath',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						operation: ['uploadFile'],
					},
				},
				description: 'The destination path inside the sandbox',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['uploadFile'],
					},
				},
				typeOptions: {
					rows: 5,
				},
				description:
					'File content as text. Ignored when binary input is provided via the Binary Property field.',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryProperty',
				type: 'string',
				default: 'data',
				displayOptions: {
					show: {
						operation: ['uploadFile'],
					},
				},
				description:
					'The name of the input binary property containing the file. If binary data exists for this property, it takes priority over the Content field.',
			},

			// ------ Download File Parameters ------
			{
				displayName: 'Remote Path',
				name: 'remotePathDownload',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						operation: ['downloadFile'],
					},
				},
				description: 'The file path inside the sandbox to download',
			},
			{
				displayName: 'Binary Output',
				name: 'binaryOutput',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						operation: ['downloadFile'],
					},
				},
				description: 'Whether to output the file as binary data instead of text',
			},

			// ------ List Files Parameters ------
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: '/',
				displayOptions: {
					show: {
						operation: ['listFiles'],
					},
				},
				description: 'The directory path to list',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('e2bApi');
		const apiKey = credentials.apiKey as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				switch (operation) {
					case 'createSandbox': {
						const template = this.getNodeParameter('template', i, '') as string;
						const timeout = this.getNodeParameter('timeout', i, 300) as number;

						if (timeout <= 0 || timeout > 86400) {
							throw new NodeOperationError(
								this.getNode(),
								'Timeout must be between 1 and 86400 seconds',
								{ itemIndex: i },
							);
						}

						const envVarsData = this.getNodeParameter('envVars', i, {}) as {
							env?: Array<{ name: string; value: string }>;
						};
						const envs: Record<string, string> = {};
						if (envVarsData.env) {
							for (const entry of envVarsData.env) {
								if (entry.name) {
									envs[entry.name] = entry.value;
								}
							}
						}

						const createOpts: {
							apiKey: string;
							timeoutMs: number;
							envs?: Record<string, string>;
						} = {
							apiKey,
							timeoutMs: timeout * 1000,
						};
						if (Object.keys(envs).length > 0) {
							createOpts.envs = envs;
						}

						let sandbox: Sandbox;
						if (template) {
							sandbox = await Sandbox.create(template, createOpts);
						} else {
							sandbox = await Sandbox.create(createOpts);
						}

						returnData.push({
							json: {
								sandboxId: sandbox.sandboxId,
							},
						});
						break;
					}

					case 'executeCode': {
						const sandboxId = this.getNodeParameter('sandboxId', i) as string;
						const code = this.getNodeParameter('code', i) as string;
						const language = this.getNodeParameter('language', i, 'python') as string;
						const codeTimeout = this.getNodeParameter('codeTimeout', i, 0) as number;

						if (!sandboxId) {
							throw new NodeOperationError(this.getNode(), 'Sandbox ID is required', {
								itemIndex: i,
							});
						}
						if (!code) {
							throw new NodeOperationError(this.getNode(), 'Code is required', {
								itemIndex: i,
							});
						}
						if (language !== 'python' && language !== 'javascript') {
							throw new NodeOperationError(
								this.getNode(),
								'Language must be "python" or "javascript"',
								{ itemIndex: i },
							);
						}

						const runOpts: { language: string; timeoutMs?: number } = { language };
						if (codeTimeout > 0) {
							runOpts.timeoutMs = codeTimeout * 1000;
						} else {
							// 0 = explicitly unlimited (SDK default is 60s otherwise)
							runOpts.timeoutMs = 0;
						}

						const sbExec = await Sandbox.connect(sandboxId, { apiKey });

						let stdout = '';
						let stderr = '';
						let results: Record<string, unknown>[] = [];
						let errorOut = '';
						let errorMessage: string | undefined;

						try {
							const execution = await sbExec.runCode(code, runOpts);
							stdout = execution.logs.stdout.join('');
							stderr = execution.logs.stderr.join('');
							results = execution.results.map((r) => {
								const result: Record<string, unknown> = {};
								if (r.text !== undefined) result.text = r.text;
								if (r.html !== undefined) result.html = r.html;
								if (r.png !== undefined) result.png = r.png;
								if (r.jpeg !== undefined) result.jpeg = r.jpeg;
								if (r.svg !== undefined) result.svg = r.svg;
								if (r.markdown !== undefined) result.markdown = r.markdown;
								if (r.latex !== undefined) result.latex = r.latex;
								if (r.json !== undefined) result.json = r.json;
								if (r.pdf !== undefined) result.pdf = r.pdf;
								result.isMainResult = r.isMainResult;
								return result;
							});
							errorOut = execution.error
								? `${execution.error.name}: ${execution.error.value}`
								: '';
						} catch (err) {
							// preserve any stdout/stderr that the SDK surfaces on the error object
							const e = err as {
								stdout?: string;
								stderr?: string;
								message?: string;
							};
							stdout = e.stdout ?? '';
							stderr = e.stderr ?? '';
							errorMessage = e.message;

							if (!this.continueOnFail()) {
								const op = new NodeOperationError(
									this.getNode(),
									`Code execution failed: ${errorMessage ?? 'unknown error'}`,
									{
										itemIndex: i,
										description:
											`stdout:
${stdout || '(empty)'}

` +
											`stderr:
${stderr || '(empty)'}`,
									},
								);
								throw op;
							}
							errorOut = errorMessage ?? 'unknown error';
						}

						returnData.push({
							json: {
								sandboxId,
								stdout,
								stderr,
								results,
								error: errorOut,
							},
						});
						break;
					}

					case 'runCommand': {
						const sandboxId = this.getNodeParameter('sandboxId', i) as string;
						const command = this.getNodeParameter('command', i) as string;
						const workingDir = this.getNodeParameter('workingDir', i, '/') as string;
						const commandTimeout = this.getNodeParameter('commandTimeout', i, 0) as number;

						if (!sandboxId) {
							throw new NodeOperationError(this.getNode(), 'Sandbox ID is required', {
								itemIndex: i,
							});
						}
						if (!command) {
							throw new NodeOperationError(this.getNode(), 'Command is required', {
								itemIndex: i,
							});
						}

						const sbCmd = await Sandbox.connect(sandboxId, { apiKey });

						let stdout = '';
						let stderr = '';
						let exitCode = 0;
						let errorMessage: string | undefined;

						const runOpts: { cwd: string; timeoutMs?: number } = { cwd: workingDir };
						if (commandTimeout > 0) {
							runOpts.timeoutMs = commandTimeout * 1000;
						} else {
							// 0 = explicitly unlimited (SDK default is 60s otherwise)
							runOpts.timeoutMs = 0;
						}

						try {
							const cmdResult = await sbCmd.commands.run(command, runOpts);
							stdout = cmdResult.stdout;
							stderr = cmdResult.stderr;
							exitCode = cmdResult.exitCode;
						} catch (err) {
							// E2B CommandExitError 等、non-zero exit でも stdout/stderr を回収
							const e = err as {
								stdout?: string;
								stderr?: string;
								exitCode?: number;
								message?: string;
							};
							stdout = e.stdout ?? '';
							stderr = e.stderr ?? '';
							exitCode = e.exitCode ?? -1;
							errorMessage = e.message;

							if (!this.continueOnFail()) {
								const op = new NodeOperationError(
									this.getNode(),
									`Command exited with ${exitCode}: ${errorMessage ?? 'unknown error'}`,
									{
										itemIndex: i,
										description:
											`stdout:\n${stdout || '(empty)'}\n\n` +
											`stderr:\n${stderr || '(empty)'}`,
									},
								);
								throw op;
							}
						}

						returnData.push({
							json: {
								sandboxId,
								stdout,
								stderr,
								exitCode,
								...(errorMessage ? { error: errorMessage } : {}),
							},
						});
						break;
					}

					case 'uploadFile': {
						const sandboxId = this.getNodeParameter('sandboxId', i) as string;
						const remotePath = this.getNodeParameter('remotePath', i) as string;
						const binaryProperty = this.getNodeParameter('binaryProperty', i, 'data') as string;

						if (!sandboxId) {
							throw new NodeOperationError(this.getNode(), 'Sandbox ID is required', {
								itemIndex: i,
							});
						}
						if (!remotePath) {
							throw new NodeOperationError(this.getNode(), 'Remote Path is required', {
								itemIndex: i,
							});
						}

						const sbUpload = await Sandbox.connect(sandboxId, { apiKey });

						// Check for binary data first
						const itemBinary = items[i].binary;
						if (itemBinary && itemBinary[binaryProperty]) {
							const binaryData = await this.helpers.getBinaryDataBuffer(i, binaryProperty);
							const arrayBuffer = binaryData.buffer.slice(
								binaryData.byteOffset,
								binaryData.byteOffset + binaryData.byteLength,
							) as ArrayBuffer;
							await sbUpload.files.write(remotePath, arrayBuffer);
						} else {
							const content = this.getNodeParameter('content', i, '') as string;
							if (!content) {
								throw new NodeOperationError(
									this.getNode(),
									'Either binary input or Content is required',
									{ itemIndex: i },
								);
							}
							await sbUpload.files.write(remotePath, content);
						}

						returnData.push({
							json: {
								sandboxId,
								remotePath,
								success: true,
							},
						});
						break;
					}

					case 'downloadFile': {
						const sandboxId = this.getNodeParameter('sandboxId', i) as string;
						const remotePath = this.getNodeParameter('remotePathDownload', i) as string;
						const binaryOutput = this.getNodeParameter('binaryOutput', i, false) as boolean;

						if (!sandboxId) {
							throw new NodeOperationError(this.getNode(), 'Sandbox ID is required', {
								itemIndex: i,
							});
						}
						if (!remotePath) {
							throw new NodeOperationError(this.getNode(), 'Remote Path is required', {
								itemIndex: i,
							});
						}

						const sbDownload = await Sandbox.connect(sandboxId, { apiKey });

						if (binaryOutput) {
							const fileBytes = await sbDownload.files.read(remotePath, { format: 'bytes' });
							const buffer = Buffer.from(fileBytes);
							const fileName = remotePath.split('/').pop() || 'file';
							const binaryData = await this.helpers.prepareBinaryData(buffer, fileName);
							returnData.push({
								json: {
									sandboxId,
									remotePath,
								},
								binary: {
									data: binaryData,
								},
							});
						} else {
							const content = await sbDownload.files.read(remotePath);
							returnData.push({
								json: {
									sandboxId,
									remotePath,
									content,
								},
							});
						}
						break;
					}

					case 'listFiles': {
						const sandboxId = this.getNodeParameter('sandboxId', i) as string;
						const path = this.getNodeParameter('path', i, '/') as string;

						if (!sandboxId) {
							throw new NodeOperationError(this.getNode(), 'Sandbox ID is required', {
								itemIndex: i,
							});
						}

						const sbList = await Sandbox.connect(sandboxId, { apiKey });
						const entries = await sbList.files.list(path);

						const files = entries.map((entry) => ({
							name: entry.name,
							type: entry.type === 'file' ? 'file' : 'dir',
						}));

						returnData.push({
							json: {
								sandboxId,
								path,
								files,
							},
						});
						break;
					}

					case 'killSandbox': {
						const sandboxId = this.getNodeParameter('sandboxId', i) as string;

						if (!sandboxId) {
							throw new NodeOperationError(this.getNode(), 'Sandbox ID is required', {
								itemIndex: i,
							});
						}

						const sbKill = await Sandbox.connect(sandboxId, { apiKey });
						await sbKill.kill();

						returnData.push({
							json: {
								sandboxId,
								killed: true,
							},
						});
						break;
					}

					default:
						throw new NodeOperationError(
							this.getNode(),
							`Unknown operation: ${operation}`,
							{ itemIndex: i },
						);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
