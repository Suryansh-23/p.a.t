/**
 * Price chart component with spread visualization
 * Uses blessed-contrib for interactive terminal charts
 */

import contrib from "blessed-contrib";
import type { Widgets } from "blessed";
import type { PriceDataPoint } from "../types/parameters.js";

export interface ChartConfig {
  maxDataPoints?: number;
  showSpreadBands?: boolean;
  showGrid?: boolean;
  style?: {
    line?: string;
    text?: string;
    baseline?: string;
  };
}

/**
 * Price chart component with real-time updates and spread visualization
 */
export class PriceChart {
  private chart: any; // blessed-contrib line chart type
  private priceData: PriceDataPoint[] = [];
  private maxDataPoints: number;
  private showSpreadBands: boolean;

  constructor(
    parent: Widgets.Screen | Widgets.Node,
    options: contrib.Widgets.LineOptions & ChartConfig = {}
  ) {
    this.maxDataPoints = options.maxDataPoints || 100;
    this.showSpreadBands = options.showSpreadBands ?? true;

    // Create the line chart with proper blessed-contrib configuration
    this.chart = contrib.line({
      parent,
      top: options.top || 0,
      left: options.left || 0,
      width: options.width || "100%",
      height: options.height || "100%",
      label: " Price & Spread ",
      tags: true,
      showLegend: true,
      legend: {
        width: 12,
      },
      style: {
        line: "cyan",
        text: "white",
        baseline: "white",
      },
      xLabelPadding: 3,
      xPadding: 5,
      numYLabels: 7,
      wholeNumbersOnly: false,
      minY: 0,
    });
  }

  /**
   * Add a new price data point and update the chart
   */
  addDataPoint(dataPoint: PriceDataPoint): void {
    this.priceData.push(dataPoint);

    // Trim to max data points
    if (this.priceData.length > this.maxDataPoints) {
      this.priceData.shift();
    }

    this.render();
  }

  /**
   * Update multiple data points at once
   */
  setData(dataPoints: PriceDataPoint[]): void {
    this.priceData = dataPoints.slice(-this.maxDataPoints);
    this.render();
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.priceData = [];
    this.render();
  }

  /**
   * Render the chart with current data
   */
  private render(): void {
    if (this.priceData.length === 0) {
      // Set empty data to clear chart
      this.chart.setData([
        {
          title: "No Data",
          x: ["00:00:00"],
          y: [0],
          style: { line: "white" },
        },
      ]);
      return;
    }

    // Prepare time labels (x-axis) - shared across all series
    const xLabels = this.priceData.map((point) => {
      const date = new Date(point.timestamp);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    });

    // Extract numeric values
    const midPrices = this.priceData.map((p) => p.midPrice);
    const upperBounds = this.priceData.map((p) => p.upperBound);
    const lowerBounds = this.priceData.map((p) => p.lowerBound);

    // Calculate Y-axis bounds based on actual data
    // Use all values (mid, upper, lower) to determine the range
    const allValues = [...midPrices, ...upperBounds, ...lowerBounds];
    const dataMin = Math.min(...allValues);
    const dataMax = Math.max(...allValues);

    // Calculate range and add padding (use confidence or 2% of range)
    const range = dataMax - dataMin;
    const avgConfidence =
      this.priceData
        .filter((p) => p.confidence)
        .reduce((sum, p) => sum + (p.confidence || 0), 0) /
      (this.priceData.filter((p) => p.confidence).length || 1);

    // Use confidence interval or fallback to 5% padding
    const padding = avgConfidence > 0 ? avgConfidence * 3 : range * 0.05;

    const minY = Math.floor(dataMin - padding);
    const maxY = Math.ceil(dataMax + padding);

    // Update chart options with calculated bounds
    this.chart.options.minY = minY;
    this.chart.options.maxY = maxY;

    // Prepare chart series
    const series: any[] = [];

    if (this.showSpreadBands) {
      // Upper spread band
      series.push({
        title: "Upper",
        x: xLabels,
        y: upperBounds,
        style: {
          line: "magenta",
        },
      });

      // Mid price (main line)
      series.push({
        title: "Mid",
        x: xLabels,
        y: midPrices,
        style: {
          line: "cyan",
        },
      });

      // Lower spread band
      series.push({
        title: "Lower",
        x: xLabels,
        y: lowerBounds,
        style: {
          line: "blue",
        },
      });
    } else {
      // Only show mid price
      series.push({
        title: "Price",
        x: xLabels,
        y: midPrices,
        style: {
          line: "cyan",
        },
      });
    }

    try {
      this.chart.setData(series);
    } catch (error) {
      console.error("Error setting chart data:", error);
    }
  }

  /**
   * Get the latest data point
   */
  getLatestDataPoint(): PriceDataPoint | null {
    return this.priceData.length > 0
      ? this.priceData[this.priceData.length - 1]
      : null;
  }

  /**
   * Get all current data points
   */
  getData(): PriceDataPoint[] {
    return [...this.priceData];
  }

  /**
   * Toggle spread band visibility
   */
  toggleSpreadBands(): void {
    this.showSpreadBands = !this.showSpreadBands;
    this.render();
  }

  /**
   * Get chart statistics
   */
  getStats(): {
    min: number;
    max: number;
    avg: number;
    current: number;
  } | null {
    if (this.priceData.length === 0) return null;

    const prices = this.priceData.map((p) => p.midPrice);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const current = prices[prices.length - 1];

    return { min, max, avg, current };
  }

  /**
   * Get the blessed-contrib chart widget
   */
  getWidget(): any {
    return this.chart;
  }
}
