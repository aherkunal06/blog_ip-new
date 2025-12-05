"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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
  TextField,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaTimesCircle,
  FaFlask,
} from "react-icons/fa";

interface AIProvider {
  id: number;
  providerName: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
  rateLimitPerMinute: number;
  isActive: boolean;
  isDefault: boolean;
  costPerToken: number | null;
  baseUrl?: string | null;
}

interface Setting {
  key: string;
  value: any;
  type: string;
  category: string;
  description: string;
  isActive: boolean;
}

export default function AutoBlogSettingsPage() {
  const { theme } = useThemeContext();
  const { data: session } = useSession();
  const isDark = theme === "dark";

  const [tabValue, setTabValue] = useState(0);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    responseTime?: number;
  } | null>(null);

  // Provider form state
  const [providerForm, setProviderForm] = useState({
    providerName: "openai",
    apiKey: "",
    apiSecret: "",
    baseUrl: "",
    modelName: "gpt-4-turbo-preview",
    temperature: 0.7,
    maxTokens: 2000,
    rateLimitPerMinute: 60,
    isDefault: false,
    costPerToken: null as number | null,
  });

  useEffect(() => {
    if (session) {
      fetchProviders();
      fetchSettings();
    }
  }, [session]);

  const fetchProviders = async () => {
    try {
      const response = await axios.get("/api/blogs/auto-generate/ai-providers");
      setProviders(response.data.providers);
    } catch (error: any) {
      console.error("Error fetching providers:", error);
      toast.error("Failed to load AI providers");
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get("/api/blogs/auto-generate/settings");
      setSettings(response.data.settings);
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProvider = async () => {
    try {
      if (editingProvider) {
        await axios.put(
          `/api/blogs/auto-generate/ai-providers?id=${editingProvider.id}`,
          providerForm
        );
        toast.success("AI provider updated");
      } else {
        await axios.post("/api/blogs/auto-generate/ai-providers", providerForm);
        toast.success("AI provider created");
      }
      setProviderDialogOpen(false);
      setEditingProvider(null);
      resetProviderForm();
      fetchProviders();
    } catch (error: any) {
      console.error("Error saving provider:", error);
      toast.error(error.response?.data?.error || "Failed to save provider");
    }
  };

  const handleTestProvider = async (providerId: number) => {
    try {
      const response = await axios.post(
        `/api/blogs/auto-generate/ai-providers/${providerId}/test`
      );
      setTestResult(response.data);
      if (response.data.success) {
        toast.success("Connection test successful");
      } else {
        toast.error("Connection test failed");
      }
    } catch (error: any) {
      console.error("Error testing provider:", error);
      toast.error("Failed to test connection");
    }
  };

  const handleDeleteProvider = async (providerId: number) => {
    if (!confirm("Are you sure you want to delete this provider?")) return;

    try {
      await axios.delete(`/api/blogs/auto-generate/ai-providers?id=${providerId}`);
      toast.success("Provider deleted");
      fetchProviders();
    } catch (error: any) {
      console.error("Error deleting provider:", error);
      toast.error(error.response?.data?.error || "Failed to delete provider");
    }
  };

  const handleToggleActive = async (providerId: number, isActive: boolean) => {
    try {
      await axios.put(`/api/blogs/auto-generate/ai-providers?id=${providerId}`, {
        isActive,
      });
      toast.success(`Provider ${isActive ? "activated" : "deactivated"}`);
      fetchProviders();
    } catch (error: any) {
      console.error("Error toggling provider status:", error);
      toast.error(error.response?.data?.error || "Failed to update provider status");
    }
  };

  const handleUpdateSetting = async (key: string, value: any) => {
    try {
      await axios.put(`/api/blogs/auto-generate/settings?key=${key}`, { value });
      toast.success("Setting updated");
      fetchSettings();
    } catch (error: any) {
      console.error("Error updating setting:", error);
      toast.error("Failed to update setting");
    }
  };

  const resetProviderForm = () => {
    setProviderForm({
      providerName: "openai",
      apiKey: "",
      apiSecret: "",
      baseUrl: "",
      modelName: "gpt-4-turbo-preview",
      temperature: 0.7,
      maxTokens: 2000,
      rateLimitPerMinute: 60,
      isDefault: false,
      costPerToken: null,
    });
  };

  // Get default model name based on provider
  const getDefaultModel = (provider: string) => {
    switch (provider) {
      case "openai":
        return "gpt-4-turbo-preview";
      case "anthropic":
        return "claude-3-opus-20240229";
      case "google":
        return "gemini-pro";
      case "ollama":
        return "llama3.2:1b";
      default:
        return "";
    }
  };

  const openProviderDialog = (provider?: AIProvider) => {
    if (provider) {
      setEditingProvider(provider);
      setProviderForm({
        providerName: provider.providerName,
        apiKey: "", // Don't show existing key
        apiSecret: "",
        baseUrl: provider.baseUrl || "",
        modelName: provider.modelName,
        temperature: provider.temperature,
        maxTokens: provider.maxTokens,
        rateLimitPerMinute: provider.rateLimitPerMinute,
        isDefault: provider.isDefault,
        costPerToken: provider.costPerToken,
      });
    } else {
      resetProviderForm();
      setEditingProvider(null);
    }
    setProviderDialogOpen(true);
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

  const contentSettings = settings.filter((s) => s.category === "content");
  const hyperlinkSettings = settings.filter((s) => s.category === "hyperlink");
  const validationSettings = settings.filter((s) => s.category === "validation");
  const batchSettings = settings.filter((s) => s.category === "batch");
  const costSettings = settings.filter((s) => s.category === "cost");

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Auto Blog Generation Settings
      </Typography>

      <Tabs
        value={tabValue}
        onChange={(e, newValue) => setTabValue(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab label="AI Providers" />
        <Tab label="Content Settings" />
        <Tab label="Hyperlink Settings" />
        <Tab label="Validation Settings" />
        <Tab label="Batch Settings" />
        <Tab label="Cost Settings" />
      </Tabs>

      {/* AI Providers Tab */}
      {tabValue === 0 && (
        <Box>
          <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between" }}>
            <Typography variant="h6">AI Provider Configuration</Typography>
            <Button
              variant="contained"
              startIcon={<FaPlus />}
              onClick={() => openProviderDialog()}
            >
              Add Provider
            </Button>
          </Box>

          <TableContainer
            component={Paper}
            sx={{
              bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
            }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Provider</TableCell>
                  <TableCell>Model</TableCell>
                  <TableCell>Temperature</TableCell>
                  <TableCell>Max Tokens</TableCell>
                  <TableCell>Rate Limit</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell>
                      <Chip
                        label={provider.providerName}
                        color={provider.isDefault ? "primary" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{provider.modelName}</TableCell>
                    <TableCell>{provider.temperature}</TableCell>
                    <TableCell>{provider.maxTokens}</TableCell>
                    <TableCell>{provider.rateLimitPerMinute}/min</TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                        <Switch
                          checked={provider.isActive}
                          onChange={(e) => handleToggleActive(provider.id, e.target.checked)}
                          size="small"
                        />
                        {provider.isActive ? (
                          <Chip
                            icon={<FaCheckCircle />}
                            label="Active"
                            color="success"
                            size="small"
                          />
                        ) : (
                          <Chip
                            icon={<FaTimesCircle />}
                            label="Inactive"
                            color="default"
                            size="small"
                          />
                        )}
                        {provider.isDefault && (
                          <Chip label="Default" color="primary" size="small" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleTestProvider(provider.id)}
                        title="Test Connection"
                      >
                        <FaFlask />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => openProviderDialog(provider)}
                        title="Edit"
                      >
                        <FaEdit />
                      </IconButton>
                      {!provider.isDefault && (
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteProvider(provider.id)}
                          title="Delete"
                        >
                          <FaTrash />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Content Settings Tab */}
      {tabValue === 1 && (
        <Card
          sx={{
            bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
          }}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Content Generation Settings
            </Typography>
            <Grid container spacing={2}>
              {contentSettings.map((setting) => (
                <Grid item xs={12} md={6} key={setting.key}>
                  <TextField
                    fullWidth
                    label={setting.description || setting.key}
                    type={setting.type === "number" ? "number" : "text"}
                    value={setting.value}
                    onChange={(e) => {
                      const newValue =
                        setting.type === "number"
                          ? Number(e.target.value)
                          : e.target.value;
                      handleUpdateSetting(setting.key, newValue);
                    }}
                    variant="outlined"
                  />
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Other tabs - similar structure */}
      {tabValue === 2 && (
        <Card
          sx={{
            bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
          }}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Hyperlink Settings
            </Typography>
            <Grid container spacing={2}>
              {hyperlinkSettings.map((setting) => (
                <Grid item xs={12} md={6} key={setting.key}>
                  <TextField
                    fullWidth
                    label={setting.description || setting.key}
                    type={setting.type === "number" ? "number" : "text"}
                    value={setting.value}
                    onChange={(e) => {
                      const newValue =
                        setting.type === "number"
                          ? Number(e.target.value)
                          : e.target.value;
                      handleUpdateSetting(setting.key, newValue);
                    }}
                    variant="outlined"
                  />
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {tabValue === 3 && (
        <Card
          sx={{
            bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
          }}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Validation & Quality Settings
            </Typography>
            <Grid container spacing={2}>
              {validationSettings.map((setting) => (
                <Grid item xs={12} md={6} key={setting.key}>
                  {setting.type === "boolean" ? (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={setting.value}
                          onChange={(e) =>
                            handleUpdateSetting(setting.key, e.target.checked)
                          }
                        />
                      }
                      label={setting.description || setting.key}
                    />
                  ) : (
                    <TextField
                      fullWidth
                      label={setting.description || setting.key}
                      type={setting.type === "number" ? "number" : "text"}
                      value={setting.value}
                      onChange={(e) => {
                        const newValue =
                          setting.type === "number"
                            ? Number(e.target.value)
                            : e.target.value;
                        handleUpdateSetting(setting.key, newValue);
                      }}
                      variant="outlined"
                    />
                  )}
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {tabValue === 4 && (
        <Card
          sx={{
            bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
          }}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Batch Processing Settings
            </Typography>
            <Grid container spacing={2}>
              {batchSettings.map((setting) => (
                <Grid item xs={12} md={6} key={setting.key}>
                  <TextField
                    fullWidth
                    label={setting.description || setting.key}
                    type={setting.type === "number" ? "number" : "text"}
                    value={setting.value}
                    onChange={(e) => {
                      const newValue =
                        setting.type === "number"
                          ? Number(e.target.value)
                          : e.target.value;
                      handleUpdateSetting(setting.key, newValue);
                    }}
                    variant="outlined"
                  />
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {tabValue === 5 && (
        <Card
          sx={{
            bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
          }}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Cost & Budget Settings
            </Typography>
            <Grid container spacing={2}>
              {costSettings.map((setting) => (
                <Grid item xs={12} md={6} key={setting.key}>
                  <TextField
                    fullWidth
                    label={setting.description || setting.key}
                    type={setting.type === "number" ? "number" : "text"}
                    value={setting.value}
                    onChange={(e) => {
                      const newValue =
                        setting.type === "number"
                          ? Number(e.target.value)
                          : e.target.value;
                      handleUpdateSetting(setting.key, newValue);
                    }}
                    variant="outlined"
                  />
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Provider Dialog */}
      <Dialog
        open={providerDialogOpen}
        onClose={() => {
          setProviderDialogOpen(false);
          setEditingProvider(null);
          resetProviderForm();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingProvider ? "Edit AI Provider" : "Add AI Provider"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Provider</InputLabel>
                <Select
                  value={providerForm.providerName}
                  onChange={(e) => {
                    const newProvider = e.target.value;
                    setProviderForm({
                      ...providerForm,
                      providerName: newProvider,
                      modelName: getDefaultModel(newProvider),
                      baseUrl: newProvider === "ollama" ? "http://localhost:11434" : "",
                    });
                  }}
                  label="Provider"
                >
                  <MenuItem value="openai">OpenAI</MenuItem>
                  <MenuItem value="anthropic">Anthropic</MenuItem>
                  <MenuItem value="google">Google</MenuItem>
                  <MenuItem value="ollama">Ollama (Local)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {providerForm.providerName === "ollama" && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Base URL"
                  value={providerForm.baseUrl}
                  onChange={(e) =>
                    setProviderForm({ ...providerForm, baseUrl: e.target.value })
                  }
                  placeholder="http://localhost:11434"
                  helperText="Ollama server URL (default: http://localhost:11434)"
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={providerForm.providerName === "ollama" ? "API Key (Optional)" : "API Key"}
                type="password"
                value={providerForm.apiKey}
                onChange={(e) =>
                  setProviderForm({ ...providerForm, apiKey: e.target.value })
                }
                required={providerForm.providerName !== "ollama"}
                helperText={providerForm.providerName === "ollama" ? "For Ollama, you can leave this empty or set to 'ollama'" : ""}
              />
            </Grid>
            {providerForm.providerName !== "ollama" && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="API Secret (Optional)"
                  type="password"
                  value={providerForm.apiSecret}
                  onChange={(e) =>
                    setProviderForm({ ...providerForm, apiSecret: e.target.value })
                  }
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Model Name"
                value={providerForm.modelName}
                onChange={(e) =>
                  setProviderForm({ ...providerForm, modelName: e.target.value })
                }
                required
                helperText={
                  providerForm.providerName === "ollama"
                    ? "Example: llama3.2:1b, mistral:7b, llama3:8b (pull models with: ollama pull <model-name>)"
                    : ""
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Temperature"
                type="number"
                inputProps={{ min: 0, max: 1, step: 0.1 }}
                value={providerForm.temperature}
                onChange={(e) =>
                  setProviderForm({
                    ...providerForm,
                    temperature: Number(e.target.value),
                  })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Max Tokens"
                type="number"
                value={providerForm.maxTokens}
                onChange={(e) =>
                  setProviderForm({
                    ...providerForm,
                    maxTokens: Number(e.target.value),
                  })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Rate Limit (per minute)"
                type="number"
                value={providerForm.rateLimitPerMinute}
                onChange={(e) =>
                  setProviderForm({
                    ...providerForm,
                    rateLimitPerMinute: Number(e.target.value),
                  })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Cost per Token (Optional)"
                type="number"
                inputProps={{ step: 0.000001 }}
                value={providerForm.costPerToken || ""}
                onChange={(e) =>
                  setProviderForm({
                    ...providerForm,
                    costPerToken: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={providerForm.isDefault}
                    onChange={(e) =>
                      setProviderForm({
                        ...providerForm,
                        isDefault: e.target.checked,
                      })
                    }
                  />
                }
                label="Set as Default Provider"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setProviderDialogOpen(false);
              setEditingProvider(null);
              resetProviderForm();
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSaveProvider} variant="contained">
            {editingProvider ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

