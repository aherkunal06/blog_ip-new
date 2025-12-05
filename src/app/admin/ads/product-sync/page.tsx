"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useThemeContext } from "@/context/ThemeContext";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  LinearProgress,
} from "@mui/material";
import {
  FaSync,
  FaCheckCircle,
  FaExclamationCircle,
  FaClock,
  FaRedo,
} from "react-icons/fa";
import dayjs from "dayjs";

interface SyncStatus {
  lastSync: string | null;
  totalProducts: number;
  activeProducts: number;
  deletedProducts: number;
  lastSyncLog: {
    id: number;
    syncType: string;
    status: string;
    productsProcessed: number;
    productsCreated: number;
    productsUpdated: number;
    productsDeleted: number;
    errorMessage: string | null;
    startedAt: string;
    completedAt: string | null;
    durationSeconds: number | null;
  } | null;
}

interface SyncLog {
  id: number;
  syncType: string;
  status: string;
  productsProcessed: number;
  productsCreated: number;
  productsUpdated: number;
  productsDeleted: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
}

export default function ProductSyncPage() {
  const { theme } = useThemeContext();
  const { data: session } = useSession();
  const router = useRouter();
  const isDark = theme === "dark";

  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    isRunning: boolean;
    total: number;
    processed: number;
    created: number;
    updated: number;
    deleted: number;
    currentBatch: number;
    totalBatches: number;
    percentage: number;
    elapsedSeconds: number;
    errors: number;
  } | null>(null);

  useEffect(() => {
    if (session) {
      fetchSyncStatus();
      fetchSyncLogs();
    }
  }, [session]);

  // Poll for progress when sync is running
  useEffect(() => {
    if (!syncProgress?.isRunning) return;

    const interval = setInterval(() => {
      fetchSyncStatus();
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [syncProgress?.isRunning]);

  const fetchSyncStatus = async () => {
    try {
      const res = await axios.get("/api/products/sync/status");
      setSyncStatus(res.data.status);
      setSyncLogs(res.data.recentLogs || []);
      
      // Update progress if available
      if (res.data.progress) {
        setSyncProgress(res.data.progress);
        setSyncing(res.data.progress.isRunning);
        
        // If sync completed, refresh after a short delay
        if (!res.data.progress.isRunning) {
          setTimeout(() => {
            fetchSyncStatus();
            fetchSyncLogs();
          }, 1000);
        }
      } else {
        setSyncProgress(null);
        setSyncing(false);
      }
    } catch (error: any) {
      console.error("Error fetching sync status:", error);
      toast.error("Failed to fetch sync status");
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncLogs = async () => {
    try {
      const res = await axios.get("/api/products/sync/status?limit=20");
      setSyncLogs(res.data.recentLogs || []);
    } catch (error: any) {
      console.error("Error fetching sync logs:", error);
    }
  };

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      const res = await axios.post("/api/products/sync", { type: "manual" });
      toast.success("Sync started! Progress will be shown below.");
      
      // Start polling for progress
      setTimeout(() => {
        fetchSyncStatus();
      }, 1000);
    } catch (error: any) {
      console.error("Error starting sync:", error);
      const errorMessage = error.response?.data?.error || "Failed to start sync";
      toast.error(errorMessage);
      
      // If sync is already running, update state
      if (errorMessage.includes("already running")) {
        setSyncing(true);
        fetchSyncStatus();
      } else {
        setSyncing(false);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "success";
      case "error":
        return "error";
      case "partial":
        return "warning";
      default:
        return "default";
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: isDark ? "white" : "black",
          }}
        >
          Product Sync Management
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<FaRedo />}
            onClick={fetchSyncStatus}
            disabled={syncing}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={syncing ? <CircularProgress size={16} /> : <FaSync />}
            onClick={handleManualSync}
            disabled={syncing}
          >
            {syncing ? "Syncing..." : "Sync Now"}
          </Button>
        </Box>
      </Box>

      {/* Status Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
              color: isDark ? "white" : "black",
            }}
          >
            <CardContent>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Total Products
              </Typography>
              <Typography variant="h4">
                {syncStatus?.totalProducts || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
              color: isDark ? "white" : "black",
            }}
          >
            <CardContent>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Active Products
              </Typography>
              <Typography variant="h4" color="success.main">
                {syncStatus?.activeProducts || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
              color: isDark ? "white" : "black",
            }}
          >
            <CardContent>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Deleted Products
              </Typography>
              <Typography variant="h4" color="error.main">
                {syncStatus?.deletedProducts || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
              color: isDark ? "white" : "black",
            }}
          >
            <CardContent>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Last Sync
              </Typography>
              <Typography variant="body1">
                {syncStatus?.lastSync
                  ? dayjs(syncStatus.lastSync).format("MMM DD, YYYY HH:mm")
                  : "Never"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Sync Progress */}
      {syncProgress && syncProgress.isRunning && (
        <Card
          sx={{
            mb: 3,
            bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
            color: isDark ? "white" : "black",
          }}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Sync in Progress
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1,
                }}
              >
                <Typography variant="body2" color="textSecondary">
                  Processing products...
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {syncProgress.percentage}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={syncProgress.percentage}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="textSecondary">
                  Processed
                </Typography>
                <Typography variant="h6">
                  {syncProgress.processed.toLocaleString()} / {syncProgress.total.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="textSecondary">
                  Batch
                </Typography>
                <Typography variant="h6">
                  {syncProgress.currentBatch} / {syncProgress.totalBatches}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="textSecondary">
                  Created
                </Typography>
                <Typography variant="h6" color="success.main">
                  {syncProgress.created.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="textSecondary">
                  Updated
                </Typography>
                <Typography variant="h6" color="info.main">
                  {syncProgress.updated.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  Elapsed Time: {formatDuration(syncProgress.elapsedSeconds)}
                  {syncProgress.errors > 0 && (
                    <span style={{ color: "error.main", marginLeft: 16 }}>
                      Errors: {syncProgress.errors}
                    </span>
                  )}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Last Sync Details */}
      {syncStatus?.lastSyncLog && (
        <Card
          sx={{
            mb: 3,
            bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
            color: isDark ? "white" : "black",
          }}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Last Sync Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="textSecondary">
                  Type
                </Typography>
                <Typography variant="body1">
                  {syncStatus.lastSyncLog.syncType}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="textSecondary">
                  Status
                </Typography>
                <Chip
                  label={syncStatus.lastSyncLog.status}
                  color={getStatusColor(syncStatus.lastSyncLog.status) as any}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="textSecondary">
                  Duration
                </Typography>
                <Typography variant="body1">
                  {formatDuration(syncStatus.lastSyncLog.durationSeconds)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="textSecondary">
                  Processed
                </Typography>
                <Typography variant="body1">
                  {syncStatus.lastSyncLog.productsProcessed}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="textSecondary">
                  Created
                </Typography>
                <Typography variant="body1" color="success.main">
                  {syncStatus.lastSyncLog.productsCreated}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="textSecondary">
                  Updated
                </Typography>
                <Typography variant="body1" color="info.main">
                  {syncStatus.lastSyncLog.productsUpdated}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="textSecondary">
                  Deleted
                </Typography>
                <Typography variant="body1" color="error.main">
                  {syncStatus.lastSyncLog.productsDeleted}
                </Typography>
              </Grid>
              {syncStatus.lastSyncLog.errorMessage && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    Error
                  </Typography>
                  <Typography
                    variant="body2"
                    color="error"
                    sx={{ wordBreak: "break-word" }}
                  >
                    {syncStatus.lastSyncLog.errorMessage}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Sync Logs Table */}
      <Card
        sx={{
          bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
          color: isDark ? "white" : "black",
        }}
      >
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Sync History
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Processed</TableCell>
                  <TableCell align="right">Created</TableCell>
                  <TableCell align="right">Updated</TableCell>
                  <TableCell align="right">Deleted</TableCell>
                  <TableCell align="right">Duration</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {syncLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No sync logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  syncLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {dayjs(log.startedAt).format("MMM DD, YYYY HH:mm")}
                      </TableCell>
                      <TableCell>{log.syncType}</TableCell>
                      <TableCell>
                        <Chip
                          label={log.status}
                          color={getStatusColor(log.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">{log.productsProcessed}</TableCell>
                      <TableCell align="right" sx={{ color: "success.main" }}>
                        {log.productsCreated}
                      </TableCell>
                      <TableCell align="right" sx={{ color: "info.main" }}>
                        {log.productsUpdated}
                      </TableCell>
                      <TableCell align="right" sx={{ color: "error.main" }}>
                        {log.productsDeleted}
                      </TableCell>
                      <TableCell align="right">
                        {formatDuration(log.durationSeconds)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}

