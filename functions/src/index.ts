/**
 * Firebase Cloud Functions for GDG-DLSU Internal Hub
 * - DigitalOcean Spaces integration for file uploads
 */

import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
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
      // URL-encode the key portion to ensure spaces and special chars are safe in the public URL
      const publicUrl = `${process.env.DO_SPACES_ENDPOINT}/${BUCKET_NAME}/${encodeURIComponent(
        key
      )}`;

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

