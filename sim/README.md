# PropLaunchpad Sequencer Parameter TUI Simulator

A beautiful terminal user interface (TUI) for managing and simulating PropLaunchpad sequencer parameters with **real-time price data from Pyth Network**.

## Features

- 🎛️ **Interactive Parameter Controls**

  - Update frequency (block time) configuration
  - Two-sided spread range slider (1-25 bps)
  - Correlation factor adjustment (0.0 - 1.0)

- 📊 **Real-time Price Visualization**

  - Live price chart with spread bands using **Pyth Network** data
  - Real-time Server-Sent Events (SSE) streaming
  - Automatic reconnection with exponential backoff
  - Fallback to mock data mode for testing

- 🌐 **Pyth Network Integration**

  - Live cryptocurrency price feeds (BTC, ETH, and more)
  - Sub-second price updates via SSE
  - Configurable feed IDs via environment variables
  - Production-ready Hermes client

- 🎨 **Beautiful UI**

  - Dark purple/navy theme inspired by modern terminal apps
  - High-contrast color scheme for readability
  - Unicode box-drawing for elegant borders
  - ASCII art header with Nyan Cat 🌈

- ⌨️ **Keyboard Driven**
  - Full keyboard navigation
  - Intuitive shortcuts
  - No mouse required

## Prerequisites

- **Node.js**: >= 20.0.0
- **pnpm**: >= 8.0.0 (required - this project uses pnpm exclusively)

Install pnpm if you haven't already:

```bash
npm install -g pnpm
```

## Installation

```bash
cd sim
pnpm install
```

## Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

### Environment Variables

```bash
# Pyth Network Configuration
PYTH_HERMES_URL=https://hermes.pyth.network
PYTH_FEED_ID=0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43

# Data Mode
ENABLE_MOCK_DATA=false  # Set to 'true' to use mock price simulator
```

### Available Price Feed IDs

Get price feed IDs from: https://pyth.network/developers/price-feed-ids

Common feeds:

- **BTC/USD**: `0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43`
- **ETH/USD**: `0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace`
- **SOL/USD**: `0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d`

## Usage

### Development Mode (with hot reload)

```bash
pnpm dev
```

### Build and Run

```bash
pnpm build
pnpm start
```

## Keyboard Shortcuts

| Key            | Action                                      |
| -------------- | ------------------------------------------- |
| `Q` / `Ctrl+C` | Quit application                            |
| `P`            | Pause/resume price updates                  |
| `R`            | Reset parameters to defaults                |
| `A`            | Apply parameters (when sequencer connected) |
| `H` / `?`      | Show help overlay                           |
| `Tab`          | Navigate between controls                   |
| `Arrow Keys`   | Adjust parameter values                     |

## Parameters

### Update Frequency

- **Range**: 1000ms - 60000ms (1s - 60s)
- **Default**: 2000ms (2 seconds)
- **Description**: Controls how frequently the sequencer checks and updates parameters, roughly aligned with blockchain block time

### Spread Range

- **Range**: 0 - 10000 basis points (0% - 100%)
- **Default**: 50 - 500 bps (0.5% - 5%)
- **Description**: Defines the minimum and maximum spread boundaries around the mid-price
- Uses a two-sided slider for intuitive control

### Correlation Factor

- **Range**: 0.0 - 1.0
- **Default**: 0.7
- **Description**: Correlation coefficient used in spread calculation algorithm; affects how spread responds to market conditions

## Project Structure

```
sim/
├── src/
│   ├── index.ts              # Application entry point
│   ├── app.ts                # Main TUI orchestrator
│   ├── constants.ts          # Application constants
│   ├── types/                # TypeScript type definitions
│   ├── config/               # Configuration and validation
│   ├── components/           # TUI components and widgets
│   ├── services/             # Business logic services
│   └── utils/                # Utility functions
├── package.json
├── tsconfig.json
└── README.md
```

## Development Status

### ✅ Phase 1: Core Setup (Complete)

- [x] Project structure and dependencies
- [x] Basic blessed application scaffold
- [x] Type definitions and validation
- [x] Mock price simulator
- [x] Parameter state management

### 🚧 Phase 2: Enhanced UI (In Progress)

- [ ] Advanced parameter input widgets
- [ ] Custom two-sided spread slider
- [ ] Correlation factor gauge
- [ ] Chart integration with blessed-contrib

### 📋 Phase 3: Visualization

- [ ] Real-time price chart with line graph
- [ ] Filled spread band visualization
- [ ] Current spread detail panel
- [ ] Historical data tracking

### 🔮 Phase 4: Future Enhancements

- [ ] Sequencer HTTP/WebSocket integration
- [ ] Real-time data from sequencer
- [ ] Parameter push to production
- [ ] Connection management

## Architecture

See [AGENTS.md](./AGENTS.md) for comprehensive architecture documentation, design decisions, and implementation details.

## Configuration

Environment variables (optional):

```bash
# Sequencer connection (future)
SEQUENCER_HOST=localhost
SEQUENCER_PORT=3000
SEQUENCER_API_KEY=your_api_key_here

# UI settings
UPDATE_DEBOUNCE_MS=500
ENABLE_MOCK_DATA=true
```

## Technical Details

- **Framework**: [blessed](https://github.com/chjj/blessed) - Terminal UI framework
- **Language**: TypeScript (ES2022+)
- **Runtime**: Node.js >= 20.0.0
- **Validation**: Zod schemas for parameter validation
- **Mock Data**: Brownian motion price simulator

## Color Scheme

Inspired by modern terminal applications with a dark purple/navy theme:

- Background: Deep purple/navy
- Accents: Vibrant purple and cyan
- Charts: Purple gradient with transparency
- Text: High-contrast white/light gray

## License

Apache-2.0

## Related Projects

- [PropLaunchpad Contracts](../contracts) - Smart contracts for the launchpad
- [PropLaunchpad Sequencer](../sequencer) - The actual sequencer service
- [PropLaunchpad UI](../UI) - Web interface for users

---

**Status**: 🚧 In Development  
**Version**: 0.1.0
