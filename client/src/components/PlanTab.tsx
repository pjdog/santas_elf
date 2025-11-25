import React, { useContext } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import { ArtifactContext, PlanStep } from '../context/ArtifactContext';

const PlanTab: React.FC = () => {
    const context = useContext(ArtifactContext);
    if (!context) return null;
    const { artifacts, saveArtifacts } = context;
    const plan = artifacts.plan;

    if (!plan || plan.steps.length === 0) {
        return (
            <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                <Typography variant="body2">
                    No active plan yet. Ask the agent to "create a plan" for your event!
                </Typography>
            </Box>
        );
    }

    const handleToggleStep = (stepId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
        
        if (!artifacts.plan) return;

        const updatedSteps = artifacts.plan.steps.map(s => 
            s.id === stepId ? { ...s, status: newStatus as PlanStep['status'] } : s
        );

        saveArtifacts({
            ...artifacts,
            plan: {
                ...artifacts.plan,
                steps: updatedSteps
            }
        });
    };

    const getStatusChip = (status: string) => {
        let color: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" = "default";
        if (status === 'completed') color = "success";
        if (status === 'in_progress') color = "primary";
        if (status === 'cancelled') color = "error";
        
        return (
            <Chip 
                label={status.replace('_', ' ')} 
                size="small" 
                color={color} 
                variant="outlined" 
                sx={{ fontSize: '0.7rem', height: 20 }} 
            />
        );
    };

    return (
        <Box sx={{ pb: 4 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
                {plan.title}
            </Typography>
            
            <List>
                {plan.steps.map((step) => (
                    <ListItem 
                        key={step.id} 
                        alignItems="flex-start"
                        sx={{ 
                            bgcolor: '#fff', 
                            mb: 1, 
                            borderRadius: 2, 
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                            opacity: step.status === 'cancelled' ? 0.6 : 1
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                            <Checkbox 
                                edge="start" 
                                checked={step.status === 'completed'} 
                                onChange={() => handleToggleStep(step.id, step.status)}
                                color="success"
                                disabled={step.status === 'cancelled'}
                            />
                        </ListItemIcon>
                        <ListItemText 
                            primary={
                                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                    <Typography 
                                        variant="body2" 
                                        sx={{ 
                                            textDecoration: step.status === 'completed' || step.status === 'cancelled' ? 'line-through' : 'none',
                                            fontWeight: 500
                                        }}
                                    >
                                        {step.description}
                                    </Typography>
                                    {getStatusChip(step.status)}
                                </Box>
                            }
                        />
                    </ListItem>
                ))}
            </List>
        </Box>
    );
};

export default PlanTab;
