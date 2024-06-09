import { useForm } from 'react-hook-form';
import { WalletContext, WalletContextProvider } from './wallet/WalletContext';
import { useContext, useEffect } from 'react';
import moment from 'moment';
import { QRCodeCanvas } from 'qrcode.react';
import { BtcNode, IMessage, NodeFinder } from './service/BtcNode';
import { ToastContainer } from 'react-toastify';
import {
    ITransaction,
    TransactionContext,
    TransactionContextProvider,
} from './transactions/TransactionContext';

function arrayBufferToBase64(arrayBuffer: ArrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);

    let s = '';
    for (let i = 0; i < bytes.length; i++) {
        s += String.fromCharCode(bytes[i]);
    }

    return btoa(s);
}

function base64ToArrayBuffer(base64: string) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

async function signWithKey(key: string, data: string) {
    console.log(key, data);
    const binary = base64ToArrayBuffer(key);

    const privateKey = await window.crypto.subtle.importKey(
        'pkcs8',
        binary,
        {
            name: 'RSASSA-PKCS1-v1_5',
            hash: 'SHA-256',
        },
        true,
        ['sign']
    );

    const buffer = await window.crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        privateKey,
        new TextEncoder().encode(data)
    );

    return arrayBufferToBase64(buffer);
}

function CreateWallet() {
    const walletCtx = useContext(WalletContext);

    const createWallet = async () => {
        const pair = await window.crypto.subtle.generateKey(
            {
                name: 'RSASSA-PKCS1-v1_5',
                modulusLength: 512,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: { name: 'SHA-256' },
            },
            true,
            ['sign', 'verify']
        );

        const address = arrayBufferToBase64(
            await window.crypto.subtle.exportKey('spki', pair.publicKey)
        );
        const privateKey = arrayBufferToBase64(
            await window.crypto.subtle.exportKey('pkcs8', pair.privateKey)
        );

        walletCtx.addWallet({
            address,
            privateKey,
            balance: 0,
        });
    };

    return (
        <div>
            <button
                className="px-3.5 py-2 bg-gray-300 text-sm font-semibold rounded-md shadow-lg hover:bg-gray-400"
                onClick={() => createWallet()}
            >
                Create Wallet
            </button>
        </div>
    );
}

function getTransactionText(trx: Partial<ITransaction>) {
    return `Trx{from=${trx.from}, to=${trx.to}, amount=${trx.amount}, timestamp=${trx.timestamp}}`;
}

