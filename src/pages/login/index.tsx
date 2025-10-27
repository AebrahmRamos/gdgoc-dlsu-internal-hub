import { Box, Button, Card, CardContent, Typography } from "@mui/material";
import { useLogin } from "@refinedev/core";
import GoogleIcon from "@mui/icons-material/Google";

export const Login = () => {
  const { mutate: login } = useLogin();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
      }}
    >
      <Card sx={{ minWidth: 350, textAlign: "center", p: 2 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            GDG-DLSU Leadership Hub
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Sign in with your authorized Google account
          </Typography>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            startIcon={<GoogleIcon />}
            onClick={() => login({})}
          >
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};
