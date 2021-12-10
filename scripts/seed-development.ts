import { BigNumber } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { artifacts, ethers } from 'hardhat'
import { Exchange, Token } from '../typechain-types'
import { initializeScript, shortenAddress, wait } from './helpers'

const ETHER_ADDRESS = ethers.constants.AddressZero
const { parseEther, formatEther } = ethers.utils

let accounts: SignerWithAddress[]
let token: Token
let exchange: Exchange

const main = async () => {
  initializeScript()
  accounts = (await ethers.getSigners()).slice(0, 4)
  const [deployer, user1, user2, user3] = accounts
  const tokenAddress = process.env.TOKEN_CONTRACT_ADDRESS
  const exchangeAddress = process.env.EXCHANGE_CONTRACT_ADDRESS
  if (!tokenAddress || !exchangeAddress) {
    throw new Error('A contract address is missing, deploy first.')
  }
  token = new ethers.Contract(tokenAddress, (await artifacts.readArtifact('Token')).abi, deployer) as Token
  exchange = new ethers.Contract(exchangeAddress, (await artifacts.readArtifact('Exchange')).abi, deployer) as Exchange

  await token.transfer(user2.address, parseEther('100000'))
  await token.transfer(user3.address, parseEther('100000'))
  await token.connect(user1).approve(exchange.address, parseEther('100000'))
  await token.connect(user2).approve(exchange.address, parseEther('100000'))
  await token.connect(user3).approve(exchange.address, parseEther('100000'))

  await exchange.connect(user1).depositEther({ value: parseEther('1000') })
  await exchange.connect(user2).depositEther({ value: parseEther('1000') })
  await exchange.connect(user2).depositToken(token.address, parseEther('100000'))
  await exchange.connect(user3).depositToken(token.address, parseEther('100000'))
  await logState()

  await createOrder(user1, token.address, parseEther('900'), ETHER_ADDRESS, parseEther('0.8'))
  await createOrder(user2, ETHER_ADDRESS, parseEther('1'), token.address, parseEther('1200'))
  await createOrder(user3, token.address, parseEther('1500'), ETHER_ADDRESS, parseEther('1.1'))

  // Trades:
  //    #4          #5          #6          #7            #8
  // 1  -1/+1100    -1/+1100    -0.9/+800   +2.9/-3000
  // 2  +1/-1100    +1/-1100                -2.9/+3000    +0.9/-800
  // 3                          +0.9/-800                 -0.9/+800

  // Balances after trade:
  // 1  99/1100     98/2200     97.1/3000   100/0         100/0
  // 2  100/98900   101/97800   101/97800   98.1/100800   99/100000
  // 3  0/100000    0/100000    0.9/99200   0.9/99200     0/100000

  for (let orderId = 4; orderId < 999999; orderId++) {
    await createOrder(user1, ETHER_ADDRESS, parseEther('1'), token.address, parseEther('1100'))
    wait(20)
    await createOrder(user2, token.address, parseEther('1100'), ETHER_ADDRESS, parseEther('0.9'))
    wait(20)
    await createOrder(user1, ETHER_ADDRESS, parseEther('0.9'), token.address, parseEther('800'))
    wait(20)
    await fillOrder(user2, orderId++)
    wait(20)
    await fillOrder(user1, orderId++)
    wait(20)
    await fillOrder(user3, orderId++)
    wait(20)
    await createOrder(user2, token.address, parseEther('3000'), ETHER_ADDRESS, parseEther('2.9'))
    wait(20)
    await createOrder(user3, token.address, parseEther('800'), ETHER_ADDRESS, parseEther('0.9'))
    wait(20)
    await fillOrder(user1, orderId++)
    wait(20)
    await fillOrder(user2, orderId)
    wait(20)
  }
}

const createOrder = async (
  account: SignerWithAddress,
  sellToken: string,
  sellAmount: BigNumber,
  buyToken: string,
  buyAmount: BigNumber
) => {
  console.log()
  console.log(`Creating order for ${shortenAddress(account.address)}...`)
  console.log(`SELL: token=${shortenAddress(sellToken)} amount=${formatEther(sellAmount)}`)
  console.log(`BUY: token=${shortenAddress(buyToken)} amount=${formatEther(buyAmount)}`)
  console.log(`Order created for ${shortenAddress(account.address)}.`)
  await exchange.connect(account).createOrder(sellToken, sellAmount, buyToken, buyAmount)
  await wait(1)
}

const fillOrder = async (account: SignerWithAddress, orderId: number) => {
  const order = await exchange.orders(orderId)

  console.log()
  console.log(`Filling order #${order.id}...`)
  console.log(
    `SELL: account=${shortenAddress(order.account)} token=${shortenAddress(order.sellToken)} amount=${formatEther(
      order.sellAmount
    )}`
  )
  console.log(
    `BUY: account=${shortenAddress(account.address)} token=${shortenAddress(order.buyToken)} amount=${formatEther(
      order.buyAmount
    )}`
  )
  await exchange.connect(account).fillOrder(orderId)
  console.log(`Order #${order.id} filled.`)
  logState()
  await wait(1)
}

const logState = async () => {
  console.log()
  console.log('---------------------------------------------')
  console.log('ACCOUNT | ETH | ETH DEP. | TOKEN | TOKEN DEP.')
  console.log('---------------------------------------------')
  for (let index = 0; index < accounts.length; index++) {
    const account = accounts[index]
    const tokenSymbol = await token.name()
    const address = shortenAddress(account.address)
    const ethBalance = formatEther(await ethers.provider.getBalance(account.address))
    const depEthBalance = formatEther(await exchange.ethBalanceOf(account.address))
    const tokenBalance = formatEther(await token.balanceOf(account.address))
    const depTokenBalance = formatEther(await exchange.tokenBalanceOf(token.address, account.address))
    console.log(
      `${address} | ETH ${ethBalance} | ETH ${depEthBalance} | ${tokenSymbol} ${tokenBalance} | ${tokenSymbol} ${depTokenBalance}`
    )
  }
  console.log('---------------------------------------------')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
