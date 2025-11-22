# Quick Start Guide

## Prerequisites

- **Node.js**: >= 20.0.0
- **pnpm**: >= 8.0.0

> **Note**: This project uses **pnpm** exclusively. Install it globally if you haven't:
>
> ```bash
> npm install -g pnpm
> ```

## Setup Instructions

### 1. Install Dependencies

```bash
cd sim
pnpm install
```

This will install:

- `blessed` - Terminal UI framework
- `blessed-contrib` - Advanced widgets and charts
- `neo-blessed` - Modern blessed fork
- TypeScript and development tools
- Zod for validation

### 2. Run the Application

**Development mode (recommended):**

```bash
pnpm dev
```

**Production mode:**

```bash
pnpm build
pnpm start
```

### 3. Basic Usage

Once the TUI launches:

1. You'll see a split-screen interface
   - Left: Parameter controls
   - Right: Price visualization
2. Use keyboard shortcuts to interact (see below)
3. The price will update automatically based on the update frequency

## First-Time Setup Checklist

- [ ] Install dependencies with `pnpm install`
- [ ] Copy `.env.example` to `.env` (optional, has sensible defaults)
- [ ] Run `pnpm dev` to start the application
- [ ] Press `h` or `?` to see the help menu
- [ ] Try pressing `p` to pause/resume updates
- [ ] Press `r` to reset parameters to defaults

## Key Features to Explore

1. **Live Price Updates**: Watch the price change in real-time
2. **Parameter Display**: See current spread range, update frequency, and correlation
3. **Status Bar**: Check connection status and last update time
4. **Help Menu**: Press `h` for full keyboard shortcuts

## Common Issues

### "Cannot find module 'blessed'"

Run `pnpm install` to install dependencies.

### "Permission denied"

Make sure you have write permissions in the directory.

### Terminal size issues

The app works best with a terminal size of at least 80x24. Resize your terminal if needed.

## Next Steps

After getting familiar with the basic interface:

1. **Read AGENTS.md** for the full architecture and design
2. **Explore the code** in `src/` directory
3. **Customize parameters** by editing default values in `src/config/defaults.ts`
4. **Implement advanced widgets** (see AGENTS.md Phase 2)
5. **Add blessed-contrib charts** for enhanced visualization

## Development Workflow

```bash
# Install dependencies
pnpm install

# Run in development mode (auto-reload)
pnpm dev

# Build for production
pnpm build

# Run production build
pnpm start

# Clean build artifacts
pnpm clean
```

## Project Structure Quick Reference

```
sim/
├── AGENTS.md           # Comprehensive architecture doc
├── README.md           # User documentation
├── QUICKSTART.md       # This file
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript config
├── .env.example        # Environment variable template
└── src/
    ├── index.ts        # Entry point
    ├── app.ts          # Main application
    ├── constants.ts    # App constants
    ├── types/          # Type definitions
    ├── config/         # Configuration
    ├── components/     # UI components (to be implemented)
    ├── services/       # Business logic
    └── utils/          # Helpers
```

## What's Implemented

✅ Basic TUI scaffold with blessed  
✅ Parameter type definitions and validation  
✅ Mock price simulator (Brownian motion)  
✅ Parameter state management  
✅ Simple layout with panels  
✅ Keyboard shortcuts (quit, pause, reset, help)  
✅ Status bar with connection info

## What's Coming Next

🚧 Custom two-sided slider widget  
🚧 Price chart with blessed-contrib  
🚧 Spread band visualization  
🚧 Advanced parameter input widgets  
🚧 Correlation factor gauge  
🚧 Enhanced keyboard navigation  
🔮 Sequencer HTTP/WebSocket integration

---

**Questions?** Check AGENTS.md for detailed documentation or explore the source code!
