import React, { useState, useEffect, useRef, useContext } from 'react';
import ChatInput from '../components/ChatInput';
import ArtifactPanel from '../components/ArtifactPanel';
import ThinkingElf from '../components/ThinkingElf';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import Avatar from '@mui/material/Avatar';
import { useTheme } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import { Fade } from '@mui/material';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { ArtifactContext } from '../context/ArtifactContext';

import RecipeWidget from '../components/RecipeWidget';
import GiftWidget from '../components/GiftWidget';
import DecorationWidget from '../components/DecorationWidget';
import VoiceMode from '../components/VoiceMode';

interface Message {
    sender: 'user' | 'ai';
    text?: string;
    type?: 'text' | 'recipe' | 'gift' | 'decoration' | 'commerce' | 'error';
    data?: any;
    trace?: string[];
}

const SuggestionChips = ({ onSelect }: { onSelect: (text: string) => void }) => {
    const suggestions = [
        "Find a cookie recipe",
        "Suggest gifts for Mom",
        "Decorate my living room",
        "Add 'Buy Milk' to tasks",
        "Set budget to $500",
        "See what people on Reddit are saying about Christmas gifts",
        "Find an Amazon cart helper for stocking stuffers"
    ];

    return (
        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1, mb: 1 }}>
            {suggestions.map((s) => (
                <Chip 
                    key={s} 
                    label={s} 
                    onClick={() => onSelect(s)} 
                    sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.9)', 
                        backdropFilter: 'blur(4px)',
                        fontWeight: 500,
                        '&:hover': { bgcolor: '#fff', boxShadow: 1 } 
                    }} 
                />
            ))}
        </Stack>
    );
};

