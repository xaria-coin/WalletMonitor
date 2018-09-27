var TurtleCoinWalletd = require('turtlecoin-walletd-rpc-js').default

let walletd = new TurtleCoinWalletd(
  'http://159.69.86.230',
  8070,
  'myRpcPassword'
)
let blockCount = 1000000;
let firstBlockIndex = 1;
let blockHash = null;
let addresses = null;
let paymentId = null;

walletd.getTransactions(blockCount, firstBlockIndex, blockHash, addresses, paym$
    .then(resp => {
        console.log(resp.body)
    })
    .catch(err => {
        console.log(err)