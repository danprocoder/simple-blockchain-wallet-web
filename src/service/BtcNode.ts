export interface IMessage<T> {
    header: { [key: string]: string | number };
    body: T;
}

export class BtcNode {
    private ws: WebSocket | undefined;

    private subscribers: any = {};

    private responseListener: { [id: string]: (msg: IMessage<any>) => void } =
        {};

    constructor(private host: string, private port: number) {}

    async connect() {
        return new Promise((resolve) => {
            this.ws = new WebSocket(`ws://${this.host}:${this.port}`);
            this.ws.onopen = () => {
                if (!this.ws) return;

                console.log('Ready state', this.ws.readyState);

                this.ws.onmessage = (ev: MessageEvent<any>) => {
                    const msg: IMessage<any> = this.parseMessage(ev.data);

                    const idListener =
                        this.responseListener[msg.header['message-id']];
                    if (idListener) idListener(msg);

                    const sub = this.subscribers[msg.header['event']];
                    if (sub) sub(msg);
                };

                resolve(this);
            };
        });
    }

    subscribe(event: string, callback: (message: IMessage<any>) => void) {
        this.subscribers[event] = callback;
    }

    emit(event: string, payload: string) {
        const msgId = window.crypto.randomUUID();
        this.ws?.send(`event: ${event}\nmessage-id: ${msgId}\n\n${payload}`);
    }

    async request<T>(
        event: string,
        body: string | object
    ): Promise<IMessage<T>> {
        if (!this.ws) {
            throw Error('No websocket connection found.');
        }

        return new Promise((resolve) => {
            if (typeof body === 'object') {
                body = JSON.stringify(body);
            }

            const msgId = window.crypto.randomUUID();
            this.responseListener[msgId] = (msg: IMessage<any>) => {
                delete this.responseListener[msgId];
                resolve(msg);
            };
            this.ws?.send(`event: ${event}\nmessage-id: ${msgId}\n\n${body}`);
        });
    }

    parseMessage(data: string): IMessage<any> {
        const [headerSection, body] = data.split('\r\n\r\n');

        const header = headerSection.split('\r\n').reduce((prev, curr) => {
            const [k, v] = curr.split(':');

            prev[k.trim()] = v.trim();

            return prev;
        }, {} as { [k: string]: string });

        return {
            header,
            body:
                header['content-type'] === 'application/json'
                    ? JSON.parse(body)
                    : body,
        };
    }

    onDisconnect(callback: (ev: CloseEvent) => void) {
        if (this.ws) {
            this.ws.onclose = callback;
        }
    }
}

export class NodeFinder {
    private static connectedNode: BtcNode | undefined = undefined;

    static async findNode(): Promise<BtcNode> {
        if (!this.connectedNode) {
            this.connectedNode = new BtcNode('localhost', 12345);
            await this.connectedNode.connect();
            this.connectedNode.onDisconnect(() => {
                this.connectedNode = undefined;
            });
        }

        return this.connectedNode;
    }
}
