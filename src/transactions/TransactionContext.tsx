import { Dispatch, ReactElement, createContext, useState } from 'react';

export interface ITransaction {
    from: string;
    to: string;
    amount: number;
    hash: string;
    timestamp: number;
}

type TransactionContentValue = {
    transactions: ITransaction[];
    setTransactions: Dispatch<ITransaction[]>;
    addTransaction: (trx: ITransaction) => void;
};

export const TransactionContext = createContext<TransactionContentValue>({
    transactions: [],
    setTransactions: () => {},
    addTransaction: () => {},
});

export const TransactionContextProvider = ({
    children,
}: {
    children: ReactElement;
}) => {
    const [transactions, setTransactions] = useState<ITransaction[]>([]);

    const addTransaction = (trx: ITransaction) => {
        // Check if duplicate.

        setTransactions([trx, ...transactions]);
    };

    return (
        <TransactionContext.Provider
            value={{ transactions, setTransactions, addTransaction }}
        >
            {children}
        </TransactionContext.Provider>
    );
};
