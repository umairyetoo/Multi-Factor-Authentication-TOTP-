const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');

const apiRouter = require('./routes/api');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

// Disable x-powered-by header for security
app.disable('x-powered-by');

// Express middlewares
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Configure express-session for auth states
app.use(session({
  name: 'mfa.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if running over HTTPS
    httpOnly: true, // Prevent client-side scripting access
    maxAge: 1000 * 60 * 30 // 30 minutes
  }
}));

// Serve static assets from 'public' (maps '/' to 'public/index.html')
app.use(express.static(path.join(__dirname, 'public')));

// Mount API routers
app.use('/api', apiRouter);

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = new Error('Resource Not Found');
  err.statusCode = 404;
  err.status = 'fail';
  next(err);
});

// Centralized production-grade error handler
app.use(errorHandler);

module.exports = app;
