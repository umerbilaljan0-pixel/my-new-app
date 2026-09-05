import {
  DEFAULT_PRESIGN_TTL,
  type HeadResult,
  type PresignGetInput,
  type PresignPutInput,
  type PresignResult,
  type StorageAdapter,
  type StorageBucket,
} from "./types";

/**
 * Cloudflare R2 storage adapter (production). R2 is S3-compatible, so this uses
 * the official AWS SDK, imported dynamically so the local-dev path never loads
 * it. Activated by lib/storage/index.ts only when the R2_* env vars are present.
 *
 * The browser PUTs directly to the presigned URL; the R2 bucket must have a CORS
 * rule allowing PUT from the app origin with the Content-Type header (an infra
 * setup step, documented in the README).
 */
export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketInputs: string;
  bucketOutputs: string;
}

function bucketName(cfg: R2Config, bucket: StorageBucket): string {
  return bucket === "inputs" ? cfg.bucketInputs : cfg.bucketOutputs;
}

export function createR2Adapter(cfg: R2Config): StorageAdapter {
  const endpoint = `https://${cfg.accountId}.r2.cloudflarestorage.com`;

  // Lazily construct the S3 client + presigner on first use.
  let clientPromise: Promise<{
    client: import("@aws-sdk/client-s3").S3Client;
    s3: typeof import("@aws-sdk/client-s3");
    presign: typeof import("@aws-sdk/s3-request-presigner").getSignedUrl;
  }> | null = null;

  async function getClient() {
    if (!clientPromise) {
      clientPromise = (async () => {
        const s3 = await import("@aws-sdk/client-s3");
        const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
        const client = new s3.S3Client({
          region: "auto",
          endpoint,
          credentials: {
            accessKeyId: cfg.accessKeyId,
            secretAccessKey: cfg.secretAccessKey,
          },
        });
        return { client, s3, presign: getSignedUrl };
      })();
    }
    return clientPromise;
  }

  return {
    backend: "r2",

    async presignPut(input: PresignPutInput): Promise<PresignResult> {
      const { client, s3, presign } = await getClient();
      const expiresIn = input.expiresIn ?? DEFAULT_PRESIGN_TTL;
      const cmd = new s3.PutObjectCommand({
        Bucket: bucketName(cfg, input.bucket),
        Key: input.key,
        ContentType: input.contentType,
        ContentLength: input.bytes,
      });
      const url = await presign(client, cmd, { expiresIn });
      return { url, expiresIn };
    },

    async presignGet(input: PresignGetInput): Promise<PresignResult> {
      const { client, s3, presign } = await getClient();
      const expiresIn = input.expiresIn ?? DEFAULT_PRESIGN_TTL;
      const cmd = new s3.GetObjectCommand({
        Bucket: bucketName(cfg, input.bucket),
        Key: input.key,
      });
      const url = await presign(client, cmd, { expiresIn });
      return { url, expiresIn };
    },

    async head(bucket: StorageBucket, key: string): Promise<HeadResult> {
      const { client, s3 } = await getClient();
      try {
        const res = await client.send(
          new s3.HeadObjectCommand({ Bucket: bucketName(cfg, bucket), Key: key }),
        );
        return {
          exists: true,
          bytes: res.ContentLength,
          contentType: res.ContentType,
        };
      } catch (err: unknown) {
        const name = (err as { name?: string })?.name;
        if (name === "NotFound" || name === "NoSuchKey") return { exists: false };
        throw err;
      }
    },

    async delete(bucket: StorageBucket, key: string): Promise<void> {
      const { client, s3 } = await getClient();
      await client.send(
        new s3.DeleteObjectCommand({ Bucket: bucketName(cfg, bucket), Key: key }),
      );
    },
  };
}
