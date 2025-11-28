import React from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

interface FormattedTextProps {
    text: string;
}

const FormattedText: React.FC<FormattedTextProps> = ({ text }) => {
    // Ensure text is a string before processing
    // Handles objects (React Error #31) by stringifying them
    const safeText = typeof text === 'string' ? text : (text ? JSON.stringify(text) : '');

    if (!safeText) return null;

    // 1. Split by newlines first to handle paragraphs/breaks
    const lines = safeText.split('\n');

    return (
        <Box>
            {lines.map((line, lineIdx) => {
                // If line is empty, render a break (unless it's the last line)
                if (!line.trim()) {
                    return <Box key={lineIdx} sx={{ height: '0.5em' }} />;
                }

                // 2. Parse bold syntax (**text**)
                const parts = line.split(/(\*\*.*?\*\*)/g);

                return (
                    <Typography key={lineIdx} variant="body1" sx={{ lineHeight: 1.6, mb: 0.5 }}>
                        {parts.map((part, partIdx) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return (
                                    <strong key={partIdx}>
                                        {part.slice(2, -2)}
                                    </strong>
                                );
                            }
                            return <span key={partIdx}>{part}</span>;
                        })}
                    </Typography>
                );
            })}
        </Box>
    );
};

export default FormattedText;
