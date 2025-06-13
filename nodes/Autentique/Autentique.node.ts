import { IExecuteSingleFunctions, INodeType, INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';

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
						name: 'Email Template',
						value: 'emailTemplates',
						description: 'Gerenciar modelos de email',
					},
					{
						name: 'Folder',
						value: 'folders',
						description: 'Gerenciar pastas de documentos',
					},
					{
						name: 'Organization',
						value: 'organizations',
						description: 'Gerenciar organizações',
					},
					{
						name: 'User',
						value: 'users',
						description: 'Gerenciar informações do usuário',
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
						action: 'Add signatory',
						description: 'Adicionar um novo signatário ao documento',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
							},
							send: {
								preSend: [
									async function(this: IExecuteSingleFunctions, requestOptions: any) {
										const documentId = this.getNodeParameter('documentId') as string;
										const contactMethod = this.getNodeParameter('signatoryContactMethod') as string;
										const action = this.getNodeParameter('signatoryAction') as string;
										const name = this.getNodeParameter('signatoryName', '') as string;
										
										// Construir objeto signer baseado no método de contato
										const signer: any = { action };
										
										if (contactMethod === 'email') {
											const email = this.getNodeParameter('signatoryEmail') as string;
											signer.email = email;
										} else if (contactMethod === 'phone') {
											const phone = this.getNodeParameter('signatoryPhone') as string;
											const deliveryMethod = this.getNodeParameter('signatoryDeliveryMethod') as string;
											signer.phone = phone;
											signer.delivery_method = deliveryMethod;
										} else if (contactMethod === 'name') {
											signer.name = name;
										}
										
										// Adicionar nome se fornecido (exceto quando é o método principal)
										if (name && contactMethod !== 'name') {
											signer.name = name;
										}
										
										const query = `mutation createSigner($document_id: UUID!, $signer: SignerInput!) {
											createSigner(document_id: $document_id, signer: $signer) {
												public_id
												name
												email
												delivery_method
												action { name }
												link {
													id
													short_link
												}
												created_at
											}
										}`;
										
										requestOptions.body = {
											query,
											variables: {
												document_id: documentId,
												signer
											}
										};
										
										return requestOptions;
									}
								]
							}
						},
					},
					{
						name: 'Approve Biometric Verification',
						value: 'approveBiometric',
						action: 'Approve biometric verification',
						description: 'Aprovar uma verificação biométrica pendente',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `mutation approveBiometric($verification_id: Int!, $public_id: UUID!) {
										approveBiometric(verification_id: $verification_id, public_id: $public_id) {
											public_id
											name
											email
											delivery_method
											user {
												id
												name
												email
												phone
											}
											verifications {
												id
												type
												verify_phone
												verified_at
												max_attempt
												logs_attempt
											}
										}
									}`,
									variables: {
										verification_id: '={{$parameter["verificationId"]}}',
										public_id: '={{$parameter["signatureId"]}}'
									}
								}
							},
						},
					},
					{
						name: 'Create',
						value: 'create',
						action: 'Create',
						description: 'Criar um novo documento para assinatura',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								headers: {},
							},
							send: {
								preSend: [
									// Seguindo exatamente a documentação oficial da API Autentique v2
									async function(this: IExecuteSingleFunctions, requestOptions: any) {
										const FormData = require('form-data');
										const form = new FormData();
										
										// Obter parâmetros
										const documentName = this.getNodeParameter('documentName') as string;
										const fileContent = this.getNodeParameter('fileContent') as string;
										const signatures = this.getNodeParameter('signatures') as string;
										const message = this.getNodeParameter('message', '') as string;
										const reminder = this.getNodeParameter('reminder', '') as string;
										const sortable = this.getNodeParameter('sortable', false) as boolean;
										const footer = this.getNodeParameter('footer', '') as string;
										const refusable = this.getNodeParameter('refusable', false) as boolean;
										const qualified = this.getNodeParameter('qualified', false) as boolean;
										const scrollingRequired = this.getNodeParameter('scrollingRequired', false) as boolean;
										const stopOnRejected = this.getNodeParameter('stopOnRejected', false) as boolean;
										const newSignatureStyle = this.getNodeParameter('newSignatureStyle', false) as boolean;
										const showAuditPage = this.getNodeParameter('showAuditPage', true) as boolean;
										const ignoreCpf = this.getNodeParameter('ignoreCpf', false) as boolean;
										const ignoreBirthdate = this.getNodeParameter('ignoreBirthdate', false) as boolean;
										const deadlineAt = this.getNodeParameter('deadlineAt', '') as string;
										
										// Parse signatários
										const parsedSignatures = JSON.parse(signatures).map((s: any) => ({
											...s,
											action: s.action || 'SIGN'
										}));
										
										// Preparar dados do documento conforme documentação
										const documentData: any = {
											name: documentName,
										};
										
										// Adicionar campos opcionais apenas se tiverem valores
										if (message) documentData.message = message;
										if (reminder) documentData.reminder = reminder;
										if (footer) documentData.footer = footer;
										if (deadlineAt) {
											// Garantir formato ISO 8601 com timezone conforme documentação da API
											// Exemplo da documentação: "2023-11-24T02:59:59.999Z"
											let formattedDeadline = deadlineAt.trim();
											
											try {
												// Converter para objeto Date para validação e formatação
												let dateObj;
												
												// Se não tem timezone, assumir que é local e converter para UTC
												if (!formattedDeadline.includes('Z') && 
													!formattedDeadline.includes('+') && 
													!(formattedDeadline.includes('-') && formattedDeadline.lastIndexOf('-') > 10)) {
													// Adicionar Z para UTC
													dateObj = new Date(formattedDeadline + 'Z');
												} else {
													dateObj = new Date(formattedDeadline);
												}
												
												if (isNaN(dateObj.getTime())) {
													throw new Error('Data inválida');
												}
												
												// Formatar exatamente como no exemplo da documentação: "2023-11-24T02:59:59.999Z"
												formattedDeadline = dateObj.toISOString();
												
												// Verificar se a data é no futuro
												const now = new Date();
												if (dateObj <= now) {
													console.warn('AVISO: deadline_at está no passado ou muito próximo do presente:', formattedDeadline);
												}
												
												documentData.deadline_at = formattedDeadline;
												
												// Log para debug (remover em produção)
												console.log('DEBUG - deadline_at original:', deadlineAt);
												console.log('DEBUG - deadline_at formatado:', formattedDeadline);
												
											} catch (error) {
												throw new Error(`Erro ao processar deadline_at: ${deadlineAt}. ${error.message}. Use formato ISO 8601: YYYY-MM-DDTHH:mm:ss`);
											}
										}
										if (sortable) documentData.sortable = sortable;
										if (refusable) documentData.refusable = refusable;
										if (qualified) documentData.qualified = qualified;
										if (scrollingRequired) documentData.scrolling_required = scrollingRequired;
										if (stopOnRejected) documentData.stop_on_rejected = stopOnRejected;
										if (newSignatureStyle) documentData.new_signature_style = newSignatureStyle;
										if (!showAuditPage) documentData.show_audit_page = showAuditPage;
										if (ignoreCpf) documentData.ignore_cpf = ignoreCpf;
										if (ignoreBirthdate) documentData.ignore_birthdate = ignoreBirthdate;
										
										// Query GraphQL exatamente como na documentação
										const query = `mutation CreateDocumentMutation($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
											createDocument(document: $document, signers: $signers, file: $file) {
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
													action { name }
													link { short_link }
													user { id name email }
												}
											}
										}`;
										
										// Variáveis exatamente como na documentação
										const variables: any = {
											document: documentData,
											signers: parsedSignatures,
											file: null
										};
										
										// Preparar multipart/form-data exatamente como na documentação
										form.append('operations', JSON.stringify({
											query,
											variables
										}));
										
										form.append('map', JSON.stringify({
											file: ['variables.file']
										}));
										
										// Converter arquivo base64 para buffer
										const fileBuffer = Buffer.from(fileContent, 'base64');
										form.append('file', fileBuffer, {
											filename: 'document.pdf',
											contentType: 'application/pdf'
										});
										
										// Configurar requisição para multipart
										requestOptions.body = form;
										requestOptions.headers = {
											...requestOptions.headers,
											...form.getHeaders()
										};
										
										// Remover Content-Type para que form-data defina automaticamente
										delete requestOptions.headers['Content-Type'];
										
										return requestOptions;
									}
								]
							}
						},
					},
					{
						name: 'Create Signature Link',
						value: 'createSignatureLink',
						action: 'Create signature link',
						description: 'Criar um link direto para assinatura',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `mutation createLinkToSignature($public_id: UUID!) {
										createLinkToSignature(public_id: $public_id) {
											short_link
										}
									}`,
									variables: {
										public_id: '={{$parameter["signatureId"]}}'
									}
								}
							},
						},
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete',
						description: 'Deletar um documento',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `mutation DeleteDocumentMutation($id: UUID!) {
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
						action: 'Edit',
						description: 'Editar informações de um documento',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
							},
							send: {
								preSend: [
									async function(this: IExecuteSingleFunctions, requestOptions: any) {
										// Obter parâmetros
										const documentId = this.getNodeParameter('documentId') as string;
										const documentName = this.getNodeParameter('documentName', '') as string;
										const message = this.getNodeParameter('message', '') as string;
										const reminder = this.getNodeParameter('reminder', '') as string;
										const refusable = this.getNodeParameter('refusable', undefined) as boolean | undefined;
										const sortable = this.getNodeParameter('sortable', undefined) as boolean | undefined;
										const stopOnRejected = this.getNodeParameter('stopOnRejected', undefined) as boolean | undefined;
										const newSignatureStyle = this.getNodeParameter('newSignatureStyle', undefined) as boolean | undefined;
										const showAuditPage = this.getNodeParameter('showAuditPage', undefined) as boolean | undefined;
										const deadlineAt = this.getNodeParameter('deadlineAt', '') as string;
										const footer = this.getNodeParameter('footer', '') as string;
										
										// Construir objeto document
										const documentData: any = {};
										
										// Adicionar campos apenas se tiverem valores
										if (documentName) documentData.name = documentName;
										if (message) documentData.message = message;
										if (reminder) documentData.reminder = reminder;
										if (refusable !== undefined) documentData.refusable = refusable;
										if (sortable !== undefined) documentData.sortable = sortable;
										if (stopOnRejected !== undefined) documentData.stop_on_rejected = stopOnRejected;
										if (newSignatureStyle !== undefined) documentData.new_signature_style = newSignatureStyle;
										if (showAuditPage !== undefined) documentData.show_audit_page = showAuditPage;
										if (footer) documentData.footer = footer;
										
										if (deadlineAt) {
											try {
												// Converter para objeto Date para validação e formatação
												const dateObj = new Date(deadlineAt);
												if (isNaN(dateObj.getTime())) {
													throw new Error('Data inválida');
												}
												
												// Converter para formato ISO 8601 completo conforme documentação da API
												const formattedDeadline = dateObj.toISOString();
												documentData.deadline_at = formattedDeadline;
												
												// Log para debug (remover em produção)
												console.log('DEBUG - deadline_at formatado para edit:', formattedDeadline);
											} catch (error) {
												throw new Error(`Erro ao processar deadline_at: ${error.message}. Use formato de data válido (ex: "2025-06-30T10:00:00" ou "2025-06-30")`);
											}
										}
										
										const query = `mutation updateDocument($id: UUID!, $document: UpdateDocumentInput!) {
											updateDocument(id: $id, document: $document) {
												id
												name
												message
												reminder
												refusable
												sortable
												stop_on_rejected
												new_signature_style
												show_audit_page
												deadline_at
												footer
												created_at
											}
										}`;
										
										requestOptions.body = {
											query,
											variables: {
												id: documentId,
												document: documentData
											}
										};
										
										return requestOptions;
									}
								]
							}
						},
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get',
						description: 'Obter informações de um documento específico',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `query DocumentQuery($id: UUID!) {
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
						action: 'Get many',
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
						action: 'Move to folder',
						description: 'Mover um documento para uma pasta específica',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `mutation moveDocumentToFolder($document_id: UUID!, $folder_id: UUID, $current_folder_id: UUID, $context: String) {
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
						name: 'Reject Biometric Verification',
						value: 'rejectBiometric',
						action: 'Reject biometric verification',
						description: 'Rejeitar uma verificação biométrica pendente',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `mutation rejectBiometric($verification_id: Int!, $public_id: UUID!) {
										rejectBiometric(verification_id: $verification_id, public_id: $public_id) {
											public_id
											name
											email
											delivery_method
											user {
												id
												name
												email
												phone
											}
											verifications {
												id
												type
												verify_phone
												verified_at
												max_attempt
												logs_attempt
											}
										}
									}`,
									variables: {
										verification_id: '={{$parameter["verificationId"]}}',
										public_id: '={{$parameter["signatureId"]}}'
									}
								}
							},
						},
					},
					{
						name: 'Remove Signatory',
						value: 'removeSignatory',
						action: 'Remove signatory',
						description: 'Remover um signatário do documento',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `mutation deleteSigner($public_id: UUID!, $document_id: UUID!) {
										deleteSigner(public_id: $public_id, document_id: $document_id)
									}`,
									variables: {
										public_id: '={{$parameter["signatureId"]}}',
										document_id: '={{$parameter["documentId"]}}'
									}
								}
							},
						},
					},
					{
						name: 'Resend Signatures',
						value: 'resendSignatures',
						action: 'Resend signatures',
						description: 'Reenviar notificações de assinatura pendentes',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `mutation resendSignatures($public_ids: [UUID!]!) {
										resendSignatures(public_ids: $public_ids)
									}`,
									variables: {
										public_ids: '={{$parameter["signatureIds"]}}'
									}
								}
							},
						},
					},
					{
						name: 'Search',
						value: 'search',
						action: 'Search documents',
						description: 'Buscar documentos com filtros avançados',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `query DocumentsSearchQuery($search: String, $status: String, $folder_id: UUID, $limit: Int, $page: Int, $order_by: String, $order_direction: String) {
										documents(
											search: $search,
											status: $status,
											folder_id: $folder_id,
											limit: $limit,
											page: $page,
											order_by: $order_by,
											order_direction: $order_direction
										) {
											data {
												id
												name
												refusable
												sortable
												created_at
												updated_at
												status
												signatures {
													public_id
													name
													email
													created_at
													action {
														name
													}
													user {
														id
														name
														email
													}
												}
												folder {
													id
													name
												}
											}
											total
											per_page
											current_page
											last_page
										}
									}`,
									variables: {
										search: '={{$parameter["searchTerm"] || undefined}}',
										status: '={{$parameter["documentStatus"] || undefined}}',
										folder_id: '={{$parameter["searchFolderId"] || undefined}}',
										limit: '={{$parameter["limit"] || 20}}',
										page: '={{$parameter["page"] || 1}}',
										order_by: '={{$parameter["orderBy"] || "created_at"}}',
										order_direction: '={{$parameter["orderDirection"] || "desc"}}'
									}
								}
							},
						},
					},
					{
						name: 'Send via WhatsApp Flow',
						value: 'sendWhatsAppFlow',
						action: 'Send via whats app flow',
						description: 'Enviar documento usando WhatsApp Flow',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `mutation sendDocumentWhatsAppFlow($docId: UUID!, $phone: String!, $flowData: WhatsAppFlowInput) {
										sendDocumentWhatsAppFlow(docId: $docId, phone: $phone, flowData: $flowData) {
											id
											name
											signatures {
												public_id
												name
												phone
											}
										}
									}`,
									variables: {
										docId: '={{$parameter["documentId"]}}',
										phone: '={{$parameter["phone"]}}',
										flowData: '={{$parameter["flowData"] || undefined}}'
									}
								}
							},
						},
					},
					{
						name: 'Sign',
						value: 'sign',
						action: 'Sign',
						description: 'Assinar um documento específico',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `mutation SignDocumentMutation($id: UUID!) {
										signDocument(id: $id)
									}`,
									variables: {
										id: '={{$parameter["documentId"]}}'
									}
								}
							},
						},
					},
					{
						name: 'Transfer Document',
						value: 'transferDocument',
						action: 'Transfer document',
						description: 'Transferir um documento para outro usuário ou organização',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `mutation transferDocument($docId: UUID!, $receiverEmail: String!) {
										transferDocument(docId: $docId, receiverEmail: $receiverEmail) {
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
										receiverEmail: '={{$parameter["receiverEmail"]}}'
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
						operation: ['get', 'delete', 'moveToFolder', 'edit', 'addSignatory', 'removeSignatory', 'createSignatureLink', 'transferDocument', 'sendWhatsAppFlow', 'approveBiometric', 'rejectBiometric'],
					},
				},
				default: '',
				description: 'O ID do documento',
				placeholder: 'doc_xxxxx',
			},
			{
				displayName: 'Signature IDs',
				name: 'signatureIds',
				type: 'json',
				required: true,
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['resendSignatures'],
					},
				},
				default: '["434fcd4c6d0c11eea3c542010a2b60c6"]',
				description: 'Array de IDs públicos das assinaturas a serem reenviadas. Exemplo: ["434fcd4c6d0c11eea3c542010a2b60c6", "534fcd4c6d0c11eea3c542010a2b60c7"]',
				typeOptions: {
					rows: 3,
				},
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
				description: 'Conteúdo do arquivo em formato Base64. Formatos aceitos: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ODT, ODS, ODP, RTF, HTML, TXT. Máximo: 20MB. Use o node "Read Binary File" para converter um arquivo em Base64.',
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
				default: '[{"name": "João Silva", "email": "joao@exemplo.com", "action": "SIGN"}]',
				description: 'Array de assinantes em formato JSON. Cada signatário deve ter: name/email, action (SIGN, APPROVE, SIGN_AS_A_WITNESS, RECOGNIZE). Exemplo: [{"name": "João Silva", "email": "joao@exemplo.com", "action": "SIGN"}]',
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
				displayName: 'Message',
				name: 'message',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['edit'],
					},
				},
				default: '',
				description: 'Mensagem customizada enviada para os emails dos signatários',
				typeOptions: {
					rows: 3,
				},
			},
			{
				displayName: 'Reminder',
				name: 'reminder',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['edit'],
					},
				},
				options: [
					{
						name: 'None',
						value: '',
						description: 'Sem lembretes automáticos',
					},
					{
						name: 'Daily',
						value: 'DAILY',
						description: 'Lembrete diário',
					},
					{
						name: 'Weekly',
						value: 'WEEKLY',
						description: 'Lembrete semanal',
					},
				],
				default: '',
				description: 'Frequência de lembretes automáticos',
			},
			{
				displayName: 'Stop on Rejected',
				name: 'stopOnRejected',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['edit'],
					},
				},
				default: false,
				description: 'Impede que outras pessoas assinem quando recusado',
			},
			{
				displayName: 'New Signature Style',
				name: 'newSignatureStyle',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['edit'],
					},
				},
				default: false,
				description: 'Se true, ativa o uso de um estilo de assinatura atualizado',
			},
			{
				displayName: 'Show Audit Page',
				name: 'showAuditPage',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['edit'],
					},
				},
				default: true,
				description: 'Evita criar a última página de auditoria (requer new_signature_style: true)',
			},
			{
				displayName: 'Deadline At',
				name: 'deadlineAt',
				type: 'dateTime',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['edit'],
					},
				},
				default: '',
				description: 'Data limite para a assinatura do documento (formato ISO 8601)',
			},
			{
				displayName: 'Footer Position',
				name: 'footer',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['edit'],
					},
				},
				options: [
					{
						name: 'None',
						value: '',
						description: 'Sem rodapé',
					},
					{
						name: 'Bottom',
						value: 'BOTTOM',
						description: 'Rodapé na parte inferior',
					},
					{
						name: 'Left',
						value: 'LEFT',
						description: 'Rodapé à esquerda',
					},
					{
						name: 'Right',
						value: 'RIGHT',
						description: 'Rodapé à direita',
					},
				],
				default: '',
				description: 'Posição do rodapé no documento',
			},

			// Advanced Document Creation Fields
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'Mensagem customizada enviada para os emails dos signatários',
				typeOptions: {
					rows: 3,
				},
			},
			{
				displayName: 'Reminder',
				name: 'reminder',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['create'],
					},
				},
				options: [
					{
						name: 'None',
						value: '',
						description: 'Sem lembretes automáticos',
					},
					{
						name: 'Daily',
						value: 'DAILY',
						description: 'Lembrete diário',
					},
					{
						name: 'Weekly',
						value: 'WEEKLY',
						description: 'Lembrete semanal',
					},
				],
				default: '',
				description: 'Frequência de lembretes automáticos',
			},
			{
				displayName: 'Footer Position',
				name: 'footer',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['create'],
					},
				},
				options: [
					{
						name: 'None',
						value: '',
						description: 'Sem rodapé',
					},
					{
						name: 'Bottom',
						value: 'BOTTOM',
						description: 'Rodapé na parte inferior',
					},
					{
						name: 'Left',
						value: 'LEFT',
						description: 'Rodapé à esquerda',
					},
					{
						name: 'Right',
						value: 'RIGHT',
						description: 'Rodapé à direita',
					},
				],
				default: '',
				description: 'Posição do rodapé no documento',
			},
			{
				displayName: 'Qualified Signature',
				name: 'qualified',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['create'],
					},
				},
				default: false,
				description: 'Whether to enable qualified signature using digital certificates',
			},
			{
				displayName: 'Scrolling Required',
				name: 'scrollingRequired',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['create'],
					},
				},
				default: false,
				description: 'Whether to require the signatory to scroll through the entire page before signing',
			},
			{
				displayName: 'Stop on Rejected',
				name: 'stopOnRejected',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['create'],
					},
				},
				default: false,
				description: 'Whether to stop other people from signing when the document is refused',
			},
			{
				displayName: 'New Signature Style',
				name: 'newSignatureStyle',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['create'],
					},
				},
				default: false,
				description: 'Whether to enable new signature fields',
			},
			{
				displayName: 'Show Audit Page',
				name: 'showAuditPage',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['create'],
					},
				},
				default: true,
				description: 'Whether to show the audit page at the end of the document',
			},
			{
				displayName: 'Ignore CPF',
				name: 'ignoreCpf',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['create'],
					},
				},
				default: false,
				description: 'Whether to remove the requirement to fill in CPF to sign',
			},
			{
				displayName: 'Ignore Birthdate',
				name: 'ignoreBirthdate',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['create'],
					},
				},
				default: false,
				description: 'Whether to remove the requirement to fill in birthdate',
			},
			{
				displayName: 'Deadline',
				name: 'deadlineAt',
				type: 'dateTime',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'Data limite para assinaturas (formato ISO)',
			},
			{
				displayName: 'Organization ID',
				name: 'organizationId',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'ID da organização onde criar o documento (opcional)',
				placeholder: 'org_xxxxx',
			},
			{
				displayName: 'Folder ID',
				name: 'createInFolderId',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'ID da pasta onde criar o documento (opcional)',
				placeholder: 'folder_xxxxx',
			},
			{
				displayName: 'Signature ID',
				name: 'signatureId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['sign', 'removeSignatory', 'createSignatureLink', 'approveBiometric', 'rejectBiometric'],
					},
				},
				default: '',
				description: 'ID público da assinatura (public_id). Obtenha este valor na resposta da criação do documento ou na operação "Get Document" no campo signatures.public_id',
				placeholder: '434fcd4c6d0c11eea3c542010a2b60c6',
			},
			{
				displayName: 'Verification ID',
				name: 'verificationId',
				type: 'number',
				required: true,
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['approveBiometric', 'rejectBiometric'],
					},
				},
				default: 0,
				description: 'ID da verificação biométrica a ser aprovada ou rejeitada. Obtenha este valor no campo verifications.id da resposta da operação "Get Document"',
				placeholder: '430555',
			},
			{
				displayName: 'Contact Method',
				name: 'signatoryContactMethod',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['addSignatory'],
					},
				},
				options: [
					{
						name: 'Email',
						value: 'email',
						description: 'Usar email para contato',
					},
					{
						name: 'Phone',
						value: 'phone',
						description: 'Usar telefone para contato',
					},
					{
						name: 'Name Only',
						value: 'name',
						description: 'Apenas nome (gera link)',
					},
				],
				default: 'email',
				description: 'Método de contato com o signatário',
			},
			{
				displayName: 'Signatory Email',
				name: 'signatoryEmail',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['addSignatory'],
						signatoryContactMethod: ['email'],
					},
				},
				default: '',
				description: 'Email do signatário',
				placeholder: 'joao@exemplo.com',
			},
			{
				displayName: 'Signatory Phone',
				name: 'signatoryPhone',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['addSignatory'],
						signatoryContactMethod: ['phone'],
					},
				},
				default: '',
				description: 'Telefone do signatário (formato: +5511999999999)',
				placeholder: '+5511999999999',
			},
			{
				displayName: 'Signatory Name',
				name: 'signatoryName',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['addSignatory'],
					},
				},
				default: '',
				description: 'Nome do signatário (opcional para email/phone, obrigatório para name only)',
				placeholder: 'João Silva',
			},
			{
				displayName: 'Action',
				name: 'signatoryAction',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['addSignatory'],
					},
				},
				options: [
					{
						name: 'Sign',
						value: 'SIGN',
						description: 'Assinar o documento',
					},
					{
						name: 'Approve',
						value: 'APPROVE',
						description: 'Aprovar o documento',
					},
					{
						name: 'Sign as Witness',
						value: 'SIGN_AS_A_WITNESS',
						description: 'Assinar como testemunha',
					},
					{
						name: 'Recognize',
						value: 'RECOGNIZE',
						description: 'Reconhecer assinatura',
					},
				],
				default: 'SIGN',
				description: 'Ação que o signatário deve realizar',
			},
			{
				displayName: 'Delivery Method',
				name: 'signatoryDeliveryMethod',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['addSignatory'],
						signatoryContactMethod: ['phone'],
					},
				},
				options: [
					{
						name: 'WhatsApp',
						value: 'DELIVERY_METHOD_WHATSAPP',
						description: 'Enviar por WhatsApp',
					},
					{
						name: 'SMS',
						value: 'DELIVERY_METHOD_SMS',
						description: 'Enviar por SMS',
					},
				],
				default: 'DELIVERY_METHOD_WHATSAPP',
				description: 'Método de entrega do convite de assinatura (obrigatório para telefone)',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['getMany', 'search'],
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
						operation: ['getMany', 'search'],
					},
				},
				default: 1,
				description: 'Página dos resultados',
				typeOptions: {
					minValue: 1,
				},
			},

			// Search parameters
			{
				displayName: 'Search Term',
				name: 'searchTerm',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['search'],
					},
				},
				default: '',
				description: 'Termo de busca no nome do documento',
				placeholder: 'Contrato de Serviços',
			},
			{
				displayName: 'Document Status',
				name: 'documentStatus',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['search'],
					},
				},
				options: [
					{
						name: 'All',
						value: '',
						description: 'Todos os status',
					},
					{
						name: 'Draft',
						value: 'draft',
						description: 'Rascunho',
					},
					{
						name: 'Expired',
						value: 'expired',
						description: 'Expirado',
					},
					{
						name: 'Pending',
						value: 'pending',
						description: 'Pendente de assinatura',
					},
					{
						name: 'Rejected',
						value: 'rejected',
						description: 'Rejeitado',
					},
					{
						name: 'Signed',
						value: 'signed',
						description: 'Assinado',
					},
				],
				default: '',
				description: 'Status do documento',
			},
			{
				displayName: 'Search Folder ID',
				name: 'searchFolderId',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['search'],
					},
				},
				default: '',
				description: 'ID da pasta para filtrar documentos (opcional)',
				placeholder: 'folder_xxxxx',
			},
			{
				displayName: 'Order By',
				name: 'orderBy',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['search'],
					},
				},
				options: [
					{
						name: 'Created At',
						value: 'created_at',
					},
					{
						name: 'Updated At',
						value: 'updated_at',
					},
					{
						name: 'Name',
						value: 'name',
					},
				],
				default: 'created_at',
				description: 'Campo para ordenação',
			},
			{
				displayName: 'Order Direction',
				name: 'orderDirection',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['search'],
					},
				},
				options: [
					{
						name: 'Descending',
						value: 'desc',
					},
					{
						name: 'Ascending',
						value: 'asc',
					},
				],
				default: 'desc',
				description: 'Direção da ordenação',
			},

			// Transfer Document fields
			{
				displayName: 'Receiver Email',
				name: 'receiverEmail',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['transferDocument'],
					},
				},
				default: '',
				description: 'Email do usuário que receberá o documento',
				placeholder: 'usuario@exemplo.com',
			},

			// WhatsApp Flow fields
			{
				displayName: 'Phone Number',
				name: 'phone',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['sendWhatsAppFlow'],
					},
				},
				default: '',
				description: 'Número de telefone para envio via WhatsApp (formato internacional)',
				placeholder: '+5511999999999',
			},
			{
				displayName: 'Flow Data',
				name: 'flowData',
				type: 'json',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['sendWhatsAppFlow'],
					},
				},
				default: '{}',
				description: 'Dados adicionais para o WhatsApp Flow (opcional)',
				typeOptions: {
					rows: 3,
				},
			},

			// Biometric Verification fields
			{
				displayName: 'Rejection Reason',
				name: 'rejectionReason',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['documents'],
						operation: ['rejectBiometric'],
					},
				},
				default: '',
				description: 'Motivo da rejeição da verificação biométrica (opcional)',
				placeholder: 'Documento ilegível',
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
			// EMAIL TEMPLATES OPERATIONS
			// ===========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['emailTemplates'],
					},
				},
				options: [
					{
						name: 'Get Many',
						value: 'getMany',
						action: 'Get many',
						description: 'Listar modelos de email disponíveis',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `query EmailTemplatesQuery {
										emailTemplates {
											id
											name
											subject
											body
											created_at
											updated_at
											is_default
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
						action: 'Get current',
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
						action: 'Get many',
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
						action: 'Get many',
						description: 'Recuperar múltiplas pastas',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `query FoldersQuery($limit: Int!, $page: Int!) {
										folders(limit: $limit, page: $page) {
											total
											data {
												id
												name
												created_at
											}
										}
									}`,
									variables: {
										limit: '={{$parameter["limit"] || 10}}',
										page: '={{$parameter["page"] || 1}}'
									}
								}
							},
						},
					},
					{
						name: 'Create',
						value: 'create',
						action: 'Create',
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
						action: 'Delete',
						description: 'Deletar uma pasta',
						routing: {
							request: {
								method: 'POST',
								url: '/graphql',
								body: {
									query: `mutation DeleteFolderMutation($id: UUID!) {
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
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['folders'],
						operation: ['getMany'],
					},
				},
				default: 10,
				description: 'Número máximo de pastas a retornar (1-100)',
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['folders'],
						operation: ['getMany'],
					},
				},
				default: 1,
				description: 'Número da página (começando em 1)',
				typeOptions: {
					minValue: 1,
				},
			},
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




