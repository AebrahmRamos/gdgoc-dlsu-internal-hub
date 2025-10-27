import { TitleProps } from "@refinedev/core";
import { Box, Typography } from "@mui/material";

export const Title: React.FC<TitleProps> = ({ collapsed }) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: collapsed ? "12px" : "12px 16px",
      }}
    >
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          fontSize: collapsed ? "0" : "18px",
          transition: "font-size 0.2s",
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
      >
        GDG-DLSU Hub
      </Typography>
    </Box>
  );
};
