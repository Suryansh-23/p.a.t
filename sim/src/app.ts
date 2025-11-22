/**
 * Main TUI application orchestrator
 */

import blessed from "blessed";
import type { Widgets } from "blessed";
import { ParameterManager } from "./services/parameterManager.js";
import { PriceSimulator } from "./services/priceSimulator.js";
import { APP_NAME, KEY_BINDINGS } from "./constants.js";
import type { AppState } from "./types/state.js";
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
    const rainbow = blessed.box({
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
    const nyanCat = blessed.box({
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
    const title = blessed.box({
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

    // Placeholder content for parameters
    const paramContent = blessed.text({
      top: 1,
      left: 1,
      width: "100%-2",
      content: this.renderParameterContent(),
      tags: true,
      style: {
        fg: "white",
      },
    });

    // Placeholder content for visualization
    const vizContent = blessed.text({
      top: 1,
      left: 1,
      width: "100%-2",
      height: "100%-2",
      content: this.renderVisualizationContent(),
      tags: true,
      style: {
        fg: "white",
      },
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
    parameterPanel.append(paramContent);
    vizPanel.append(vizContent);
    mainContainer.append(parameterPanel);
    mainContainer.append(vizPanel);

    this.screen.append(mainContainer);
    this.screen.append(statusBar);

    // Store references for updates
    this.screen.data = {
      paramContent,
      vizContent,
      statusBar,
      subtitle,
    };
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
  private renderHeader(): string {
    const status = this.state.isPaused
      ? "{yellow-fg}PAUSED{/yellow-fg}"
      : "{green-fg}RUNNING{/green-fg}";
    return `
{red-fg}━━{/red-fg}{yellow-fg}━━{/yellow-fg}{green-fg}━━{/green-fg}{cyan-fg}━━{/cyan-fg}{blue-fg}━━{/blue-fg}{magenta-fg}━━  {/magenta-fg}{bold}{cyan-fg}██╗    ██╗██╗███╗   ██╗████████╗███████╗██████╗  ██████╗██╗   ██╗████████╗███████╗{/cyan-fg}{/bold}
{red-fg}━━{/red-fg}{yellow-fg}━━{/yellow-fg}{green-fg}━━{/green-fg}{cyan-fg}━━{/cyan-fg}{blue-fg}━━{/blue-fg}{magenta-fg}━━  {/magenta-fg}{bold}{cyan-fg}██║    ██║██║████╗  ██║╚══██╔══╝██╔════╝██╔══██╗██╔════╝██║   ██║╚══██╔══╝██╔════╝{/cyan-fg}{/bold}
{red-fg}━━{/red-fg}{yellow-fg}━━{/yellow-fg}{green-fg}━━{/green-fg}{cyan-fg}━━{/cyan-fg}{blue-fg}━━{/blue-fg}{magenta-fg}━━  {/magenta-fg}{bold}{cyan-fg}██║ █╗ ██║██║██╔██╗ ██║   ██║   █████╗  ██████╔╝██║     ██║   ██║   ██║   █████╗  {/cyan-fg}{/bold}
{magenta-fg}+~,_,~+  {/magenta-fg}{bold}{cyan-fg}██║███╗██║██║██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗██║     ██║   ██║   ██║   ██╔══╝  {/cyan-fg}{/bold}
{magenta-fg}( @.@ )  {/magenta-fg}{bold}{cyan-fg}╚███╔███╔╝██║██║ ╚████║   ██║   ███████╗██║  ██║╚██████╗╚██████╔╝   ██║   ███████╗{/cyan-fg}{/bold}
{magenta-fg}( >^< )  {/magenta-fg}{bold}{cyan-fg} ╚══╝╚══╝ ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝    ╚═╝   ╚══════╝{/cyan-fg}{/bold}
                  {magenta-fg}P.A.T Dashboard{/magenta-fg}                                   {white-fg}[{/white-fg}${status}{white-fg}]{/white-fg}
    `.trim();
  }

  /**
   * Render parameter panel content
   */
  private renderParameterContent(): string {
    const params = this.state.parameters;

    return `
{bold}{white-fg}Update Frequency{/white-fg}{/bold}
{cyan-fg}Block Time:{/cyan-fg} {yellow-fg}${
      params.updateFrequency
    }{/yellow-fg} ms

{bold}{white-fg}Spread Range (BPS){/white-fg}{/bold}
{cyan-fg}Min:{/cyan-fg} {yellow-fg}${
      params.spreadRange.min
    }{/yellow-fg} bps {gray-fg}(${(params.spreadRange.min / 100).toFixed(
      2
    )}%){/gray-fg}
{cyan-fg}Max:{/cyan-fg} {yellow-fg}${
      params.spreadRange.max
    }{/yellow-fg} bps {gray-fg}(${(params.spreadRange.max / 100).toFixed(
      2
    )}%){/gray-fg}

{bold}{white-fg}Correlation Factor{/white-fg}{/bold}
{cyan-fg}Factor:{/cyan-fg} {yellow-fg}${params.correlationFactor.toFixed(
      2
    )}{/yellow-fg}

{gray-fg}━━━━━━━━━━━━━━━━━━━━━━━━━{/gray-fg}

{green-fg}Press 'a' to apply changes{/green-fg}
{green-fg}Press 'r' to reset{/green-fg}
{green-fg}Press 'p' to pause{/green-fg}
{red-fg}Press 'q' to quit{/red-fg}
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

    const upperChange = (
      ((dataPoint.upperBound - dataPoint.midPrice) / dataPoint.midPrice) *
      100
    ).toFixed(3);
    const lowerChange = (
      ((dataPoint.lowerBound - dataPoint.midPrice) / dataPoint.midPrice) *
      100
    ).toFixed(3);

    return `
{bold}{white-fg}Current Price:{/white-fg} {cyan-fg}${dataPoint.midPrice.toFixed(
      2
    )}{/cyan-fg}{/bold}

{magenta-fg}Upper Bound:{/magenta-fg} {yellow-fg}${dataPoint.upperBound.toFixed(
      4
    )}{/yellow-fg} {green-fg}(+${upperChange}%){/green-fg}
{magenta-fg}Lower Bound:{/magenta-fg} {yellow-fg}${dataPoint.lowerBound.toFixed(
      4
    )}{/yellow-fg} {red-fg}(${lowerChange}%){/red-fg}

{white-fg}Spread Width:{/white-fg} {cyan-fg}${(
      dataPoint.upperBound - dataPoint.lowerBound
    ).toFixed(4)}{/cyan-fg}

{gray-fg}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{/gray-fg}
{gray-fg}Chart visualization will be implemented with blessed-contrib{/gray-fg}
{gray-fg}This will show real-time price movement with spread bands{/gray-fg}
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
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
  }
}
