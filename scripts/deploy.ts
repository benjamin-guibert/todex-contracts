import { run, ethers } from 'hardhat'
import { Exchange__factory, Token__factory } from '../typechain-types'

const initialSupply = '10000000000000000000000000'
const feePercent = 10

const main = async () => {
  await run('compile')
  console.log('Deploying contracts...')
  await deployToken()
  await deployExchange()
  console.log('Contracts deployed.')
}

const deployToken = async () => {
  console.log('Deploying Token contract...')
  const Token = (await ethers.getContractFactory('Token')) as Token__factory
  const token = await Token.deploy(initialSupply)
  await token.deployed()
  console.log('Token contract deployed.')
}

const deployExchange = async () => {
  console.log('Deploying exchange contract...')
  const [feeAcount] = await ethers.getSigners()
  const Exchange = (await ethers.getContractFactory('Exchange')) as Exchange__factory
  const exchange = await Exchange.deploy(feeAcount.address, feePercent)
  await exchange.deployed()
  console.log('Exchange contract deployed.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
