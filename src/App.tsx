import { Authenticated, Refine } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";

import {
  ErrorComponent,
  RefineSnackbarProvider,
  ThemedLayout,
  useNotificationProvider,
} from "@refinedev/mui";

import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";
import routerProvider, {
  CatchAllNavigate,
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import dataProvider from "@refinedev/simple-rest";
import firebaseProvider from "./firebaseProvider";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import { authProvider } from "./authProvider";
import { accessControlProvider } from "./providers/accessControlProvider";
import { AuthContextProvider } from "./contexts/AuthContext";
import { Header } from "./components/header";
import { Title } from "./components/title";
import { ColorModeContextProvider } from "./contexts/color-mode";
import {
  PartnerCreate,
  PartnerEdit,
  PartnerList,
  PartnerShow,
} from "./pages/partners";
import { TeamList, TeamShow } from "./pages/team";
import { AssetHubList } from "./pages/assets";
import { Dashboard } from "./pages/dashboard";
import { ForgotPassword } from "./pages/forgotPassword";
import { Login } from "./pages/login";
import { Register } from "./pages/register";

function App() {
  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ColorModeContextProvider>
          <AuthContextProvider>
            <CssBaseline />
            <GlobalStyles styles={{ html: { WebkitFontSmoothing: "auto" } }} />
            <RefineSnackbarProvider>
              <DevtoolsProvider>
                <Refine
                  dataProvider={firebaseProvider()}
                  notificationProvider={useNotificationProvider}
                  routerProvider={routerProvider}
                  authProvider={authProvider}
                  accessControlProvider={accessControlProvider}
                  resources={[
                  {
                    name: "partners",
                    list: "/partners",
                    create: "/partners/create",
                    edit: "/partners/edit/:id",
                    show: "/partners/show/:id",
                    meta: {
                      canDelete: true,
                      label: "Partners",
                    },
                  },
                  {
                    name: "team",
                    list: "/team",
                    show: "/team/show/:id",
                    meta: {
                      label: "Team Directory",
                    },
                  },
                  {
                    name: "files",
                    list: "/assets",
                    meta: {
                      label: "Asset Hub",
                      canDelete: true,
                    },
                  },
                ]}
                options={{
                  syncWithLocation: true,
                  warnWhenUnsavedChanges: true,
                  projectId: "n33JUr-vRy1gE-vonL30",
                }}
              >
                <Routes>
                  <Route
                    element={
                      <Authenticated
                        key="authenticated-inner"
                        fallback={<CatchAllNavigate to="/login" />}
                      >
                        <ThemedLayout Header={Header} Title={Title}>
                          <Outlet />
                        </ThemedLayout>
                      </Authenticated>
                    }
                  >
                    <Route index element={<Dashboard />} />
                    <Route path="/partners">
                      <Route index element={<PartnerList />} />
                      <Route path="create" element={<PartnerCreate />} />
                      <Route path="edit/:id" element={<PartnerEdit />} />
                      <Route path="show/:id" element={<PartnerShow />} />
                    </Route>
                    <Route path="/team">
                      <Route index element={<TeamList />} />
                      <Route path="show/:id" element={<TeamShow />} />
                    </Route>
                    <Route path="/assets">
                      <Route index element={<AssetHubList />} />
                    </Route>
                    <Route path="*" element={<ErrorComponent />} />
                  </Route>
                  <Route
                    element={
                      <Authenticated
                        key="authenticated-outer"
                        fallback={<Outlet />}
                      >
                        <NavigateToResource />
                      </Authenticated>
                    }
                  >
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route
                      path="/forgot-password"
                      element={<ForgotPassword />}
                    />
                  </Route>
                </Routes>

                <RefineKbar />
                <UnsavedChangesNotifier />
                <DocumentTitleHandler />
              </Refine>
              <DevtoolsPanel />
            </DevtoolsProvider>
          </RefineSnackbarProvider>
          </AuthContextProvider>
        </ColorModeContextProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
