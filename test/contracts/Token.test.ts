import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Token, Token__factory } from '../../typechain-types'
import { BigNumber } from '@ethersproject/bignumber'

describe('Token', () => {
  const initialSupply = BigNumber.from('10000000000000000000')

  let initializeToken: () => Promise<Token>
  let token: Token

  before(async () => {
    initializeToken = async () => {
      const factory = (await ethers.getContractFactory('Token')) as Token__factory
      return (await factory.deploy(initialSupply)).deployed()
    }
  })

  describe('#name()', () => {
    let result: string

    before(async () => {
      token = await initializeToken()

      result = await token.name()
    })

    it('should return name', () => expect(result).to.equal('ToDEX'))
  })

  describe('#symbol()', () => {
    let result: string

    before(async () => {
      token = await initializeToken()

      result = await token.symbol()
    })

    it('should return symbol', () => expect(result).to.equal('TDX'))
  })

  describe('#decimals()', () => {
    let result: number

    before(async () => {
      token = await initializeToken()

      result = await token.decimals()
    })

    it('should return decimals', () => expect(result).to.equal(18))
  })

  describe('#totalSupply()', () => {
    let result: BigNumber

    before(async () => {
      token = await initializeToken()

      result = await token.totalSupply()
    })

    it('should return total supply', () => expect(result).to.equal(initialSupply))
  })
})
