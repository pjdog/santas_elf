import React, { useContext, useState, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto';
import ChairIcon from '@mui/icons-material/Chair';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { ArtifactContext } from '../context/ArtifactContext';

const SeatingTab: React.FC = () => {
    const context = useContext(ArtifactContext);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!context) return null;
    const { artifacts, saveArtifacts, scenario } = context;

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('image', file);
        formData.append('prompt', 'Generate a seating plan based on this room layout.');
        // We send a flag/hint via the prompt or query param if the backend supported it,
        // but for now we'll rely on the backend's vision prompt logic to detect the intent
        // or we can update the backend to accept a 'purpose' field.
        // Let's add 'purpose' to the body.
        formData.append('purpose', 'seating_plan');

        try {
            const res = await fetch(`/api/agent/chat?scenario=${encodeURIComponent(scenario)}`, {
                method: 'POST',
                body: formData
            });
            
            if (res.ok) {
                const data = await res.json();
                if (data.type === 'seating_plan' && data.data) {
                    // Update artifacts directly
                    const updated = { ...artifacts, seating: data.data };
                    saveArtifacts(updated);
                } else if (data.type === 'chat' || data.type === 'decoration') {
                    // Fallback if the AI just chatted about it
                    console.warn("AI returned chat instead of seating plan:", data);
                }
            }
        } catch (e) {
            console.error("Failed to upload seating plan image", e);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteTable = (tableId: string) => {
        const updatedSeating = artifacts.seating.filter(t => t.id !== tableId);
        saveArtifacts({ ...artifacts, seating: updatedSeating });
    };

    return (
        <Box>
            <Box sx={{ mb: 3, textAlign: 'center' }}>
                <input
                    type="file"
                    accept="image/*"
                    hidden
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                />
                <Button
                    variant="outlined"
                    startIcon={uploading ? <CircularProgress size={20} /> : <AddAPhotoIcon />}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    fullWidth
                    sx={{ borderStyle: 'dashed', height: 60 }}
                >
                    {uploading ? "Analyzing Room..." : "Upload Room Photo"}
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Upload a photo of your dining area to auto-generate a table layout!
                </Typography>
            </Box>

            {artifacts.seating.length === 0 ? (
                <Box textAlign="center" py={4} color="text.secondary">
                    <TableRestaurantIcon sx={{ fontSize: 48, opacity: 0.3, mb: 2 }} />
                    <Typography>No tables set up yet.</Typography>
                </Box>
            ) : (
                <Box>
                    {artifacts.seating.map((table) => (
                        <Card key={table.id} sx={{ mb: 3, p: 2, bgcolor: '#F9F9F9', position: 'relative' }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Box display="flex" alignItems="center">
                                    <TableRestaurantIcon color="primary" sx={{ mr: 1 }} />
                                    <Typography variant="subtitle1" fontWeight={600}>
                                        {table.name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ ml: 1, bgcolor: '#eee', px: 1, borderRadius: 1 }}>
                                        {table.seats} Seats
                                    </Typography>
                                </Box>
                                <IconButton size="small" onClick={() => handleDeleteTable(table.id)}>
                                    <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                            </Box>

                            {/* Visual Chair Layout */}
                            <Box 
                                sx={{ 
                                    display: 'flex', 
                                    flexWrap: 'wrap', 
                                    gap: 1, 
                                    justifyContent: 'center',
                                    border: '2px solid #e0e0e0',
                                    borderRadius: 4,
                                    p: 2,
                                    bgcolor: '#fff'
                                }}
                            >
                                {Array.from({ length: table.seats }).map((_, i) => {
                                    const guestName = table.guests[i];
                                    return (
                                        <Box 
                                            key={i} 
                                            sx={{ 
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                alignItems: 'center',
                                                width: 60
                                            }}
                                        >
                                            <ChairIcon 
                                                color={guestName ? "secondary" : "disabled"} 
                                                fontSize="medium" 
                                            />
                                            <Typography 
                                                variant="caption" 
                                                align="center" 
                                                sx={{ 
                                                    fontSize: '0.7rem', 
                                                    mt: 0.5, 
                                                    fontWeight: guestName ? 600 : 400,
                                                    color: guestName ? 'text.primary' : 'text.secondary',
                                                    lineHeight: 1.1
                                                }}
                                            >
                                                {guestName || "Empty"}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Card>
                    ))}
                </Box>
            )}
        </Box>
    );
};

export default SeatingTab;
