import React, { useState, useEffect, useRef } from 'react';
import Dialog from '@mui/material/Dialog';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import { keyframes } from '@mui/system';

// Pulse animation for the talking orb
const pulse = keyframes`
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.7);
  }
  70% {
    transform: scale(1.1);
    box-shadow: 0 0 0 20px rgba(255, 59, 48, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(255, 59, 48, 0);
  }
`;

interface VoiceModeProps {
    open: boolean;
    onClose: () => void;
    onSendMessage: (text: string) => Promise<any>;
    scenario: string;
}

const VoiceMode: React.FC<VoiceModeProps> = ({ open, onClose, onSendMessage, scenario }) => {
    const [status, setStatus] = useState<'listening' | 'processing' | 'speaking' | 'idle'>('listening');
    const [transcript, setTranscript] = useState('');
    const [aiText, setAiText] = useState('');
    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);

    useEffect(() => {
        const synth = synthRef.current;
        if (open) {
            startListening();
        } else {
            stopListening();
            synth?.cancel();
        }
        return () => {
            stopListening();
            synth?.cancel();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const startListening = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setAiText("Voice not supported in this browser.");
            setStatus('idle');
            return;
        }

        if (recognitionRef.current) recognitionRef.current.stop();

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setStatus('listening');
            setTranscript('');
        };

        recognition.onresult = (event: any) => {
            const current = event.resultIndex;
            const text = event.results[current][0].transcript;
            setTranscript(text);
        };

        recognition.onend = () => {
            // If we have a transcript, send it. If not, restart listening (unless closed)
            if (transcript.trim()) {
                handleSend(transcript);
            } else if (open && status !== 'speaking' && status !== 'processing') {
                // Restart listening if silence
                // recognition.start(); 
                // Actually, let's wait for user to tap or just stay idle to avoid loops
                setStatus('idle');
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };

    const handleSend = async (text: string) => {
        setStatus('processing');
        try {
            const data = await onSendMessage(text);
            if (data && data.message) {
                speak(data.message);
            } else {
                setStatus('idle');
            }
        } catch (e) {
            console.error(e);
            setStatus('idle');
        }
    };

    const speak = (text: string) => {
        setStatus('speaking');
        setAiText(text);
        
        // Strip markdown asterisks for cleaner speech
        const cleanText = text.replace(/\*/g, '');
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.onend = () => {
            if (open) {
                startListening(); // Auto-listen after speaking
            }
        };
        synthRef.current.speak(utterance);
    };

    const toggleMic = () => {
        if (status === 'listening') {
            stopListening();
            setStatus('idle');
        } else {
            startListening();
        }
    };

    return (
        <Dialog 
            fullScreen 
            open={open} 
            onClose={onClose}
            PaperProps={{
                sx: {
                    bgcolor: '#000',
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }
            }}
        >
            <IconButton 
                onClick={onClose} 
                sx={{ position: 'absolute', top: 20, right: 20, color: '#fff' }}
            >
                <CloseIcon />
            </IconButton>

            <Typography variant="h6" sx={{ position: 'absolute', top: 20, left: 20, opacity: 0.7 }}>
                {scenario}
            </Typography>

            <Box 
                sx={{ 
                    width: 200, 
                    height: 200, 
                    borderRadius: '50%', 
                    bgcolor: status === 'listening' ? '#fff' : (status === 'processing' ? '#FF9500' : '#FF3B30'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: status === 'speaking' ? `${pulse} 2s infinite` : 'none',
                    transition: 'background-color 0.5s',
                    mb: 8,
                    cursor: 'pointer'
                }}
                onClick={toggleMic}
            >
                {status === 'listening' ? <MicIcon sx={{ fontSize: 80, color: '#000' }} /> : 
                 status === 'idle' ? <MicOffIcon sx={{ fontSize: 80, color: '#fff' }} /> :
                 null}
            </Box>

            <Typography variant="h5" align="center" sx={{ maxWidth: '80%', mb: 2, fontWeight: 600 }}>
                {status === 'listening' ? (transcript || "Listening...") : 
                 status === 'processing' ? "Thinking..." : 
                 status === 'speaking' ? "Speaking..." : 
                 "Tap to Speak"}
            </Typography>

            {status === 'speaking' && (
                <Typography variant="body1" align="center" sx={{ maxWidth: '70%', opacity: 0.8 }}>
                    {aiText}
                </Typography>
            )}

        </Dialog>
    );
};

export default VoiceMode;
