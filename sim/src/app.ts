/**
 * Main TUI application orchestrator
 */

import blessed from "blessed";
import type { Widgets } from "blessed";
import { ParameterManager } from "./services/parameterManager.js";
import { PriceSimulator } from "./services/priceSimulator.js";
import { PriceChart } from "./components/priceChart.js";
import { UpdateTimeline } from "./components/updateTimeline.js";
import { ParameterPanel } from "./components/parameterPanel.js";
import { SwapVisualizer } from "./components/swapVisualizer.js";
import { SequencerClient } from "./services/sequencerClient.js";
import { SwapSimulator } from "./services/swapSimulator.js";
import { Web3Client } from "./clients/web3Client.js";
import { APP_NAME, KEY_BINDINGS } from "./constants.js";
import type { AppState } from "./types/state.js";
import { DEFAULT_PARAMETERS, UI_CONFIG } from "./config/defaults.js";
import { config } from "./config/index.js";
import { generatePriceDataPoint } from "./utils/calculations.js";

export class App {
  private screen!: Widgets.Screen;
  private parameterManager: ParameterManager;
  private priceSimulator: PriceSimulator;
  private priceChart?: PriceChart;
  private updateTimeline?: UpdateTimeline;
  private parameterPanelComponent?: ParameterPanel;
  private swapVisualizer?: SwapVisualizer;
  private sequencerClient: SequencerClient;
  private web3Client?: Web3Client;
  private swapSimulator?: SwapSimulator;
  private state: AppState;
  private postTimer?: NodeJS.Timeout;
  private priceSubscription?: () => void;
  private updateCount: number = 0;
  private lastUpdateTime?: Date;

