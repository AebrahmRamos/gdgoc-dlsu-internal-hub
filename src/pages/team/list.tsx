import React from "react";
import {
  useDataGrid,
  List,
} from "@refinedev/mui";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Chip } from "@mui/material";

export const TeamList = () => {
  const { dataGridProps } = useDataGrid({
    sorters: {
      initial: [
        {
          field: "department",
          order: "asc",
        },
      ],
    },
  });

  const columns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: "idNumber",
        headerName: "ID Number",
        flex: 1,
        minWidth: 120,
      },
      {
        field: "email",
        headerName: "Email",
        flex: 1.5,
        minWidth: 250,
      },
      {
        field: "position",
        headerName: "Position",
        flex: 1,
        minWidth: 200,
      },
      {
        field: "committee",
        headerName: "Committee",
        flex: 1,
        minWidth: 180,
      },
      {
        field: "department",
        headerName: "Department",
        flex: 1,
        minWidth: 150,
      },
      {
        field: "newOfficer",
        headerName: "Status",
        flex: 0.5,
        minWidth: 100,
        renderCell: ({ value }) => (
          <Chip
            label={value ? "New" : "Existing"}
            color={value ? "success" : "default"}
            size="small"
          />
        ),
      },
    ],
    []
  );

  return (
    <List>
      <DataGrid {...dataGridProps} columns={columns} autoHeight />
    </List>
  );
};
