import type {
	GeneratedOpdsCredentials,
	OpdsCredentialSecret,
	OpdsCredentialStatus,
	OpdsServiceStatus,
	OpdsStartConfig,
} from "@/bindings";

export interface OpdsCredentials {
	username: string;
	password: string;
}

export interface OpdsClient {
	status(): Promise<OpdsServiceStatus>;
	start(config: OpdsStartConfig): Promise<OpdsServiceStatus>;
	stop(): Promise<OpdsServiceStatus>;
	reconfigure(config: OpdsStartConfig): Promise<OpdsServiceStatus>;
	credentialStatus(): Promise<OpdsCredentialStatus>;
	credentialSecret(): Promise<OpdsCredentialSecret | null>;
	configureCredentials(
		credentials: OpdsCredentials,
	): Promise<OpdsCredentialStatus>;
	generateCredentials(username: string): Promise<GeneratedOpdsCredentials>;
	clearCredentials(): Promise<OpdsCredentialStatus>;
}
