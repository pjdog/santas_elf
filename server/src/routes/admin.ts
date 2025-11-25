import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { isAuthenticated } from '../middleware/auth';

const router = Router();
const logDir = path.join(process.cwd(), 'logs');

router.get('/logs', isAuthenticated, (req, res) => {
    // Simple log reader - in production use a real log management system
    const logFile = path.join(logDir, 'combined.log');
    
    if (fs.existsSync(logFile)) {
        const stream = fs.createReadStream(logFile, { encoding: 'utf8' });
        res.setHeader('Content-Type', 'text/plain');
        stream.pipe(res);
    } else {
        res.send('No logs found yet.');
    }
});

export default router;