  constructor() {
    this.parameterManager = new ParameterManager();
    this.priceSimulator = new PriceSimulator();
    this.sequencerClient = new SequencerClient({
      url: config.sequencer.url,
      apiKey: config.sequencer.apiKey,
    });

    // Initialize Web3Client and SwapSimulator if enabled
    if (config.swap.enabled && config.blockchain.privateKey) {
      this.web3Client = new Web3Client({
        rpcUrl: config.blockchain.rpcUrl,
        chainId: config.blockchain.chainId,
        privateKey: config.blockchain.privateKey,
      });
      this.swapSimulator = new SwapSimulator(this.web3Client, {
        enabled: config.swap.enabled,
        minAmount: config.swap.minAmount,
        maxAmount: config.swap.maxAmount,
        minInterval: config.swap.minInterval,
        maxInterval: config.swap.maxInterval,
        routerAddress: config.swap.routerAddress as `0x${string}`,
        wethAddress: config.swap.wethAddress as `0x${string}`,
        usdcAddress: config.swap.usdcAddress as `0x${string}`,
        hookAddress: config.swap.hookAddress as `0x${string}`,
      });
    }

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
      width: "25%",
      height: "60%",
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

    // Swap Activity Panel (below parameters)
    const swapActivityPanel = blessed.box({
      top: "60%",
      left: 0,
      width: "25%",
      height: "40%",
      tags: true,
      border: {
        type: "line",
      },
      style: {
        fg: "white",
        border: {
          fg: "magenta",
        },
      },
    });

    // Right panel - Visualization
    const vizPanel = blessed.box({
      top: 0,
      left: "25%",
      width: "75%",
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

    // Swap activity visualizer
    this.swapVisualizer = new SwapVisualizer(swapActivityPanel);

    // Price chart with spread visualization
    this.priceChart = new PriceChart(vizPanel, {
      top: 1,
      left: 1,
      width: "100%-2",
      height: "55%-1",
      showSpreadBands: true,
      maxDataPoints: 100,
    });

    // Update timeline below price chart
    this.updateTimeline = new UpdateTimeline(vizPanel, {
      top: "55%",
      left: 1,
      width: "100%-2",
      height: 4,
      maxDataPoints: 100,
    });

    // Current spread info box
    const spreadInfo = blessed.box({
      top: "55%+4",
      left: 1,
      width: "100%-2",
      height: "45%-5",
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
    mainContainer.append(swapActivityPanel);
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
    this.state.parameters = DEFAULT_PARAMETERS;
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

    const lines = [];

    // Data source line
    lines.push(
      `{bold}{white-fg}Data Source:{/white-fg}{/bold} ${
        mode === "live"
          ? "{green-fg}Pyth Network (Live){/green-fg}"
          : "{yellow-fg}Mock Data{/yellow-fg}"
      }`
    );

    // Connection status
    lines.push(
      `{white-fg}Connection:{/white-fg} ${
        connected
          ? "{green-fg}●{/green-fg} Connected"
          : "{red-fg}●{/red-fg} Disconnected"
      }`
    );

    // Updates posted
    lines.push("");
    lines.push(
      `{bold}{yellow-fg}Updates Posted:{/yellow-fg}{/bold} {green-fg}${
        this.updateCount
      }{/green-fg}${
        this.lastUpdateTime
          ? ` {gray-fg}(last: ${this.lastUpdateTime.toLocaleTimeString()}){/gray-fg}`
          : ""
      }`
    );

    // Separator
    lines.push("");
    lines.push(
      "{gray-fg}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{/gray-fg}"
    );
    lines.push("");

    // Current price
    lines.push(
      `{bold}{white-fg}Current Price:{/white-fg} {cyan-fg}${dataPoint.midPrice.toFixed(
        2
      )}{/cyan-fg}{/bold}`
    );

    // Confidence interval
    if (currentConfidence !== undefined) {
      lines.push(
        `{white-fg}Conf. Interval:{/white-fg} {yellow-fg}±${currentConfidence.toFixed(
          4
        )}{/yellow-fg}`
      );
    }

    lines.push("");

    // Spread bounds
    lines.push(
      `{magenta-fg}Upper Spread:{/magenta-fg} {yellow-fg}${dataPoint.upperBound.toFixed(
        4
      )}{/yellow-fg} {green-fg}(+${upperChange}%){/green-fg}`
    );
    lines.push(
      `{blue-fg}Lower Spread:{/blue-fg} {yellow-fg}${dataPoint.lowerBound.toFixed(
        4
      )}{/yellow-fg} {red-fg}(${lowerChange}%){/red-fg}`
    );

    lines.push("");
    lines.push(
      `{white-fg}Spread Width:{/white-fg} {cyan-fg}${(
        dataPoint.upperBound - dataPoint.lowerBound
      ).toFixed(4)}{/cyan-fg}`
    );

    // Statistics
    if (stats) {
      lines.push("");
      lines.push(
        "{gray-fg}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{/gray-fg}"
      );
      lines.push("");
      lines.push(
        `{white-fg}Statistics (${this.state.priceHistory.length} pts):{/white-fg}`
      );
      lines.push(
        `{gray-fg}Min:{/gray-fg} ${stats.min.toFixed(
          2
        )}  {gray-fg}Max:{/gray-fg} ${stats.max.toFixed(2)}`
      );
      lines.push(`{gray-fg}Avg:{/gray-fg} ${stats.avg.toFixed(2)}`);
    }

    // Swap Simulator Stats
    if (this.swapSimulator) {
      const swapStats = this.swapSimulator.getStats();
      lines.push("");
      lines.push(
        "{gray-fg}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{/gray-fg}"
      );
      lines.push("");
      lines.push(`{bold}{white-fg}Swap Simulator:{/white-fg}{/bold}`);
      lines.push(
        `{white-fg}Total Swaps:{/white-fg} {cyan-fg}${swapStats.totalSwaps}{/cyan-fg} {gray-fg}(✓ ${swapStats.successfulSwaps} / ✗ ${swapStats.failedSwaps}){/gray-fg}`
      );
      lines.push(
        `{white-fg}Total Volume:{/white-fg} {green-fg}${parseFloat(
          swapStats.totalVolumeWeth
        ).toFixed(4)} WETH{/green-fg}`
      );
      if (swapStats.lastSwapTime && swapStats.lastSwapAmount) {
        const lastSwapDate = new Date(swapStats.lastSwapTime);
        const lastStatus = swapStats.lastSwapSuccess
          ? "{green-fg}✓{/green-fg}"
          : "{red-fg}✗{/red-fg}";
        lines.push(
          `{white-fg}Last Swap:{/white-fg} ${lastStatus} {yellow-fg}${parseFloat(
            swapStats.lastSwapAmount
          ).toFixed(
            4
          )} WETH{/yellow-fg} {gray-fg}at ${lastSwapDate.toLocaleTimeString()}{/gray-fg}`
        );
      }
    }

    return lines.join("\n");
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
        : this.state.connectionStatus === "error"
        ? "{red-fg}Error{/red-fg}"
        : "{gray-fg}Disconnected{/gray-fg}";

    const timeSinceUpdate = Math.floor(
      (Date.now() - this.state.lastUpdate.getTime()) / 1000
    );

    return [
      "{white-fg}Status:{/white-fg}",
      status,
      "{gray-fg}|{/gray-fg}",
      "{white-fg}Connection:{/white-fg}",
      connection,
      "{gray-fg}|{/gray-fg}",
      `{white-fg}Last update:{/white-fg} {cyan-fg}${timeSinceUpdate}s{/cyan-fg} ago`,
      "{gray-fg}|{/gray-fg}",
      "{dim}Press 'h' for help{/dim}",
    ].join(" ");
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
   * Start price update loop (real-time from Pyth or mock)
   */
  private async startPriceUpdates(): Promise<void> {
    const mode = this.priceSimulator.getMode();

    if (mode === "live") {
      // Subscribe to Pyth price updates (real-time SSE stream)
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
      // Mock data mode - generate prices periodically for visualization
      const generateMockPrice = () => {
        if (!this.state.isPaused) {
          const newPrice = this.priceSimulator.generateNextPrice();
          this.handlePriceUpdate(newPrice, Date.now());
        }
        // Mock mode updates every 500ms for smooth visualization
        setTimeout(generateMockPrice, 500);
      };
      generateMockPrice();
    }

    // Start sequencer posting loop (controlled by updateFrequency)
    this.startSequencerPostingLoop();

    // Start swap simulator if enabled
    if (this.swapSimulator && config.swap.enabled) {
      await this.swapSimulator.start();
    }
  }

  /**
   * Post spread updates to sequencer at configured frequency
   */
  private startSequencerPostingLoop(): void {
    const postUpdate = async () => {
      if (!this.state.isPaused && this.state.priceHistory.length > 0) {
        const latestPoint =
          this.state.priceHistory[this.state.priceHistory.length - 1];
        const spreadBps = Math.round(
          ((latestPoint.upperBound - latestPoint.midPrice) /
            latestPoint.midPrice) *
            10000
        );

        // Post to sequencer (errors are suppressed internally)
        const result = await this.sequencerClient.postSpreadUpdate(
          config.sequencer.poolId,
          spreadBps
        );

        // Update connection status based on result
        if (result.ok) {
          this.state.connectionStatus = "connected";
        } else {
          this.state.connectionStatus = "error";
        }

        // Track update count and time
        this.updateCount++;
        this.lastUpdateTime = new Date();

        // Mark the data point regardless of server response
        // This shows when we attempted to post updates
        if (this.state.priceHistory.length > 0) {
          this.state.priceHistory[
            this.state.priceHistory.length - 1
          ].isUpdateMarker = true;

          // Re-render the chart and timeline to show the marker
          this.priceChart?.setData(this.state.priceHistory);
          this.updateTimeline?.setData(this.state.priceHistory);
        }

        // Update UI to show new update count
        this.updateUI();
      }

      this.postTimer = setTimeout(
        postUpdate,
        this.state.parameters.updateFrequency
      );
    };

    postUpdate();
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

    // Update chart and timeline
    this.priceChart?.addDataPoint(dataPoint);
    this.updateTimeline?.setData(this.state.priceHistory);

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

    // Update swap visualizer with current stats
    if (this.swapVisualizer && this.swapSimulator) {
      const swapStats = this.swapSimulator.getStats();
      this.swapVisualizer.updateStats(swapStats);
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
    if (this.postTimer) {
      clearTimeout(this.postTimer);
    }

    // Unsubscribe from Pyth price updates
    if (this.priceSubscription) {
      this.priceSubscription();
    }

    // Cleanup swap simulator
    if (this.swapSimulator) {
      this.swapSimulator.stop();
    }

    // Cleanup price simulator
    this.priceSimulator.destroy();
  }
}
