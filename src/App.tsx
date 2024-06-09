import { useForm } from 'react-hook-form';
import { WalletContext, WalletContextProvider } from './wallet/WalletContext';
import { useContext } from 'react';
import moment from 'moment';
import { QRCodeCanvas } from 'qrcode.react';
import { BtcNode, NodeFinder } from './service/BtcNode';

function arrayBufferToBase64(arrayBuffer: any) {
  const bytes = new Uint8Array(arrayBuffer);
  
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    s += String.fromCharCode(bytes[i]);
  }

  return btoa(s);
}

function CreateWallet() {
  const walletCtx = useContext(WalletContext);

  const createWallet = async () => {
    const pair = await window.crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 512,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: { name: 'SHA-256' }
      },
      true,
      ['sign', 'verify']
    );

    const address = arrayBufferToBase64(await window.crypto.subtle.exportKey('spki', pair.publicKey));
    const privateKey = arrayBufferToBase64(await window.crypto.subtle.exportKey('pkcs8', pair.privateKey));

    walletCtx.addWallet({
      address,
      privateKey,
      balance: 0
    });
  }

  return (
    <div>
      <button onClick={() => createWallet()}>Create Wallet</button>
    </div>
  )
}

function getTransactionText(trx: any) {
  return `Trx{from=${trx.from}, to=${trx.to}, amount=${trx.amount}, timestamp=${trx.timestamp}}`;
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
  const binary = base64ToArrayBuffer(key);

  let privateKey = await window.crypto.subtle.importKey(
    "pkcs8",
    binary,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    true,
    ['sign']
  );

  const buffer = await window.crypto.subtle.sign(
    {
      name: 'RSASSA-PKCS1-v1_5',
    },
    privateKey,
    new TextEncoder().encode(data)
  );

  return arrayBufferToBase64(buffer);
}

function TransferFunds() {
  const walletCtx = useContext(WalletContext);

  const { register, handleSubmit } = useForm();

  const transferFunds = async (formData: any) => {
    const payload = formData;
    payload.from = walletCtx.wallet.address;
    payload.timestamp = moment().valueOf();
    payload.meta = {
      source: 'airdrop'
    }
    payload.signature = await signWithKey(walletCtx.wallet.privateKey, getTransactionText(payload));

    const node: BtcNode = await NodeFinder.findNode();
    node.sendMessage('send-transaction', payload);
  }

  return (
    <div className="shadow-lg basis-1/2 p-4">
      <h4>Transfer</h4>

      <form onSubmit={handleSubmit(transferFunds)}>
        <label className="font-semibold text-sm text-gray-300 block">Enter address here:</label>
        <input type="text" className="block w-full rounded-md shadow-sm border-0 text-gray-900 px-3.5 py-2 ring-1 ring-gray-100" {...register('to', { required: true })} />

        <label className="font-semibold text-sm text-gray-300 block">Amount</label>
        <input type="number" step=".00001" className="block w-full rounded-md shadow-sm border-0 text-gray-900 px-3.5 py-2 ring-1 ring-gray-100" {...register('amount', { required: true })} />

        <div className="flex flex-row">
          <button type="submit" className="bg-blue-800 text-sm rounded-md px-3 py-2 font-semibold shadow-sm text-white">Send</button>
        </div>
      </form>
    </div>
  )
}

function MyWallet({ ...props }) {
  const walletCtx = useContext(WalletContext);

  return (
    <div {...props}>
      <div>
        <QRCodeCanvas value={walletCtx.wallet.address} />
      </div>
      <div>
        <div style={{ textWrap: 'wrap', overflowWrap: 'break-word', width: '400px' }}>{walletCtx.wallet.address}</div>
      </div>
    </div>
  );
}

function WalletBalance({ ...props }) {
  const walletCtx = useContext(WalletContext);

  return (
    <div {...props}>
      <div>BALANCE</div>
      <div className="text-3xl font-bold">SMPL {walletCtx.wallet.balance}</div>
      <div>
        <button className="bg-blue-800 text-sm rounded-md px-3 py-2 font-semibold shadow-sm text-white">Buy</button>
        <button className="bg-blue-800 text-sm rounded-md px-3 py-2 font-semibold shadow-sm text-white">Sell</button>
        <button className="bg-blue-800 text-sm rounded-md px-3 py-2 font-semibold shadow-sm text-white">Transfer</button>
      </div>
    </div>
  );
}

function WalletTransactions() {

}

function AirDrop() {
  const { register, handleSubmit } = useForm();

  const onSend = (data: any) => {
    console.log(data);
  }

  return (
    <div className="shadow-lg p-4 basis-1/2">
      <h4>Air Drop</h4>

      <form onSubmit={handleSubmit(onSend)}>
        <div>
          <label className="text-gray-300 block text-sm font-semibold">Receiver</label>
          <input type="text" {...register('receiver')} className="block w-full px-3.5 py-2 rounded-md border-0 shadow-sm ring-1 ring-inset ring-gray-100 focus:ring-indigo-600" />
        </div>

        <div>
          <label className="text-gray-300 block text-sm font-semibold">Amount</label>
          <input type="number" {...register('amount')} className="block w-full px-3.5 py-2 rounded-md border-0 shadow-sm ring-1 ring-inset ring-gray-100 focus:ring-indigo-600" />
        </div>

        <div>
          <button type="submit" className="bg-blue-800 text-sm rounded-md px-3 py-2 font-semibold shadow-sm text-white">Send</button>
        </div>
      </form>
    </div>
  );
}

function App() {
  return (
    <WalletContextProvider>
      <>
        <div className="container mx-auto">
          <h1>My Wallet</h1>
          <CreateWallet />
        </div>
        <div className="container mx-auto">
          <div className="flex flex-row shadow-lg">
            <WalletBalance className="basis-1/2 p-6" />
            <MyWallet className="basis-1/2" />
          </div>

          <div className="flex flex-row">
            <TransferFunds />
            <AirDrop />
          </div>
        </div>
      </>
    </WalletContextProvider>
  )
}

export default App
