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
  LinearProgress,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  FaFileAlt,
  FaList,
  FaLink,
  FaChartLine,
  FaPlay,
  FaSync,
} from "react-icons/fa";
import Link from "next/link";

interface GenerationStats {
  totalProducts: number;
  productsWithTitles: number;
  productsWithAllArticles: number;
  totalTitlesGenerated: number;
  totalArticlesGenerated: number;
  totalHyperlinks: number;
  averageHyperlinksPerArticle: number;
  pendingReview: number;
  averageScore: number;
  successRate: number;
}

export default function AutoBlogGenerationDashboard() {
  const { theme } = useThemeContext();
  const { data: session } = useSession();
  const router = useRouter();
  const isDark = theme === "dark";

  const [stats, setStats] = useState<GenerationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (session) {
      fetchStats();
    }
  }, [session]);

  const fetchStats = async () => {
    try {
      const response = await axios.get("/api/blogs/auto-generate/stats");
      setStats(response.data);
    } catch (error: any) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  const handleBatchGenerate = async () => {
    if (!confirm("Generate articles for all products? This may take a while.")) {
      return;
    }

    setGenerating(true);
    try {
      const response = await axios.post("/api/blogs/auto-generate/batch", {
        productIds: [],
        generateTitles: true,
        generateArticles: true,
        skipExisting: true,
      });

      toast.success("Batch generation started");
      setTimeout(() => {
        fetchStats();
      }, 2000);
    } catch (error: any) {
      console.error("Error starting batch generation:", error);
      toast.error(error.response?.data?.error || "Failed to start generation");
    } finally {
      setGenerating(false);
    }
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
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Auto Blog Generation
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Automatically generate 10 article titles and 10 full articles for each product
        </Typography>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<FaPlay />}
          onClick={handleBatchGenerate}
          disabled={generating}
        >
          {generating ? "Starting..." : "Generate All Products"}
        </Button>
        <Button
          variant="outlined"
          startIcon={<FaSync />}
          onClick={fetchStats}
        >
          Refresh Stats
        </Button>
        <Link href="/admin/blogs/auto-generate/products" passHref>
          <Button variant="outlined">Manage Products</Button>
        </Link>
        <Link href="/admin/blogs/auto-generate/settings" passHref>
          <Button variant="outlined">Settings</Button>
        </Link>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
              color: isDark ? "white" : "black",
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <FaFileAlt style={{ marginRight: 8 }} />
                <Typography variant="body2" color="textSecondary">
                  Total Products
                </Typography>
              </Box>
              <Typography variant="h4">{stats?.totalProducts || 0}</Typography>
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
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <FaList style={{ marginRight: 8 }} />
                <Typography variant="body2" color="textSecondary">
                  Titles Generated
                </Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {stats?.totalTitlesGenerated || 0}
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
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <FaFileAlt style={{ marginRight: 8 }} />
                <Typography variant="body2" color="textSecondary">
                  Articles Generated
                </Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {stats?.totalArticlesGenerated || 0}
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
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <FaLink style={{ marginRight: 8 }} />
                <Typography variant="body2" color="textSecondary">
                  Total Hyperlinks
                </Typography>
              </Box>
              <Typography variant="h4" color="info.main">
                {stats?.totalHyperlinks || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Progress Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
              color: isDark ? "white" : "black",
            }}
          >
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Generation Progress
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography variant="body2">Products with Titles</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {stats?.productsWithTitles || 0} / {stats?.totalProducts || 0}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={
                    stats?.totalProducts
                      ? (stats.productsWithTitles / stats.totalProducts) * 100
                      : 0
                  }
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography variant="body2">Products with All Articles</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {stats?.productsWithAllArticles || 0} / {stats?.totalProducts || 0}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={
                    stats?.totalProducts
                      ? (stats.productsWithAllArticles / stats.totalProducts) * 100
                      : 0
                  }
                  color="success"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card
            sx={{
              bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
              color: isDark ? "white" : "black",
            }}
          >
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quality Metrics
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography variant="body2">Average Score</Typography>
                  <Chip
                    label={`${stats?.averageScore || 0}/100`}
                    color={
                      (stats?.averageScore || 0) >= 80
                        ? "success"
                        : (stats?.averageScore || 0) >= 70
                        ? "warning"
                        : "error"
                    }
                    size="small"
                  />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={stats?.averageScore || 0}
                  color={
                    (stats?.averageScore || 0) >= 80
                      ? "success"
                      : (stats?.averageScore || 0) >= 70
                      ? "warning"
                      : "error"
                  }
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography variant="body2">Success Rate</Typography>
                  <Chip
                    label={`${stats?.successRate || 0}%`}
                    color={stats?.successRate && stats.successRate >= 95 ? "success" : "warning"}
                    size="small"
                  />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={stats?.successRate || 0}
                  color={stats?.successRate && stats.successRate >= 95 ? "success" : "warning"}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Additional Stats */}
      <Card
        sx={{
          bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
          color: isDark ? "white" : "black",
        }}
      >
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Additional Statistics
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="textSecondary">
                Average Hyperlinks/Article
              </Typography>
              <Typography variant="h6">
                {stats?.averageHyperlinksPerArticle || 0}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="textSecondary">
                Pending Review
              </Typography>
              <Typography variant="h6" color="warning.main">
                {stats?.pendingReview || 0}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="textSecondary">
                Products with Titles
              </Typography>
              <Typography variant="h6">
                {stats?.productsWithTitles || 0}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="textSecondary">
                Complete Products
              </Typography>
              <Typography variant="h6" color="success.main">
                {stats?.productsWithAllArticles || 0}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}

