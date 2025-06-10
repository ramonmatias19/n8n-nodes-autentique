import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AutentiqueApi implements ICredentialType {
	name = 'autentiqueApi';
	displayName = 'Autentique API';
	documentationUrl = 'https://docs.autentique.com.br/api/';
	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Seu Token de API do Autentique. Obtenha em Configurações > Integrações > API na sua conta Autentique.',
			placeholder: 'autentique_api_token_xxxxxxxxxxxxx',
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'Authorization': '=Bearer {{$credentials.apiToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.autentique.com.br/v2',
			url: '/graphql',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: {
				query: `query {
					me {
						id
						name
						email
					}
				}`,
			},
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'data.me.id',
					value: undefined,
					message: 'Token de API inválido. Verifique se o token está correto e ativo.',
				},
			},
		],
	};
}
