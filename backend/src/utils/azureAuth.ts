import { createRemoteJWKSet, jwtVerify, type JWTVerifyOptions } from 'jose';

const tenantId = process.env.AZURE_TENANT_ID;
const clientId = process.env.AZURE_CLIENT_ID;

if (!tenantId || !clientId) {
  throw new Error('AZURE_TENANT_ID and AZURE_CLIENT_ID are required for Azure auth');
}

const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
const jwksUri = `${issuer}/discovery/v2.0/keys`;
const JWKS = createRemoteJWKSet(new URL(jwksUri));

export const verifyAzureToken = async (token: string) => {
  const options: JWTVerifyOptions = {
    issuer,
    audience: clientId,
    algorithms: ['RS256']
  };
  const { payload } = await jwtVerify(token, JWKS, options);
  return payload;
};
