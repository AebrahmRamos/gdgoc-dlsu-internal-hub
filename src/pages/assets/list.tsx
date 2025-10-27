import React, { useState } from "react";
import {
  useDataGrid,
  List,
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
  Tooltip,
} from "@mui/material";
import Snackbar from "@mui/material/Snackbar";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import GetAppIcon from "@mui/icons-material/GetApp";
import { useCreate, useGetIdentity, useDelete } from "@refinedev/core";
import CloseIcon from '@mui/icons-material/Close';
import ReplayIcon from '@mui/icons-material/Replay';
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
  const { mutate: deleteResource } = useDelete();
  const { data: identity } = useGetIdentity<{ email: string }>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    filePath: string;
    fileName?: string | null;
  } | null>(null);
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [previewingIds, setPreviewingIds] = useState<Record<string, boolean>>({});
  const [downloadingIds, setDownloadingIds] = useState<Record<string, boolean>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileType, setPreviewFileType] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);
  // Snackbar / error UX
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [lastFailed, setLastFailed] = useState<any | null>(null);

  const handleDownload = async (filePath: string) => {
    setDownloadingIds((s) => ({ ...s, [filePath]: true }));
    try {
      const getDownload = httpsCallable(functions, "getPresignedDownloadURL");
      const result = await getDownload({ key: filePath, disposition: "attachment", ttlSeconds: 120 });
      const url = (result.data as any)?.url;
      if (url) {
        window.open(url, "_blank");
      } else {
        throw new Error("No download URL returned");
      }
    } catch (error: any) {
      console.error("Failed to get download URL:", error);
  const message = error?.message || "Failed to get download URL";
  setUploadError(message);
  setSnackbarMessage(message);
  setLastFailed({ type: "download", filePath });
  setSnackbarOpen(true);
    } finally {
      setDownloadingIds((s) => {
        const copy = { ...s };
        delete copy[filePath];
        return copy;
      });
    }
  };

  const openDeleteDialog = (id: string, filePath: string, fileName?: string) => {
    setDeleteTarget({ id, filePath, fileName });
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id, filePath } = deleteTarget;

    // mark as deleting
    setDeletingIds((s) => ({ ...s, [id]: true }));
    setUploadError(null);

    try {
      // Call callable to delete object (best-effort). Provide both fileId and filePath for server-side delete function.
      try {
        const deleteFn = httpsCallable(functions, "deleteFile");
        await deleteFn({ fileId: id, filePath });
      } catch (err) {
        // If callable failed, still attempt to remove Firestore record so UI stays consistent.
        console.warn("deleteFile callable failed (continuing to remove metadata):", err);
      }

      // Remove Firestore metadata record
      deleteResource(
        {
          resource: "files",
          id,
        },
        {
          onSuccess: () => {
            // clean up deleting state and close dialog
            setDeletingIds((s) => {
              const copy = { ...s };
              delete copy[id];
              return copy;
            });
            closeDeleteDialog();
          },
          onError: (error: any) => {
            console.error("Failed to delete file record:", error);
            setUploadError(error.message || "Failed to delete file record");
            setDeletingIds((s) => {
              const copy = { ...s };
              delete copy[id];
              return copy;
            });
            closeDeleteDialog();
          },
        }
      );
    } catch (error: any) {
      console.error("Error during delete flow:", error);
      setUploadError(error.message || "Failed to delete file");
      setDeletingIds((s) => {
        const copy = { ...s };
        delete copy[id];
        return copy;
      });
      closeDeleteDialog();
    }
  };

  const handlePreview = async (
    filePath: string,
    fileType?: string | null,
    fileName?: string | null,
    publicUrl?: string | null
  ) => {
    // mark previewing state for this filePath
    setPreviewingIds((s) => ({ ...s, [filePath]: true }));
    // open modal immediately so spinner shows
    setPreviewUrl(null);
    setPreviewFileType(null);
    setPreviewFileName(fileName ?? null);
    setPreviewOpen(true);

    try {
      // If a public URL is supplied (CDN or public origin), use it directly for fast preview
      if (publicUrl) {
        // If fileType is missing, try to infer from the file extension in the URL or filePath
        let inferredType = fileType ?? null;
        if (!inferredType) {
          const extMatch = (publicUrl || filePath).split("?")[0].match(/\.([0-9a-zA-Z]+)$/);
          const ext = extMatch?.[1]?.toLowerCase() || null;
          if (ext) {
            const map: Record<string, string> = {
              jpg: "image/jpeg",
              jpeg: "image/jpeg",
              png: "image/png",
              gif: "image/gif",
              webp: "image/webp",
              svg: "image/svg+xml",
              pdf: "application/pdf",
            };
            inferredType = map[ext] ?? null;
          }
        }

        setPreviewUrl(publicUrl);
        setPreviewFileType(inferredType);
        setPreviewFileName(fileName ?? null);
        return;
      }

      const getDownload = httpsCallable(functions, "getPresignedDownloadURL");
      const result = await getDownload({ key: filePath, disposition: "inline", ttlSeconds: 120 });
      const url = (result.data as any)?.url;
      if (url) {
        // If fileType is missing, try to infer from the url
        let inferredType = fileType ?? null;
        if (!inferredType) {
          const extMatch = url.split("?")[0].match(/\.([0-9a-zA-Z]+)$/);
          const ext = extMatch?.[1]?.toLowerCase() || null;
          if (ext) {
            const map: Record<string, string> = {
              jpg: "image/jpeg",
              jpeg: "image/jpeg",
              png: "image/png",
              gif: "image/gif",
              webp: "image/webp",
              svg: "image/svg+xml",
              pdf: "application/pdf",
            };
            inferredType = map[ext] ?? null;
          }
        }

        // Open modal with inline preview URL
        setPreviewUrl(url);
        setPreviewFileType(inferredType);
        setPreviewFileName(fileName ?? null);
      } else {
        throw new Error("No preview URL returned");
      }
    } catch (error: any) {
      console.error("Failed to get preview URL:", error);
  const message = error?.message || "Failed to get preview URL";
  setUploadError(message);
  setSnackbarMessage(message);
  setLastFailed({ type: "preview", filePath, fileType, fileName, publicUrl });
  setSnackbarOpen(true);
  // close modal if we failed to get a URL
  setPreviewOpen(false);
    } finally {
      setPreviewingIds((s) => {
        const copy = { ...s };
        delete copy[filePath];
        return copy;
      });
    }
  };

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
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Tooltip title="Preview">
              <span>
                <IconButton
                  size="small"
                  onClick={() => handlePreview(row.filePath, row.fileType, row.fileName, row.fileURL)}
                  disabled={Boolean(previewingIds[row.filePath])}
                >
                  {previewingIds[row.filePath] ? <CircularProgress size={18} /> : <VisibilityIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Download">
              <span>
                <IconButton size="small" onClick={() => handleDownload(row.filePath)} disabled={Boolean(downloadingIds[row.filePath])}>
                  {downloadingIds[row.filePath] ? <CircularProgress size={18} /> : <GetAppIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => openDeleteDialog(row.id, row.filePath, row.fileName)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
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

      {/* Preview dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewUrl(null);
          setPreviewFileType(null);
          setPreviewFileName(null);
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>{previewFileName || "Preview"}</DialogTitle>
        <DialogContent dividers>
          {previewUrl ? (
            previewFileType && previewFileType.startsWith("image/") ? (
              // Image preview
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt={previewFileName || "preview"} style={{ width: "100%" }} />
            ) : (
              // Use iframe for PDFs and other types
              <iframe src={previewUrl} title={previewFileName || "preview"} style={{ width: "100%", height: "70vh", border: "none" }} />
            )
          ) : (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          <Button
            onClick={() => {
              if (previewUrl) window.open(previewUrl, "_blank");
            }}
            variant="contained"
          >
            Open in new tab
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => !Object.values(deletingIds).some(Boolean) && closeDeleteDialog()} maxWidth="xs" fullWidth>
        <DialogTitle>Delete file</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deleteTarget?.fileName || deleteTarget?.filePath}"? This will remove the stored object and the database record.
          </Typography>
          {uploadError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {uploadError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} disabled={Boolean(deleteTarget && deletingIds[deleteTarget.id])}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDelete}
            disabled={!deleteTarget || Boolean(deleteTarget && deletingIds[deleteTarget.id])}
            startIcon={deleteTarget && deletingIds[deleteTarget.id] ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      {/* Snackbar for errors with retry */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={8000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        action={
          <>
            <Button color="inherit" size="small" startIcon={<ReplayIcon />} onClick={() => {
              if (lastFailed) {
                const t = lastFailed.type;
                if (t === "download") handleDownload(lastFailed.filePath);
                else if (t === "preview") handlePreview(lastFailed.filePath, lastFailed.fileType, lastFailed.fileName, lastFailed.publicUrl);
                else if (t === "upload") handleUpload();
              }
              setSnackbarOpen(false);
            }}>
              Retry
            </Button>
            <IconButton size="small" aria-label="close" color="inherit" onClick={() => setSnackbarOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </>
        }
      />
    </>
  );
};
