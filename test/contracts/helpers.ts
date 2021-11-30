import { ERC20Instance } from '../../types/truffle-contracts'

export const describeErc20Token = (
  name: string,
  symbol: string,
  decimals: number,
  initializeToken: () => Promise<ERC20Instance>
): void => {
  let token: ERC20Instance

  describe('ERC-20 Token', () => {
    describe('#name()', () => {
      let result: string

      before(async () => {
        token = await initializeToken()
        result = await token.name()
      })

      it('should return name', () => result.should.equal(name))
    })

    describe('#symbol()', () => {
      let result: string

      before(async () => {
        token = await initializeToken()
        result = await token.symbol()
      })

      it('should return symbol', () => result.should.equal(symbol))
    })

    describe('#decimals()', () => {
      let result: number

      before(async () => {
        token = await initializeToken()
        result = (await token.decimals()).toNumber()
      })

      it('should return decimals', () => result.should.equal(decimals))
    })

    describe('#totalSupply()', () => {
      let result: number

      before(async () => {
        token = await initializeToken()
        result = Number(await token.totalSupply())
      })

      it('should return total supply', () => result.should.equal(0))
    })
  })
}
