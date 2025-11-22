# PropLaunchpad Sequencer Parameter TUI Simulator

## Overview

This TUI (Terminal User Interface) application provides a sophisticated, visually appealing interface for managing and simulating PropLaunchpad sequencer parameters in real-time. It serves as a control panel and visualization tool for tinkering with sequencer configurations before pushing updates to the actual running service.

## Core Concept

The simulator acts as a **parameter sandbox** where operators can:

- Adjust critical sequencer parameters through an intuitive interface
- Visualize the impact of parameter changes on price dynamics and spreads
- Test different configurations before applying them to production
- Monitor real-time price behavior with spread visualization

## Architecture

### Technology Stack

**TUI Framework**: `blessed` / `neo-blessed` + `blessed-contrib`

- **Rationale**: Terminal-based UI framework offering rich widgets, charts, and custom components
- **blessed**: Core terminal manipulation library
- **blessed-contrib**: Provides advanced widgets like line charts, gauges, and grids
- Supports complex layouts, real-time updates, and event handling
- Excellent for building dashboard-style applications

**Language**: TypeScript (ES2022+)

- Type-safe parameter management
- Zod schemas for runtime validation
- Modern async/await patterns

**Communication**: Future IPC/HTTP to sequencer

- Currently stubbed for standalone operation
- Will use HTTP/WebSocket to push parameter updates to sequencer
- RESTful endpoints or event streams for real-time data

### Project Structure

```
sim/
├── package.json                 # Project dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── .npmrc                       # pnpm configuration
├── AGENTS.md                    # This file - architecture documentation
├── README.md                    # User-facing documentation
├── .env.example                 # Environment variable template
├── src/
│   ├── index.ts                 # Application entry point
│   ├── app.ts                   # Main TUI application orchestrator
│   ├── types/
│   │   ├── parameters.ts        # Parameter type definitions
│   │   └── state.ts             # Application state types
│   ├── config/
│   │   ├── defaults.ts          # Default parameter values
│   │   └── validation.ts        # Zod schemas for validation
│   ├── components/
│   │   ├── layout.ts            # Main layout manager
│   │   ├── parameterPanel.ts    # Parameter control widgets
│   │   ├── priceChart.ts        # Price visualization chart
│   │   ├── spreadVisualizer.ts  # Spread band visualizer
│   │   ├── statusBar.ts         # Status and info bar
│   │   └── widgets/
│   │       ├── twoSidedSlider.ts    # Custom two-sided range slider
│   │       ├── numericInput.ts      # Numeric parameter input
│   │       └── correlationGauge.ts  # Correlation factor gauge
│   ├── services/
│   │   ├── parameterManager.ts  # Parameter state management
│   │   ├── priceSimulator.ts    # Mock price generation for visualization
│   │   └── sequencerClient.ts   # Future: HTTP client to sequencer
│   ├── utils/
│   │   ├── colors.ts            # Color scheme and theme
│   │   ├── formatting.ts        # Number/string formatting utilities
│   │   └── calculations.ts      # Spread and price calculations
│   └── constants.ts             # Application constants
└── dist/                        # Compiled JavaScript output
```

## Parameters & Controls

### 1. Update Frequency (Block Time)

**Type**: Numeric input (milliseconds)
**Range**: 1000ms - 60000ms (1s - 60s)
**Default**: 2000ms (2 seconds)
**UI Component**: Numeric input field with +/- buttons
**Description**: Controls how frequently the sequencer checks and updates parameters, roughly aligned with blockchain block time

**Visual Representation**:

```
┌─ Update Frequency ─────────────┐
│ Block Time (ms): [  2000  ]    │
│ ◄─────────────●──────────►     │
│ 1s          2s         60s      │
└─────────────────────────────────┘
```

### 2. Spread Range (Two-Sided Slider)

