import { ReactElement, createContext, useEffect, useState } from 'react';
import _cloneDeep from 'lodash.clonedeep';

interface IWallet {
    address: string;
    privateKey: string;
    balance: number;
}

const defaultWallet: IWallet = {
    address: '',
    privateKey: '',
    balance: 0,
};

const WalletContext = createContext({
    wallet: _cloneDeep(defaultWallet),
    addWallet: (newWallet: IWallet) => {},
    setBalance: (amount: number) => {},
});

const WalletContextProvider = ({ children }: { children: ReactElement }) => {
    const [wallet, setWallet] = useState(_cloneDeep(defaultWallet));

    // Prefetch wallets from localstorage
    useEffect(() => {
        const localWallet = localStorage.getItem('simple-wallet');
        if (localWallet) {
            setWallet(JSON.parse(localWallet));
        }
    }, []);

    const addWallet = (newWallet: IWallet) => {
        setWallet(newWallet);

        localStorage.setItem('simple-wallet', JSON.stringify(newWallet));
    };

    const setBalance = (balance: number) => {
        setWallet({ ...wallet, balance });
    };

    return (
        <WalletContext.Provider value={{ wallet, addWallet, setBalance }}>
            {children}
        </WalletContext.Provider>
    );
};

export { WalletContext, WalletContextProvider };
