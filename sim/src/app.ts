/**
 * Main TUI application orchestrator
 */

import blessed from "blessed";
import type { Widgets } from "blessed";
import { ParameterManager } from "./services/parameterManager.js";
import { PriceSimulator } from "./services/priceSimulator.js";
import { APP_NAME, APP_VERSION, KEY_BINDINGS } from "./constants.js";
import { BLESSED_COLORS } from "./utils/colors.js";
import type { AppState } from "./types/state.js";
import type { PriceDataPoint } from "./types/parameters.js";
import { DEFAULT_PARAMETERS, UI_CONFIG } from "./config/defaults.js";
import { generatePriceDataPoint } from "./utils/calculations.js";

export class App {
  private screen!: Widgets.Screen;
  private parameterManager: ParameterManager;
  private priceSimulator: PriceSimulator;
  private state: AppState;
  private updateTimer?: NodeJS.Timeout;

  constructor() {
    this.parameterManager = new ParameterManager();
    this.priceSimulator = new PriceSimulator();

    // Initialize state
    this.state = {
      parameters: DEFAULT_PARAMETERS,
      priceHistory: [],
      spreadHistory: [],
      connectionStatus: "disconnected",
      lastUpdate: new Date(),
      isPaused: false,
      focusedWidget: null,
    };
  }

  /**
   * Initialize and start the TUI application
   */
  async start(): Promise<void> {
    this.initializeScreen();
    this.setupLayout();
    this.setupEventHandlers();
    this.startPriceUpdates();

    // Render the screen
    this.screen.render();
  }

  /**
   * Initialize blessed screen
   */
  private initializeScreen(): void {
    this.screen = blessed.screen({
      smartCSR: true,
      title: APP_NAME,
      fullUnicode: true,
      dockBorders: true,
    });

    this.screen.key(KEY_BINDINGS.quit, () => {
      this.cleanup();
      process.exit(0);
    });
  }

  /**
   * Setup main layout
   */
  private setupLayout(): void {
    // Header
    const header = blessed.box({
      top: 0,
      left: 0,
      width: "100%",
      height: 3,
      content: `  ${APP_NAME} v${APP_VERSION}`,
      tags: true,
      border: {
        type: "line",
      },
      style: {
        fg: BLESSED_COLORS.text,
        border: {
          fg: BLESSED_COLORS.border,
        },
      },
    });

    // Main container
    const mainContainer = blessed.box({
      top: 3,
      left: 0,
      width: "100%",
      height: "100%-6",
      style: {
        fg: BLESSED_COLORS.text,
      },
    });

    // Left panel - Parameters
    const parameterPanel = blessed.box({
      top: 0,
      left: 0,
      width: "30%",
      height: "100%",
      label: " Parameters ",
      border: {
        type: "line",
      },
      style: {
        fg: BLESSED_COLORS.text,
        border: {
          fg: BLESSED_COLORS.border,
        },
      },
    });

    // Right panel - Visualization
    const vizPanel = blessed.box({
      top: 0,
      left: "30%",
      width: "70%",
      height: "100%",
      label: " Price & Spread Visualization ",
      border: {
        type: "line",
      },
      style: {
        fg: BLESSED_COLORS.text,
        border: {
          fg: BLESSED_COLORS.border,
        },
      },
    });

    // Placeholder content for parameters
    const paramContent = blessed.text({
      top: 1,
      left: 1,
      width: "100%-2",
      content: this.renderParameterContent(),
      tags: true,
    });

    // Placeholder content for visualization
    const vizContent = blessed.text({
      top: 1,
      left: 1,
      width: "100%-2",
      height: "100%-2",
      content: this.renderVisualizationContent(),
      tags: true,
    });

    // Status bar
    const statusBar = blessed.box({
      bottom: 0,
      left: 0,
      width: "100%",
      height: 3,
      content: this.renderStatusBar(),
      tags: true,
      border: {
        type: "line",
      },
      style: {
        fg: BLESSED_COLORS.text,
        border: {
          fg: BLESSED_COLORS.border,
        },
      },
    });

    // Append to containers
    parameterPanel.append(paramContent);
    vizPanel.append(vizContent);
    mainContainer.append(parameterPanel);
    mainContainer.append(vizPanel);

    this.screen.append(header);
    this.screen.append(mainContainer);
    this.screen.append(statusBar);

    // Store references for updates
    this.screen.data = {
      paramContent,
      vizContent,
      statusBar,
    };
  }

