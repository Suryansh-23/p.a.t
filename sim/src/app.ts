/**
 * Main TUI application orchestrator
 */

import blessed from "blessed";
import type { Widgets } from "blessed";
import { ParameterManager } from "./services/parameterManager.js";
import { PriceSimulator } from "./services/priceSimulator.js";
import { PriceChart } from "./components/priceChart.js";
import { ParameterPanel } from "./components/parameterPanel.js";
import { APP_NAME, KEY_BINDINGS } from "./constants.js";
import type { AppState } from "./types/state.js";
import { DEFAULT_PARAMETERS, UI_CONFIG } from "./config/defaults.js";
import { generatePriceDataPoint } from "./utils/calculations.js";

export class App {
  private screen!: Widgets.Screen;
  private parameterManager: ParameterManager;
  private priceSimulator: PriceSimulator;
  private priceChart?: PriceChart;
  private parameterPanelComponent?: ParameterPanel;
  private state: AppState;
  private updateTimer?: NodeJS.Timeout;
  private priceSubscription?: () => void;

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
      // Ignore if an input widget is focused
      const focused = this.screen.focused as any;
      if (focused?.type === "textarea" || focused?.type === "textbox") return;

      this.cleanup();
      process.exit(0);
    });
  }

  /**
   * Setup main layout
   */
  private setupLayout(): void {
    // Header with ASCII art
    const header = blessed.box({
      top: 0,
      left: 0,
      width: "100%",
      height: 8,
      border: {
        type: "line",
      },
      style: {
        border: {
          fg: "cyan",
        },
      },
    });

    // Rainbow trail
    blessed.box({
      parent: header,
      top: 1,
      left: 1,
      width: 12,
      height: 3,
      content:
        "{red-fg}━━{/red-fg}{yellow-fg}━━{/yellow-fg}{green-fg}━━{/green-fg}{cyan-fg}━━{/cyan-fg}{blue-fg}━━{/blue-fg}{magenta-fg}━━{/magenta-fg}\n{red-fg}━━{/red-fg}{yellow-fg}━━{/yellow-fg}{green-fg}━━{/green-fg}{cyan-fg}━━{/cyan-fg}{blue-fg}━━{/blue-fg}{magenta-fg}━━{/magenta-fg}\n{red-fg}━━{/red-fg}{yellow-fg}━━{/yellow-fg}{green-fg}━━{/green-fg}{cyan-fg}━━{/cyan-fg}{blue-fg}━━{/blue-fg}{magenta-fg}━━{/magenta-fg}",
      tags: true,
    });

    // Nyan cat
    blessed.box({
      parent: header,
      top: 3,
      left: 1,
      width: 9,
      height: 3,
      content:
        "{magenta-fg}+~,_,~+{/magenta-fg}\n{magenta-fg}( @.@ ){/magenta-fg}\n{magenta-fg}( >^< ){/magenta-fg}",
      tags: true,
    });

    // Main title
    blessed.box({
      parent: header,
      top: 1,
      left: 13,
      width: "100%-26",
      height: 6,
      content:
        "{bold}{cyan-fg}██╗    ██╗██╗███╗   ██╗████████╗███████╗██████╗  ██████╗██╗   ██╗████████╗███████╗{/cyan-fg}{/bold}\n{bold}{cyan-fg}██║    ██║██║████╗  ██║╚══██╔══╝██╔════╝██╔══██╗██╔════╝██║   ██║╚══██╔══╝██╔════╝{/cyan-fg}{/bold}\n{bold}{cyan-fg}██║ █╗ ██║██║██╔██╗ ██║   ██║   █████╗  ██████╔╝██║     ██║   ██║   ██║   █████╗  {/cyan-fg}{/bold}\n{bold}{cyan-fg}██║███╗██║██║██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗██║     ██║   ██║   ██║   ██╔══╝  {/cyan-fg}{/bold}\n{bold}{cyan-fg}╚███╔███╔╝██║██║ ╚████║   ██║   ███████╗██║  ██║╚██████╗╚██████╔╝   ██║   ███████╗{/cyan-fg}{/bold}\n{bold}{cyan-fg} ╚══╝╚══╝ ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝    ╚═╝   ╚══════╝{/cyan-fg}{/bold}",
      tags: true,
    });

    // Subtitle and status
    const subtitle = blessed.box({
      parent: header,
      top: 6,
      left: 2,
      width: "100%-4",
      height: 1,
      content: this.renderSubtitle(),
      tags: true,
    });

    this.screen.append(header);

    // Main container
    const mainContainer = blessed.box({
      top: 8,
      left: 0,
      width: "100%",
      height: "100%-11",
      style: {
        fg: "white",
      },
    });

    // Left panel - Parameters
    const parameterPanel = blessed.box({
      top: 0,
      left: 0,
      width: "30%",
      height: "100%",
      label: " {bold}Parameters{/bold} ",
      tags: true,
      border: {
        type: "line",
      },
      style: {
        fg: "white",
        border: {
          fg: "magenta",
        },
        label: {
          fg: "cyan",
        },
      },
    });

    // Right panel - Visualization
    const vizPanel = blessed.box({
      top: 0,
      left: "30%",
      width: "70%",
      height: "100%",
      label: " {bold}Price & Spread Visualization{/bold} ",
      tags: true,
      border: {
        type: "line",
      },
      style: {
        fg: "white",
        border: {
          fg: "magenta",
        },
        label: {
          fg: "cyan",
        },
      },
    });

    // Interactive parameter inputs
    this.parameterPanelComponent = new ParameterPanel(
      this.screen,
      parameterPanel,
      this.state,
      this.parameterManager
    );

    // Price chart with spread visualization
    this.priceChart = new PriceChart(vizPanel, {
      top: 1,
      left: 1,
      width: "100%-2",
      height: "50%-1",
      showSpreadBands: true,
      maxDataPoints: 100,
    });

    // Current spread info box
    const spreadInfo = blessed.box({
      top: "50%",
      left: 1,
      width: "100%-2",
      height: "50%-1",
      label: " {bold}Current Spread Info{/bold} ",
      tags: true,
      border: {
        type: "line",
      },
      style: {
        fg: "white",
        border: {
          fg: "cyan",
        },
      },
      content: this.renderSpreadInfo(),
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
        fg: "white",
        border: {
          fg: "cyan",
        },
      },
    });

    // Append to containers
    vizPanel.append(spreadInfo);
    mainContainer.append(parameterPanel);
    mainContainer.append(vizPanel);

    this.screen.append(mainContainer);
    this.screen.append(statusBar);

    // Store references for updates
    this.screen.data = {
      spreadInfo,
      statusBar,
      subtitle,
    };

    // Setup keyboard handlers
    this.screen.key(["r"], () => {
      this.resetParameters();
    });
  }
  /**
   * Reset parameters to defaults
   */
  private resetParameters(): void {
    this.state.parameters = {
      updateFrequency: 2000,
      spreadRange: { min: 1, max: 10 },
      correlationFactor: 0.7,
    };
    this.parameterManager.updateParameters(this.state.parameters);
    this.updateUI();
  }

  /**
   * Render subtitle with status
   */
  private renderSubtitle(): string {
    const status = this.state.isPaused
      ? "{yellow-fg}PAUSED{/yellow-fg}"
      : "{green-fg}RUNNING{/green-fg}";
    return `                 {magenta-fg}P.A.T Dashboard{/magenta-fg}                                   {white-fg}[{/white-fg}${status}{white-fg}]{/white-fg}`;
  }

  /**
   * Render ASCII art header (deprecated - kept for reference)
   */
  /**
   * Render current spread information
   */
  private renderSpreadInfo(): string {
    const currentPrice = this.priceSimulator.getCurrentPrice();
    const currentConfidence = this.priceSimulator.getCurrentConfidence();
    const params = this.state.parameters;

    // Generate current data point
    const dataPoint = generatePriceDataPoint(
      Date.now(),
      currentPrice,
      params,
      0,
      currentConfidence
    );

    const upperChange = (
      ((dataPoint.upperBound - dataPoint.midPrice) / dataPoint.midPrice) *
      100
    ).toFixed(3);
    const lowerChange = (
      ((dataPoint.lowerBound - dataPoint.midPrice) / dataPoint.midPrice) *
      100
    ).toFixed(3);

    const stats = this.priceChart?.getStats();
    const mode = this.priceSimulator.getMode();
    const connected = this.priceSimulator.isConnected();

    return `
{bold}{white-fg}Data Source:{/white-fg}{/bold} ${
      mode === "live"
        ? "{green-fg}Pyth Network (Live){/green-fg}"
        : "{yellow-fg}Mock Data{/yellow-fg}"
    }
{white-fg}Connection:{/white-fg} ${
      connected
        ? "{green-fg}●{/green-fg} Connected"
        : "{red-fg}●{/red-fg} Disconnected"
    }

{gray-fg}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{/gray-fg}

{bold}{white-fg}Current Price:{/white-fg} {cyan-fg}${dataPoint.midPrice.toFixed(
      2
    )}{/cyan-fg}{/bold}
${
  currentConfidence !== undefined
    ? `{white-fg}Conf. Interval:{/white-fg} {yellow-fg}±${currentConfidence.toFixed(
        4
      )}{/yellow-fg}`
    : ""
}

{magenta-fg}Upper Spread:{/magenta-fg} {yellow-fg}${dataPoint.upperBound.toFixed(
      4
    )}{/yellow-fg} {green-fg}(+${upperChange}%){/green-fg}
{blue-fg}Lower Spread:{/blue-fg} {yellow-fg}${dataPoint.lowerBound.toFixed(
      4
    )}{/yellow-fg} {red-fg}(${lowerChange}%){/red-fg}

{white-fg}Spread Width:{/white-fg} {cyan-fg}${(
      dataPoint.upperBound - dataPoint.lowerBound
    ).toFixed(4)}{/cyan-fg}
${
  stats
    ? `
{gray-fg}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{/gray-fg}

{white-fg}Statistics (${this.state.priceHistory.length} pts):{/white-fg}
{gray-fg}Min:{/gray-fg} ${stats.min.toFixed(
        2
      )}  {gray-fg}Max:{/gray-fg} ${stats.max.toFixed(2)}
{gray-fg}Avg:{/gray-fg} ${stats.avg.toFixed(2)}`
    : ""
}
    `.trim();
  }

  /**
   * Render status bar
   */
  private renderStatusBar(): string {
    const status = this.state.isPaused
      ? "{yellow-fg}PAUSED{/yellow-fg}"
      : "{green-fg}RUNNING{/green-fg}";
    const connection =
      this.state.connectionStatus === "connected"
        ? "{green-fg}Connected{/green-fg}"
        : "{gray-fg}Disconnected{/gray-fg}";

    const timeSinceUpdate = Math.floor(
      (Date.now() - this.state.lastUpdate.getTime()) / 1000
    );

    return ` {white-fg}Status:{/white-fg} ${status} {gray-fg}|{/gray-fg} {white-fg}Connection:{/white-fg} ${connection} {gray-fg}|{/gray-fg} {white-fg}Last update:{/white-fg} {cyan-fg}${timeSinceUpdate}s{/cyan-fg} ago {gray-fg}|{/gray-fg} {magenta-fg}Press 'h' for help{/magenta-fg}`;
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.screen.key(KEY_BINDINGS.pause, () => {
      // Ignore if an input widget is focused
      const focused = this.screen.focused as any;
      if (focused?.type === "textarea" || focused?.type === "textbox") return;

      this.state.isPaused = !this.state.isPaused;
      this.updateUI();
    });

    this.screen.key(KEY_BINDINGS.reset, () => {
      // Ignore if an input widget is focused
      const focused = this.screen.focused as any;
      if (focused?.type === "textarea" || focused?.type === "textbox") return;

      this.parameterManager.reset();
      this.state.parameters = this.parameterManager.getParameters();
      this.updateUI();
    });

    this.screen.key(KEY_BINDINGS.help, () => {
      // Ignore if an input widget is focused
      const focused = this.screen.focused as any;
      if (focused?.type === "textarea" || focused?.type === "textbox") return;

      this.showHelp();
    });
  }
  /**
   * Start price update loop
   */
  private async startPriceUpdates(): Promise<void> {
    const mode = this.priceSimulator.getMode();

    if (mode === "live") {
      // Subscribe to Pyth price updates (real-time SSE)
      this.priceSubscription = this.priceSimulator.subscribe(
        (price: number, timestamp: number, confidence?: number) => {
          if (!this.state.isPaused) {
            this.handlePriceUpdate(price, timestamp, confidence);
          }
        }
      );

      // Fetch initial price
      const initialPrice = await this.priceSimulator.fetchLatestPrice();
      if (initialPrice) {
        this.handlePriceUpdate(initialPrice, Date.now());
        this.state.connectionStatus = "connected";
      }
    } else {
      // Mock data mode - use timer-based updates
      const update = () => {
        if (!this.state.isPaused) {
          const newPrice = this.priceSimulator.generateNextPrice();
          this.handlePriceUpdate(newPrice, Date.now());
        }

        this.updateTimer = setTimeout(
          update,
          this.state.parameters.updateFrequency
        );
      };

      update();
    }
  }

  /**
   * Handle a price update from either Pyth or mock simulator
   */
  private handlePriceUpdate(
    price: number,
    timestamp: number,
    confidence?: number
  ): void {
    // Create data point with spread calculations
    const dataPoint = generatePriceDataPoint(
      timestamp,
      price,
      this.state.parameters,
      0,
      confidence
    );

    // Update history
    this.state.priceHistory.push(dataPoint);
    if (this.state.priceHistory.length > UI_CONFIG.maxHistoryPoints) {
      this.state.priceHistory.shift();
    }

    // Update chart
    this.priceChart?.addDataPoint(dataPoint);

    this.state.lastUpdate = new Date();
    this.updateUI();
  }

  /**
   * Update UI elements
   */
  private updateUI(): void {
    const data = this.screen.data as any;

    // Update parameter panel
    if (this.parameterPanelComponent) {
      this.parameterPanelComponent.update();
    }

    if (data.spreadInfo) {
      data.spreadInfo.setContent(this.renderSpreadInfo());
    }

    if (data.statusBar) {
      data.statusBar.setContent(this.renderStatusBar());
    }

    if (data.subtitle) {
      data.subtitle.setContent(this.renderSubtitle());
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
      label: " {bold}Help{/bold} ",
      tags: true,
      border: {
        type: "line",
      },
      style: {
        fg: "white",
        border: {
          fg: "cyan",
        },
        label: {
          fg: "cyan",
        },
      },
      content: `
{bold}{white-fg}Keyboard Shortcuts:{/white-fg}{/bold}

{cyan-fg}Q / Ctrl+C{/cyan-fg}  - Quit application
{cyan-fg}P{/cyan-fg}          - Pause/resume updates
{cyan-fg}R{/cyan-fg}          - Reset parameters to defaults
{cyan-fg}A{/cyan-fg}          - Apply parameters (when sequencer connected)
{cyan-fg}H / ?{/cyan-fg}      - Show this help

{bold}{white-fg}Navigation:{/white-fg}{/bold}
{cyan-fg}Tab{/cyan-fg}        - Navigate between controls
{cyan-fg}Arrows{/cyan-fg}     - Adjust values

{gray-fg}Press any key to close this help{/gray-fg}
      `,
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
   * Cleanup resources before exit
   */
  private cleanup(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    // Unsubscribe from Pyth price updates
    if (this.priceSubscription) {
      this.priceSubscription();
    }

    // Cleanup price simulator
    this.priceSimulator.destroy();
  }
}
