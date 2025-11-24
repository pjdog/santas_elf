import React, { useState } from 'react';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);

  const handleSend = () => {
    if (text.trim()) {
      onSendMessage(text);
      setText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Web Speech API is not supported in this browser.');
      return;
    }

    if (isListening) {
        // Ideally verify instance handling
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
    <Paper
      elevation={0}
      component="form"
      sx={{
        p: '8px',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        maxWidth: 700,
        margin: '0 auto',
        borderRadius: 28, // Full pill shape
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
            backgroundColor: text.trim() ? '#FF3B30' : '#E5E5EA', 
            color: '#fff',
            '&:hover': {
                backgroundColor: text.trim() ? '#FF2D55' : '#D1D1D6',
            },
            transition: 'background-color 0.2s',
            width: 40,
            height: 40,
        }} 
        aria-label="send" 
        onClick={handleSend} 
        disabled={!text.trim()}
      >
        <ArrowUpwardIcon fontSize="small" />
      </IconButton>
    </Paper>
  );
};

export default ChatInput;