import { config } from 'dotenv'
import { ethers } from 'hardhat'
import updateDotenv from 'update-dotenv'

export const initializeScript = () => {
  config()
}

export const deployContract = async (name: string, ...args: unknown[]) => {
  console.log(`Deploying '${name}' contract...`)
  const Contract = await ethers.getContractFactory(name)
  const contract = await Contract.deploy(...args)
  await contract.deployed()
  saveContractAddress(name, contract.address)
  console.log(`Contract '${name}' deployed: ${contract.address}`)

  return contract
}

const saveContractAddress = async (name: string, address: string) => {
  const variables = {} as { [key: string]: string }
  const key = `${name.toUpperCase()}_CONTRACT_ADDRESS`
  variables[key] = address
  await updateDotenv(variables)
  console.log(`Environment variable '${key}' updated.`)
}

export const wait = (seconds: number) => {
  const milliseconds = seconds * 1000
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export const shortenAddress = (address: string) => {
  return `0x...${address.slice(-4)}`
}
