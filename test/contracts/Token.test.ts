import { TokenInstance } from '../../types/truffle-contracts'

const Token = artifacts.require('Token')

contract('Token', ([deployer]: string[]) => {
  const initialSupply = '10000000000000000000'
  const initializeToken = () => Token.new(initialSupply, { from: deployer })

  let token: TokenInstance

  describe('#name()', () => {
    let result: string

    before(async () => {
      token = await initializeToken()
      result = await token.name()
    })

    it('should return name', () => result.should.equal('ToDEX'))
  })

  describe('#symbol()', () => {
    let result: string

    before(async () => {
      token = await initializeToken()
      result = await token.symbol()
    })

    it('should return symbol', () => result.should.equal('TDX'))
  })

  describe('#decimals()', () => {
    let result: BN

    before(async () => {
      token = await initializeToken()
      result = await token.decimals()
    })

    it('should return decimals', () => result.toString().should.equal('18'))
  })

  describe('#totalSupply()', () => {
    let result: BN

    before(async () => {
      token = await initializeToken()
      result = await token.totalSupply()
    })

    it('should return total supply', () => result.toString().should.equal(initialSupply))
  })
})
