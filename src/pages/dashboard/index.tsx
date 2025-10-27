import { Box, Card, CardContent, Grid, Typography } from "@mui/material";
import { useGetIdentity } from "@refinedev/core";

export const Dashboard: React.FC = () => {
  const { data: identity } = useGetIdentity<{
    email: string;
    position?: string;
    department?: string;
    committee?: string;
  }>();

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        GDG-DLSU Leadership Hub
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Welcome, {identity?.email || "Leader"}!
              </Typography>
              {identity?.position && (
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  Position: {identity.position}
                </Typography>
              )}
              {identity?.department && (
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  Department: {identity.department}
                </Typography>
              )}
              {identity?.committee && (
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  Committee: {identity.committee}
                </Typography>
              )}
              <Typography variant="body2" sx={{ mt: 2 }}>
                This is your internal hub for managing GDG-DLSU operations.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Links
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Partner Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Team Directory
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Asset Hub
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
