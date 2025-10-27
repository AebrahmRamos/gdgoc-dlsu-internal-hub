import { Box, TextField, MenuItem } from "@mui/material";
import { Edit } from "@refinedev/mui";
import { useForm } from "@refinedev/react-hook-form";
import React from "react";

export const PartnerEdit = () => {
  const {
    saveButtonProps,
    refineCore: { formLoading },
    register,
    formState: { errors },
  } = useForm({});

  return (
    <Edit isLoading={formLoading} saveButtonProps={saveButtonProps}>
      <Box
        component="form"
        sx={{ display: "flex", flexDirection: "column" }}
        autoComplete="off"
      >
        <TextField
          {...register("organizationName", { required: "This field is required" })}
          error={!!(errors as any)?.organizationName}
          helperText={(errors as any)?.organizationName?.message}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="text"
          label={"Organization Name"}
          name="organizationName"
        />

        <TextField
          {...register("contactPerson")}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="text"
          label={"Contact Person"}
          name="contactPerson"
        />

        <TextField
          {...register("contactEmail")}
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          type="email"
          label={"Contact Email"}
          name="contactEmail"
        />

        <TextField
          {...register("status")}
          select
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
          label={"Status"}
          defaultValue="Prospect"
        >
          <MenuItem value="Prospect">Prospect</MenuItem>
          <MenuItem value="Contacted">Contacted</MenuItem>
          <MenuItem value="Partnered">Partnered</MenuItem>
          <MenuItem value="Inactive">Inactive</MenuItem>
        </TextField>
      </Box>
    </Edit>
  );
};
