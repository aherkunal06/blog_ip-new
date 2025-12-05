"use client";

import React from "react";
import {
  useMaterialReactTable,
  MaterialReactTable,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
} from "material-react-table";
import { useThemeContext } from "@/context/ThemeContext";

interface BasicTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: MRT_ColumnDef<T>[];
  enableRowSelection?: boolean;
  onRowSelectionChange?: (selectedRows: T[]) => void;
  topToolbarActions?: () => React.ReactNode;
  enablePagination?: boolean;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enableColumnFilters?: boolean;
  enableGlobalFilter?: boolean;
  initialState?: Record<string, unknown>;
}

function BasicTable<T extends Record<string, unknown>>({
  data,
  columns,
  enableRowSelection = false,
  onRowSelectionChange,
  topToolbarActions,
  enablePagination = true,
  enableSorting = true,
  enableFiltering = true,
  enableColumnFilters = true,
  enableGlobalFilter = true,
  initialState,
}: BasicTableProps<T>) {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";

  const [rowSelection, setRowSelection] = React.useState<MRT_RowSelectionState>({});

  const table = useMaterialReactTable({
    columns,
    data,
    enableRowSelection,
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === "function" ? updater(rowSelection) : updater;
      setRowSelection(newSelection);
      
      if (onRowSelectionChange) {
        const selectedRows = Object.keys(newSelection)
          .filter((key) => newSelection[key])
          .map((key) => data[parseInt(key)]);
        onRowSelectionChange(selectedRows);
      }
    },
    state: {
      rowSelection,
    },
    enablePagination,
    enableSorting,
    enableFiltering,
    enableColumnFilters,
    enableGlobalFilter,
    initialState,
    muiTablePaperProps: {
      sx: {
        backgroundColor: isDark ? "rgba(31, 41, 55, 0.8)" : "white",
        color: isDark ? "#fff" : "#000",
      },
    },
    muiTableContainerProps: {
      sx: {
        backgroundColor: isDark ? "rgba(31, 41, 55, 0.8)" : "white",
      },
    },
    muiTableHeadCellProps: {
      sx: {
        backgroundColor: isDark ? "rgba(31, 41, 55, 0.8)" : "white",
        color: isDark ? "#fff" : "#000",
      },
    },
    muiTableBodyCellProps: {
      sx: {
        backgroundColor: isDark ? "rgba(31, 41, 55, 0.8)" : "white",
        color: isDark ? "#fff" : "#000",
      },
    },
    renderTopToolbarCustomActions: topToolbarActions,
  });

  return <MaterialReactTable table={table} />;
}

export default BasicTable;

