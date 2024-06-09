import { ReactElement, createContext, useEffect, useState } from "react";
import _cloneDeep from 'lodash.clonedeep';

interface IWallet {
    address: string;
    privateKey: string;
    balance: 0;
}

const defaultWallet: IWallet = {
    address: '',
    privateKey: '',
    balance: 0
};

const WalletContext = createContext({
    wallet: _cloneDeep(defaultWallet),
    addWallet: (newWallet: IWallet) => {}
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
    }

    return (
        <WalletContext.Provider value={{ wallet, addWallet }}>
            {children}
        </WalletContext.Provider>
    )
}

export { WalletContext, WalletContextProvider };
