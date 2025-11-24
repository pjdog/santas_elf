import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Fab from '@mui/material/Fab';
import Badge from '@mui/material/Badge';
import Tooltip from '@mui/material/Tooltip';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import HomeIcon from '@mui/icons-material/Home';
import BrushIcon from '@mui/icons-material/Brush';
import LogoutIcon from '@mui/icons-material/Logout';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import { Link as RouterLink } from 'react-router-dom';

interface ArtifactPanelProps {
  open: boolean;
  onToggle: () => void;
}

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

interface SavedArtifacts {
  todos: TodoItem[];
  recipes: any[];
  gifts: any[];
}

const ArtifactPanel: React.FC<ArtifactPanelProps> = ({ open, onToggle }) => {
  const [tab, setTab] = useState(0);
  const [artifacts, setArtifacts] = useState<SavedArtifacts>({ todos: [], recipes: [], gifts: [] });
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchArtifacts();
  }, []);

  const fetchArtifacts = async () => {
    try {
        const res = await fetch('/api/artifacts');
        if (res.ok) {
            const data = await res.json();
            const safeData: SavedArtifacts = {
                todos: Array.isArray(data?.todos) ? data.todos : [],
                recipes: Array.isArray(data?.recipes) ? data.recipes : [],
                gifts: Array.isArray(data?.gifts) ? data.gifts : [],
            };
            setArtifacts(safeData);
        }
    } catch (e) {
        console.error("Failed to load artifacts", e);
    }
  };

  const saveArtifacts = async (updated: SavedArtifacts) => {
    setArtifacts(updated); // Optimistic update
    try {
        await fetch('/api/artifacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
        });
    } catch (e) {
        console.error("Failed to save artifacts", e);
    }
  };

  const handleAddTodo = () => {
    if (!newTodo.trim()) return;
    const newItem = { id: Date.now().toString(), text: newTodo, completed: false };
    const updated = { ...artifacts, todos: [...artifacts.todos, newItem] };
    saveArtifacts(updated);
    setNewTodo('');
  };

  const handleToggleTodo = (id: string) => {
    const updatedTodos = artifacts.todos.map(t => 
        t.id === id ? { ...t, completed: !t.completed } : t
    );
    saveArtifacts({ ...artifacts, todos: updatedTodos });
  };

  const handleDeleteTodo = (id: string) => {
    const updatedTodos = artifacts.todos.filter(t => t.id !== id);
    saveArtifacts({ ...artifacts, todos: updatedTodos });
  };

  const handleDeleteGift = (index: number) => {
      const updatedGifts = [...artifacts.gifts];
      updatedGifts.splice(index, 1);
      saveArtifacts({ ...artifacts, gifts: updatedGifts });
  };

  const handleDeleteRecipe = (index: number) => {
      const updatedRecipes = [...artifacts.recipes];
      updatedRecipes.splice(index, 1);
      saveArtifacts({ ...artifacts, recipes: updatedRecipes });
  };

  const calculateGiftTotal = () => {
      return artifacts.gifts.reduce((acc, gift) => {
          const price = gift.budget ? (gift.budget.min + gift.budget.max) / 2 : 0;
          return acc + price;
      }, 0);
  };

  return (
    <>
      {/* Toggle Button (Visible when closed) */}
      {!open && (
        <Tooltip title="Open Holiday Planner" placement="left">
            <Fab 
                color="primary" 
                onClick={onToggle}
                sx={{ 
                    position: 'fixed', 
                    right: 20, 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    zIndex: 1200,
                    background: 'linear-gradient(135deg, #FF3B30, #FF9500)',
                    boxShadow: '0 4px 20px rgba(255, 59, 48, 0.4)'
                }}
            >
                <Badge badgeContent={artifacts.todos.filter(t => !t.completed).length} color="secondary">
                    <ChevronLeftIcon />
                </Badge>
            </Fab>
        </Tooltip>
      )}

      {/* The Panel */}
      <Paper
        elevation={4}
        sx={{
          position: 'fixed',
          right: open ? 0 : -400,
          top: 0,
          bottom: 0,
          width: 350,
          zIndex: 1200,
          transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRadius: '24px 0 0 24px',
          bgcolor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(255,255,255,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'rgba(255,255,255,0.5)' }}>
            <Box display="flex" alignItems="center">
                <AutoAwesomeIcon sx={{ color: '#FF3B30', mr: 1 }} />
                <Typography variant="h6" fontWeight={700}>Holiday Planner</Typography>
            </Box>
            <IconButton onClick={onToggle}>
                <ChevronRightIcon />
            </IconButton>
        </Box>

        {/* Navigation shortcuts */}
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, bgcolor: '#fff' }}>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 0.5 }}>
            Navigate
          </Typography>
          <Button startIcon={<HomeIcon />} component={RouterLink} to="/" color="primary" variant="outlined">
            Chat
          </Button>
          <Button startIcon={<RestaurantIcon />} component={RouterLink} to="/recipes" color="primary" variant="outlined">
            Recipes
          </Button>
          <Button startIcon={<CardGiftcardIcon />} component={RouterLink} to="/gifts" color="primary" variant="outlined">
            Gifts
          </Button>
          <Button startIcon={<BrushIcon />} component={RouterLink} to="/decorations" color="primary" variant="outlined">
            Decor
          </Button>
          <Button startIcon={<ManageAccountsIcon />} component={RouterLink} to="/llm-setup" color="secondary" variant="outlined">
            LLM Setup
          </Button>
          <Button startIcon={<LogoutIcon />} href="/auth/logout" color="inherit">
            Exit
          </Button>
        </Box>

        <Tabs 
            value={tab} 
            onChange={(e, v) => setTab(v)} 
            variant="fullWidth" 
            sx={{ 
                borderBottom: 1, 
                borderColor: 'divider',
                '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 }
            }}
        >
            <Tab icon={<CheckCircleIcon />} label="To-Do" />
            <Tab icon={<CardGiftcardIcon />} label="Gifts" />
            <Tab icon={<RestaurantIcon />} label="Recipes" />
        </Tabs>

        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
            
            {/* To-Dos Tab */}
            {tab === 0 && (
                <Box>
                    <Box sx={{ display: 'flex', mb: 2 }}>
                        <TextField 
                            fullWidth 
                            size="small" 
                            placeholder="Add a task..." 
                            value={newTodo}
                            onChange={(e) => setNewTodo(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddTodo()}
                            sx={{ mr: 1, bgcolor: '#fff', borderRadius: 1 }}
                        />
                        <IconButton onClick={handleAddTodo} color="primary" sx={{ bgcolor: '#fff', boxShadow: 1 }}>
                            <AddIcon />
                        </IconButton>
                    </Box>
                    <List>
                        {artifacts.todos.map((todo) => (
                            <ListItem 
                                key={todo.id} 
                                dense 
                                sx={{ 
                                    bgcolor: '#fff', 
                                    mb: 1, 
                                    borderRadius: 2, 
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)' 
                                }}
                                secondaryAction={
                                    <IconButton edge="end" size="small" onClick={() => handleDeleteTodo(todo.id)}>
                                        <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                }
                            >
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    <Checkbox 
                                        edge="start" 
                                        checked={todo.completed} 
                                        onChange={() => handleToggleTodo(todo.id)}
                                        color="secondary"
                                    />
                                </ListItemIcon>
                                <ListItemText 
                                    primary={todo.text} 
                                    sx={{ textDecoration: todo.completed ? 'line-through' : 'none', opacity: todo.completed ? 0.6 : 1 }}
                                />
                            </ListItem>
                        ))}
                    </List>
                    {artifacts.todos.length === 0 && (
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
                            No tasks yet. Get organized!
                        </Typography>
                    )}
                </Box>
            )}

            {/* Gifts Tab */}
            {tab === 1 && (
                <Box>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: '#34C759' }}>
                        Estimated Total: ${calculateGiftTotal().toFixed(2)}
                    </Typography>
                    
                    {artifacts.gifts.length === 0 ? (
                         <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
                            Save gift ideas from the chat to see them here!
                        </Typography>
                    ) : (
                        <List>
                            {artifacts.gifts.map((gift, idx) => (
                                <ListItem 
                                    key={idx} 
                                    sx={{ 
                                        bgcolor: '#fff', 
                                        mb: 1, 
                                        borderRadius: 2, 
                                        flexDirection: 'column', 
                                        alignItems: 'flex-start',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                                    }}
                                >
                                    <Box width="100%" display="flex" justifyContent="space-between" alignItems="flex-start">
                                        <ListItemText 
                                            primary={gift.name} 
                                            secondary={`Budget: $${gift.budget?.min || 0} - $${gift.budget?.max || 0}`} 
                                        />
                                        <IconButton size="small" onClick={() => handleDeleteGift(idx)}>
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Box>
            )}

            {/* Recipes Tab */}
            {tab === 2 && (
                 <Box>
                    {artifacts.recipes.length === 0 ? (
                         <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
                            Save recipes from the chat to keep them handy!
                        </Typography>
                    ) : (
                        <List>
                            {artifacts.recipes.map((recipe, idx) => (
                                <ListItem 
                                    key={idx}
                                    sx={{ 
                                        bgcolor: '#fff', 
                                        mb: 1, 
                                        borderRadius: 2, 
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                                    }}
                                    secondaryAction={
                                        <IconButton edge="end" size="small" onClick={() => handleDeleteRecipe(idx)}>
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    }
                                >
                                    <ListItemText primary={recipe.name} secondary={`${recipe.servings} Servings`} />
                                </ListItem>
                            ))}
                        </List>
                    )}
                 </Box>
            )}

        </Box>
      </Paper>
    </>
  );
};

export default ArtifactPanel;
