import { IpcProvider } from 'web3-core'

export const BURN_ADDRESS = '0x0000000000000000000000000000000000000000'

export const advanceBlockTime = async (seconds: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    ;(web3.currentProvider as IpcProvider).send(
      {
        jsonrpc: '2.0',
        method: 'evm_increaseTime + evm_mine',
        params: [seconds],
        id: new Date().getTime(),
      },
      (error, result) => {
        if (error || !result) return reject(error)

        resolve(Math.floor(result.id / 1000).toString())
      }
    )
  })
}
