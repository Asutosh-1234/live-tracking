import http from 'node:http';
import path from 'node:path';

import express from 'express';
import session from 'express-session';

import 'dotenv/config';

import { initDb } from './src/db.js';
import passport from './src/auth.js';
import { initSocket } from './src/socket.js';
import { initConsumers } from './src/consumers.js';

async function main() {
  await initDb();

  const PORT = process.env.PORT ?? 8000;

  const app = express();
  const server = http.createServer(app);

  const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  });
  app.use(sessionMiddleware);

  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (_req, res) => res.redirect('/'),
  );
  app.get('/auth/logout', (req, res, next) => {
    req.logout((err) => { if (err) return next(err); res.redirect('/'); });
  });
  app.get('/auth/me', (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
    res.json(req.user);
  });

  const io = await initSocket(server, sessionMiddleware);
  await initConsumers(io, PORT);

  app.use(express.static(path.resolve('./public')));

  app.get('/health', (req, res) => {
    return res.json({ healthy: true });
  });

  server.listen(PORT, () =>
    console.log(`Server running on http://localhost:${PORT}`),
  );
}

main();