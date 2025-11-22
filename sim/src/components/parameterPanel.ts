import blessed from "blessed";
import type { Widgets } from "blessed";
import type { AppState } from "../types/state.js";
import type { ParameterManager } from "../services/parameterManager.js";
import { InputPrompt } from "./widgets/inputPrompt.js";

export class ParameterPanel {
  private parent: Widgets.BoxElement;
  private screen: Widgets.Screen;
  private state: AppState;
  private parameterManager: ParameterManager;
  private inputPrompt: InputPrompt;

  // Widgets
  private freqBox!: Widgets.BoxElement;
  private spreadMinBox!: Widgets.BoxElement;
  private spreadMaxBox!: Widgets.BoxElement;
  private corrBox!: Widgets.BoxElement;

  constructor(
    screen: Widgets.Screen,
    parent: Widgets.BoxElement,
    state: AppState,
    parameterManager: ParameterManager
  ) {
    this.screen = screen;
    this.parent = parent;
    this.state = state;
    this.parameterManager = parameterManager;
    this.inputPrompt = new InputPrompt(screen);

    this.render();
  }

  private render(): void {
    // Update Frequency Input
    blessed.text({
      parent: this.parent,
      top: 1,
      left: 1,
      content: "{bold}{white-fg}Update Frequency (ms){/white-fg}{/bold}",
      tags: true,
    });

    this.freqBox = blessed.box({
      parent: this.parent,
      top: 2,
      left: 1,
      width: "100%-2",
      height: 1,
      content: String(this.state.parameters.updateFrequency),
      style: {
        fg: "yellow",
        hover: {
          bg: "blue",
        },
      },
      mouse: true,
      clickable: true,
    });

    this.freqBox.on("click", () => {
      this.inputPrompt.show(
        "Update Frequency (150-4000 ms)",
        String(this.state.parameters.updateFrequency),
        (value: string) => {
          const num = parseInt(value.trim());
          if (!isNaN(num) && num >= 150 && num <= 4000) {
            this.state.parameters.updateFrequency = num;
            this.parameterManager.updateParameters(this.state.parameters);
            this.update();
          }
        }
      );
    });

    // Spread Range Inputs
    blessed.text({
      parent: this.parent,
      top: 4,
      left: 1,
      content: "{bold}{white-fg}Spread Range (BPS){/white-fg}{/bold}",
      tags: true,
    });

    blessed.text({
      parent: this.parent,
      top: 5,
      left: 1,
      content: "{cyan-fg}Min:{/cyan-fg}",
      tags: true,
    });

    this.spreadMinBox = blessed.box({
      parent: this.parent,
      top: 5,
      left: 6,
      width: 8,
      height: 1,
      content: String(this.state.parameters.spreadRange.min),
      style: {
        fg: "yellow",
        hover: {
          bg: "blue",
        },
      },
      mouse: true,
      clickable: true,
    });

    this.spreadMinBox.on("click", () => {
      this.inputPrompt.show(
        "Min Spread (1-25 bps)",
        String(this.state.parameters.spreadRange.min),
        (value: string) => {
          const num = parseInt(value.trim());
          if (
            !isNaN(num) &&
            num >= 1 &&
            num <= 25 &&
            num < this.state.parameters.spreadRange.max
          ) {
            this.state.parameters.spreadRange.min = num;
            this.parameterManager.updateParameters(this.state.parameters);
            this.update();
          }
        }
      );
    });

    blessed.text({
      parent: this.parent,
      top: 6,
      left: 1,
      content: "{cyan-fg}Max:{/cyan-fg}",
      tags: true,
    });

    this.spreadMaxBox = blessed.box({
      parent: this.parent,
      top: 6,
      left: 6,
      width: 8,
      height: 1,
      content: String(this.state.parameters.spreadRange.max),
      style: {
        fg: "yellow",
        hover: {
          bg: "blue",
        },
      },
      mouse: true,
      clickable: true,
    });

    this.spreadMaxBox.on("click", () => {
      this.inputPrompt.show(
        "Max Spread (1-25 bps)",
        String(this.state.parameters.spreadRange.max),
        (value: string) => {
          const num = parseInt(value.trim());
          if (
            !isNaN(num) &&
            num >= 1 &&
            num <= 25 &&
            num > this.state.parameters.spreadRange.min
          ) {
            this.state.parameters.spreadRange.max = num;
            this.parameterManager.updateParameters(this.state.parameters);
            this.update();
          }
        }
      );
    });

    // Correlation Factor Input
    blessed.text({
      parent: this.parent,
      top: 8,
      left: 1,
      content: "{bold}{white-fg}Correlation Factor{/white-fg}{/bold}",
      tags: true,
    });

    this.corrBox = blessed.box({
      parent: this.parent,
      top: 9,
      left: 1,
      width: "100%-2",
      height: 1,
      content: String(this.state.parameters.correlationFactor),
      style: {
        fg: "yellow",
        hover: {
          bg: "blue",
        },
      },
      mouse: true,
      clickable: true,
    });

    this.corrBox.on("click", () => {
      this.inputPrompt.show(
        "Correlation Factor (0.0-1.0)",
        String(this.state.parameters.correlationFactor),
        (value: string) => {
          const num = parseFloat(value.trim());
          if (!isNaN(num) && num >= 0 && num <= 1) {
            this.state.parameters.correlationFactor =
              Math.round(num * 100) / 100;
            this.parameterManager.updateParameters(this.state.parameters);
            this.update();
          }
        }
      );
    });

    // Help text
    blessed.text({
      parent: this.parent,
      top: 11,
      left: 1,
      width: "100%-2",
      content: `
{gray-fg}─────────────────────────{/gray-fg}

{green-fg}Click field to edit{/green-fg}
{green-fg}Press 'r' to reset{/green-fg}
{green-fg}Press 'p' to pause{/green-fg}
{red-fg}Press 'q' to quit{/red-fg}`,
      tags: true,
    });
  }

  public update(): void {
    this.freqBox.setContent(String(this.state.parameters.updateFrequency));
    this.spreadMinBox.setContent(String(this.state.parameters.spreadRange.min));
    this.spreadMaxBox.setContent(String(this.state.parameters.spreadRange.max));
    this.corrBox.setContent(String(this.state.parameters.correlationFactor));
    this.screen.render();
  }
}
