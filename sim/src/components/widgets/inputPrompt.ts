import blessed from "blessed";
import type { Widgets } from "blessed";

export class InputPrompt {
  private screen: Widgets.Screen;

  constructor(screen: Widgets.Screen) {
    this.screen = screen;
  }

  show(
    label: string,
    currentValue: string,
    callback: (value: string) => void
  ): void {
    // Create overlay
    const overlay = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      style: {
        bg: "black",
        transparent: true,
      },
      // Important: grab focus to prevent background interactions
      clickable: true,
      keyable: true,
    });

    // Create prompt box
    const promptBox = blessed.box({
      parent: overlay,
      top: "center",
      left: "center",
      width: 60,
      height: 5,
      label: ` ${label} `,
      tags: true,
      border: {
        type: "line",
      },
      style: {
        fg: "white",
        bg: "black",
        border: {
          fg: "yellow",
        },
      },
    });

    // Create input using textbox
    // We use manual key handling to avoid double-input issues and ensure reliability
    const input = blessed.textbox({
      parent: promptBox,
      top: 1,
      left: 1,
      width: 56, // Fixed width to avoid "Cannot read properties of null" in blessed calculation
      height: 1,
      value: currentValue,
      mouse: true,
      keys: true,
      inputOnFocus: false, // Disable built-in input handling
      style: {
        fg: "yellow",
        bg: "black",
      },
    });

    let isClosed = false;
    const cleanup = () => {
      if (isClosed) return;
      isClosed = true;
      overlay.destroy();
      this.screen.render();
    };

    // Handle escape on overlay (in case user clicks outside input)
    overlay.on("keypress", (_ch, key) => {
      if (key && (key.name === "escape" || key.full === "escape")) {
        cleanup();
      }
    });

    // Manual key handler
    input.on("keypress", (ch, key) => {
      if (!key) return;

      if (key.name === "escape" || key.full === "escape") {
        cleanup();
        return;
      }

      if (key.name === "enter") {
        const val = input.getValue();
        cleanup();
        callback(String(val).trim());
        return;
      }

      if (key.name === "backspace") {
        const val = input.getValue();
        if (val.length > 0) {
          input.setValue(val.slice(0, -1));
          this.screen.render();
        }
        return;
      }

      // Handle typing (printable characters)
      if (ch && !/^[\x00-\x1f]$/.test(ch)) {
        // Safety check: ensure input is still attached
        if (!input.parent) return;

        input.setValue(input.getValue() + ch);
        this.screen.render();
      }
    });

    input.focus();
    this.screen.render();
  }
}
