import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import recipeRoutes from './routes/recipes';
import giftRoutes from './routes/gifts';
import voiceRoutes from './routes/voice';
import authRoutes from './routes/auth';
import llmRoutes from './routes/llm';
import decorationsRoutes from './routes/decorations';
import agentRoutes from './routes/agent';
import configRoutes from './routes/config';
import artifactsRoutes from './routes/artifacts';
import adminRoutes from './routes/admin';
import fs from 'fs';
import passport, { initializePassport } from './config/passport';
import { isAuthenticated } from './middleware/auth';
import logger from './utils/logger';

dotenv.config();

// Initialize Passport with current config
initializePassport();

const app = express();
const port = Number(process.env.PORT) || 5000;
const sessionSecret = process.env.SESSION_SECRET || 'santas-elf-session-secret';

// Trust proxy (critical for ngrok/cloud hosting)
app.set('trust proxy', 1);

app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production' || process.env.Using_Ngrok === 'true', // Set secure if HTTPS
        sameSite: 'lax'
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Logging Middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// API Routes
app.use('/auth', authRoutes);
app.use('/api/config', configRoutes);
app.use('/api/agent', isAuthenticated, agentRoutes);
app.use('/api/recipes', isAuthenticated, recipeRoutes);
app.use('/api/gifts', isAuthenticated, giftRoutes);
app.use('/api/voice', isAuthenticated, voiceRoutes);
app.use('/api/llm', isAuthenticated, llmRoutes);
app.use('/api/decorations', isAuthenticated, decorationsRoutes);
app.use('/api/artifacts', isAuthenticated, artifactsRoutes);
app.use('/api/admin', adminRoutes);
// Static API docs generated via `npm run docs` (JSDoc output lives in dist/../docs at runtime)
const docsDir = path.join(__dirname, '../docs');
if (fs.existsSync(docsDir)) {
    app.use('/docs', express.static(docsDir));
}

app.get('/', (_req, res) => {
    res.send("Santa's Elf Backend is running! Access via Nginx on port 8080. Docs: /docs");
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled Error:', err);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`
    🎄 Ho ho ho! The Workshop is Open! 🎄
    
    My you're a smart elf! The servers are humming along nicely.
    
    📜 Application Logs (Console Access Only):
       http://localhost:8080/elf-admin/logs
       
    📚 Comprehensive Auto-Documentation (generate with \`npm run docs\`):
       http://localhost:8080/docs
       
    Server is listening on port ${port}.
    `);
  });
}

export default app;
