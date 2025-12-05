"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useThemeContext } from "@/context/ThemeContext";
import axios from "axios";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaPause,
  FaPlay,
} from "react-icons/fa";
import dayjs from "dayjs";

interface Campaign {
  id: number;
  name: string;
  description: string | null;
  type: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  targetType: string;
  priority: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  createdAt: string;
}

export default function CampaignsPage() {
  const { theme } = useThemeContext();
  const { data: session } = useSession();
  const router = useRouter();
  const isDark = theme === "dark";

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "product",
    status: "draft",
    startDate: "",
    endDate: "",
    targetType: "all",
    priority: 0,
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/ads/campaigns");
      setCampaigns(res.data.campaigns || []);
    } catch (error: any) {
      console.error("Error fetching campaigns:", error);
      toast.error("Failed to fetch campaigns");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      name: "",
      description: "",
      type: "product",
      status: "draft",
      startDate: "",
      endDate: "",
      targetType: "all",
      priority: 0,
    });
    setShowAddModal(true);
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || "",
      type: campaign.type,
      status: campaign.status,
      startDate: campaign.startDate
        ? dayjs(campaign.startDate).format("YYYY-MM-DDTHH:mm")
        : "",
      endDate: campaign.endDate
        ? dayjs(campaign.endDate).format("YYYY-MM-DDTHH:mm")
        : "",
      targetType: campaign.targetType,
      priority: campaign.priority,
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    try {
      if (editingCampaign) {
        await axios.put(`/api/ads/campaigns/${editingCampaign.id}`, formData);
        toast.success("Campaign updated successfully");
      } else {
        await axios.post("/api/ads/campaigns", formData);
        toast.success("Campaign created successfully");
      }
      setShowAddModal(false);
      setShowEditModal(false);
      setEditingCampaign(null);
      fetchCampaigns();
    } catch (error: any) {
      console.error("Error saving campaign:", error);
      toast.error(error.response?.data?.error || "Failed to save campaign");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;

    try {
      await axios.delete(`/api/ads/campaigns/${id}`);
      toast.success("Campaign deleted successfully");
      fetchCampaigns();
    } catch (error: any) {
      console.error("Error deleting campaign:", error);
      toast.error("Failed to delete campaign");
    }
  };

  const handleToggleStatus = async (campaign: Campaign) => {
    try {
      const newStatus =
        campaign.status === "active" ? "paused" : "active";
      await axios.put(`/api/ads/campaigns/${campaign.id}`, {
        status: newStatus,
      });
      toast.success(`Campaign ${newStatus}`);
      fetchCampaigns();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "paused":
        return "warning";
      case "ended":
        return "error";
      default:
        return "default";
    }
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
          Ad Campaigns
        </Typography>
        <Button
          variant="contained"
          startIcon={<FaPlus />}
          onClick={handleAdd}
        >
          New Campaign
        </Button>
      </Box>

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
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Target</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell align="right">Impressions</TableCell>
                <TableCell align="right">Clicks</TableCell>
                <TableCell>Dates</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    No campaigns found
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <Link
                        href={`/admin/ads/campaigns/${campaign.id}`}
                        style={{
                          color: isDark ? "#90caf9" : "#1976d2",
                          textDecoration: "none",
                        }}
                      >
                        {campaign.name}
                      </Link>
                    </TableCell>
                    <TableCell>{campaign.type}</TableCell>
                    <TableCell>
                      <Chip
                        label={campaign.status}
                        color={getStatusColor(campaign.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{campaign.targetType}</TableCell>
                    <TableCell>{campaign.priority}</TableCell>
                    <TableCell align="right">
                      {campaign.totalImpressions.toLocaleString()}
                    </TableCell>
                    <TableCell align="right">
                      {campaign.totalClicks.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {campaign.startDate
                        ? dayjs(campaign.startDate).format("MMM DD")
                        : "—"}{" "}
                      -{" "}
                      {campaign.endDate
                        ? dayjs(campaign.endDate).format("MMM DD")
                        : "—"}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleToggleStatus(campaign)}
                        title={
                          campaign.status === "active" ? "Pause" : "Activate"
                        }
                      >
                        {campaign.status === "active" ? (
                          <FaPause />
                        ) : (
                          <FaPlay />
                        )}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(campaign)}
                      >
                        <FaEdit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(campaign.id)}
                        color="error"
                      >
                        <FaTrash />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog
        open={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setEditingCampaign(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingCampaign ? "Edit Campaign" : "New Campaign"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
            <TextField
              label="Campaign Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              fullWidth
              multiline
              rows={3}
            />
            <TextField
              label="Type"
              select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
              fullWidth
            >
              <MenuItem value="product">Product</MenuItem>
              <MenuItem value="category">Category</MenuItem>
              <MenuItem value="banner">Banner</MenuItem>
              <MenuItem value="comparison">Comparison</MenuItem>
            </TextField>
            <TextField
              label="Status"
              select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              fullWidth
            >
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="paused">Paused</MenuItem>
            </TextField>
            <TextField
              label="Target Type"
              select
              value={formData.targetType}
              onChange={(e) =>
                setFormData({ ...formData, targetType: e.target.value })
              }
              fullWidth
            >
              <MenuItem value="all">All Pages</MenuItem>
              <MenuItem value="categories">Categories</MenuItem>
              <MenuItem value="blogs">Specific Blogs</MenuItem>
              <MenuItem value="keywords">Keywords</MenuItem>
            </TextField>
            <TextField
              label="Priority"
              type="number"
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: parseInt(e.target.value) })
              }
              fullWidth
              inputProps={{ min: 0, max: 100 }}
            />
            <TextField
              label="Start Date"
              type="datetime-local"
              value={formData.startDate}
              onChange={(e) =>
                setFormData({ ...formData, startDate: e.target.value })
              }
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date"
              type="datetime-local"
              value={formData.endDate}
              onChange={(e) =>
                setFormData({ ...formData, endDate: e.target.value })
              }
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowAddModal(false);
              setShowEditModal(false);
              setEditingCampaign(null);
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained">
            {editingCampaign ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

