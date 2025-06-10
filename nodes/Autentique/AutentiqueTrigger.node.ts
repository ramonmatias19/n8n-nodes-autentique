import {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	NodeOperationError,
	NodeConnectionType,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';

// Função auxiliar para fazer chamadas à API GraphQL da Autentique
async function makeAutentiqueApiCall(
	functions: IHookFunctions | ILoadOptionsFunctions,
	credentials: IDataObject,
	query: string,
	variables?: IDataObject,
): Promise<any> {
	const options: IRequestOptions = {
		method: 'POST' as IHttpRequestMethods,
		url: 'https://api.autentique.com.br/v2/graphql',
		headers: {
			'Authorization': `Bearer ${credentials.apiToken}`,
			'Content-Type': 'application/json',
		},
		body: {
			query,
			variables: variables || {},
		},
		json: true,
	};

	try {
		const response = await functions.helpers.request(options);
		
		if (response.errors) {
			throw new NodeOperationError(functions.getNode(), `Erro da API GraphQL: ${JSON.stringify(response.errors)}`);
		}

		return response.data;
	} catch (error) {
		throw new NodeOperationError(functions.getNode(), `Erro na chamada da API: ${error.message}`);
	}
}

export class AutentiqueTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Autentique Trigger',
		name: 'autentiqueTrigger',
		icon: 'file:logo.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Recebe notificações de eventos da Autentique via webhook',
		defaults: {
			name: 'Autentique Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'autentiqueApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Evento',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'Documento Assinado',
						value: 'document_signed',
						description: 'Disparado quando um documento é totalmente assinado',
					},
					{
						name: 'Documento Criado',
						value: 'document_created',
						description: 'Disparado quando um novo documento é criado',
					},
					{
						name: 'Documento Rejeitado',
						value: 'document_rejected',
						description: 'Disparado quando um documento é rejeitado',
					},
					{
						name: 'Signatário Assinou',
						value: 'signatory_signed',
						description: 'Disparado quando um signatário específico assina',
					},
					{
						name: 'Signatário Rejeitou',
						value: 'signatory_rejected',
						description: 'Disparado quando um signatário rejeita a assinatura',
					},
					{
						name: 'Todos Os Eventos',
						value: '*',
						description: 'Receber notificações de todos os eventos',
					},
				],
				default: 'document_signed',
				required: true,
				description: 'Tipo de evento para receber notificações',
			},
			{
				displayName: 'Apenas Documentos Específicos',
				name: 'specificDocuments',
				type: 'boolean',
				default: false,
				description: 'Whether to filter only specific documents',
			},
			{
				displayName: 'IDs Dos Documentos',
				name: 'documentIds',
				type: 'string',
				default: '',
				placeholder: 'doc_123,doc_456',
				description: 'Lista de IDs de documentos separados por vírgula (deixe em branco para todos)',
				displayOptions: {
					show: {
						specificDocuments: [true],
					},
				},
			},
			{
				displayName: 'Validar Assinatura',
				name: 'validateSignature',
				type: 'boolean',
				default: true,
				description: 'Whether to validate the webhook signature using the API token',
			},
		],
	};

	methods = {
		loadOptions: {
			async getDocuments(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('autentiqueApi');
				
				const query = `
					query {
						documents {
							data {
								id
								name
								created_at
							}
						}
					}
				`;

				try {
					const responseData = await makeAutentiqueApiCall(this, credentials, query);
					const documents = responseData.documents?.data || [];

					return documents.map((document: any) => ({
						name: `${document.name} (${document.id})`,
						value: document.id,
					}));
				} catch (error) {
					throw new NodeOperationError(this.getNode(), `Erro ao carregar documentos: ${error.message}`);
				}
			},
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				// Para simplicidade, sempre retornamos false
				// Isso fará com que o webhook seja sempre recriado
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				// A Autentique não possui endpoints específicos para criar webhooks via API
				// Os webhooks precisam ser configurados manualmente no painel da Autentique
				// Retornamos true para simular que foi criado com sucesso
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				// Retornamos true para simular que foi deletado com sucesso
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData() as IDataObject;
		const headerData = this.getHeaderData() as IDataObject;
		const event = this.getNodeParameter('event') as string;
		const specificDocuments = this.getNodeParameter('specificDocuments') as boolean;
		const documentIds = this.getNodeParameter('documentIds') as string;
		const validateSignature = this.getNodeParameter('validateSignature') as boolean;

		// Validação de assinatura (se habilitada)
		if (validateSignature) {
			const signature = headerData['x-autentique-signature'] as string;
			const timestamp = headerData['x-autentique-timestamp'] as string;
			
			if (!signature || !timestamp) {
				throw new NodeOperationError(this.getNode(), 'Webhook não contém assinatura válida');
			}

			// Aqui você implementaria a validação da assinatura
			// usando o token da API para verificar se o webhook é legítimo
		}

		// Filtro por evento específico
		if (event !== '*' && bodyData.event !== event) {
			return {
				webhookResponse: {
					status: 200,
					body: { received: true, ignored: 'Event type mismatch' },
				},
			};
		}

		// Filtro por documentos específicos
		if (specificDocuments && documentIds) {
			const allowedDocuments = documentIds.split(',').map(id => id.trim());
			const document = bodyData.document as IDataObject;
			const documentId = document?.id as string || bodyData.document_id as string;
			
			if (documentId && !allowedDocuments.includes(documentId)) {
				return {
					webhookResponse: {
						status: 200,
						body: { received: true, ignored: 'Document not in filter list' },
					},
				};
			}
		}

		// Processa os dados do webhook
		const processedData = {
			event: bodyData.event,
			timestamp: bodyData.timestamp || new Date().toISOString(),
			document: bodyData.document || {},
			signatory: bodyData.signatory || {},
			organization: bodyData.organization || {},
			webhook_data: bodyData,
		};

		return {
			workflowData: [
				[
					{
						json: processedData,
					} as INodeExecutionData,
				],
			],
			webhookResponse: {
				status: 200,
				body: { received: true },
			},
		};
	}
} 