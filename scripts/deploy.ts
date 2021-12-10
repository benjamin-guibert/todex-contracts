import { deployContract, initializeScript } from './helpers'
import { ethers } from 'hardhat'

const { parseEther } = ethers.utils
const initialSupply = parseEther('1000000')
const feePercent = 1

export const main = async () => {
  initializeScript()
  console.log('Deploying contracts...')
  const [deployer] = await ethers.getSigners()
  await deployContract('Token', initialSupply)
  await deployContract('Exchange', deployer.address, feePercent)
  console.log('Contracts deployed.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
