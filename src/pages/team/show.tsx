import { useShow } from "@refinedev/core";
import {
  Show,
  TextFieldComponent as TextField,
} from "@refinedev/mui";
import { Typography, Stack, Chip } from "@mui/material";

export const TeamShow = () => {
  const { query } = useShow({});
  const { data, isLoading } = query;

  const record = data?.data;

  return (
    <Show isLoading={isLoading}>
      <Stack gap={1}>
        <Typography variant="body1" fontWeight="bold">
          {"ID Number"}
        </Typography>
        <TextField value={record?.idNumber || "N/A"} />
        
        <Typography variant="body1" fontWeight="bold">
          {"Email"}
        </Typography>
        <TextField value={record?.email} />
        
        <Typography variant="body1" fontWeight="bold">
          {"Position"}
        </Typography>
        <TextField value={record?.position || "N/A"} />
        
        <Typography variant="body1" fontWeight="bold">
          {"Committee"}
        </Typography>
        <TextField value={record?.committee || "N/A"} />
        
        <Typography variant="body1" fontWeight="bold">
          {"Department"}
        </Typography>
        <TextField value={record?.department || "N/A"} />
        
        <Typography variant="body1" fontWeight="bold">
          {"Status"}
        </Typography>
        <Chip
          label={record?.newOfficer ? "New Officer" : "Existing Officer"}
          color={record?.newOfficer ? "success" : "default"}
          sx={{ width: "fit-content" }}
        />
      </Stack>
    </Show>
  );
};
