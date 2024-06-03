type EventKind = Record<string, object>;

export interface EventEmitter<TEventKind extends EventKind> {
	/**
	 * Emit an event.
	 *
	 * Listeners for this event will be invoked.
	 *
	 * @param name The name of the event to emit.
	 * @param data Any associated data for this kind of event.
	 */
	emit<ThisEventName extends keyof TEventKind>(
		name: ThisEventName extends string ? ThisEventName : never,
		data: TEventKind[ThisEventName],
	): void;

	/**
	 * Register a function to be invoked when an event is emitted.
	 *
	 * @param name The name of the event to listen for.
	 * @param callback Function run when an event of the given name is emitted.
	 */
	listen<ThisEventName extends keyof TEventKind>(
		name: ThisEventName extends string ? ThisEventName : never,
		callback: (data: TEventKind[ThisEventName]) => void,
	): () => void;
}

export const createEventEmitter = <
	TEventKind extends EventKind,
>(): EventEmitter<TEventKind> => {
	const emitter = new EventTarget();

	return {
		emit: (name, data) => {
			emitter.dispatchEvent(new CustomEvent(name, { detail: data }));
		},

		listen: <ThisEventName extends keyof TEventKind>(
			name: ThisEventName extends string ? ThisEventName : never,
			callback: (data: TEventKind[ThisEventName]) => void,
		) => {
			const listener = (event: CustomEvent<TEventKind[ThisEventName]>) =>
				callback(event.detail);
			emitter.addEventListener(name, listener as EventListener);

			return () => emitter.removeEventListener(name, listener as EventListener);
		},
	};
};
