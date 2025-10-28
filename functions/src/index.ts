/**
 * Firebase Cloud Functions for GDG-DLSU Internal Hub
 * - DigitalOcean Spaces integration for file uploads
 */

import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";
import { config } from "dotenv";

// Load environment variables
config();

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Configure DigitalOcean Spaces S3 client
const s3Client = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: process.env.DO_SPACES_REGION || "sgp1",
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || "",
    secretAccessKey: process.env.DO_SPACES_SECRET || "",
  },
});

const BUCKET_NAME = process.env.DO_SPACES_BUCKET || "";
const CDN_ENDPOINT = (process.env.DO_SPACES_CDN_ENDPOINT || "").replace(/\/$/, "");

// Set global options for cost control
setGlobalOptions({ maxInstances: 10 });

/**
 * Generate a presigned URL for uploading files to DigitalOcean Spaces
 * @param fileName - The name of the file to upload
 * @param fileType - The MIME type of the file
 * @returns Presigned URL for PUT operation
 */
export const getPresignedUploadURL = onCall(
  { cors: true },
  async (request) => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { fileName, fileType } = request.data;

    if (!fileName || !fileType) {
      throw new HttpsError(
        "invalid-argument",
        "fileName and fileType are required"
      );
    }

    try {
      // Generate unique key with timestamp and place files at bucket root (no `uploads/` prefix)
      const timestamp = Date.now();
      const key = `${timestamp}-${fileName}`;

      // Request that the uploaded object be publicly readable so the publicUrl will work
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: fileType,
        ACL: "public-read",
      });

      // Generate presigned URL (valid for 15 minutes)
      const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });

      // Construct the public URL (after upload completes)
      // Prefer the CDN endpoint for public URLs if configured. URL-encode the key portion.
      const host = CDN_ENDPOINT || (process.env.DO_SPACES_ENDPOINT || "").replace(/\/$/, "");
      const publicUrl = `${host}/${BUCKET_NAME}/${encodeURIComponent(key)}`;

      logger.info("Generated presigned URL", {
        userId: request.auth.uid,
        fileName,
        key,
      });

      return {
        uploadUrl: url,
        publicUrl,
        key,
      };
    } catch (error) {
      logger.error("Error generating presigned URL", error);
      throw new HttpsError("internal", "Failed to generate upload URL");
    }
  }
);

/**
 * Delete a file from DigitalOcean Spaces and its Firestore metadata
 * @param fileId - The Firestore document ID
 * @param filePath - The S3 key/path of the file
 */
export const deleteFile = onCall(
  { cors: true },
  async (request) => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { fileId, filePath } = request.data;

    if (!fileId || !filePath) {
      throw new HttpsError(
        "invalid-argument",
        "fileId and filePath are required"
      );
    }

    try {
      // Delete from DigitalOcean Spaces
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filePath,
      });

      await s3Client.send(command);

      // Delete from Firestore
      await db.collection("files").doc(fileId).delete();

      logger.info("Deleted file", {
        userId: request.auth.uid,
        fileId,
        filePath,
      });

      return { success: true };
    } catch (error) {
      logger.error("Error deleting file", error);
      throw new HttpsError("internal", "Failed to delete file");
    }
  }
);


/**
 * Generate a presigned GET URL for downloading files from DigitalOcean Spaces
 * Input: { key: string, disposition?: 'inline' | 'attachment', ttlSeconds?: number }
 */
export const getPresignedDownloadURL = onCall(
  { cors: true },
  async (request) => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { key, disposition = "attachment", ttlSeconds = 120 } = request.data || {};

    if (!key) {
      throw new HttpsError("invalid-argument", "key is required");
    }

    // Basic authorization: ensure user is in the `team` collection (same check used for sign-in)
    try {
      const userEmail = request.auth.token?.email;
      if (!userEmail) {
        throw new HttpsError("permission-denied", "User email not available");
      }

      const teamQuery = await db.collection("team").where("email", "==", userEmail).limit(1).get();
      if (teamQuery.empty) {
        throw new HttpsError("permission-denied", "User is not a verified team member");
      }

      const filename = key.split("/").pop() || "file";
      // Build Content-Disposition header value
      const dispositionHeader = `${disposition}; filename="${filename.replace(/\"/g, "")}"`;

      // If the file is public and we have a CDN endpoint configured, prefer returning the stored public URL
      // Try to find a file metadata record in Firestore with this key
      const fileQuery = await db.collection("files").where("filePath", "==", key).limit(1).get();
      if (!fileQuery.empty) {
        const fileDoc = fileQuery.docs[0].data() as any;
        if (fileDoc?.fileURL) {
          // Log the download/preview request
          await db.collection("downloads").add({
            key,
            userId: request.auth.uid,
            email: userEmail,
            action: disposition === "inline" ? "preview" : "download",
            createdAt: new Date(),
          });

          return { url: fileDoc.fileURL, expiresAt: new Date(Date.now() + (ttlSeconds * 1000)).toISOString() };
        }
      }

      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ResponseContentDisposition: dispositionHeader,
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn: Number(ttlSeconds) || 120 });

      // Optional: log the download/preview request
      await db.collection("downloads").add({
        key,
        userId: request.auth.uid,
        email: userEmail,
        action: disposition === "inline" ? "preview" : "download",
        createdAt: new Date(),
      });

      return { url, expiresAt: new Date(Date.now() + (ttlSeconds * 1000)).toISOString() };
    } catch (error: any) {
      logger.error("Error generating presigned GET URL", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to generate download URL");
    }
  }
);

