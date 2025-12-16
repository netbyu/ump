import AriClient from 'ari-client';
import { config } from '../config';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

/**
 * ARI Service - Handles real-time communication with Asterisk
 * Uses Asterisk REST Interface for:
 * - Originating calls
 * - Getting channel status
 * - Managing bridges
 * - Subscribing to events
 */
export class AriService extends EventEmitter {
  private static instance: AriService;
  private client: any = null;
  private connected = false;

  private constructor() {
    super();
  }

  static getInstance(): AriService {
    if (!AriService.instance) {
      AriService.instance = new AriService();
    }
    return AriService.instance;
  }

  async connect(): Promise<void> {
    try {
      this.client = await AriClient.connect(
        config.ari.url,
        config.ari.username,
        config.ari.password
      );

      this.connected = true;
      this.setupEventHandlers();

      // Start the Stasis application
      await this.client.start(config.ari.appName);

      logger.info('ARI connected and Stasis app started');
    } catch (error) {
      logger.error('Failed to connect to ARI:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    // Channel events
    this.client.on('StasisStart', (event: any, channel: any) => {
      logger.debug('StasisStart:', channel.name);
      this.emit('channelStart', { channel: this.formatChannel(channel) });
    });

    this.client.on('StasisEnd', (event: any, channel: any) => {
      logger.debug('StasisEnd:', channel.name);
      this.emit('channelEnd', { channel: this.formatChannel(channel) });
    });

    this.client.on('ChannelStateChange', (event: any, channel: any) => {
      this.emit('channelStateChange', { channel: this.formatChannel(channel) });
    });

    // Device state changes (extension status)
    this.client.on('DeviceStateChanged', (event: any) => {
      this.emit('deviceStateChange', {
        device: event.device_state.name,
        state: event.device_state.state,
      });
    });
  }

  private formatChannel(channel: any) {
    return {
      id: channel.id,
      name: channel.name,
      state: channel.state,
      caller: channel.caller,
      connected: channel.connected,
      creationtime: channel.creationtime,
    };
  }

  isConnected(): boolean {
    return this.connected;
  }

  getClient(): any {
    return this.client;
  }

  // Get all active channels
  async getChannels(): Promise<any[]> {
    if (!this.client) throw new Error('ARI not connected');
    const channels = await this.client.channels.list();
    return channels.map(this.formatChannel);
  }

  // Get specific channel
  async getChannel(channelId: string): Promise<any> {
    if (!this.client) throw new Error('ARI not connected');
    const channel = await this.client.channels.get({ channelId });
    return this.formatChannel(channel);
  }

  // Originate a call
  async originateCall(params: {
    endpoint: string;
    extension: string;
    context?: string;
    callerId?: string;
  }): Promise<any> {
    if (!this.client) throw new Error('ARI not connected');

    const channel = await this.client.channels.originate({
      endpoint: params.endpoint,
      extension: params.extension,
      context: params.context || 'from-internal',
      callerId: params.callerId,
      app: config.ari.appName,
    });

    return this.formatChannel(channel);
  }

  // Hangup a channel
  async hangupChannel(channelId: string): Promise<void> {
    if (!this.client) throw new Error('ARI not connected');
    await this.client.channels.hangup({ channelId });
  }

  // Get endpoint (extension) status
  async getEndpoints(): Promise<any[]> {
    if (!this.client) throw new Error('ARI not connected');
    const endpoints = await this.client.endpoints.list();
    return endpoints.map((ep: any) => ({
      technology: ep.technology,
      resource: ep.resource,
      state: ep.state,
      channel_ids: ep.channel_ids,
    }));
  }

  // Get specific endpoint status
  async getEndpoint(tech: string, resource: string): Promise<any> {
    if (!this.client) throw new Error('ARI not connected');
    const endpoint = await this.client.endpoints.get({ tech, resource });
    return {
      technology: endpoint.technology,
      resource: endpoint.resource,
      state: endpoint.state,
      channel_ids: endpoint.channel_ids,
    };
  }

  // Reload Asterisk module (useful after config changes)
  async reloadModule(module: string): Promise<void> {
    if (!this.client) throw new Error('ARI not connected');
    // ARI doesn't have direct module reload, use CLI command through asterisk
    // For now, this is a placeholder - implement via AMI if needed
    logger.info(`Module reload requested: ${module}`);
  }
}
