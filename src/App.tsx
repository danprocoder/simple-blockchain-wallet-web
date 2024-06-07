import keypair from 'keypair';
import { useForm } from 'react-hook-form';
import { WalletContext, WalletContextProvider } from './wallet/WalletContext';
import { useContext } from 'react';
import moment from 'moment';
import { QRCodeCanvas } from 'qrcode.react';

function CreateWallet() {
  const walletCtx = useContext(WalletContext);

  const createWallet = () => {
    const pair = keypair({ bits: 512 });

    const clean = (key: string) =>
      key
        .replace('-----BEGIN RSA PRIVATE KEY-----', ' ')
        .replace('-----END RSA PRIVATE KEY-----', '')
        .replace('-----BEGIN RSA PUBLIC KEY-----', ' ')
        .replace('-----END RSA PUBLIC KEY-----', '')
        .replace(/\s+/g, '')
        .trim();

    const privateKey = clean(pair['private']);
    const address = clean(pair['public']);

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

function TransferFunds() {
  const walletCtx = useContext(WalletContext);

  const { register, handleSubmit } = useForm();

  const transferFunds = (formData: any) => {
    const payload = formData;
    payload.from = walletCtx.wallet.address;
    payload.signature = 'fjejfijfjefefe';
    payload.timestamp = moment().valueOf();

    console.log(payload);
  }

  return (
    <div className="shadow-lg">
      <form onSubmit={handleSubmit(transferFunds)}>
        <label>Enter address here:</label>
        <input type="text" {...register('to', { required: true })} />

        <label>Amount</label>
        <input type="number" step=".00001" {...register('amount', { required: true })} />

        <button type="submit" className="bg-blue-800 text-sm rounded-md px-3 py-2 font-semibold shadow-sm text-white">Send</button>
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
        <div>{walletCtx.wallet.address}</div>
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
            <WalletBalance className="basis-1/2" />
            <MyWallet className="basis-1/2" />
          </div>
          <TransferFunds />
        </div>
      </>
    </WalletContextProvider>
  )
}

export default App
