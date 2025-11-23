/**
 * Swap Visualizer Component
 * Displays recent swap activity in a visually appealing format
 */

import blessed from "blessed";
import type { Widgets } from "blessed";
import type { SwapStats } from "../types/swap.js";

export class SwapVisualizer {
  private container: Widgets.BoxElement;
  private recentSwaps: Array<{
    time: string;
    amount: string;
    success: boolean;
  }> = [];
  private maxSwaps = 10;

  constructor(parent: Widgets.Node) {
    this.container = blessed.box({
      parent,
      label: " Swap Activity ",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      border: {
        type: "line",
      },
      style: {
        border: {
          fg: "cyan",
        },
        label: {
          fg: "cyan",
          bold: true,
        },
      },
      tags: true,
      scrollable: false,
    });
  }

  /**
   * Update the swap visualizer with new stats
   */
  updateStats(stats: SwapStats): void {
    // Add latest swap to history if it exists
    if (stats.lastSwapTime && stats.lastSwapAmount !== undefined) {
      const time = new Date(stats.lastSwapTime);
      const timeStr = time.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      this.recentSwaps.unshift({
        time: timeStr,
        amount: stats.lastSwapAmount,
        success: stats.lastSwapSuccess ?? false,
      });

      // Keep only the most recent swaps
      if (this.recentSwaps.length > this.maxSwaps) {
        this.recentSwaps = this.recentSwaps.slice(0, this.maxSwaps);
      }
    }

    this.render(stats);
  }

  /**
   * Render the swap activity display
   */
  private render(stats: SwapStats): void {
    const lines: string[] = [];

    // Header stats
    lines.push("{bold}{white-fg}Total Swaps:{/white-fg}{/bold}");
    lines.push(
      `  {cyan-fg}${stats.totalSwaps}{/cyan-fg} total {gray-fg}({green-fg}✓ ${stats.successfulSwaps}{/green-fg} / {red-fg}✗ ${stats.failedSwaps}{/red-fg}){/gray-fg}`
    );
    lines.push("");

    // Success rate
    const successRate =
      stats.totalSwaps > 0
        ? ((stats.successfulSwaps / stats.totalSwaps) * 100).toFixed(1)
        : "0.0";
    const rateColor =
      parseFloat(successRate) >= 90
        ? "green"
        : parseFloat(successRate) >= 70
        ? "yellow"
        : "red";
    lines.push("{bold}{white-fg}Success Rate:{/white-fg}{/bold}");
    lines.push(`  {${rateColor}-fg}${successRate}%{/${rateColor}-fg}`);
    lines.push("");

    // Total volume
    lines.push("{bold}{white-fg}Total Volume:{/white-fg}{/bold}");
    lines.push(
      `  {green-fg}${parseFloat(stats.totalVolumeWeth).toFixed(
        4
      )} WETH{/green-fg}`
    );
    lines.push("");

    // Recent swaps header
    if (this.recentSwaps.length > 0) {
      lines.push("{bold}{yellow-fg}Recent Swaps:{/yellow-fg}{/bold}");
      lines.push("{gray-fg}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{/gray-fg}");

      // Display recent swaps
      this.recentSwaps.forEach((swap, index) => {
        const indicator = swap.success
          ? "{green-fg}●{/green-fg}"
          : "{red-fg}●{/red-fg}";
        const fade = index > 5 ? "{gray-fg}" : "";
        const endFade = index > 5 ? "{/gray-fg}" : "";

        lines.push(
          `${fade}${indicator} {white-fg}${
            swap.time
          }{/white-fg} {yellow-fg}${parseFloat(swap.amount).toFixed(
            4
          )}{/yellow-fg} WETH${endFade}`
        );
      });
    } else {
      lines.push("{gray-fg}No swaps yet...{/gray-fg}");
      lines.push("");
      lines.push("{dim}Waiting for swap activity{/dim}");
    }

    this.container.setContent(lines.join("\n"));
  }

  /**
   * Get the blessed container
   */
  getContainer(): Widgets.BoxElement {
    return this.container;
  }
}
