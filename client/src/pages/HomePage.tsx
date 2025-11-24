import React, { useState, useEffect, useRef } from 'react';
import ChatInput from '../components/ChatInput';
import ArtifactPanel from '../components/ArtifactPanel';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import CircularProgress from '@mui/material/CircularProgress';
import Avatar from '@mui/material/Avatar';
import { useTheme } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import { Fade, Chip } from '@mui/material';

import RecipeWidget from '../components/RecipeWidget';
import GiftWidget from '../components/GiftWidget';
import DecorationWidget from '../components/DecorationWidget';
import { useAssistantContext } from '../context/AssistantContext';

interface Message {
    sender: 'user' | 'ai';
    text?: string;
    type?: 'text' | 'recipe' | 'gift' | 'decoration' | 'error';
    data?: any;
}

const HomePage: React.FC = () => {
  const { applyChatInsights } = useAssistantContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const theme = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        sender: 'ai',
        type: 'text',
        text: "Ho ho ho! 🎅 I'm Santa's Elf. How can I help you prepare for the holidays?",
      },
    ]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { sender: 'user', text, type: 'text' };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
        applyChatInsights(text);
        const response = await fetch('/api/agent/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: text }),
        });

        if (response.status === 401) {
            setMessages((prev) => [...prev, { 
                sender: 'ai', 
                type: 'error', 
                text: "Please log in to continue chatting." 
            }]);
            setLoading(false);
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong.');
        }

        const aiMsg: Message = {
            sender: 'ai',
            text: data.message,
            type: data.type,
            data: data.data
        };
        setMessages((prev) => [...prev, aiMsg]);

    } catch (error) {
        console.error("Agent error:", error);
        setMessages((prev) => [...prev, { 
            sender: 'ai', 
            type: 'error', 
            text: "I'm having trouble connecting to the North Pole. Please try again." 
        }]);
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

  const quickPrompts = [
    'Plan a cozy vegetarian dinner for 4',
    'Gift ideas for my dad who loves fishing under $75',
    'How should I decorate my living room for a holiday party?',
  ];

  const handleQuickPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  return (
    <Box sx={{ height: '85vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      <Box sx={{ position: 'absolute', top: -20, right: 0, zIndex: 10, display: 'flex', alignItems: 'center' }}>
        <IconButton component={RouterLink} to="/llm-setup" sx={{ color: 'text.secondary' }}>
            <SettingsIcon />
        </IconButton>
      </Box>

      <ArtifactPanel open={panelOpen} onToggle={() => setPanelOpen(!panelOpen)} />

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
        
        {loading && (
             <Fade in={true}>
             <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 3, alignItems: 'center' }}>
                 <Avatar sx={{ bgcolor: '#fff', color: '#000', mr: 1.5, width: 36, height: 36 }}>🧝</Avatar>
                 <Paper elevation={0} sx={{ px: 2, py: 1.5, borderRadius: 3, bgcolor: '#fff' }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <CircularProgress size={14} color="inherit" sx={{ color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Thinking...</Typography>
                    </Stack>
                 </Paper>
             </Box>
             </Fade>
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{ p: 2 }}>
        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {quickPrompts.map((prompt) => (
            <Chip
              key={prompt}
              label={prompt}
              onClick={() => handleQuickPrompt(prompt)}
              color="primary"
              variant="outlined"
            />
          ))}
        </Box>
        <ChatInput onSendMessage={handleSendMessage} />
      </Box>
    </Box>
  );
};

export default HomePage;
