declare module 'comlink' {
    export function expose(obj: any): void;
    export function wrap<T>(worker: Worker): Promise<T>;
    export function createEndpoint(worker: Worker): [MessagePort, MessagePort];
    export function transfer(worker: Worker, value: any): any;
}