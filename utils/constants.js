const TOKENS = {
  USDC: {
    address: '0xddafbb505ad214d7b80b1f830fccc89b60fb7a83',
    decimals: 6,
    symbol: 'USDC',
    supplyAddress: '0xeD56F76E9cBC6A64b821e9c016eAFbd3db5436D1', 
    supplySymbol: 'armmUSDC',
    supplyV2Address: '0x05d909006cD38ba9E73db72C083081726B67971D',
    supplyV2Symbol: 'armmUSDC_V2',
    debtAddress: '0x69c731aE5f5356a779f44C355aBB685d84e5E9e6',
    debtSymbol: 'debtUSDC',
    debtV2Address: '0xefEA0b5a48f1B936759a3279dcC3BA252884C764', //TBC
    debtV2Symbol: 'debtUSDC_V2',
    reserveId: '0xddafbb505ad214d7b80b1f830fccc89b60fb7a830xdaa06cf7adceb69fcfde68d896818b9938984a70'
  },
  WXDAI: {
    address: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
    decimals: 18,
    symbol: 'WXDAI',
    supplyAddress: '0x0cA4f5554Dd9Da6217d62D8df2816c82bba4157b',
    supplySymbol: 'armmWXDAI',
    supplyV2Address: '0x7349C9eaA538e118725a6130e0f8341509b9f8A0',
    supplyV2Symbol: 'armmWXDAI_V2',
    debtAddress: '0x9908801dF7902675C3FEDD6Fea0294D18D5d5d34',
    debtSymbol: 'debtWXDAI',
    debtV2Address: '0x6a7CeD66902D07066Ad08c81179d17d0fbE36829',
    debtV2Symbol: 'debtWXDAI_V2',
    reserveId: '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d0xdaa06cf7adceb69fcfde68d896818b9938984a70'
  }
};

// Mapping des adresses vers les tokens pour une recherche rapide
const ADDRESS_TO_TOKEN = {
  // Adresses principales
  [TOKENS.USDC.address.toLowerCase()]: 'USDC',
  [TOKENS.WXDAI.address.toLowerCase()]: 'WXDAI',
  // Adresses de supply
  [TOKENS.USDC.supplyAddress.toLowerCase()]: 'USDC',
  [TOKENS.WXDAI.supplyAddress.toLowerCase()]: 'WXDAI',
  // Adresses de debt
  [TOKENS.USDC.debtAddress.toLowerCase()]: 'USDC',
  [TOKENS.WXDAI.debtAddress.toLowerCase()]: 'WXDAI'
};

// Adresses des contrats
const CONTRACTS = {
  RMM: '0x12a000a8a2cd339d85119c346142adb444bc5ce5',
  YAM: '0xc759aa7f9dd9720a1502c104dae4f9852bb17c14'
};

// Enum pour les tickers des tokens
const TokenTicker = {
  USDC: 'USDC',
  WXDAI: 'WXDAI',
  DEFAULT: 'ERR'
};

// Enum pour les types de transactions
const TransactionType = {
  BORROW: 'borrow',
  REPAY: 'repay',
  SUPPLY: 'supply',
  WITHDRAW: 'withdraw'
};

// Mapping des adresses de réserves vers les tickers
const RESERVE_TO_TICKER = {
  [TOKENS.USDC.reserveId]: TokenTicker.USDC,
  [TOKENS.WXDAI.reserveId]: TokenTicker.WXDAI
};

// Mapping des tickers vers les adresses de réserves
const TICKER_TO_RESERVE = {
  [TokenTicker.USDC]: TOKENS.USDC.reserveId,
  [TokenTicker.WXDAI]: TOKENS.WXDAI.reserveId,
  [TokenTicker.DEFAULT]: "ERR"
};

// Helper function pour obtenir les adresses des tokens de supply
const getSupplyTokenAddresses = () => ({
  armmUSDC: TOKENS.USDC.supplyAddress,
  armmWXDAI: TOKENS.WXDAI.supplyAddress
});

// Helper function pour obtenir les adresses des tokens de debt
const getDebtTokenAddresses = () => ({
  debtUSDC: TOKENS.USDC.debtAddress,
  debtWXDAI: TOKENS.WXDAI.debtAddress
});

module.exports = {
  TOKENS,
  ADDRESS_TO_TOKEN,
  CONTRACTS,
  TokenTicker,
  TransactionType,
  RESERVE_TO_TICKER,
  TICKER_TO_RESERVE,
  getSupplyTokenAddresses,
  getDebtTokenAddresses
};
