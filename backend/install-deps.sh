#!/bin/bash

# Install required dependencies
npm install express dotenv mongoose morgan helmet express-mongo-sanitize xss-clean express-rate-limit hpp cors bcryptjs jsonwebtoken colors

# Install middleware packages
npm install express-validator multer node-cron axios

# Install dev dependencies
npm install -D nodemon jest
