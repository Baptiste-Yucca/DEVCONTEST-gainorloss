export const TOKENS = {
  USDC: {
    address: '0xddafbb505ad214d7b80b1f830fccc89b60fb7a83',
    decimals: 6,
    symbol: 'USDC'
  },
  WXDAI: {
    address: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
    decimals: 18,
    symbol: 'WXDAI'
  },
  armmUSDC: {
    address: '0xeD56F76E9cBC6A64b821e9c016eAFbd3db5436D1',
    decimals: 6,
    symbol: 'armmUSDC'
  },
  debtUSDC: {
    address: '0x69c731aE5f5356a779f44C355aBB685d84e5E9e6',
    decimals: 6,
    symbol: 'debtUSDC'
  },
  armmWXDAI: {
    address: '0x0cA4f5554Dd9Da6217d62D8df2816c82bba4157b',
    decimals: 18,
    symbol: 'armmWXDAI'
  },
  debtWXDAI: {
    address: '0x9908801dF7902675C3FEDD6Fea0294D18D5d5d34',
    decimals: 18,
    symbol: 'debtWXDAI'
  }
};
// c'est plus addresse to TOKEN? 
export const ADDRESS_SC_TO_TOKEN: Record<string, keyof typeof TOKENS> = {
  [TOKENS.USDC.address.toLowerCase()]: 'USDC',
  [TOKENS.WXDAI.address.toLowerCase()]: 'WXDAI',
  [TOKENS.armmUSDC.address.toLowerCase()]: 'armmUSDC',
  [TOKENS.debtUSDC.address.toLowerCase()]: 'debtUSDC',
  [TOKENS.armmWXDAI.address.toLowerCase()]: 'armmWXDAI',
  [TOKENS.debtWXDAI.address.toLowerCase()]: 'debtWXDAI'
};

// Adresses des contrats
export const CONTRACTS = {
  RMM: '0x12a000a8a2cd339d85119c346142adb444bc5ce5',
  YAM: '0xc759aa7f9dd9720a1502c104dae4f9852bb17c14'
};

// Enum pour les tickers des tokens
export enum TokenTicker {
  USDC = 'USDC',
  WXDAI = 'WXDAI',
  DEFAULT = 'ERR'
}

// Enum pour les types de transactions
export enum TransactionType {
  BORROW = 'borrow',
  REPAY = 'repay',
  SUPPLY = 'supply',
  WITHDRAW = 'withdraw'
}

// Mapping des adresses de réserves vers les tickers
export const RESERVE_TO_TICKER: Record<string, TokenTicker> = {
  "0xddafbb505ad214d7b80b1f830fccc89b60fb7a830xdaa06cf7adceb69fcfde68d896818b9938984a70": TokenTicker.USDC,
  "0xe91d153e0b41518a2ce8dd3d7944fa863463a97d0xdaa06cf7adceb69fcfde68d896818b9938984a70": TokenTicker.WXDAI
};
// Mapping des tickers vers les adresses de réserves
export const TICKER_TO_RESERVE: Record<TokenTicker, string> = {
  [TokenTicker.USDC]: "0xddafbb505ad214d7b80b1f830fccc89b60fb7a830xdaa06cf7adceb69fcfde68d896818b9938984a70",
  [TokenTicker.WXDAI]: "0xe91d153e0b41518a2ce8dd3d7944fa863463a97d0xdaa06cf7adceb69fcfde68d896818b9938984a70",
  [TokenTicker.DEFAULT]: "ERR"
};
