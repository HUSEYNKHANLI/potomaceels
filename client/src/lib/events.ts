type EventCallback = (data?: any) => void;

interface Events {
  [key: string]: EventCallback[];
}

/**
 * Simple event bus implementation to allow communication between components
 * without direct dependencies
 */
class EventBus {
  private events: Events = {};

  /**
   * Subscribe to an event
   * @param event The event name
   * @param callback The callback function
   * @returns A function to unsubscribe
   */
  subscribe(event: string, callback: EventCallback): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);

    // Return unsubscribe function
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }

  /**
   * Publish an event
   * @param event The event name
   * @param data Optional data to pass to subscribers
   */
  publish(event: string, data?: any): void {
    if (!this.events[event]) {
      return;
    }
    this.events[event].forEach(callback => callback(data));
  }
}

// Export a singleton instance
export const eventBus = new EventBus();

// Define event constants
export const EVENT_NEW_ORDER = 'new-order';
export const EVENT_ORDER_STATUS_UPDATED = 'order-status-updated';