import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Fab from '@mui/material/Fab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';

interface VoiceInputProps {
    onVoiceCommand: (command: string) => void;
    onAiResponse: (response: string) => void;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onVoiceCommand, onAiResponse }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const navigate = useNavigate();

  const sendCommandToBackend = async (command: string) => {
    try {
      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      onAiResponse(data.message);
      if (data.redirect) {
        const queryParams = new URLSearchParams(data.params).toString();
        navigate(`${data.redirect}?${queryParams}`);
      }
    } catch (error) {
      console.error('Error sending command to backend:', error);
      onAiResponse('Error processing command.');
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Your browser does not support Web Speech API. Please try Chrome, Firefox, or Edge.');
      return;
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = false;
    recognitionInstance.lang = 'en-US';

    recognitionInstance.onstart = () => {
      setIsListening(true);
      setTranscript('');
      console.log('Voice recognition started...');
    };

    recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
      const currentTranscript = event.results[0][0].transcript;
      setTranscript(currentTranscript);
      onVoiceCommand(currentTranscript); 
      sendCommandToBackend(currentTranscript);
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
      console.log('Voice recognition ended.');
    };

    recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
      onAiResponse('Could not understand voice command.');
    };

    recognitionInstance.start();
    setRecognition(recognitionInstance);
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  return (
    <Box sx={{ textAlign: 'center', mt: 2 }}>
      <Fab 
        color={isListening ? "secondary" : "primary"} 
        aria-label="voice-command" 
        onClick={isListening ? stopListening : startListening}
        sx={{ width: 70, height: 70 }}
      >
        {isListening ? <MicOffIcon fontSize="large" /> : <MicIcon fontSize="large" />}
      </Fab>
      {transcript && (
        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', color: 'text.secondary' }}>
            You said: "{transcript}"
        </Typography>
      )}
    </Box>
  );
};

export default VoiceInput;