**Type**: Two-sided range slider (basis points)
**Range**: 0 bps - 10000 bps (0% - 100%)
**Default**: [50 bps, 500 bps] (0.5% - 5%)
**UI Component**: Custom two-sided slider with draggable handles
**Description**: Defines the minimum and maximum spread boundaries around the mid-price

**Visual Representation**:

```
┌─ Spread Range (bps) ───────────┐
│ Min: 50 bps    Max: 500 bps    │
│ ├──●─────────────────●───────┤ │
│ 0           250          1000  │
│                                │
│ Min Spread: 0.50%              │
│ Max Spread: 5.00%              │
└─────────────────────────────────┘
```

**Behavior**:

- Left handle: Controls minimum spread
- Right handle: Controls maximum spread
- Handles cannot cross each other
- Real-time updates to spread visualization

### 3. Correlation Factor

**Type**: Decimal input/slider (0.0 - 1.0)
**Range**: 0.0 (no correlation) - 1.0 (perfect correlation)
**Default**: 0.7
**UI Component**: Gauge/dial with precise numeric input
**Description**: Correlation coefficient used in spread calculation algorithm; affects how spread responds to market conditions

**Visual Representation**:

```
┌─ Correlation Factor ───────────┐
│         ╭────────╮             │
│        │    ●    │             │
│        │   ╱│╲   │             │
│        │  ╱ │ ╲  │             │
│        │ ╱  │  ╲ │             │
│         ╰────────╯             │
│                                │
│ Factor: [  0.70  ]             │
│ ◄───────────●──────────►       │
│ 0.0       0.5        1.0       │
└─────────────────────────────────┘
```

## Visualization Components

### Price Chart with Spread Bands

**Component**: Line chart (blessed-contrib)
**Update Rate**: Real-time based on update frequency parameter
**Data Points**: Rolling window of last 50-100 data points

**Visual Structure**:

```
┌─ Price Chart ───────────────────────────────────────────────────────┐
│                                                                      │
│  2753.00 ┤                                                          │
│  2752.50 ┤        ╭──────────╮                                      │
│  2752.00 ┤    ╭───╯██████████╰────╮          ░░░░                   │
│  2751.50 ┤╭───╯█████████████████████─────╮░░░░░░░░░                │
│  2751.00 ┼████████████████████████████████████░░░░░░░░              │ ◄─ Upper spread
│  2750.50 ┤███████████████████████████████████████░░░░░░             │ ◄─ Mid price
│  2750.00 ┤░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░             │ ◄─ Lower spread
│  2749.50 ┤    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░            │
│  2749.00 ┤                    ░░░░░░░░░░░░░░░░░░                    │
│  2748.50 ┤                                                          │
│          └┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬──   │
│           19:59:00   19:59:20   19:59:40   19:59:56                │
└──────────────────────────────────────────────────────────────────────┘
```

**Features**:

- **Mid-price line**: Solid white line showing current price
- **Upper spread band**: Purple/filled area above mid-price (mid + max spread)
- **Lower spread band**: Purple/filled area below mid-price (mid - min spread)
- **Dotted reference line**: Horizontal line at initial price for reference
- **Time axis**: Shows timestamps for historical context
- **Price axis**: Dynamic scaling based on price range

**Data Generation (Mock)**:

- Base price with Brownian motion/random walk
- Volatility affected by correlation factor
- Spread bands calculated dynamically: `price * (spread_bps / 10000)`

### Spread Visualizer (Detailed)

**Component**: Stacked bar chart or range indicator
**Purpose**: Show current spread levels and their relationship

```
┌─ Current Spread ───────────────┐
│                                │
│ Upper: 2753.75 (+1.36%)        │
│ ████████████████████░░░        │
│                                │
│ Mid:   2750.50                 │
│ ─────────────●─────────        │
│                                │
│ Lower: 2749.13 (-0.52%)        │
│ ░░░████████████████████        │
│                                │
│ Spread Width: 4.62 (168 bps)   │
└─────────────────────────────────┘
```

