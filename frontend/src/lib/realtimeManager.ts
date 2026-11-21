import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type PostgresChangeEvent = '*' | 'INSERT' | 'UPDATE' | 'DELETE';
export type ChangePayload = any;
export type ChangeCallback = (payload: ChangePayload) => void;

export interface ChannelRef {
  channel: RealtimeChannel;
  refCount: number;
}

/**
 * RealtimeManager: Singleton multiplexed channel manager for Supabase Realtime subscriptions.
 *
 * Provides:
 * 1. Reference-counted channel lifecycle to prevent duplicate WebSocket topics and socket exhaustion.
 * 2. Shared table listeners for multiplexed Postgres change streams.
 * 3. Graceful disposal when all subscribers unmount.
 */
export class RealtimeManager {
  private channels = new Map<string, ChannelRef>();
  private tableListeners = new Map<string, Set<ChangeCallback>>();

  /**
   * Reference-counted channel acquisition. Reuses an existing channel if topic matches.
   */
  public getOrCreateChannel(topic: string): RealtimeChannel {
    const existing = this.channels.get(topic);
    if (existing) {
      existing.refCount++;
      return existing.channel;
    }

    const channel = supabase.channel(topic);
    this.channels.set(topic, {
      channel,
      refCount: 1,
    });
    return channel;
  }

  /**
   * Releases a reference to a channel. Removes from Supabase only when refCount reaches 0.
   */
  public releaseChannel(topic: string): void {
    const entry = this.channels.get(topic);
    if (!entry) return;

    entry.refCount--;
    if (entry.refCount <= 0) {
      try {
        supabase.removeChannel(entry.channel);
      } catch (e) {
        console.warn(`Error removing realtime channel ${topic}:`, e);
      }
      this.channels.delete(topic);
    }
  }

  /**
   * Returns current active channel count and stats for testing/debugging.
   */
  public getStats(): {
    activeChannels: number;
    channelNames: string[];
    channelRefCount: Record<string, number>;
  } {
    const channelRefCount: Record<string, number> = {};
    for (const [topic, ref] of this.channels.entries()) {
      channelRefCount[topic] = ref.refCount;
    }
    return {
      activeChannels: this.channels.size,
      channelNames: Array.from(this.channels.keys()),
      channelRefCount,
    };
  }

  /**
   * Reset / clear all channels (useful in test teardown).
   */
  public clearAll(): void {
    for (const [, ref] of this.channels) {
      try {
        supabase.removeChannel(ref.channel);
      } catch {}
    }
    this.channels.clear();
    this.tableListeners.clear();
  }

  /**
   * Subscribe to postgres changes across common tables using a singleton multiplexed channel.
   * Returns an unsubscribe function.
   */
  public subscribeToTable(
    table: string,
    callback: ChangeCallback,
    options: { event?: PostgresChangeEvent; filter?: string } = {}
  ): () => void {
    const key = options.filter ? `${table}:${options.filter}` : table;

    if (!this.tableListeners.has(key)) {
      this.tableListeners.set(key, new Set());
    }
    this.tableListeners.get(key)!.add(callback);

    const channelName = options.filter ? `shared_filtered_${table}` : 'shared_global_multiplex';
    const channel = this.getOrCreateChannel(channelName);

    const event = options.event || '*';
    const config: any = { event, schema: 'public', table };
    if (options.filter) config.filter = options.filter;

    channel.on('postgres_changes' as any, config, (payload: any) => {
      const listeners = this.tableListeners.get(key);
      if (listeners) {
        listeners.forEach((cb) => {
          try {
            cb(payload);
          } catch (e) {
            console.error('Realtime listener error:', e);
          }
        });
      }
    });

    channel.subscribe();

    return () => {
      const listeners = this.tableListeners.get(key);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.tableListeners.delete(key);
        }
      }
      this.releaseChannel(channelName);
    };
  }
}

export const realtimeManager = new RealtimeManager();