  /**
   * Render parameter panel content
   */
  private renderParameterContent(): string {
    const params = this.state.parameters;

    return `
{bold}Update Frequency{/bold}
Block Time: ${params.updateFrequency} ms

{bold}Spread Range{/bold}
Min: ${params.spreadRange.min} bps (${(params.spreadRange.min / 100).toFixed(
      2
    )}%)
Max: ${params.spreadRange.max} bps (${(params.spreadRange.max / 100).toFixed(
      2
    )}%)

{bold}Correlation Factor{/bold}
Factor: ${params.correlationFactor.toFixed(2)}

{gray}─────────────────────────{/gray}

{cyan}Press 'a' to apply changes{/cyan}
{cyan}Press 'r' to reset{/cyan}
{cyan}Press 'p' to pause{/cyan}
{cyan}Press 'q' to quit{/cyan}
    `.trim();
  }

  /**
   * Render visualization content
   */
  private renderVisualizationContent(): string {
    const currentPrice = this.priceSimulator.getCurrentPrice();
    const params = this.state.parameters;

    // Generate current data point
    const dataPoint = generatePriceDataPoint(
      Date.now(),
      currentPrice,
      params,
      0
    );

    return `
{bold}Current Price: {cyan}${dataPoint.midPrice.toFixed(2)}{/cyan}{/bold}

Upper Bound: {magenta}${dataPoint.upperBound.toFixed(2)}{/magenta}
Lower Bound: {magenta}${dataPoint.lowerBound.toFixed(2)}{/magenta}

Spread Width: ${(dataPoint.upperBound - dataPoint.lowerBound).toFixed(2)}

{gray}Chart visualization will be implemented with blessed-contrib{/gray}
{gray}This will show real-time price movement with spread bands{/gray}
    `.trim();
  }

  /**
   * Render status bar
   */
  private renderStatusBar(): string {
    const status = this.state.isPaused
      ? "{yellow}PAUSED{/yellow}"
      : "{green}RUNNING{/green}";
    const connection =
      this.state.connectionStatus === "connected"
        ? "{green}Connected{/green}"
        : "{gray}Disconnected{/gray}";

    const timeSinceUpdate = Math.floor(
      (Date.now() - this.state.lastUpdate.getTime()) / 1000
    );

    return ` Status: ${status} | Connection: ${connection} | Last update: ${timeSinceUpdate}s ago | Press 'h' for help`;
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.screen.key(KEY_BINDINGS.pause, () => {
      this.state.isPaused = !this.state.isPaused;
      this.updateUI();
    });

    this.screen.key(KEY_BINDINGS.reset, () => {
      this.parameterManager.reset();
      this.state.parameters = this.parameterManager.getParameters();
      this.updateUI();
    });

    this.screen.key(KEY_BINDINGS.help, () => {
      this.showHelp();
    });
  }

  /**
   * Start price update loop
   */
  private startPriceUpdates(): void {
    const update = () => {
      if (!this.state.isPaused) {
        // Generate new price
        const newPrice = this.priceSimulator.generateNextPrice();

        // Create data point
        const dataPoint = generatePriceDataPoint(
          Date.now(),
          newPrice,
          this.state.parameters,
          0
        );

        // Update history
        this.state.priceHistory.push(dataPoint);
        if (this.state.priceHistory.length > UI_CONFIG.maxHistoryPoints) {
          this.state.priceHistory.shift();
        }

        this.state.lastUpdate = new Date();
        this.updateUI();
      }

      // Schedule next update
      this.updateTimer = setTimeout(
        update,
        this.state.parameters.updateFrequency
      );
    };

    update();
  }

  /**
   * Update UI elements
   */
  private updateUI(): void {
    const data = this.screen.data as any;

    if (data.paramContent) {
      data.paramContent.setContent(this.renderParameterContent());
    }

    if (data.vizContent) {
      data.vizContent.setContent(this.renderVisualizationContent());
    }

    if (data.statusBar) {
      data.statusBar.setContent(this.renderStatusBar());
    }

    this.screen.render();
  }

  /**
   * Show help overlay
   */
  private showHelp(): void {
    const helpBox = blessed.box({
      top: "center",
      left: "center",
      width: "60%",
      height: "60%",
      label: " Help ",
      border: {
        type: "line",
      },
      style: {
        fg: BLESSED_COLORS.text,
        border: {
          fg: BLESSED_COLORS.accent,
        },
      },
      content: `
{bold}Keyboard Shortcuts:{/bold}

{cyan}Q / Ctrl+C{/cyan}  - Quit application
{cyan}P{/cyan}          - Pause/resume updates
{cyan}R{/cyan}          - Reset parameters to defaults
{cyan}A{/cyan}          - Apply parameters (when sequencer connected)
{cyan}H / ?{/cyan}      - Show this help

{bold}Navigation:{/bold}
{cyan}Tab{/cyan}        - Navigate between controls
{cyan}Arrows{/cyan}     - Adjust values

{gray}Press any key to close this help{/gray}
      `,
      tags: true,
    });

    this.screen.append(helpBox);
    helpBox.focus();

    helpBox.key(["escape", "enter", "q"], () => {
      this.screen.remove(helpBox);
      this.screen.render();
    });

    this.screen.render();
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
  }
}
