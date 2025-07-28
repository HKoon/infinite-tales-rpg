/**
 * Stream Manager for handling TTS and other streaming operations
 * Prevents "Controller is already closed" errors and handles race conditions
 */

export class StreamManager {
	private static instance: StreamManager;
	private activeStreams = new Map<string, { 
		controller: ReadableStreamDefaultController | null; 
		closed: boolean;
		cancelled: boolean;
		lastActivity: number;
	}>();
	private cleanupInterval: NodeJS.Timeout | null = null;

	private constructor() {
		// Start cleanup interval to remove old streams
		this.cleanupInterval = setInterval(() => {
			this.cleanupOldStreams();
		}, 30000); // Clean up every 30 seconds
	}

	static getInstance(): StreamManager {
		if (!StreamManager.instance) {
			StreamManager.instance = new StreamManager();
		}
		return StreamManager.instance;
	}

	/**
	 * Register a new stream with a unique ID
	 */
	registerStream(streamId: string, controller: ReadableStreamDefaultController): void {
		this.activeStreams.set(streamId, { 
			controller, 
			closed: false, 
			cancelled: false,
			lastActivity: Date.now()
		});
	}

	/**
	 * Safely enqueue data to a stream
	 */
	safeEnqueue(streamId: string, chunk: any): boolean {
		const stream = this.activeStreams.get(streamId);
		if (!stream || stream.closed || stream.cancelled || !stream.controller) {
			return false;
		}

		try {
			stream.controller.enqueue(chunk);
			stream.lastActivity = Date.now();
			return true;
		} catch (error) {
			console.error(`Error enqueueing to stream ${streamId}:`, error);
			this.markStreamClosed(streamId);
			return false;
		}
	}

	/**
	 * Safely close a stream
	 */
	safeClose(streamId: string): boolean {
		const stream = this.activeStreams.get(streamId);
		if (!stream || stream.closed || stream.cancelled || !stream.controller) {
			return false;
		}

		try {
			stream.controller.close();
			this.markStreamClosed(streamId);
			return true;
		} catch (error) {
			console.error(`Error closing stream ${streamId}:`, error);
			this.markStreamClosed(streamId);
			return false;
		}
	}

	/**
	 * Safely propagate an error to a stream
	 */
	safeError(streamId: string, error: any): boolean {
		const stream = this.activeStreams.get(streamId);
		if (!stream || stream.closed || stream.cancelled || !stream.controller) {
			return false;
		}

		try {
			stream.controller.error(error);
			this.markStreamClosed(streamId);
			return true;
		} catch (err) {
			console.error(`Error propagating error to stream ${streamId}:`, err);
			this.markStreamClosed(streamId);
			return false;
		}
	}

	/**
	 * Mark a stream as cancelled (different from closed)
	 */
	markStreamCancelled(streamId: string): void {
		const stream = this.activeStreams.get(streamId);
		if (stream) {
			stream.cancelled = true;
			stream.closed = true;
			stream.controller = null;
		}
		// Clean up after a delay to prevent immediate re-registration issues
		setTimeout(() => {
			this.activeStreams.delete(streamId);
		}, 1000);
	}

	/**
	 * Mark a stream as closed and clean up
	 */
	markStreamClosed(streamId: string): void {
		const stream = this.activeStreams.get(streamId);
		if (stream) {
			stream.closed = true;
			stream.controller = null;
		}
		// Clean up after a delay to prevent immediate re-registration issues
		setTimeout(() => {
			this.activeStreams.delete(streamId);
		}, 1000);
	}

	/**
	 * Check if a stream is still active
	 */
	isStreamActive(streamId: string): boolean {
		const stream = this.activeStreams.get(streamId);
		return stream ? !stream.closed && !stream.cancelled && stream.controller !== null : false;
	}

	/**
	 * Check if a stream is cancelled
	 */
	isStreamCancelled(streamId: string): boolean {
		const stream = this.activeStreams.get(streamId);
		return stream ? stream.cancelled : false;
	}

	/**
	 * Clean up old streams that haven't been active for a while
	 */
	private cleanupOldStreams(): void {
		const now = Date.now();
		const maxAge = 5 * 60 * 1000; // 5 minutes

		for (const [streamId, stream] of this.activeStreams) {
			if (now - stream.lastActivity > maxAge) {
				console.log(`Cleaning up old stream ${streamId}`);
				this.markStreamClosed(streamId);
			}
		}
	}

	/**
	 * Force cleanup of all streams (useful for cleanup on page unload)
	 */
	cleanup(): void {
		for (const [streamId] of this.activeStreams) {
			this.markStreamClosed(streamId);
		}
		this.activeStreams.clear();
		
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
	}
}

/**
 * Generate a unique stream ID
 */
export function generateStreamId(): string {
	return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}