# Meteo Cyclone Animation

A TypeScript-based weather image archiver that fetches cyclone trajectory images from Meteo France every hour and displays them as an animated timeline.

## Features

- Fetches weather images hourly from Meteo France using TypeScript
- Organizes images in daily directories (YYYY-MM-DD)
- Generates JSON index of all images with metadata
- Beautiful web interface for viewing animations
- No compilation step required - runs directly with tsx
- **Cloud-native**: Deploy to Google Cloud Platform with GitHub Actions
- Configurable animation settings:
  - Number of days to display (default: 3)
  - Animation speed (100ms - 2000ms)
  - Infinite loop mode
  - Play/Pause controls
  - Restart from beginning

## Deployment Options

### ☁️ Google Cloud Platform (Recommended)

Deploy automatically to GCP with GitHub Actions. Images stored in Cloud Storage, fetch job runs hourly via Cloud Scheduler.

**See [GCP_SETUP.md](./GCP_SETUP.md) for complete deployment instructions.**

Quick setup:
1. Configure GCP project and GitHub secrets
2. Push to `main` branch
3. GitHub Actions handles everything automatically

### 🖥️ Local/Server Installation

Run on your own Linux server with cron.

## Requirements

### For GCP Deployment
- GCP account with billing enabled
- GitHub repository
- See [GCP_SETUP.md](./GCP_SETUP.md)

### For Local Installation
- Node.js (v18 or higher)
- tsx (TypeScript Execute)
- cron
- A web server (or Python's http.server for local testing)

## Local Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd meteo-cyclone-animation
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

   Or install tsx globally:
   ```bash
   npm install -g tsx
   ```

3. Make scripts executable:
   ```bash
   chmod +x fetch_image.ts setup_cron.sh
   ```

4. Set up automatic hourly fetching:
   ```bash
   ./setup_cron.sh
   ```

   This will:
   - Check that Node.js and tsx are installed
   - Add a cron job to run every hour using tsx
   - Fetch the first image immediately
   - Create the images directory structure

## Manual Usage

### Fetch an image manually
```bash
tsx fetch_image.ts
```

Or using npm script:
```bash
npm run fetch
```

This will:
- Download the current cyclone trajectory image
- Save it to `images/YYYY-MM-DD/HH-MM-SS.png`
- Regenerate the `images.json` index

### View the animation

Start a local web server:
```bash
python3 -m http.server 8000
```

Then open your browser to: `http://localhost:8000`

## Directory Structure

```
meteo-cyclone-animation/
├── fetch_image.ts          # Main TypeScript fetching script
├── setup_cron.sh           # Cron setup script
├── index.html              # Web viewer
├── package.json            # Node.js dependencies
├── tsconfig.json           # TypeScript configuration
├── images.json             # Generated index (created by script)
├── fetch.log               # Cron execution log
├── node_modules/           # Dependencies (after npm install)
└── images/                 # Image storage (created by script)
    ├── 2026-01-14/
    │   ├── 10-00-00.png
    │   ├── 11-00-00.png
    │   └── ...
    └── 2026-01-15/
        └── ...
```

## Configuration

### Change fetch frequency

Edit your crontab:
```bash
crontab -e
```

Current setting (every hour at minute 0):
```
0 * * * * cd /path/to/meteo-cyclone-animation && tsx fetch_image.ts >> /path/to/fetch.log 2>&1
```

For every 30 minutes:
```
*/30 * * * * cd /path/to/meteo-cyclone-animation && tsx fetch_image.ts >> /path/to/fetch.log 2>&1
```

### Web viewer settings

In the web interface:
- **Days to display**: Choose how many days of images to show (1-30)
- **Animation speed**: Adjust using the slider (100-2000ms per frame)
- **Loop mode**: Toggle infinite loop on/off
- **Play/Pause**: Control animation playback
- **Restart**: Start animation from the beginning

## Image Source

Images are fetched from:
```
http://www.meteo.fr/temps/domtom/La_Reunion/webcmrs9.0/francais/tpsreel/trajectoire.png
```

This shows the real-time cyclone trajectories for La Réunion.

## Troubleshooting

### Cron job not running
```bash
# Check if cron service is running
sudo systemctl status cron

# View cron logs
grep CRON /var/log/syslog

# Check fetch.log for errors
tail -f fetch.log
```

### No images appearing
```bash
# Verify images directory exists
ls -la images/

# Check if images.json was created
cat images.json

# Test manual fetch
tsx fetch_image.ts

# Check if tsx is installed
tsx --version

# Check if Node.js is installed
node --version
```

### Web interface shows "No images found"
- Check that images.json exists and contains data
- Verify the web server can access the images directory
- Try adjusting the "Days to display" setting

## License

MIT