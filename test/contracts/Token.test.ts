import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Token__factory } from '../../typechain-types'

const { parseEther } = ethers.utils
const initialSupply = parseEther('1000000')
const initializeToken = async () => {
  const factory = (await ethers.getContractFactory('Token')) as Token__factory
  return (await factory.deploy(initialSupply)).deployed()
}

describe('Token', () => {
  describe('#name()', () => {
    it('should return name', async () => {
      const token = await initializeToken()

      const result = await token.name()

      expect(result).to.equal('ToDEX')
    })
  })

  describe('#symbol()', () => {
    it('should return symbol', async () => {
      const token = await initializeToken()

      const result = await token.symbol()

      expect(result).to.equal('TDX')
    })
  })

  describe('#decimals()', () => {
    it('should return decimals', async () => {
      const token = await initializeToken()

      const result = await token.decimals()

      expect(result.toString()).to.equal('18')
    })
  })

  describe('#totalSupply()', () => {
    it('should return token supply', async () => {
      const token = await initializeToken()

      const result = await token.totalSupply()

      expect(result).to.equal(initialSupply)
    })
  })
})
