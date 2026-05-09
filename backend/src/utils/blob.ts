import { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, SASProtocol, StorageSharedKeyCredential } from '@azure/storage-blob';

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const containerName = process.env.AZURE_STORAGE_CONTAINER || '';

const isAzureConfigured = Boolean(
  accountName &&
  accountKey &&
  !accountName.includes('<') &&
  !accountKey.includes('<') &&
  accountName !== 'yourstorageaccount' &&
  accountKey !== 'yourstorageaccountkey'
);

let client: BlobServiceClient | null = null;
let containerClient: any = null;
let credential: StorageSharedKeyCredential | null = null;

if (isAzureConfigured) {
  credential = new StorageSharedKeyCredential(accountName!, accountKey!);
  client = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, credential);
  containerClient = client.getContainerClient(containerName);
}

export const createMediaUploadUrl = async (filename: string, contentType: string) => {
  if (!containerClient) {
    // Mock implementation for local development
    const apiPort = process.env.PORT || '5000';
    const mockUrl = `http://localhost:${apiPort}/mock-upload/${encodeURIComponent(filename)}`;
    return {
      uploadUrl: mockUrl,
      blobUrl: `http://localhost:${apiPort}/mock-media/${encodeURIComponent(filename)}`,
      expiresOn: new Date(Date.now() + 15 * 60 * 1000)
    };
  }

  const blobClient = containerClient.getBlockBlobClient(filename);
  const expiresOn = new Date(Date.now() + 15 * 60 * 1000);
  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName: filename,
      permissions: BlobSASPermissions.parse('cw'),
      startsOn: new Date(Date.now() - 5 * 60 * 1000),
      expiresOn,
      protocol: SASProtocol.Https
    },
    credential!
  ).toString();

  return {
    uploadUrl: `${blobClient.url}?${sasToken}`,
    blobUrl: blobClient.url,
    expiresOn
  };
};
