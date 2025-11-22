/**
 * Parameter state management service
 */

import type { SequencerParameters } from "../types/parameters.js";
import { DEFAULT_PARAMETERS } from "../config/defaults.js";
import { validateParameters } from "../config/validation.js";

export class ParameterManager {
  private parameters: SequencerParameters;
  private listeners: Set<(params: SequencerParameters) => void>;

  constructor(initialParams?: SequencerParameters) {
    this.parameters = initialParams ?? { ...DEFAULT_PARAMETERS };
    this.listeners = new Set();
  }

  /**
   * Get current parameters (readonly copy)
   */
  getParameters(): Readonly<SequencerParameters> {
    return { ...this.parameters };
  }

  /**
   * Update parameters with validation
   * @throws {Error} if validation fails
   */
  updateParameters(newParams: Partial<SequencerParameters>): void {
    const merged = {
      ...this.parameters,
      ...newParams,
    };

    // Validate before applying
    const validated = validateParameters(merged);
    this.parameters = validated;

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Update update frequency
   */
  setUpdateFrequency(frequency: number): void {
    this.updateParameters({ updateFrequency: frequency });
  }

  /**
   * Update spread range
   */
  setSpreadRange(min: number, max: number): void {
    this.updateParameters({
      spreadRange: { min, max },
    });
  }

  /**
   * Update correlation factor
   */
  setCorrelationFactor(factor: number): void {
    this.updateParameters({ correlationFactor: factor });
  }

  /**
   * Reset to default parameters
   */
  reset(): void {
    this.parameters = { ...DEFAULT_PARAMETERS };
    this.notifyListeners();
  }

  /**
   * Subscribe to parameter changes
   */
  subscribe(listener: (params: SequencerParameters) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of parameter changes
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      listener(this.getParameters());
    });
  }
}
