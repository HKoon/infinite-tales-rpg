/**
 * Stream Manager for handling TTS and other streaming operations
 * Prevents "Controller is already closed" errors
 */

export class StreamManager {
	private static instance: StreamManager;
	private activeStreams = new Map<string, { controller: ReadableStreamDefaultController | null; closed: boolean }>();

	private constructor() {}

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
		this.activeStreams.set(streamId, { controller, closed: false });
	}

	/**
	 * Safely enqueue data to a stream
	 */
	safeEnqueue(streamId: string, chunk: any): boolean {
		const stream = this.activeStreams.get(streamId);
		if (!stream || stream.closed || !stream.controller) {
			return false;
		}

		try {
			stream.controller.enqueue(chunk);
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
		if (!stream || stream.closed || !stream.controller) {
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
		if (!stream || stream.closed || !stream.controller) {
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
		return stream ? !stream.closed && stream.controller !== null : false;
	}

	/**
	 * Force cleanup of all streams (useful for cleanup on page unload)
	 */
	cleanup(): void {
		for (const [streamId] of this.activeStreams) {
			this.markStreamClosed(streamId);
		}
		this.activeStreams.clear();
	}
}

/**
 * Generate a unique stream ID
 */
export function generateStreamId(): string {
	return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}