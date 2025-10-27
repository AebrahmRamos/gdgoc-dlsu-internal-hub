import React, { useState } from "react";
import {
  useDataGrid,
  List,
  DeleteButton,
} from "@refinedev/mui";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Typography,
  IconButton,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useCreate, useGetIdentity } from "@refinedev/core";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../../firebase";

const functions = getFunctions(app);

export const AssetHubList = () => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { dataGridProps } = useDataGrid({
    sorters: {
      initial: [
        {
          field: "createdAt",
          order: "desc",
        },
      ],
    },
  });

  const { mutate: createFileRecord } = useCreate();
  const { data: identity } = useGetIdentity<{ email: string }>();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadError(null);

    try {
      console.log("🚀 Starting upload for:", selectedFile.name);
      
      // Step 1: Get presigned URL from Cloud Function
      console.log("📡 Calling getPresignedUploadURL...");
      const getPresignedURL = httpsCallable(functions, "getPresignedUploadURL");
      const result = await getPresignedURL({
        fileName: selectedFile.name,
        fileType: selectedFile.type,
      });

      console.log("✅ Presigned URL received:", result.data);

      const data = result.data as {
        uploadUrl: string;
        publicUrl: string;
        key: string;
      };

      // Step 2: Upload file to DigitalOcean Spaces using presigned URL
      console.log("📤 Uploading to Spaces...", data.uploadUrl);
      const uploadResponse = await fetch(data.uploadUrl, {
        method: "PUT",
        body: selectedFile,
        headers: {
          "Content-Type": selectedFile.type,
          // Ensure the uploaded object is publicly readable
          "x-amz-acl": "public-read",
        },
      });

      console.log("Upload response status:", uploadResponse.status);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("Upload failed:", errorText);
        throw new Error(`Failed to upload file to storage: ${uploadResponse.status} - ${errorText}`);
      }

      console.log("✅ File uploaded to Spaces successfully");

      // Step 3: Create metadata record in Firestore
      console.log("💾 Creating Firestore record...");
      createFileRecord(
        {
          resource: "files",
          values: {
            fileName: selectedFile.name,
            fileURL: data.publicUrl,
            filePath: data.key,
            fileType: selectedFile.type,
            fileSize: selectedFile.size,
            uploader: identity?.email || "unknown",
            createdAt: new Date(),
          },
        },
        {
          onSuccess: () => {
            console.log("✅ Upload complete!");
            setUploadDialogOpen(false);
            setSelectedFile(null);
            setUploading(false);
          },
          onError: (error) => {
            console.error("❌ Failed to save metadata:", error);
            setUploadError(`Failed to save file metadata: ${error.message}`);
            setUploading(false);
          },
        }
      );
    } catch (error: any) {
      console.error("❌ Upload failed:", error);
      setUploadError(error.message || "Failed to upload file");
      setUploading(false);
    }
  };

  const columns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: "fileName",
        headerName: "File Name",
        flex: 1.5,
        minWidth: 250,
      },
      {
        field: "fileType",
        headerName: "Type",
        flex: 0.8,
        minWidth: 150,
      },
      {
        field: "fileSize",
        headerName: "Size",
        flex: 0.5,
        minWidth: 100,
        valueFormatter: ({ value }) => {
          if (!value) return "N/A";
          const kb = value / 1024;
          if (kb < 1024) return `${kb.toFixed(2)} KB`;
          return `${(kb / 1024).toFixed(2)} MB`;
        },
      },
      {
        field: "uploader",
        headerName: "Uploaded By",
        flex: 1,
        minWidth: 200,
      },
      {
        field: "createdAt",
        headerName: "Uploaded At",
        flex: 1,
        minWidth: 180,
        valueFormatter: ({ value }: any) => {
          if (!value) return "";
          const date = value.toDate ? value.toDate() : new Date(value);
          return date.toLocaleString();
        },
      },
      {
        field: "actions",
        headerName: "Actions",
        flex: 1,
        minWidth: 150,
        sortable: false,
        renderCell: ({ row }) => (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              href={row.fileURL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Download
            </Button>
            <DeleteButton
              recordItemId={row.id}
              resource="files"
              hideText
              size="small"
            />
          </Box>
        ),
      },
    ],
    []
  );

  return (
    <>
      <List
        headerButtons={
          <Button
            variant="contained"
            startIcon={<UploadFileIcon />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Upload File
          </Button>
        }
      >
        <DataGrid {...dataGridProps} columns={columns} autoHeight />
      </List>

      <Dialog
        open={uploadDialogOpen}
        onClose={() => !uploading && setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload File</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {uploadError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {uploadError}
              </Alert>
            )}
            
            <input
              accept="*/*"
              style={{ display: "none" }}
              id="file-upload"
              type="file"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            <label htmlFor="file-upload">
              <Button
                variant="outlined"
                component="span"
                fullWidth
                disabled={uploading}
              >
                Choose File
              </Button>
            </label>

            {selectedFile && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Selected: {selectedFile.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Size: {(selectedFile.size / 1024).toFixed(2)} KB
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={!selectedFile || uploading}
            startIcon={uploading && <CircularProgress size={20} />}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
