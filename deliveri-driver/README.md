# DeliVeri Driver App

React Native mobile app for delivery drivers using Expo.

## Setup

1. Copy `.env.example` to `.env` and fill in your Supabase credentials:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## Features

- Driver authentication
- View assigned deliveries
- Real-time GPS tracking with background location updates
- Automatic location sharing during active deliveries
- Delivery status management

## Requirements

- Node.js 18+
- Expo CLI
- iOS Simulator or Android Emulator (or physical device with Expo Go)

## Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

## Assets

Before building, add the following assets to the `assets/` folder:
- `icon.png` (1024x1024)
- `splash.png` (1284x2778)
- `adaptive-icon.png` (1024x1024)