function TransferFunds() {
    const walletCtx = useContext(WalletContext);

    const { register, handleSubmit } =
        useForm<Pick<ITransaction, 'to' | 'amount'>>();

    const transferFunds = async (
        formData: Pick<ITransaction, 'to' | 'amount'>
    ) => {
        const payload: Partial<ITransaction> = {
            ...formData,
            amount: Number(formData.amount),
            from: walletCtx.wallet.address,
            timestamp: moment().valueOf(),
        };
        payload.signature = await signWithKey(
            walletCtx.wallet.privateKey,
            getTransactionText(payload)
        );

        const node: BtcNode = await NodeFinder.findNode();
        const res: IMessage<any> = await node.request<any>(
            'send-transaction',
            payload
        );
        console.log(res);
    };

    return (
        <div className="shadow-lg basis-1/2 p-4 rounded-lg bg-white">
            <h4 className="mb-6 font-bold">Transfer</h4>

            <form onSubmit={handleSubmit(transferFunds)}>
                <div className="mb-4">
                    <label className="font-semibold text-sm text-gray-300 block">
                        Enter address here:
                    </label>
                    <input
                        type="text"
                        className="block w-full rounded-md shadow-sm border-0 text-gray-900 px-3.5 py-2 ring-1 ring-gray-100"
                        {...register('to', { required: true })}
                    />
                </div>

                <div className="mb-4">
                    <label className="font-semibold text-sm text-gray-300 block">
                        Amount
                    </label>
                    <input
                        type="number"
                        step=".00001"
                        className="block w-full rounded-md shadow-sm border-0 text-gray-900 px-3.5 py-2 ring-1 ring-gray-100"
                        {...register('amount', { required: true })}
                    />
                </div>

                <div className="flex flex-row">
                    <button
                        type="submit"
                        className="bg-blue-800 text-sm rounded-md px-3 py-2 font-semibold shadow-md text-white"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
}

function MyWallet({ ...props }) {
    const walletCtx = useContext(WalletContext);

    return (
        <div {...props}>
            <div className="mb-4">
                <QRCodeCanvas value={walletCtx.wallet.address} />
            </div>
            <div>
                <div
                    style={{
                        textWrap: 'wrap',
                        overflowWrap: 'break-word',
                        width: '400px',
                    }}
                >
                    {walletCtx.wallet.address}
                </div>
                <div className="mt-2">
                    <button
                        className="bg-gray-300 px-3 py-2 font-semibold shadow-md rounded-md text-sm"
                        onClick={() =>
                            navigator.clipboard.writeText(
                                walletCtx.wallet.address
                            )
                        }
                    >
                        Copy
                    </button>
                </div>
            </div>
        </div>
    );
}

function WalletBalance({ ...props }) {
    const walletCtx = useContext(WalletContext);

    useEffect(() => {
        (async () => {
            // TODO: Mayeb put this in the wallet context?
            const node: BtcNode = await NodeFinder.findNode();
            node.subscribe('get-balance-for-address', ({ body }: any) => {
                walletCtx.setBalance(parseFloat(body));
            });

            node.emit('get-balance-for-address', walletCtx.wallet.address);
        })();
    }, []);

    return (
        <div {...props}>
            <div className="font-semibold text-sm text-gray-400">BALANCE</div>
            <div className="text-3xl font-bold">
                SMPL {walletCtx.wallet.balance}
            </div>
            <div className="flex flex-row gap-2 mt-6">
                <button className="bg-blue-800 text-sm rounded-md px-3 py-2 font-semibold shadow-sm text-white">
                    Buy
                </button>
                <button className="bg-blue-800 text-sm rounded-md px-3 py-2 font-semibold shadow-sm text-white">
                    Sell
                </button>
                <button className="bg-blue-800 text-sm rounded-md px-3 py-2 font-semibold shadow-sm text-white">
                    Transfer
                </button>
            </div>
        </div>
    );
}

function WalletTransactions() {
    const walletCtx = useContext(WalletContext);
    const transactionContext = useContext(TransactionContext);

    useEffect(() => {
        (async () => {
            const node: BtcNode = await NodeFinder.findNode();
            node.subscribe('block-verified', ({ body }: IMessage<any>) => {
                const trx = body.transactions.find(
                    (t: any) => t.from == address || t.to === address
                );
                if (trx) {
                    transactionContext.addTransaction(trx);
                }

                node.emit('get-balance-for-address', walletCtx.wallet.address);
            });

            const address = walletCtx.wallet.address;

            const { body } = await node.request<ITransaction[]>(
                'get-transactions-for-address',
                address
            );
            transactionContext.setTransactions(
                body as unknown as ITransaction[]
            );
        })();
    }, []);

    return (
        <div className="p-4 shadow-md rounded-lg bg-white">
            <h4 className="font-bold">Transactions</h4>

            <table className="w-full mt-6">
                <thead className="text-xs uppercase text-gray-700 bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left">&nbsp;</th>
                        <th className="px-6 py-3 text-left">Address</th>
                        <th className="px-6 py-3 text-right">Amount</th>
                        <th className="px-6 py-3 text-left">Trx ID</th>
                        <th className="px-6 py-3 text-left">Time</th>
                        <th className="px-6 py-3 text-left">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {transactionContext.transactions.map((trx) => {
                        const fromMe = walletCtx.wallet.address === trx.from;

                        return (
                            <tr>
                                <td className="px-6 py-3 vertical-top">
                                    {fromMe ? 'Withdrawal' : 'Deposit'}
                                </td>
                                <td className="px-6 py-3">
                                    <div
                                        style={{
                                            width: '150px',
                                            wordWrap: 'break-word',
                                        }}
                                    >
                                        {fromMe ? trx.to : trx.from}
                                    </div>
                                </td>
                                <td className="px-6 py-3 text-right">
                                    {fromMe && '-'}
                                    {trx.amount} SMPL
                                </td>

                                <td className="px-6 py-3">
                                    <div
                                        style={{
                                            width: '200px',
                                            wordWrap: 'break-word',
                                        }}
                                    >
                                        {trx.hash}
                                    </div>
                                </td>

                                <td className="px-6 py-3">{trx.timestamp}</td>

                                <td className="px-6 py-3">0/6 confirmed</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function AirDrop() {
    const { register, handleSubmit } =
        useForm<Pick<ITransaction, 'to' | 'amount'>>();

    const onSend = async (data: Pick<ITransaction, 'to' | 'amount'>) => {
        const pk =
            'MIIBVQIBADANBgkqhkiG9w0BAQEFAASCAT8wggE7AgEAAkEA2vTq0o4BN+DC9DIY2qrZ9pd8l8iD1B9hyL0xJB6YW9RRN2UwLHr+Zb0/Thd6g86Pgr6YUr4gkbMEoUEgTjHL0wIDAQABAkBxCcQ5U4qZeHXtb/eY3F+OiQKPsbstRc5LvjCifxEVRoDl2PDWCW0q1eib32A2KXyaGnnY4BTIDXn2CvQRsfyhAiEA8uYbBxPv3NYBs3dxZGz1GrLafhGGbMQzcjYdOaTdnhsCIQDmxDlMKoTnBrKjJP2se0mZWHSeyrqiFNEbW6cOKwQEqQIhANVN3U5J48o65SOFML7QMC5SAi3TlgjOA5+4hdGpRjUhAiBsVQXI+dT2V7CY4g6sYBxG/r2Qpf9Dg54+x6H/BraWMQIhALnG+OrZYMaW0OLKJyhvlbD6VjwvZbJ0nTLZ7o8yBtF+';

        const payload: Partial<ITransaction> = {
            ...data,
            amount: Number(data.amount),
            from: 'MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBANr06tKOATfgwvQyGNqq2faXfJfIg9QfYci9MSQemFvUUTdlMCx6/mW9P04XeoPOj4K+mFK+IJGzBKFBIE4xy9MCAwEAAQ==',
            timestamp: moment().valueOf(),
        };
        payload.signature = await signWithKey(pk, getTransactionText(payload));

        const node: BtcNode = await NodeFinder.findNode();
        const res = await node.request('send-transaction', payload);
        console.log(res);
    };

    return (
        <div className="shadow-lg p-4 basis-1/2 rounded-lg bg-white">
            <h4 className="mb-6 font-bold">Air Drop</h4>

            <form onSubmit={handleSubmit(onSend)}>
                <div className="mb-4">
                    <label className="text-gray-300 block text-sm font-semibold">
                        Receiver
                    </label>
                    <input
                        type="text"
                        {...register('to')}
                        className="block w-full px-3.5 py-2 rounded-md border-0 shadow-sm ring-1 ring-inset ring-gray-100 focus:ring-indigo-600"
                    />
                </div>

                <div className="mb-4">
                    <label className="text-gray-300 block text-sm font-semibold">
                        Amount
                    </label>
                    <input
                        type="number"
                        {...register('amount')}
                        className="block w-full px-3.5 py-2 rounded-md border-0 shadow-sm ring-1 ring-inset ring-gray-100 focus:ring-indigo-600"
                    />
                </div>

                <div>
                    <button
                        type="submit"
                        className="bg-blue-800 text-sm rounded-md px-3 py-2 font-semibold shadow-sm text-white"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
}

function Main() {
    const walletCtx = useContext(WalletContext);

    return (
        <div className="h-full bg-gray-100">
            <div className="container mx-auto py-3">
                <div className="flex flex-row justify-between">
                    <h1>Test Wallet</h1>
                    <CreateWallet />
                </div>
            </div>
            {walletCtx.wallet.address ? (
                <div className="container mx-auto">
                    <div className="flex flex-row shadow-lg mb-6 gap-6 rounded-lg bg-white">
                        <WalletBalance className="basis-1/2 p-4" />
                        <MyWallet className="basis-1/2 p-4" />
                    </div>

                    <div className="flex flex-row gap-6 mb-6">
                        <TransferFunds />
                        <AirDrop />
                    </div>

                    <WalletTransactions />
                </div>
            ) : null}

            <ToastContainer />
        </div>
    );
}

function App() {
    return (
        <WalletContextProvider>
            <TransactionContextProvider>
                <Main />
            </TransactionContextProvider>
        </WalletContextProvider>
    );
}

export default App;
