import React, { useState, useRef } from 'react';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';

interface ChatInputProps {
  onSendMessage: (text: string, file?: File) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (text.trim() || selectedFile) {
      onSendMessage(text, selectedFile || undefined);
      setText('');
      setSelectedFile(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setSelectedFile(e.target.files[0]);
      }
  };

  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Web Speech API is not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setText((prev) => (prev ? prev + ' ' + transcript : transcript));
    };

    recognition.start();
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 700, margin: '0 auto' }}>
        {selectedFile && (
            <Box sx={{ mb: 1, display: 'flex', justifyContent: 'flex-start' }}>
                <Chip 
                    label={selectedFile.name} 
                    onDelete={() => setSelectedFile(null)} 
                    color="primary" 
                    variant="outlined" 
                    sx={{ bgcolor: '#fff' }}
                />
            </Box>
        )}
        <Paper
        elevation={0}
        component="form"
        sx={{
            p: '8px',
            display: 'flex',
            alignItems: 'center',
            borderRadius: 28,
            backgroundColor: '#fff',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.05)',
            transition: 'box-shadow 0.2s',
            '&:focus-within': {
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            }
        }}
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        >
        <input 
            type="file" 
            hidden 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*"
        />
        
        <IconButton 
            sx={{ p: '10px', color: '#86868B' }} 
            aria-label="attach file" 
            onClick={() => fileInputRef.current?.click()}
        >
            <AttachFileIcon />
        </IconButton>

        <IconButton 
            sx={{ p: '10px', color: isListening ? '#FF3B30' : '#86868B' }} 
            aria-label="voice" 
            onClick={toggleListening}
        >
            {isListening ? <MicOffIcon /> : <MicIcon />}
        </IconButton>
        
        <InputBase
            sx={{ ml: 1, flex: 1, fontSize: '1rem', fontWeight: 500 }}
            placeholder="Ask Santa's Elf..."
            inputProps={{ 'aria-label': 'ask santas elf' }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={handleKeyPress}
        />
        
        <IconButton 
            type="button" 
            sx={{ 
                p: '8px', 
                backgroundColor: (text.trim() || selectedFile) ? '#FF3B30' : '#E5E5EA', 
                color: '#fff',
                '&:hover': {
                    backgroundColor: (text.trim() || selectedFile) ? '#FF2D55' : '#D1D1D6',
                },
                transition: 'background-color 0.2s',
                width: 40,
                height: 40,
            }} 
            aria-label="send" 
            onClick={handleSend} 
            disabled={!text.trim() && !selectedFile}
        >
            <ArrowUpwardIcon fontSize="small" />
        </IconButton>
        </Paper>
    </Box>
  );
};

export default ChatInput;
