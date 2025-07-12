import { Client, createClient, Osdk } from "@osdk/client";
import { createPublicOauthClient } from "@osdk/oauth";
import { TextClip } from "@suriya/sdk";

const client_id: string = "4261dd08455aac50f12940c35c9650f5";
const url: string = "https://devcon.palantirfoundry.com";
const ontologyRid: string = "ri.ontology.main.ontology.07f3b58b-e769-4a3f-a67d-25d64b90af5f";
const redirectUrl: string = "http://localhost:8080/auth/callback"; // Updated to match Palantir Foundry requirements
const scopes: string[] = [
	"api:use-ontologies-read",
	"api:use-ontologies-write",
	"api:use-mediasets-read",
	"api:use-mediasets-write"
];

// Create auth client
const auth = createPublicOauthClient(
	client_id, 
	url, 
	redirectUrl, 
	true, 
	undefined, 
	typeof window !== 'undefined' ? window.location.toString() : '', 
	scopes
);

// Create Foundry client
export const foundryClient: Client = createClient(url, ontologyRid, auth);

// Export types and utilities
export { TextClip, type Osdk };

// Helper function to fetch text clips
export const fetchTextClips = async (pageSize: number = 10) => {
	try {
		const result = await foundryClient(TextClip).fetchPage({ $pageSize: pageSize });
		const objectsList: Osdk.Instance<TextClip>[] = result.data;
		console.log('Fetched TextClips:', objectsList);
		return objectsList;
	} catch (error) {
		console.error('Error fetching TextClips:', error);
		throw error;
	}
}; 