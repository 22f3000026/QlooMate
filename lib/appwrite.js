import { Client, Account, OAuthProvider, Databases, Functions } from 'appwrite';

let client = new Client();

client
    .setEndpoint('https://nyc.cloud.appwrite.io/v1') // Your API Endpoint
    .setProject('qloohack') // Your project ID
;

const account = new Account(client);
const databases = new Databases(client);
const functions = new Functions(client);

// Validate client configuration
const validateClient = () => {
  if (!client.config.endpoint || !client.config.project) {
    console.error('Appwrite client not properly configured');
    return false;
  }
  return true;
};

// Export with validation
export { account, client, OAuthProvider, databases, functions, validateClient }; 