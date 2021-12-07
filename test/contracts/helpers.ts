import { Contract, ContractTransaction } from 'ethers'

export const getTransactionEvent = async (contract: Contract, transaction: ContractTransaction, name: string) => {
  const { logs } = await contract.provider.getTransactionReceipt(transaction.hash)
  const { data, topics } = logs[0]

  return contract.interface.decodeEventLog(name, data, topics)
}

export const getUnixTimestamp = (datetime?: Date) => {
  return Math.floor((datetime?.getTime() || Date.now()) / 1000)
}
