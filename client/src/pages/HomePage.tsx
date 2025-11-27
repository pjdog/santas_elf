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
import Button from '@mui/material/Button';

import RecipeWidget from '../components/RecipeWidget';
import GiftWidget from '../components/GiftWidget';
import DecorationWidget from '../components/DecorationWidget';
import VoiceMode from '../components/VoiceMode';
import FormattedText from '../components/FormattedText';

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
  const [liveTrace, setLiveTrace] = useState<string[]>([]);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const progressPollerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressMissesRef = useRef(0);
  const lastPayloadRef = useRef<{ text: string; file?: File | null; scenario: string } | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  
  const context = useContext(ArtifactContext);
  const panelOpen = context?.panelOpen ?? false;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setPanelOpen = context?.setPanelOpen ?? (() => {});
  const scenario = context?.scenario ?? 'default';
  const setScenario = context?.setScenario ?? (async () => {});
  const refreshArtifacts = context?.refreshArtifacts ?? (async () => {});
  const updateArtifacts = context?.updateArtifacts ?? (() => {});

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

  // Create a temporary preview URL for selected files
  useEffect(() => {
    if (!pendingFile) {
        setPendingPreviewUrl(null);
        return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPendingPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  // Title notification logic
  const prevLoadingRef = useRef(loading);
  useEffect(() => {
    if (loading) {
        document.title = "Thinking... 🧠";
    } else if (prevLoadingRef.current && !loading) {
        // Transitioned from loading -> done
        document.title = "🔴 Response Ready!";
        const timer = setTimeout(() => {
            document.title = "Santa's Elf";
        }, 4000);
        return () => clearTimeout(timer);
    }
    prevLoadingRef.current = loading;
  }, [loading]);

  const stopProgressPolling = () => {
    if (progressPollerRef.current) {
        clearInterval(progressPollerRef.current);
        progressPollerRef.current = null;
    }
    progressMissesRef.current = 0;
    setLiveTrace([]);
    setProgressMessage('');
  };

  useEffect(() => {
    return () => stopProgressPolling();
  }, []);

  const pollProgress = async (scenarioName: string) => {
    try {
        const res = await fetch(`/api/agent/progress?scenario=${encodeURIComponent(scenarioName)}`);
        if (res.status === 401) {
            stopProgressPolling();
            return;
        }
        if (!res.ok) {
            progressMissesRef.current += 1;
            if (progressMissesRef.current >= 3) {
                setProgressMessage('Connection dropped. You can resubmit or wait a moment.');
                if (progressPollerRef.current) clearInterval(progressPollerRef.current);
                progressPollerRef.current = null;
            }
            return;
        }
        const data = await res.json();
        if (data.status && data.status !== 'idle') {
            setLiveTrace(Array.isArray(data.steps) ? data.steps : []);
            setProgressMessage(data.message || '');
            progressMissesRef.current = 0;
        }
    } catch (e) {
        progressMissesRef.current += 1;
        if (progressMissesRef.current >= 3) {
            setProgressMessage('Connection dropped. You can resubmit or wait a moment.');
            if (progressPollerRef.current) clearInterval(progressPollerRef.current);
            progressPollerRef.current = null;
        }
    }
  };

  const startProgressPolling = (scenarioName: string) => {
    stopProgressPolling();
    progressMissesRef.current = 0;
    pollProgress(scenarioName);
    progressPollerRef.current = setInterval(() => pollProgress(scenarioName), 1500);
  };

  const handleSendMessage = async (text: string, file?: File, scenarioOverride?: string): Promise<any> => {
    if (loading) return null; // debounce overlapping sends
    if (!text.trim() && !file) return null;

    const scenarioName = scenarioOverride || scenario;
    lastPayloadRef.current = { text, file, scenario: scenarioName };
    const userMsg: Message = { sender: 'user', text, type: 'text' };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    startProgressPolling(scenarioName);

    try {
        let response;
        if (file) {
            const formData = new FormData();
            if (text) formData.append('prompt', text);
            formData.append('image', file);
            
            response = await fetch(`/api/agent/chat?scenario=${encodeURIComponent(scenarioName)}`, {
                method: 'POST',
                body: formData,
            });
        } else {
            response = await fetch(`/api/agent/chat?scenario=${encodeURIComponent(scenarioName)}`, {
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
            stopProgressPolling();
            return null;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong.');
        }

        if (data.type === 'switch_scenario') {
            const nextScenario = data.data;
            await setScenario(nextScenario);
            await refreshArtifacts(nextScenario);
            // Recursively call to process the original prompt in the new scenario context
            return await handleSendMessage(text, file, nextScenario);
        }

        const aiMsg: Message = {
            sender: 'ai',
            text: data.message,
            type: data.type,
            data: data.data,
            trace: data.trace
        };
        setMessages((prev) => [...prev, aiMsg]);

        // Instant update if payload is present, otherwise fallback to fetch
        if (data.updatedArtifacts) {
            updateArtifacts(data.updatedArtifacts);
        } else if (data.artifactsUpdated) {
            refreshArtifacts();
        }
        
        return data;

    } catch (error) {
        console.error("Agent error:", error);
        setMessages((prev) => [...prev, { 
            sender: 'ai', 
            type: 'error', 
            text: "I'm having trouble connecting to the North Pole. Please try again.", 
            data: lastPayloadRef.current ? { retryable: true, prompt: lastPayloadRef.current.text, scenario: lastPayloadRef.current.scenario } : undefined
        }]);
        return null;
    } finally {
        stopProgressPolling();
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
        {pendingFile && pendingPreviewUrl && (
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: 'rgba(255,255,255,0.92)', borderRadius: 2, border: '1px dashed rgba(0,0,0,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Box
                    component="img"
                    src={pendingPreviewUrl}
                    alt={pendingFile.name}
                    sx={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 1, border: '1px solid rgba(0,0,0,0.08)' }}
                />
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" fontWeight={600} gutterBottom>Photo attached</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{pendingFile.name}</Typography>
                    <Button size="small" sx={{ mt: 1 }} onClick={() => setPendingFile(null)} disabled={loading}>Remove</Button>
                </Box>
            </Box>
        )}

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
                            <FormattedText text={msg.text || ''} />
                            {msg.trace && msg.trace.length > 0 && (
                                <Box sx={{ mt: 1, opacity: 0.8 }}>
                                    <ThinkingElf message="View Thought Process" steps={msg.trace} isAnimating={false} />
                                </Box>
                            )}
                            {msg.type === 'error' && msg.data?.retryable && (
                                <Box sx={{ mt: 1 }}>
                                    <Button 
                                        size="small" 
                                        variant="outlined" 
                                        onClick={() => handleSendMessage(msg.data.prompt || '', undefined, msg.data.scenario)}
                                        disabled={loading}
                                    >
                                        Resubmit
                                    </Button>
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
        {loading && <ThinkingElf isAnimating={loading} steps={liveTrace} message={progressMessage || "Thinking..."} />}
        
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{ p: 2, mr: panelOpen ? '350px' : 0, transition: 'margin-right 0.3s' }}>
        {messages.length < 3 && (
            <SuggestionChips onSelect={(text) => handleSendMessage(text)} />
        )}
        <ChatInput 
            onSendMessage={handleSendMessage} 
            disabled={loading} 
            selectedFile={pendingFile}
            onFileSelected={setPendingFile}
        />
      </Box>
    </Box>
  );
};

export default HomePage;
