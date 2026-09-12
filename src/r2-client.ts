import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { readFile } from "node:fs/promises";

/**
 * Cloudflare R2 client (S3-compatible API).
 *
 * NOTE: this file is NOT used by the deployed diagnostics path (which uses
 * Cloudflare's native R2 binding instead — see functions/r2-selftest.ts).
 * It's kept here as an alternative for a future environment with normal
 * desktop/network access, per Correction Spec #1.
 *
 * Required env vars:
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME
 *
 * Never hardcode these (Master Instructions §34 Security). This module
 * reads them lazily (only when a function is actually called) so that
 * importing it elsewhere does not itself throw.
 */

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

function loadR2Config(): R2Config {
  const missing: string[] = [];
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!accountId) missing.push("R2_ACCOUNT_ID");
  if (!accessKeyId) missing.push("R2_ACCESS_KEY_ID");
  if (!secretAccessKey) missing.push("R2_SECRET_ACCESS_KEY");
  if (!bucketName) missing.push("R2_BUCKET_NAME");

  if (missing.length > 0) {
    throw new Error(
      `R2 client configuration error: missing environment variable(s): ${missing.join(", ")}. ` +
        `Set these before calling uploadToR2/fetchFromR2 (see instructions.md, section ` +
        `'Cloudflare R2 setup'). No default or mocked bucket is used.`
    );
  }

  return { accountId: accountId!, accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey!, bucketName: bucketName! };
}

function buildClient(config: R2Config): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export async function uploadToR2(localFilePath: string, r2Key: string): Promise<{ key: string; bucket: string }> {
  const config = loadR2Config();
  const client = buildClient(config);

  let body: Buffer;
  try {
    body = await readFile(localFilePath);
  } catch (err) {
    throw new Error(
      `R2 upload error: could not read local file "${localFilePath}" — ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucketName,
        Key: r2Key,
        Body: body,
        ContentType: "model/gltf-binary",
      })
    );
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    throw new Error(
      `R2 upload network/auth error for key "${r2Key}": could not reach or authenticate against ` +
        `${config.accountId}.r2.cloudflarestorage.com. This usually means "network unreachable at ` +
        `*.r2.cloudflarestorage.com" (check this environment's network allowlist) or invalid ` +
        `R2 credentials. Underlying error: ${cause}`
    );
  }

  return { key: r2Key, bucket: config.bucketName };
}

export async function fetchFromR2(r2Key: string): Promise<Buffer> {
  const config = loadR2Config();
  const client = buildClient(config);

  try {
    const result = await client.send(new GetObjectCommand({ Bucket: config.bucketName, Key: r2Key }));
    const byteArray = await result.Body?.transformToByteArray();
    if (!byteArray) {
      throw new Error(`R2 fetch returned an empty body for key "${r2Key}".`);
    }
    return Buffer.from(byteArray);
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    throw new Error(
      `R2 fetch network/auth error for key "${r2Key}": could not reach or authenticate against ` +
        `${config.accountId}.r2.cloudflarestorage.com. Underlying error: ${cause}`
    );
  }
}
