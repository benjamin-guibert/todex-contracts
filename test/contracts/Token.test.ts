import { describeErc20Token } from './helpers'

const Token = artifacts.require('Token')

contract('Token', ([deployer]: string[]) => {
  describeErc20Token('ToDEX', 'TDX', 18, () => Token.new({ from: deployer }))
})
