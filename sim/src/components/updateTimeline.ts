/**
 * Update timeline component - shows markers for sequencer updates
 * Synchronized with price chart data
 */

import blessed from "blessed";
import type { Widgets } from "blessed";
import type { PriceDataPoint } from "../types/parameters.js";

/**
 * Timeline component for visualizing sequencer update markers
 */
export class UpdateTimeline {
  private box: Widgets.BoxElement;
  private priceData: PriceDataPoint[] = [];
  private maxDataPoints: number;

  constructor(
    parent: Widgets.Screen | Widgets.Node,
    options: {
      top?: number | string;
      left?: number | string;
      width?: number | string;
      height?: number | string;
      maxDataPoints?: number;
    } = {}
  ) {
    this.maxDataPoints = options.maxDataPoints || 100;

    this.box = blessed.box({
      parent,
      top: options.top || 0,
      left: options.left || 0,
      width: options.width || "100%",
      height: options.height || 3,
      label: " {bold}Update Timeline{/bold} ",
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
          fg: "yellow",
        },
      },
    });
  }

  /**
   * Update timeline with current price data
   */
  setData(dataPoints: PriceDataPoint[]): void {
    this.priceData = dataPoints.slice(-this.maxDataPoints);
    this.render();
  }

  /**
   * Render the timeline with update markers
   */
  private render(): void {
    if (this.priceData.length === 0) {
      this.box.setContent("");
      return;
    }

    // Get marker indices
    const markerIndices = this.priceData
      .map((point, index) => (point.isUpdateMarker ? index : -1))
      .filter((index) => index !== -1);

    // Calculate dimensions
    const width = (this.box.width as number) - 4; // Account for borders and padding
    const totalPoints = this.priceData.length;

    // Build timeline visualization
    const timelineLine = this.buildTimelineLine(
      width,
      totalPoints,
      markerIndices
    );
    const labelLine = this.buildLabelLine(markerIndices.length);

    this.box.setContent(`${timelineLine}\n${labelLine}`);
  }

  /**
   * Build the main timeline with markers
   */
  private buildTimelineLine(
    width: number,
    totalPoints: number,
    markerIndices: number[]
  ): string {
    const chars: string[] = [];

    for (let i = 0; i < width; i++) {
      // Check if there's a marker at this position
      const hasMarker = markerIndices.some((markerIdx) => {
        const markerPos = Math.floor((markerIdx / totalPoints) * width);
        return markerPos === i;
      });

      if (hasMarker) {
        chars.push("{yellow-fg}●{/yellow-fg}");
      } else {
        // Draw timeline bar
        chars.push("{gray-fg}─{/gray-fg}");
      }
    }

    return chars.join("");
  }

  /**
   * Build label line showing marker count
   */
  private buildLabelLine(markerCount: number): string {
    if (markerCount === 0) {
      return "{gray-fg}No updates posted yet{/gray-fg}";
    }

    return `{gray-fg}◀{/gray-fg} {white-fg}${markerCount} update${
      markerCount !== 1 ? "s" : ""
    } posted{/white-fg} {gray-fg}▶{/gray-fg}`;
  }

  /**
   * Get the timeline box widget
   */
  getWidget(): Widgets.BoxElement {
    return this.box;
  }
}
