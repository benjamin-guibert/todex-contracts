import * as dotenv from 'dotenv'
import { HardhatUserConfig, task } from 'hardhat/config'
import '@nomiclabs/hardhat-etherscan'
import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
import 'hardhat-gas-reporter'
import 'solidity-coverage'

dotenv.config()

task('reset', 'Reset the local server', async (_taskArgs, hre) => {
  console.log('Resetting local server...')
  await hre.network.provider.send('hardhat_reset')
  console.log('Local server reset.')
})

const config: HardhatUserConfig = {
  solidity: '0.8.9',
  networks: {},
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
}

export default config
