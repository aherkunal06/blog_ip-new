"use client";

import React, { useEffect, useState } from "react";
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
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
} from "@mui/material";
import {
  FaFileAlt,
  FaList,
  FaLink,
  FaPlay,
  FaSync,
  FaEdit,
  FaEye,
  FaSearch,
  FaChevronDown,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
} from "react-icons/fa";
import Link from "next/link";
import dayjs from "dayjs";

interface Product {
  id: number;
  name: string;
  category: string | null;
  titlesGenerated: number;
  articlesGenerated: number;
  overallStatus: string;
  titles: Array<{
    id: number;
    title: string;
    slug: string;
    articleNumber: number;
    status: string;
    blogId?: number;
    hyperlinkCount?: number;
  }>;
}

interface ProductStatus {
  productIndexId: number;
  productName: string;
  titlesGenerated: number;
  articlesGenerated: number;
  titles: Array<{
    id: number;
    title: string;
    slug: string;
    articleNumber: number;
    status: string;
    blogId?: number;
    hyperlinkCount?: number;
  }>;
  overallStatus: string;
}

export default function ProductManagementPage() {
  const { theme } = useThemeContext();
  const { data: session } = useSession();
  const router = useRouter();
  const isDark = theme === "dark";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
  const [viewProductDialog, setViewProductDialog] = useState<Product | null>(null);
  const [generating, setGenerating] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);

  useEffect(() => {
    if (session) {
      fetchProducts();
    }
  }, [session, page, searchQuery, statusFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(searchQuery && { search: searchQuery }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      });

      const response = await axios.get(
        `/api/blogs/auto-generate/products?${params.toString()}`
      );

      setProducts(response.data.products || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotal(response.data.pagination?.total || 0);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateForProduct = async (
    productId: number,
    options: { titles?: boolean; articles?: boolean } = {}
  ) => {
    if (generating.has(productId)) return;

    setGenerating((prev) => new Set(prev).add(productId));
    try {
      await axios.post("/api/blogs/auto-generate/product", {
        productIndexId: productId,
        regenerateTitles: options.titles || false,
        regenerateArticles: options.articles || false,
        skipExisting: true,
      });

      toast.success("Generation started for product");
      setTimeout(() => {
        fetchProducts();
      }, 2000);
    } catch (error: any) {
      console.error("Error generating articles:", error);
      toast.error(error.response?.data?.error || "Failed to generate articles");
    } finally {
      setGenerating((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const handleBulkGenerate = async (type: "titles" | "articles" | "both") => {
    if (selectedProducts.size === 0) {
      toast.error("Please select at least one product");
      return;
    }

    if (
      !confirm(
        `Generate ${type} for ${selectedProducts.size} product(s)? This may take a while.`
      )
    ) {
      return;
    }

    try {
      const productIds = Array.from(selectedProducts);
      for (const productId of productIds) {
        setGenerating((prev) => new Set(prev).add(productId));
      }

      await axios.post("/api/blogs/auto-generate/batch", {
        productIds,
        generateTitles: type === "titles" || type === "both",
        generateArticles: type === "articles" || type === "both",
        skipExisting: true,
      });

      toast.success(`Batch generation started for ${productIds.length} products`);
      setTimeout(() => {
        fetchProducts();
        setSelectedProducts(new Set());
      }, 3000);
    } catch (error: any) {
      console.error("Error starting batch generation:", error);
      toast.error(error.response?.data?.error || "Failed to start batch generation");
    }
  };

  const handleSelectProduct = (productId: number) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map((p) => p.id)));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "complete":
        return "success";
      case "partial":
        return "warning";
      case "titles_only":
        return "info";
      case "in_progress":
        return "info";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "complete":
        return "Complete";
      case "partial":
        return "Partial";
      case "titles_only":
        return "Titles Only";
      case "in_progress":
        return "In Progress";
      case "not_started":
        return "Not Started";
      default:
        return status;
    }
  };

  // Use debounce for search to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchProducts();
      } else {
        setPage(1); // Reset to page 1 when search changes
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredProducts = products; // Products are already filtered by API

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
          Product Article Management
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Manage article generation for products. Generate 10 titles and 10 articles per product.
        </Typography>
      </Box>

      {/* Filters and Actions */}
      <Card
        sx={{
          bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
          mb: 3,
        }}
      >
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FaSearch />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status Filter</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status Filter"
                >
                  <MenuItem value="all">All Products</MenuItem>
                  <MenuItem value="complete">Complete</MenuItem>
                  <MenuItem value="partial">Partial</MenuItem>
                  <MenuItem value="titles_only">Titles Only</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="not_started">Not Started</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleSelectAll}
                >
                  {selectedProducts.size === products.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
                {selectedProducts.size > 0 && (
                  <>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<FaPlay />}
                      onClick={() => handleBulkGenerate("both")}
                    >
                      Generate All ({selectedProducts.size})
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleBulkGenerate("titles")}
                    >
                      Generate Titles ({selectedProducts.size})
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleBulkGenerate("articles")}
                    >
                      Generate Articles ({selectedProducts.size})
                    </Button>
                  </>
                )}
                <Button
                  variant="outlined"
                  startIcon={<FaSync />}
                  onClick={fetchProducts}
                >
                  Refresh
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card
        sx={{
          bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={
                      filteredProducts.length > 0 &&
                      selectedProducts.size === filteredProducts.length
                    }
                    indeterminate={
                      selectedProducts.size > 0 &&
                      selectedProducts.size < filteredProducts.length
                    }
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Product Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Titles</TableCell>
                <TableCell>Articles</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="textSecondary" sx={{ py: 4 }}>
                      No products found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <React.Fragment key={product.id}>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedProducts.has(product.id)}
                          onChange={() => handleSelectProduct(product.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {product.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={product.category || "Uncategorized"}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${product.titlesGenerated}/10`}
                          color={
                            product.titlesGenerated === 10
                              ? "success"
                              : product.titlesGenerated > 0
                              ? "warning"
                              : "default"
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${product.articlesGenerated}/10`}
                          color={
                            product.articlesGenerated === 10
                              ? "success"
                              : product.articlesGenerated > 0
                              ? "warning"
                              : "default"
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(product.overallStatus)}
                          color={getStatusColor(product.overallStatus)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => setExpandedProduct(
                              expandedProduct === product.id ? null : product.id
                            )}
                            title="View Details"
                          >
                            <FaEye />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleGenerateForProduct(product.id, {
                              titles: true,
                              articles: true,
                            })}
                            disabled={generating.has(product.id)}
                            title="Generate All"
                          >
                            {generating.has(product.id) ? (
                              <CircularProgress size={16} />
                            ) : (
                              <FaPlay />
                            )}
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                    {expandedProduct === product.id && (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ py: 0 }}>
                          <Box sx={{ p: 2, bgcolor: isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.02)" }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Article Titles & Status
                            </Typography>
                            <Grid container spacing={2} sx={{ mt: 1 }}>
                              {product.titles.map((title) => (
                                <Grid item xs={12} md={6} key={title.id}>
                                  <Card
                                    variant="outlined"
                                    sx={{
                                      bgcolor: isDark
                                        ? "rgba(255,255,255,0.05)"
                                        : "white",
                                    }}
                                  >
                                    <CardContent>
                                      <Box
                                        sx={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "start",
                                          mb: 1,
                                        }}
                                      >
                                        <Typography variant="body2" fontWeight="medium">
                                          #{title.articleNumber}: {title.title}
                                        </Typography>
                                        {title.blogId ? (
                                          <Chip
                                            icon={<FaCheckCircle />}
                                            label="Generated"
                                            color="success"
                                            size="small"
                                          />
                                        ) : (
                                          <Chip
                                            icon={<FaClock />}
                                            label="Pending"
                                            color="default"
                                            size="small"
                                          />
                                        )}
                                      </Box>
                                      {title.blogId && (
                                        <Box sx={{ mt: 1 }}>
                                          <Typography variant="caption" color="textSecondary">
                                            Hyperlinks: {title.hyperlinkCount || 0}
                                          </Typography>
                                          <Box sx={{ mt: 1 }}>
                                            <Link
                                              href={`/blogs/${title.slug}`}
                                              target="_blank"
                                            >
                                              <Button size="small" variant="outlined">
                                                View Article
                                              </Button>
                                            </Link>
                                          </Box>
                                        </Box>
                                      )}
                                      {!title.blogId && (
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          startIcon={<FaPlay />}
                                          onClick={() =>
                                            handleGenerateForProduct(product.id, {
                                              articles: true,
                                            })
                                          }
                                          disabled={generating.has(product.id)}
                                          sx={{ mt: 1 }}
                                        >
                                          Generate Article
                                        </Button>
                                      )}
                                    </CardContent>
                                  </Card>
                                </Grid>
                              ))}
                              {product.titles.length === 0 && (
                                <Grid item xs={12}>
                                  <Typography variant="body2" color="textSecondary">
                                    No titles generated yet. Click "Generate All" to create titles.
                                  </Typography>
                                </Grid>
                              )}
                            </Grid>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card
          sx={{
            bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
            mt: 3,
            p: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Typography variant="body2" color="textSecondary">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} products
            </Typography>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                Previous
              </Button>
              <Typography variant="body2" sx={{ px: 2 }}>
                Page {page} of {totalPages}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
              >
                Next
              </Button>
            </Box>
          </Box>
        </Card>
      )}

      {/* View Product Dialog */}
      <Dialog
        open={!!viewProductDialog}
        onClose={() => setViewProductDialog(null)}
        maxWidth="md"
        fullWidth
      >
        {viewProductDialog && (
          <>
            <DialogTitle>{viewProductDialog.name}</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Category: {viewProductDialog.category || "Uncategorized"}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Status: {getStatusLabel(viewProductDialog.overallStatus)}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Titles: {viewProductDialog.titlesGenerated}/10
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Articles: {viewProductDialog.articlesGenerated}/10
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setViewProductDialog(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

