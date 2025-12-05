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
  TextField,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
} from "@mui/material";
import {
  FaEdit,
  FaSearch,
  FaSync,
} from "react-icons/fa";
import Image from "next/image";

interface Product {
  id: number;
  ipshopyProductId: string;
  name: string;
  image: string | null;
  price: number | null;
  salePrice: number | null;
  category: string | null;
  adminPriority: number;
  popularityScore: number;
  syncStatus: string;
  lastSyncedAt: string | null;
}

export default function ProductsPage() {
  const { theme } = useThemeContext();
  const { data: session } = useSession();
  const router = useRouter();
  const isDark = theme === "dark";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [priorityValue, setPriorityValue] = useState(50);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // Fetch from ProductIndex table
      const res = await axios.get("/api/products/index?status=active&limit=100");
      setProducts(res.data.products || []);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const handleEditPriority = (product: Product) => {
    setEditingProduct(product);
    setPriorityValue(product.adminPriority);
    setShowPriorityModal(true);
  };

  const handleSavePriority = async () => {
    if (!editingProduct) return;

    try {
      // Update ProductIndex table
      await axios.put(`/api/products/index/${editingProduct.id}`, {
        adminPriority: priorityValue,
      });
      toast.success("Priority updated successfully");
      setShowPriorityModal(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error: any) {
      console.error("Error updating priority:", error);
      toast.error(error.response?.data?.error || "Failed to update priority");
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatPrice = (price: number | null) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

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
          Product Priority Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<FaSync />}
          onClick={fetchProducts}
        >
          Refresh
        </Button>
      </Box>

      <Card
        sx={{
          mb: 3,
          bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
          color: isDark ? "white" : "black",
        }}
      >
        <CardContent>
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
        </CardContent>
      </Card>

      <Card
        sx={{
          bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
          color: isDark ? "white" : "black",
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Popularity</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        {product.image && (
                          <Image
                            src={product.image}
                            alt={product.name}
                            width={50}
                            height={50}
                            style={{ borderRadius: "8px", objectFit: "cover" }}
                          />
                        )}
                        <Typography variant="body2">{product.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{product.category || "—"}</TableCell>
                    <TableCell>
                      {product.salePrice ? (
                        <>
                          <Typography
                            variant="body2"
                            sx={{ color: "success.main", fontWeight: "bold" }}
                          >
                            {formatPrice(product.salePrice)}
                          </Typography>
                          {product.price && (
                            <Typography
                              variant="caption"
                              sx={{ textDecoration: "line-through", ml: 1 }}
                            >
                              {formatPrice(product.price)}
                            </Typography>
                          )}
                        </>
                      ) : (
                        formatPrice(product.price)
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={product.popularityScore}
                        size="small"
                        color={
                          product.popularityScore > 70
                            ? "success"
                            : product.popularityScore > 40
                            ? "warning"
                            : "default"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={product.adminPriority}
                        size="small"
                        color={
                          product.adminPriority > 70
                            ? "primary"
                            : product.adminPriority > 40
                            ? "default"
                            : "secondary"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={product.syncStatus}
                        size="small"
                        color={product.syncStatus === "active" ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleEditPriority(product)}
                      >
                        <FaEdit />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Priority Edit Modal */}
      <Dialog
        open={showPriorityModal}
        onClose={() => {
          setShowPriorityModal(false);
          setEditingProduct(null);
        }}
      >
        <DialogTitle>Edit Product Priority</DialogTitle>
        <DialogContent>
          {editingProduct && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Product: {editingProduct.name}
              </Typography>
              <TextField
                label="Priority (0-100)"
                type="number"
                value={priorityValue}
                onChange={(e) =>
                  setPriorityValue(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))
                }
                fullWidth
                margin="normal"
                inputProps={{ min: 0, max: 100 }}
                helperText="0 = Never show, 50 = Normal, 100 = Always show first"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowPriorityModal(false);
              setEditingProduct(null);
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSavePriority} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