const HomePage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [voiceModeOpen, setVoiceModeOpen] = useState(false);
  
  const context = useContext(ArtifactContext);
  const panelOpen = context?.panelOpen ?? false;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setPanelOpen = context?.setPanelOpen ?? (() => {});
  const scenario = context?.scenario ?? 'default';
  const setScenario = context?.setScenario ?? (async () => {});
  const refreshArtifacts = context?.refreshArtifacts ?? (async () => {});

  const theme = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchHistory = async () => {
        try {
            const res = await fetch(`/api/agent/history?scenario=${encodeURIComponent(scenario)}`);
            if (res.ok) {
                const history = await res.json();
                if (Array.isArray(history) && history.length > 0) {
                    setMessages(history);
                    return;
                }
            }
        } catch (e) {
            console.error("Failed to load chat history", e);
        }
        // Fallback if no history
        setMessages([
          {
            sender: 'ai',
            type: 'text',
            text: `Ho ho ho! 🎅 I'm Santa's Elf. What event are we planning for today? (e.g., Christmas Dinner, Office Party)`,
          },
        ]);
    };

    setMessages([]); // clear previous scenario conversation
    fetchHistory();
  }, [scenario]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (text: string, file?: File): Promise<any> => {
    if (!text.trim() && !file) return null;

    const userMsg: Message = { sender: 'user', text, type: 'text' };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
        let response;
        if (file) {
            const formData = new FormData();
            if (text) formData.append('prompt', text);
            formData.append('image', file);
            
            response = await fetch(`/api/agent/chat?scenario=${encodeURIComponent(scenario)}`, {
                method: 'POST',
                body: formData,
            });
        } else {
            response = await fetch(`/api/agent/chat?scenario=${encodeURIComponent(scenario)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: text }),
            });
        }

        if (response.status === 401) {
            setMessages((prev) => [...prev, { 
                sender: 'ai', 
                type: 'error', 
                text: "Please log in to continue chatting." 
            }]);
            setLoading(false);
            return null;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong.');
        }

        if (data.type === 'switch_scenario') {
            await setScenario(data.data);
            // Recursively call to process the original prompt in the new scenario context
            return handleSendMessage(text, file);
        }

        const aiMsg: Message = {
            sender: 'ai',
            text: data.message,
            type: data.type,
            data: data.data,
            trace: data.trace
        };
        setMessages((prev) => [...prev, aiMsg]);

        // If the backend says artifacts were updated (by a management tool), refresh the context
        if (data.artifactsUpdated) {
            refreshArtifacts();
        }
        
        return data;

    } catch (error) {
        console.error("Agent error:", error);
        setMessages((prev) => [...prev, { 
            sender: 'ai', 
            type: 'error', 
            text: "I'm having trouble connecting to the North Pole. Please try again." 
        }]);
        return null;
    } finally {
        setLoading(false);
    }
  };

  const renderContent = (msg: Message) => {
    if (msg.type === 'recipe') return <RecipeWidget data={msg.data} />;
    if (msg.type === 'gift') return <GiftWidget data={msg.data} />;
    if (msg.type === 'decoration') return <DecorationWidget data={msg.data} />;
    return null;
  };

  return (
    <Box sx={{ height: '85vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      <Box sx={{ position: 'absolute', top: -20, right: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => setVoiceModeOpen(true)} color="primary" sx={{ bgcolor: 'rgba(255,255,255,0.8)' }}>
            <HeadphonesIcon />
        </IconButton>
        <IconButton component={RouterLink} to="/llm-setup" sx={{ color: 'text.secondary', bgcolor: 'rgba(255,255,255,0.8)' }}>
            <SettingsIcon />
        </IconButton>
      </Box>

      <ArtifactPanel />
      
      <VoiceMode 
        open={voiceModeOpen} 
        onClose={() => setVoiceModeOpen(false)} 
        onSendMessage={handleSendMessage}
        scenario={scenario}
      />

      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 2, py: 4, mr: panelOpen ? '350px' : 0, transition: 'margin-right 0.3s' }}>
        {messages.map((msg, index) => (
            <Fade in={true} timeout={500} key={index}>
            <Box
                sx={{
                display: 'flex',
                justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                mb: 3,
                alignItems: 'flex-end'
                }}
            >
                {msg.sender === 'ai' && (
                    <Avatar sx={{ bgcolor: '#fff', color: '#000', mr: 1.5, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', width: 36, height: 36 }}>🧝</Avatar>
                )}
                
                <Box sx={{ maxWidth: '75%' }}>
                    {msg.text && (
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                bgcolor: msg.sender === 'user' ? theme.palette.primary.main : '#fff',
                                color: msg.sender === 'user' ? '#fff' : 'text.primary',
                                borderRadius: 3,
                                borderBottomRightRadius: msg.sender === 'user' ? 4 : 24,
                                borderBottomLeftRadius: msg.sender === 'ai' ? 4 : 24,
                                boxShadow: msg.sender === 'ai' ? '0 2px 12px rgba(0,0,0,0.05)' : '0 4px 15px rgba(255, 59, 48, 0.3)',
                            }}
                        >
                            <Typography variant="body1" sx={{ lineHeight: 1.6 }}>{msg.text}</Typography>
                            {msg.trace && msg.trace.length > 0 && (
                                <Box sx={{ mt: 1, opacity: 0.8 }}>
                                    <ThinkingElf message="View Thought Process" steps={msg.trace} />
                                </Box>
                            )}
                        </Paper>
                    )}
                    
                    {msg.data && (
                        <Box sx={{ mt: 1.5 }}>
                            {renderContent(msg)}
                        </Box>
                    )}
                </Box>
            </Box>
            </Fade>
        ))}
        
        {/* The Thinking Elf Animation (Loading State) */}
        {loading && <ThinkingElf />}
        
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{ p: 2, mr: panelOpen ? '350px' : 0, transition: 'margin-right 0.3s' }}>
        {messages.length < 3 && (
            <SuggestionChips onSelect={(text) => handleSendMessage(text)} />
        )}
        <ChatInput onSendMessage={handleSendMessage} />
      </Box>
    </Box>
  );
};

export default HomePage;
