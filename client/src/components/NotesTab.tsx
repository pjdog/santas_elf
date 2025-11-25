import React, { useState, useContext } from 'react';
import { Box, Button, TextField, Typography, IconButton, Table, TableBody, TableCell, TableRow, Paper } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import { ArtifactContext, AgentNote } from '../context/ArtifactContext';

// Cute Elf Component
const ScamperingElf = ({ active }: { active: boolean }) => {
    if (!active) return null;
    return (
        <div style={{
            position: 'absolute',
            top: -25,
            left: 0,
            fontSize: '24px',
            animation: 'scamper 3s linear infinite',
            zIndex: 1300,
            pointerEvents: 'none',
            width: '100%'
        }}>
            <div style={{ position: 'absolute' }}>🧝</div>
            <style>{`
                @keyframes scamper {
                    0% { left: -30px; transform: scaleX(1); }
                    45% { left: 100%; transform: scaleX(1); }
                    50% { left: 100%; transform: scaleX(-1); }
                    95% { left: -30px; transform: scaleX(-1); }
                    100% { left: -30px; transform: scaleX(1); }
                }
            `}</style>
        </div>
    );
};

const NotesTab: React.FC = () => {
    const context = useContext(ArtifactContext);
    const [isElfActive, setIsElfActive] = useState(false);

    if (!context) return null;
    const { artifacts, saveArtifacts } = context;

    const handleAddNote = (type: 'text' | 'table') => {
        const newNote: AgentNote = {
            id: Date.now().toString(),
            title: type === 'text' ? 'New Note' : 'Budget Plan',
            type,
            content: '',
            tableRows: type === 'table' ? [['Item', 'Cost'], ['Total', '0']] : undefined
        };
        saveArtifacts({ ...artifacts, agentNotes: [...artifacts.agentNotes, newNote] });
        triggerElf();
    };

    const handleDeleteNote = (id: string) => {
        const updated = artifacts.agentNotes.filter(n => n.id !== id);
        saveArtifacts({ ...artifacts, agentNotes: updated });
    };

    const updateNote = (id: string, updates: Partial<AgentNote>) => {
        const updated = artifacts.agentNotes.map(n => n.id === id ? { ...n, ...updates } : n);
        saveArtifacts({ ...artifacts, agentNotes: updated });
        triggerElf();
    };

    const triggerElf = () => {
        setIsElfActive(true);
        // Elf runs for 3 seconds then hides - simply resets the timer if already active
        // Ideally we use a ref to clear timeout but for simplicity this works visually
        setTimeout(() => setIsElfActive(false), 3000);
    };

    const handleBudgetChange = (value: string) => {
        const limit = parseFloat(value);
        if (!isNaN(limit)) {
            saveArtifacts({ ...artifacts, budget: { ...artifacts.budget, limit } });
        }
    };

    const currentTotal = artifacts.gifts.reduce((acc, gift) => {
          const price = gift.budget ? (gift.budget.min + gift.budget.max) / 2 : 0;
          return acc + price;
    }, 0);

    const renderTableEditor = (note: AgentNote) => {
        const rows = note.tableRows || [];
        
        const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
            const newRows = rows.map(r => [...r]);
            newRows[rowIndex][colIndex] = value;
            updateNote(note.id, { tableRows: newRows });
        };

        const addRow = () => {
            const newRows = [...rows, Array(rows[0]?.length || 2).fill('')];
            updateNote(note.id, { tableRows: newRows });
        };

        return (
            <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                    <TableBody>
                        {rows.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                                {row.map((cell, colIndex) => (
                                    <TableCell key={colIndex} sx={{ p: 0.5, borderBottom: 'none' }}>
                                        <TextField
                                            fullWidth
                                            variant="outlined"
                                            size="small"
                                            value={cell}
                                            onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                            sx={{ '& .MuiInputBase-input': { p: 0.5, fontSize: '0.875rem' } }}
                                        />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <Button size="small" startIcon={<AddIcon />} onClick={addRow} sx={{ mt: 1 }}>Add Row</Button>
            </Box>
        );
    };

    return (
        <Box sx={{ position: 'relative', minHeight: 200 }}>
            <ScamperingElf active={isElfActive} />
            
            <Box sx={{ mb: 3, p: 2, bgcolor: '#fff', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Total Budget Goal</Typography>
                <TextField
                    fullWidth
                    type="number"
                    variant="outlined"
                    size="small"
                    value={artifacts.budget?.limit || ''}
                    onChange={(e) => handleBudgetChange(e.target.value)}
                    InputProps={{ 
                        startAdornment: <Typography color="text.secondary" sx={{ mr: 1 }}>$</Typography> 
                    }}
                    sx={{ mb: 2 }}
                />
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">Planned Gifts:</Typography>
                    <Typography variant="body2" fontWeight="bold">${currentTotal.toFixed(2)}</Typography>
                </Box>
                 <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                    <Typography variant="body2" color="text.secondary">Remaining:</Typography>
                    <Typography 
                        variant="body2" 
                        fontWeight="bold" 
                        color={(artifacts.budget?.limit || 0) - currentTotal >= 0 ? 'success.main' : 'error.main'}
                    >
                        ${((artifacts.budget?.limit || 0) - currentTotal).toFixed(2)}
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => handleAddNote('text')}>
                    Note
                </Button>
                <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => handleAddNote('table')}>
                    Table
                </Button>
            </Box>

            {artifacts.agentNotes.map((note) => (
                <Paper key={note.id} sx={{ mb: 2, p: 2, position: 'relative', overflow: 'hidden' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <TextField
                            variant="standard"
                            value={note.title}
                            onChange={(e) => updateNote(note.id, { title: e.target.value })}
                            InputProps={{ disableUnderline: true, style: { fontWeight: 'bold' } }}
                        />
                        <IconButton size="small" onClick={() => handleDeleteNote(note.id)}>
                            <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    {note.type === 'text' ? (
                        <TextField
                            multiline
                            fullWidth
                            minRows={3}
                            variant="standard"
                            placeholder="Write your notes here..."
                            value={note.content}
                            onChange={(e) => updateNote(note.id, { content: e.target.value })}
                            InputProps={{ disableUnderline: true }}
                        />
                    ) : (
                        renderTableEditor(note)
                    )}
                </Paper>
            ))}
             {artifacts.agentNotes.length === 0 && (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
                    Use the buttons above to create notes or budget tables.
                </Typography>
            )}
        </Box>
    );
};

export default NotesTab;