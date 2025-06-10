import { INodeType, INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';

export class Autentique implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Autentique',
		name: 'autentique',
		icon: 'file:logo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Trabalhe com dados da API do Autentique para assinaturas digitais',
		defaults: {
			name: 'Autentique',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'autentiqueApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://api.autentique.com.br/v2',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			// Resource selector
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Document',
						value: 'documents',
						description: 'Gerenciar documentos para assinatura',
					},
					{
						name: 'User',
						value: 'users',
						description: 'Gerenciar informações do usuário',
					},
					{
						name: 'Organization',
						value: 'organizations',
						description: 'Gerenciar organizações',
					},
					{
						name: 'Folder',
						value: 'folders',
						description: 'Gerenciar pastas de documentos',
					},
				],
				default: 'documents',
			},

			// ===========================================
			// DOCUMENTS OPERATIONS
			// ===========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['documents'],
					},
				},
				options: [
					{
						name: 'Add Signatory',
						value: 'addSignatory',
						action: 'Adicionar signat rio',
						description: 'Adicionar um novo signatário ao documento',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `mutation addSignatory($docId: ID!, $signatory: SignatoryInput!) {
										addSignatory(docId: $docId, signatory: $signatory) {
											id
											name
											signatures {
												public_id
												name
												email
											}
										}
									}`,
									variables: {
										docId: '={{$parameter["documentId"]}}',
										signatory: '={{$parameter["signatory"]}}'
									}
								}
							},
						},
					},
					{
						name: 'Create',
						value: 'create',
						action: 'Criar documento',
						description: 'Criar um novo documento para assinatura',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `mutation CreateDocumentMutation($document: DocumentInput!) {
										createDocument(document: $document) {
											id
											name
											refusable
											sortable
											created_at
											signatures {
												public_id
												name
												email
											}
										}
									}`,
									variables: {
										document: {
											name: '={{$parameter["documentName"]}}',
											refusable: '={{$parameter["refusable"] || false}}',
											sortable: '={{$parameter["sortable"] || false}}',
											file: '={{$parameter["fileContent"]}}',
											signatures: '={{$parameter["signatures"]}}'
										}
									}
								}
							},
						},
					},
					{
						name: 'Create Signature Link',
						value: 'createSignatureLink',
						action: 'Criar link de assinatura',
						description: 'Criar um link direto para assinatura',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `mutation createSignatureLink($docId: ID!, $requestSignatureId: ID!) {
										createSignatureLink(docId: $docId, requestSignatureId: $requestSignatureId) {
											link
											expires_at
										}
									}`,
									variables: {
										docId: '={{$parameter["documentId"]}}',
										requestSignatureId: '={{$parameter["signatureId"]}}'
									}
								}
							},
						},
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Deletar documento',
						description: 'Deletar um documento',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `mutation DeleteDocumentMutation($id: ID!) {
										deleteDocument(id: $id) {
											id
											name
										}
									}`,
									variables: {
										id: '={{$parameter["documentId"]}}'
									}
								}
							},
						},
					},
					{
						name: 'Edit',
						value: 'edit',
						action: 'Editar documento',
						description: 'Editar informações de um documento',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `mutation editDocument($id: ID!, $document: DocumentEditInput!) {
										editDocument(id: $id, document: $document) {
											id
											name
											refusable
											sortable
										}
									}`,
									variables: {
										id: '={{$parameter["documentId"]}}',
										document: {
											name: '={{$parameter["documentName"] || undefined}}',
											refusable: '={{$parameter["refusable"] || undefined}}',
											sortable: '={{$parameter["sortable"] || undefined}}'
										}
									}
								}
							},
						},
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Obter documento',
						description: 'Obter informações de um documento específico',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `query DocumentQuery($id: ID!) {
										document(id: $id) {
											id
											name
											refusable
											sortable
											created_at
											signatures {
												public_id
												name
												email
												created_at
												action {
													name
												}
												link {
													short_link
												}
											}
										}
									}`,
									variables: {
										id: '={{$parameter["documentId"]}}'
									}
								}
							},
						},
					},
					{
						name: 'Get Many',
						value: 'getMany',
						action: 'Listar documentos',
						description: 'Recuperar múltiplos documentos',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `query DocumentsQuery($limit: Int, $page: Int) {
										documents(limit: $limit, page: $page) {
											data {
												id
												name
												refusable
												sortable
												created_at
												signatures {
													public_id
													name
													email
													created_at
													action {
														name
													}
												}
											}
											total
											per_page
											current_page
											last_page
										}
									}`,
									variables: {
										limit: '={{$parameter["limit"] || 20}}',
										page: '={{$parameter["page"] || 1}}'
									}
								}
							},
						},
					},
					{
						name: 'Move to Folder',
						value: 'moveToFolder',
						action: 'Mover documento para pasta',
						description: 'Mover um documento para uma pasta específica',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `mutation moveDocumentToFolder($document_id: ID!, $folder_id: ID, $current_folder_id: ID, $context: String) {
										moveDocumentToFolder(
											document_id: $document_id,
											folder_id: $folder_id,
											current_folder_id: $current_folder_id,
											context: $context
										)
									}`,
									variables: {
										document_id: '={{$parameter["documentId"]}}',
										folder_id: '={{$parameter["folderId"] || null}}',
										current_folder_id: '={{$parameter["currentFolderId"] || undefined}}',
										context: '={{$parameter["context"] || undefined}}'
									}
								}
							},
						},
					},
					{
						name: 'Remove Signatory',
						value: 'removeSignatory',
						action: 'Remover signat rio',
						description: 'Remover um signatário do documento',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `mutation removeSignatory($docId: ID!, $requestSignatureId: ID!) {
										removeSignatory(docId: $docId, requestSignatureId: $requestSignatureId) {
											id
											name
											signatures {
												public_id
												name
												email
											}
										}
									}`,
									variables: {
										docId: '={{$parameter["documentId"]}}',
										requestSignatureId: '={{$parameter["signatureId"]}}'
									}
								}
							},
						},
					},
					{
						name: 'Resend Signatures',
						value: 'resendSignatures',
						action: 'Reenviar assinaturas',
						description: 'Reenviar notificações de assinatura pendentes',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `mutation resendSignatures($docId: ID!) {
										resendSignatures(docId: $docId) {
											id
											name
											signatures {
												public_id
												name
												email
											}
										}
									}`,
									variables: {
										docId: '={{$parameter["documentId"]}}'
									}
								}
							},
						},
					},
					{
						name: 'Sign',
						value: 'sign',
						action: 'Assinar documento',
						description: 'Assinar um documento específico',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `mutation SignDocumentMutation($docId: ID!, $requestSignatureId: ID!) {
										signDocument(docId: $docId, requestSignatureId: $requestSignatureId) {
											id
											name
											signatures {
												public_id
												name
												email
												action {
													name
												}
											}
										}
									}`,
									variables: {
										docId: '={{$parameter["documentId"]}}',
										requestSignatureId: '={{$parameter["signatureId"]}}'
									}
								}
							},
						},
					},
				],
				default: 'getMany',
			},

			// Document fields
			{
				displayName: 'Document ID',
				name: 'documentId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['get', 'sign', 'delete', 'moveToFolder', 'edit', 'addSignatory', 'removeSignatory', 'createSignatureLink', 'resendSignatures'],
					},
				},
				default: '',
				description: 'O ID do documento',
				placeholder: 'doc_xxxxx',
			},
			{
				displayName: 'Document Name',
				name: 'documentName',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['create', 'edit'],
					},
				},
				default: '',
				description: 'Nome do documento',
				placeholder: 'Contrato de Prestação de Serviços',
			},
			{
				displayName: 'File Content (Base64)',
				name: 'fileContent',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'Conteúdo do arquivo em formato Base64',
				typeOptions: {
					rows: 4,
				},
			},
			{
				displayName: 'Signatures',
				name: 'signatures',
				type: 'json',
				required: true,
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['create'],
					},
				},
				default: '[{"name": "João Silva", "email": "joao@exemplo.com"}]',
				description: 'Array de assinantes em formato JSON',
				typeOptions: {
					rows: 4,
				},
			},
			{
				displayName: 'Refusable',
				name: 'refusable',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['create', 'edit'],
					},
				},
				default: false,
				description: 'Whether the document can be refused',
			},
			{
				displayName: 'Sortable',
				name: 'sortable',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['create', 'edit'],
					},
				},
				default: false,
				description: 'Whether signatures must follow a specific order',
			},
			{
				displayName: 'Signature ID',
				name: 'signatureId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['sign', 'removeSignatory', 'createSignatureLink'],
					},
				},
				default: '',
				description: 'ID da assinatura',
				placeholder: 'sig_xxxxx',
			},
			{
				displayName: 'Signatory',
				name: 'signatory',
				type: 'json',
				required: true,
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['addSignatory'],
					},
				},
				default: '{"name": "João Silva", "email": "joao@exemplo.com"}',
				description: 'Dados do signatário em formato JSON',
				typeOptions: {
					rows: 3,
				},
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['getMany'],
					},
				},
				default: 50,
				description: 'Max number of results to return',
				typeOptions: {
					minValue: 1,
				},
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['getMany'],
					},
				},
				default: 1,
				description: 'Página dos resultados',
				typeOptions: {
					minValue: 1,
				},
			},

			// Move to Folder fields
			{
				displayName: 'Destination Folder ID',
				name: 'folderId',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['moveToFolder'],
					},
				},
				default: '',
				description: 'ID da pasta de destino (deixe vazio para remover da pasta)',
				placeholder: 'folder_xxxxx',
			},
			{
				displayName: 'Current Folder ID',
				name: 'currentFolderId',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['moveToFolder'],
					},
				},
				default: '',
				description: 'ID da pasta atual (obrigatório se o documento já estiver em uma pasta)',
				placeholder: 'folder_xxxxx',
			},
			{
				displayName: 'Context',
				name: 'context',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['moveToFolder'],
					},
				},
				options: [
					{
						name: 'Personal',
						value: '',
						description: 'Pasta pessoal (padrão)',
					},
					{
						name: 'Organization',
						value: 'ORGANIZATION',
						description: 'Pasta da organização',
					},
					{
						name: 'Group',
						value: 'GROUP',
						description: 'Pasta de grupo',
					},
				],
				default: '',
				description: 'Contexto da pasta (para pastas de organização ou grupo)',
			},

			// ===========================================
			// USERS OPERATIONS
			// ===========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['users'],
					},
				},
				options: [
					{
						name: 'Get Current',
						value: 'getCurrent',
						action: 'Obter usu rio atual',
						description: 'Obter informações do usuário atual',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `query MeQuery {
										me {
											id
											name
											email
											phone
											created_at
										}
									}`
								}
							},
						},
					},
				],
				default: 'getCurrent',
			},

			// ===========================================
			// ORGANIZATIONS OPERATIONS
			// ===========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['organizations'],
					},
				},
				options: [
					{
						name: 'Get Many',
						value: 'getMany',
						action: 'Listar organiza es',
						description: 'Recuperar múltiplas organizações',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `query OrganizationsQuery {
										organizations {
											id
											name
											created_at
										}
									}`
								}
							},
						},
					},
				],
				default: 'getMany',
			},

			// ===========================================
			// FOLDERS OPERATIONS
			// ===========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['folders'],
					},
				},
				options: [
					{
						name: 'Get Many',
						value: 'getMany',
						action: 'Listar pastas',
						description: 'Recuperar múltiplas pastas',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `query FoldersQuery {
										folders {
											id
											name
											created_at
										}
									}`
								}
							},
						},
					},
					{
						name: 'Create',
						value: 'create',
						action: 'Criar pasta',
						description: 'Criar uma nova pasta',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `mutation CreateFolderMutation($folder: FolderInput!) {
										createFolder(folder: $folder) {
											id
											name
											created_at
										}
									}`,
									variables: {
										folder: {
											name: '={{$parameter["folderName"]}}'
										}
									}
								}
							},
						},
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Deletar pasta',
						description: 'Deletar uma pasta',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `mutation DeleteFolderMutation($id: ID!) {
										deleteFolder(id: $id) {
											id
											name
										}
									}`,
									variables: {
										id: '={{$parameter["folderId"]}}'
									}
								}
							},
						},
					},
				],
				default: 'getMany',
			},

			// Folder fields
			{
				displayName: 'Folder Name',
				name: 'folderName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['folders'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'Nome da pasta',
				placeholder: 'Contratos 2024',
			},
			{
				displayName: 'Folder ID',
				name: 'folderId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['folders'],
						operation: ['delete'],
					},
				},
				default: '',
				description: 'O ID da pasta',
				placeholder: 'folder_xxxxx',
			},
		],
	};
}