## UI Layout & Design

### Color Scheme (Inspired by Provided Images)

**Primary Colors**:

- **Background**: Deep purple/dark navy (`#1a1a2e`, `#16213e`)
- **Accent**: Vibrant purple (`#9d4edd`, `#7b2cbf`)
- **Chart fill**: Purple gradient with transparency
- **Borders**: Light purple/cyan (`#a78bfa`, `#06b6d4`)
- **Text**: White/light gray (`#f0f0f0`)
- **Highlights**: Cyan/electric blue (`#00d4ff`)
- **Success**: Green (`#10b981`)
- **Warning**: Yellow/amber (`#fbbf24`)
- **Error**: Red (`#ef4444`)

**Aesthetic**:

- Clean, modern terminal aesthetics
- Minimalist borders with rounded corners (unicode box-drawing characters)
- Subtle animations for value changes
- High contrast for readability
- Consistent spacing and alignment

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PropLaunchpad Sequencer Parameter Simulator v0.1.0        [●] RUNNING  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─ Parameters ─────────────┐  ┌─ Price & Spread Visualization ──────┐ │
│  │                           │  │                                      │ │
│  │ Update Frequency          │  │  2753 ┤                             │ │
│  │ Block Time: [  2000  ] ms │  │       ┤     ╭──────╮                │ │
│  │ ◄────────●───────►        │  │  2751 ┼─────█──────█────            │ │
│  │                           │  │       ┤  ░░░█░░░░░░█░░░             │ │
│  │ Spread Range              │  │  2749 ┤     ░░░░░░░░                │ │
│  │ Min: 50    Max: 500  bps  │  │       └┬────┬────┬────┬──          │ │
│  │ ├──●──────────●─────┤     │  │        19:59:30  19:59:50          │ │
│  │                           │  │                                      │ │
│  │ Min: 0.50% │ Max: 5.00%   │  └──────────────────────────────────────┘ │
│  │                           │                                           │
│  │ Correlation Factor        │  ┌─ Current Spread ─────────────────────┐ │
│  │      ╭────╮               │  │                                      │ │
│  │     │  ●  │               │  │ Upper: 2753.75  (+1.36%)             │ │
│  │      ╰────╯               │  │ ██████████████████░░░                │ │
│  │                           │  │                                      │ │
│  │ [  0.70  ]                │  │ Mid:   2750.50                       │ │
│  │ ◄─────●────►              │  │ ──────────●──────                    │ │
│  │                           │  │                                      │ │
│  │ ┌──────────────────────┐  │  │ Lower: 2749.13  (-0.52%)             │ │
│  │ │ ✓ Apply Parameters   │  │  │ ░░░██████████████████                │ │
│  │ └──────────────────────┘  │  │                                      │ │
│  │                           │  │ Width: 4.62  (168 bps)               │ │
│  └───────────────────────────┘  └──────────────────────────────────────┘ │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ Status: Connected to sequencer | Last update: 2s ago | Ctrl+C to exit   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Screen Dimensions

- **Target**: 80-120 columns × 30-40 rows (adaptable)
- **Minimum**: 80×24 (standard terminal)
- **Responsive**: Auto-adjust to terminal size

## State Management

### Application State

```typescript
interface AppState {
  parameters: SequencerParameters;
  priceHistory: PriceDataPoint[];
  spreadHistory: SpreadDataPoint[];
  connectionStatus: "connected" | "disconnected" | "error";
  lastUpdate: Date;
  isPaused: boolean;
}

interface SequencerParameters {
  updateFrequency: number; // milliseconds
  spreadRange: {
    min: number; // basis points
    max: number; // basis points
  };
  correlationFactor: number; // 0.0 - 1.0
}

interface PriceDataPoint {
  timestamp: number;
  midPrice: number;
  upperBound: number;
  lowerBound: number;
}

interface SpreadDataPoint {
  timestamp: number;
  spreadBps: number;
  spreadPercent: number;
}
```

