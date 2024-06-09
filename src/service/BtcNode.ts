interface IMessage {
    header: { [key: string]: string | number };
    body: string | object;
}

export class BtcNode {
    private ws: WebSocket | undefined;

    private listeners: any = {};

    constructor(private host: string, private port: number) {}

    async connect() {
        return new Promise((resolve) => {
            this.ws = new WebSocket(`ws://${this.host}:${this.port}`);
            this.ws.onopen = () => {
                if (!this.ws) return;

                this.ws.onmessage = (ev: MessageEvent<any>) => {
                    console.log(ev);
                };

                resolve(null);
            };  
        });
    }

    addEventListener(event: string, callback: (message: IMessage) => void) {
        this.listeners[event] = callback;
    }

    sendMessage(event: string, body: string | object) {
        if (!this.ws) {
            throw Error('No websocket connection found.');
        }

        if (typeof body === 'object') {
            body = JSON.stringify(body);
        }

        this.ws.send(`event: ${event}\nmessage-id: ${window.crypto.randomUUID()}\n\n${body}`);
    }

    parseMessage() {

    }
}

export class NodeFinder {
    static connectedNode: BtcNode;
    
    static async findNode(): Promise<BtcNode> {
        if (!this.connectedNode) {
            this.connectedNode = new BtcNode('localhost', 12345);
            await this.connectedNode.connect();
        }
    
        return this.connectedNode;
    }
}
