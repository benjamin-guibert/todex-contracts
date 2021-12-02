const Token = artifacts.require('Token')
const Exchange = artifacts.require('Exchange')

module.exports = (async (deployer) => {
  const initialSupply = '10000000000000000000000000'
  const accounts = await web3.eth.getAccounts()
  const feeAccount = accounts[0]
  const feePercent = 10

  deployer.deploy(Token, initialSupply)
  deployer.deploy(Exchange, feeAccount, feePercent)
}) as Truffle.Migration

export {}