### State Updates

- **Parameter changes**: Immediate UI update, debounced push to sequencer (if connected)
- **Price updates**: Based on `updateFrequency` parameter
- **Chart updates**: Real-time rendering with data point buffering
- **Validation**: All parameter changes validated before applying

## Key Features & Interactions

### Keyboard Controls

```
Navigation:
  Tab / Shift+Tab    - Navigate between controls
  Arrow Keys         - Adjust slider/numeric values
  Enter              - Confirm selection/apply changes
  Space              - Toggle pause/resume

Parameter Shortcuts:
  F / f              - Focus on frequency input
  S / s              - Focus on spread slider
  C / c              - Focus on correlation factor

Actions:
  A / a              - Apply parameters (push to sequencer)
  R / r              - Reset to defaults
  P / p              - Pause/resume updates
  H / h / ?          - Show help overlay

Application:
  Ctrl+C / Q / q     - Quit application
```

### Mouse Support (Optional)

- Click to focus controls
- Drag slider handles
- Scroll in chart area for zoom (future enhancement)

### Real-time Updates

1. **Parameter Update Cycle**:

   - User adjusts parameter → State updates → UI re-renders
   - Validation check → If valid, update spread calculations
   - Debounced push to sequencer (configurable delay, e.g., 500ms)

2. **Price Generation Cycle**:

   - Timer ticks based on `updateFrequency`
   - Generate new price point using mock simulator
   - Calculate spread bands using current parameters
   - Update chart with new data point
   - Trim history to maintain rolling window

3. **Visual Feedback**:
   - Parameter values flash/highlight on change
   - Status bar shows last update time
   - Connection indicator updates on sequencer communication
   - Errors displayed in status bar with color coding

## Future Sequencer Integration

### Communication Protocol

**Phase 1** (Current): Standalone simulator with mock data
**Phase 2**: HTTP REST API integration
**Phase 3**: WebSocket for bi-directional real-time updates

### API Endpoints (Planned)

```typescript
// Push parameter updates
POST /api/v1/parameters
{
  "updateFrequency": 2000,
  "spreadRange": { "min": 50, "max": 500 },
  "correlationFactor": 0.7
}

// Get current parameters
GET /api/v1/parameters

// Get real-time price feed (WebSocket)
WS /api/v1/price-stream

// Health check
GET /api/v1/health
```

### Configuration

Environment variables for sequencer connection:

```env
SEQUENCER_HOST=localhost
SEQUENCER_PORT=3000
SEQUENCER_API_KEY=<secret>
UPDATE_DEBOUNCE_MS=500
ENABLE_MOCK_DATA=true
```

## Development Workflow

### Setup

```bash
cd sim
pnpm install
```

### Development

```bash
pnpm dev          # Run with hot reload (tsx)
pnpm build        # Compile TypeScript
pnpm start        # Run compiled version
```

### Testing Strategy (Future)

- Unit tests for calculation utilities
- Component tests for widgets
- Integration tests for state management
- Manual testing for UI/UX

## Implementation Phases

### Phase 1: Core TUI Setup ✅

- [x] Project structure and dependencies
- [x] Basic blessed application scaffold
- [ ] Main layout with panels
- [ ] Basic parameter input widgets

### Phase 2: Parameter Controls

- [ ] Update frequency numeric input
- [ ] Two-sided spread range slider (custom widget)
- [ ] Correlation factor gauge/slider
- [ ] Validation and state management
- [ ] Apply/reset buttons

### Phase 3: Visualization

- [ ] Price chart with line graph
- [ ] Spread band visualization (filled areas)
- [ ] Real-time data updates
- [ ] Mock price generator with spread calculation
- [ ] Current spread detail panel

### Phase 4: Polish & UX

