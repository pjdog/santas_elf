import React from 'react';
import { Box, Paper, Typography, Button, List, ListItem, ListItemText, Stack } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PaymentIcon from '@mui/icons-material/Payment';

interface CommerceData {
    summary?: string;
    amazonSearch?: string;
    paypalQuickInvoice?: string;
    checklist?: string[];
}

const CommerceWidget: React.FC<{ data: CommerceData }> = ({ data }) => {
    if (!data) return null;

    return (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <ShoppingCartIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={700}>Checkout Helpers</Typography>
            </Stack>
            {data.summary && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {data.summary}
                </Typography>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                {data.amazonSearch && (
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<ShoppingCartIcon />}
                        href={data.amazonSearch}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Amazon search
                    </Button>
                )}
                {data.paypalQuickInvoice && (
                    <Button
                        variant="outlined"
                        startIcon={<PaymentIcon />}
                        href="https://www.paypal.com/invoice/create"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        PayPal invoice
                    </Button>
                )}
            </Stack>

            {data.checklist && data.checklist.length > 0 && (
                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Before you buy:</Typography>
                    <List dense>
                        {data.checklist.map((item, idx) => (
                            <ListItem key={idx} sx={{ py: 0 }}>
                                <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={`• ${item}`} />
                            </ListItem>
                        ))}
                    </List>
                </Box>
            )}
        </Paper>
    );
};

export default CommerceWidget;
