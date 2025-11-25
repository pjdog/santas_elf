import React, { useContext, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import { ArtifactContext } from '../context/ArtifactContext';

const ChipList = ({ items, onDelete, onAdd, label }: { items: string[], onDelete: (idx: number) => void, onAdd: (val: string) => void, label: string }) => {
    const [input, setInput] = useState('');
    const handleAdd = () => {
        if (input.trim()) {
            onAdd(input.trim());
            setInput('');
        }
    };
    return (
        <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                {items.map((item, i) => (
                    <Chip key={i} label={item} onDelete={() => onDelete(i)} size="small" />
                ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField 
                    size="small" 
                    placeholder={`Add ${label}...`} 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                    fullWidth
                />
                <Button size="small" variant="outlined" onClick={handleAdd} sx={{ minWidth: 40, px: 0 }}><AddIcon /></Button>
            </Box>
        </Box>
    );
};

const PreferencesTab: React.FC = () => {
    const context = useContext(ArtifactContext);
    if (!context) return null;
    const { artifacts, saveArtifacts } = context;
    const { preferences } = artifacts;

    const updateDietary = (key: keyof typeof preferences.dietary, val: string[]) => {
        saveArtifacts({
            ...artifacts,
            preferences: {
                ...preferences,
                dietary: { ...preferences.dietary, [key]: val }
            }
        });
    };

    const updateGifts = (key: keyof typeof preferences.gifts, val: any) => {
        saveArtifacts({
            ...artifacts,
            preferences: {
                ...preferences,
                gifts: { ...preferences.gifts, [key]: val }
            }
        });
    };

    const updateDecor = (key: keyof typeof preferences.decorations, val: any) => {
        saveArtifacts({
            ...artifacts,
            preferences: {
                ...preferences,
                decorations: { ...preferences.decorations, [key]: val }
            }
        });
    };

    return (
        <Box sx={{ pb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Preferences</Typography>
            
            <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">Dietary & Food</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <ChipList 
                        label="Allergies" 
                        items={preferences.dietary.allergies} 
                        onDelete={(i) => updateDietary('allergies', preferences.dietary.allergies.filter((_, idx) => idx !== i))}
                        onAdd={(v) => updateDietary('allergies', [...preferences.dietary.allergies, v])}
                    />
                    <ChipList 
                        label="Dislikes" 
                        items={preferences.dietary.dislikes} 
                        onDelete={(i) => updateDietary('dislikes', preferences.dietary.dislikes.filter((_, idx) => idx !== i))}
                        onAdd={(v) => updateDietary('dislikes', [...preferences.dietary.dislikes, v])}
                    />
                    <ChipList 
                        label="Diets" 
                        items={preferences.dietary.diets} 
                        onDelete={(i) => updateDietary('diets', preferences.dietary.diets.filter((_, idx) => idx !== i))}
                        onAdd={(v) => updateDietary('diets', [...preferences.dietary.diets, v])}
                    />
                </AccordionDetails>
            </Accordion>

            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">Gifts</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <TextField 
                        label="Recipient Relationship" fullWidth size="small" margin="dense"
                        value={preferences.gifts.recipientRelationship}
                        onChange={(e) => updateGifts('recipientRelationship', e.target.value)}
                    />
                     <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <TextField 
                            label="Min Budget" type="number" size="small" fullWidth
                            value={preferences.gifts.budgetMin}
                            onChange={(e) => updateGifts('budgetMin', Number(e.target.value))}
                        />
                        <TextField 
                            label="Max Budget" type="number" size="small" fullWidth
                            value={preferences.gifts.budgetMax}
                            onChange={(e) => updateGifts('budgetMax', Number(e.target.value))}
                        />
                    </Box>
                    <Box sx={{ mt: 2 }}>
                        <ChipList 
                            label="Recipient Interests" 
                            items={preferences.gifts.recipientInterests} 
                            onDelete={(i) => updateGifts('recipientInterests', preferences.gifts.recipientInterests.filter((_, idx) => idx !== i))}
                            onAdd={(v) => updateGifts('recipientInterests', [...preferences.gifts.recipientInterests, v])}
                        />
                    </Box>
                </AccordionDetails>
            </Accordion>

            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">Decorations</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <TextField 
                        label="Style (e.g. Rustic, Modern)" fullWidth size="small" margin="dense"
                        value={preferences.decorations.style}
                        onChange={(e) => updateDecor('style', e.target.value)}
                    />
                    <TextField 
                        label="Focus Room" fullWidth size="small" margin="dense"
                        value={preferences.decorations.room}
                        onChange={(e) => updateDecor('room', e.target.value)}
                    />
                    <Box sx={{ mt: 2 }}>
                         <ChipList 
                            label="Preferred Colors" 
                            items={preferences.decorations.preferredColors} 
                            onDelete={(i) => updateDecor('preferredColors', preferences.decorations.preferredColors.filter((_, idx) => idx !== i))}
                            onAdd={(v) => updateDecor('preferredColors', [...preferences.decorations.preferredColors, v])}
                        />
                    </Box>
                </AccordionDetails>
            </Accordion>
        </Box>
    );
};

export default PreferencesTab;