- [ ] Color scheme and theming
- [ ] Keyboard navigation and shortcuts
- [ ] Status bar with connection info
- [ ] Help overlay
- [ ] Error handling and user feedback
- [ ] Responsive layout

### Phase 5: Sequencer Integration (Future)

- [ ] HTTP client for parameter updates
- [ ] WebSocket for real-time price data
- [ ] Connection management and retry logic
- [ ] Configuration and environment setup

## Design Inspiration Notes

Based on provided screenshots:

1. **Chart aesthetic**: Filled area charts with gradient, similar to DeFi price charts
2. **Terminal styling**: Dark theme with purple/blue accents, reminiscent of lazydocker/k9s
3. **Widget layout**: Panel-based dashboard with clear sections, inspired by btop/htop
4. **Color usage**: High-contrast purple on dark background, cyan highlights

## Technical Considerations

### Performance

- Efficient blessed rendering (minimize full screen redraws)
- Data point buffering and windowing
- Debounced updates to prevent UI thrashing
- Optimized chart rendering (only update changed regions)

### Accessibility

- High contrast color scheme
- Clear visual indicators
- Keyboard-only operation support
- Screen reader friendly (where applicable)

### Error Handling

- Graceful degradation if sequencer unavailable
- Input validation with helpful error messages
- Connection retry logic with exponential backoff
- User-friendly error display in status bar

### Cross-platform Compatibility

- ANSI color support detection
- Terminal size detection and adaptation
- UTF-8 character support for box drawing
- Fallback to ASCII if Unicode unavailable

## Code Conventions

- **TypeScript**: Strict mode enabled
- **Naming**: camelCase for variables/functions, PascalCase for types/classes
- **Exports**: Named exports preferred
- **Error handling**: Explicit error types, never throw generic errors
- **Comments**: JSDoc for public APIs, inline for complex logic
- **Formatting**: Consistent with project (2-space indent)

## Resources & References

### Libraries

- [blessed](https://github.com/chjj/blessed) - Terminal UI framework
- [blessed-contrib](https://github.com/yaronn/blessed-contrib) - Widgets and charts
- [neo-blessed](https://github.com/embark-framework/neo-blessed) - Modern blessed fork

### Inspiration

- lazydocker: Clean panel-based layout
- k9s: Keyboard navigation patterns
- btop: Colorful charts and gauges
- Uniswap interface: Price chart aesthetics

### Documentation

- Terminal color codes and ANSI escape sequences
- Unicode box-drawing characters (U+2500 - U+257F)
- Blessed API documentation and examples

## Next Steps for Agent

1. **Create basic application scaffold** (`src/index.ts`, `src/app.ts`)
2. **Implement layout manager** with grid-based panel system
3. **Build parameter widgets**:
   - Start with simple numeric input for frequency
   - Create custom two-sided slider component
   - Add correlation gauge
4. **Set up price chart** using blessed-contrib line chart
5. **Integrate mock data generator** for testing
6. **Add keyboard event handling** and navigation
7. **Apply color scheme** and polish UI
8. **Test and refine** based on visual output

## Notes for Future Agents

- **Package Manager**: This project uses **pnpm** exclusively - do not use npm or yarn
- The TUI runs standalone initially - no actual sequencer connection required
- Focus on getting the visual polish right - this is a developer tool that should look impressive
- The two-sided slider is a custom component - may need creative use of blessed primitives
- Keep parameter updates reactive but avoid over-updating the sequencer when integrated
- Consider adding a "dry run" mode that shows what would be sent without actually pushing
- Price simulation should be somewhat realistic (Brownian motion with drift)
- Spread calculation: `upperBound = midPrice * (1 + maxSpread/10000)`, similar for lower
- The correlation factor could affect volatility or spread width in the simulation
- All dependencies should be installed via `pnpm install`, never `npm install`

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-22  
**Author**: GitHub Copilot  
**Status**: Architecture Complete - Ready for Implementation
