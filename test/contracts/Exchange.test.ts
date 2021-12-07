import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'
import { Exchange__factory, Token__factory } from '../../typechain-types'
import { getTransactionEvent, getUnixTimestamp } from './helpers'

const { AddressZero: ETHER_ADDRESS, Zero } = ethers.constants
const { parseEther } = ethers.utils

describe('Exchange', () => {
  const initialSupply = parseEther('1000000')
  const feePercent = BigNumber.from(10)

  let feeAccount: SignerWithAddress
  let user1: SignerWithAddress
  let user2: SignerWithAddress

  before(async () => {
    ;[, feeAccount, user1, user2] = await ethers.getSigners()
  })

  const initializeToken = async () => {
    const factory = (await ethers.getContractFactory('Token')) as Token__factory
    return (await factory.deploy(initialSupply)).deployed()
  }
  const initializeExchange = async () => {
    const factory = (await ethers.getContractFactory('Exchange')) as Exchange__factory
    return (await factory.deploy(feeAccount.address, feePercent)).deployed()
  }

  describe('#feeAccount()', () => {
    it('should return fee account', async () => {
      const exchange = await initializeExchange()

      const result = await exchange.feeAccount()

      expect(result).to.equal(feeAccount.address)
    })
  })

  describe('#feePercent()', () => {
    it('should return fee percent', async () => {
      const exchange = await initializeExchange()

      const result = await exchange.feePercent()

      expect(result).to.equal(feePercent)
    })
  })

  describe('#ethBalanceOf', () => {
    const value = parseEther('1000')

    it('should return ETH balance when exists', async () => {
      const exchange = await initializeExchange()
      await exchange.connect(user1).depositEther({ value })

      const result = await exchange.ethBalanceOf(user1.address)

      expect(result).to.equal(value)
    })

    it('should return zero when none', async () => {
      const exchange = await initializeExchange()
      await exchange.connect(user2).depositEther({ value })

      const result = await exchange.ethBalanceOf(user1.address)

      expect(result).to.equal(Zero)
    })
  })

  describe('#tokenBalanceOf', () => {
    const value = parseEther('1000')

    it('should return token balance when exists', async () => {
      const token = await initializeToken()
      const exchange = await initializeExchange()
      await token.transfer(user1.address, value)
      await token.connect(user1).approve(exchange.address, value)
      await exchange.connect(user1).depositToken(token.address, value)

      const result = await exchange.tokenBalanceOf(token.address, user1.address)

      expect(result).to.equal(value)
    })

    it('should return zero when none', async () => {
      const token = await initializeToken()
      const exchange = await initializeExchange()
      await token.transfer(user2.address, value)
      await token.connect(user2).approve(exchange.address, value)
      await exchange.connect(user2).depositToken(token.address, value)

      const result = await exchange.tokenBalanceOf(token.address, user1.address)

      expect(result).to.equal(Zero)
    })

    it('should return zero when unknown', async () => {
      const token = await initializeToken()
      const otherToken = await initializeToken()
      const exchange = await initializeExchange()
      await token.transfer(user1.address, value)
      await token.connect(user1).approve(exchange.address, value)
      await exchange.connect(user1).depositToken(token.address, value)

      const result = await exchange.tokenBalanceOf(otherToken.address, user1.address)

      expect(result).to.equal(Zero)
    })
  })

  describe('#orders()', () => {
    it('should return orders', async () => {
      const sellAmount = parseEther('1')
      const buyAmount = parseEther('1000')
      const token = await initializeToken()
      const exchange = await initializeExchange()
      await exchange.connect(user1).createOrder(ETHER_ADDRESS, sellAmount, token.address, sellAmount)
      await exchange.connect(user1).createOrder(ETHER_ADDRESS, sellAmount, token.address, buyAmount)
      await exchange.connect(user1).createOrder(ETHER_ADDRESS, buyAmount, token.address, buyAmount)

      const result = await exchange.orders(2)

      expect(result[0].toString()).to.equal('2')
      expect(result[1]).to.equal(Zero)
      expect(result[2]).to.equal(user1.address)
      expect(result[3]).to.equal(ETHER_ADDRESS)
      expect(result[4]).to.equal(sellAmount)
      expect(result[5]).to.equal(token.address)
      expect(result[6]).to.equal(buyAmount)
      expect(result[7].gt(Zero)).to.be.true
    })
  })

  describe('#depositEther()', () => {
    it('should deposit ether', async () => {
      const value = parseEther('1')
      const token = await initializeToken()
      const exchange = await initializeExchange()
      await token.transfer(user1.address, value)
      await exchange.connect(user1).depositEther({ value: parseEther('2') })

      const transaction = await exchange.connect(user1).depositEther({ value })

      let balance = await ethers.provider.getBalance(exchange.address)
      expect(balance).to.eq(parseEther('3'))
      balance = await exchange.ethBalanceOf(user1.address)
      expect(balance).to.equal(parseEther('3'))
      await expect(transaction).to.emit(exchange, 'DepositEther').withArgs(user1.address, value, parseEther('3'))
    })
  })

  describe('#depositToken()', () => {
    it('should deposit token when success', async () => {
      const token = await initializeToken()
      const otherToken = await initializeToken()
      const exchange = await initializeExchange()
      await token.transfer(user1.address, parseEther('10000'))
      await otherToken.transfer(user1.address, parseEther('10000'))
      await token.transfer(user2.address, parseEther('10000'))
      await otherToken.transfer(user2.address, parseEther('10000'))
      await token.connect(user2).approve(exchange.address, parseEther('3000'))
      await exchange.connect(user2).depositToken(token.address, parseEther('3000'))
      await otherToken.connect(user2).approve(exchange.address, parseEther('9000'))
      await exchange.connect(user2).depositToken(otherToken.address, parseEther('9000'))
      await token.connect(user1).approve(exchange.address, parseEther('5000'))
      await exchange.connect(user1).depositToken(token.address, parseEther('5000'))
      await token.connect(user1).approve(exchange.address, parseEther('1000'))

      const transaction = await exchange.connect(user1).depositToken(token.address, parseEther('1000'))

      let balance = await exchange.tokenBalanceOf(token.address, user1.address)
      expect(balance).to.equal(parseEther('6000'))
      balance = await token.balanceOf(user1.address)
      expect(balance).to.equal(parseEther('4000'))
      balance = await token.balanceOf(user1.address)
      expect(balance).to.equal(parseEther('4000'))
      await expect(transaction)
        .to.emit(exchange, 'DepositToken')
        .withArgs(user1.address, token.address, parseEther('1000'), parseEther('6000'))
    })

    it('should revert when insufficient funds', async () => {
      const token = await initializeToken()
      const exchange = await initializeExchange()
      token.transfer(user1.address, parseEther('4000'))
      await token.connect(user1).approve(exchange.address, parseEther('5000'))
      await exchange.connect(user1).depositToken(token.address, parseEther('3000'))

      await expect(exchange.connect(user1).depositToken(token.address, parseEther('2000'))).to.be.revertedWith(
        'ERC20: transfer amount exceeds balance'
      )
    })

    it('should revert when not allowed', async () => {
      const token = await initializeToken()
      const exchange = await initializeExchange()
      await token.transfer(user1.address, parseEther('1000'))

      await expect(exchange.connect(user1).depositToken(token.address, parseEther('1000'))).to.be.revertedWith(
        'ERC20: transfer amount exceeds allowance'
      )
    })
  })

  describe('#withdrawEther()', () => {
    it('should withdraw Ether when success', async () => {
      const exchange = await initializeExchange()
      await exchange.connect(user2).depositEther({ value: parseEther('9') })
      await exchange.connect(user1).depositEther({ value: parseEther('3') })
      const initUserBalance = await ethers.provider.getBalance(user1.address)

      const transaction = await exchange.connect(user1).withdrawEther(parseEther('1'))

      let balance = await ethers.provider.getBalance(exchange.address)
      expect(balance).to.equal(parseEther('11'))
      balance = await ethers.provider.getBalance(user1.address)
      expect(balance.gt(initUserBalance)).to.true
      balance = await exchange.ethBalanceOf(user1.address)
      expect(balance).to.equal(BigNumber.from(parseEther('2')))
      await expect(transaction)
        .to.emit(exchange, 'WithdrawEther')
        .withArgs(user1.address, parseEther('1'), parseEther('2'))
    })

    it('should revert when insufficient funds', async () => {
      const exchange = await initializeExchange()
      await exchange.connect(user1).depositEther({ value: parseEther('3') })

      await expect(exchange.connect(user1).withdrawEther(parseEther('5'))).to.be.revertedWith('Insufficient funds')
    })
  })

  describe('#withdrawToken()', () => {
    it('should withdraw token when success', async () => {
      const token = await initializeToken()
      const otherToken = await initializeToken()
      const exchange = await initializeExchange()
      await token.transfer(user1.address, parseEther('3000'))
      await otherToken.transfer(user1.address, parseEther('4000'))
      await token.approve(exchange.address, parseEther('9000'))
      await exchange.depositToken(token.address, parseEther('9000'))
      await token.connect(user1).approve(exchange.address, parseEther('3000'))
      await exchange.connect(user1).depositToken(token.address, parseEther('3000'))
      await otherToken.connect(user1).approve(exchange.address, parseEther('4000'))
      await exchange.connect(user1).depositToken(otherToken.address, parseEther('4000'))

      const transaction = await exchange.connect(user1).withdrawToken(token.address, parseEther('1000'))

      let balance = await token.balanceOf(user1.address)
      expect(balance).to.equal(parseEther('1000'))
      balance = await exchange.tokenBalanceOf(token.address, user1.address)
      expect(balance).to.equal(parseEther('2000'))
      await expect(transaction)
        .to.emit(exchange, 'WithdrawToken')
        .withArgs(user1.address, token.address, parseEther('1000'), parseEther('2000'))
    })

    it('should revert when insufficient funds', async () => {
      const token = await initializeToken()
      const exchange = await initializeExchange()
      await token.transfer(user1.address, parseEther('3000'))
      await token.connect(user1).approve(exchange.address, parseEther('1000'))
      await exchange.connect(user1).depositToken(token.address, parseEther('1000'))

      await expect(exchange.connect(user1).withdrawToken(token.address, parseEther('2000'))).to.be.revertedWith(
        'Insufficient funds'
      )
    })

    it('should revert when unknown token', async () => {
      const token = await initializeToken()
      const otherToken = await initializeToken()
      const exchange = await initializeExchange()
      await token.transfer(user1.address, parseEther('3000'))
      await otherToken.transfer(user1.address, parseEther('3000'))
      await token.connect(user1).approve(exchange.address, parseEther('1000'))
      await exchange.connect(user1).depositToken(token.address, parseEther('1000'))

      await expect(exchange.withdrawToken(otherToken.address, parseEther('1000'))).to.be.revertedWith(
        'Insufficient funds'
      )
    })
  })

  describe('#createOrder()', () => {
    const ethAmount = parseEther('1')
    const tokenAmount = parseEther('1000')

    it('should create order when success', async () => {
      const token = await initializeToken()
      const exchange = await initializeExchange()

      const transaction = await exchange
        .connect(user1)
        .createOrder(ETHER_ADDRESS, ethAmount, token.address, tokenAmount)

      const order = await exchange.orders(1)
      expect(order[0].toString()).to.equal('1')
      expect(order[1]).to.equal(Zero)
      expect(order[2]).to.equal(user1.address)
      expect(order[3]).to.equal(ETHER_ADDRESS)
      expect(order[4]).to.equal(ethAmount)
      expect(order[5]).to.equal(token.address)
      expect(order[6]).to.equal(tokenAmount)
      expect(order[7].toNumber()).to.be.closeTo(getUnixTimestamp(), 1000)
      expect(transaction).to.emit(exchange, 'CreateOrder')
      const event = await getTransactionEvent(exchange, transaction, 'CreateOrder')
      expect(event.id.toString()).to.equal('1')
      expect(event.account).to.equal(user1.address)
      expect(event.sellToken).to.equal(ETHER_ADDRESS)
      expect(event.sellAmount).to.equal(ethAmount)
      expect(event.buyToken).to.equal(token.address)
      expect(event.buyAmount).to.equal(tokenAmount)
      expect(event.timestamp.toNumber()).to.be.closeTo(getUnixTimestamp(), 1000)
    })

    it('should should revert when same assets', async () => {
      const token = await initializeToken()
      const exchange = await initializeExchange()

      await expect(
        exchange.connect(user1).createOrder(token.address, tokenAmount, token.address, ethAmount)
      ).to.be.revertedWith('Assets are identical')
    })
  })

  describe('#cancelOrder()', () => {
    const ethAmount = parseEther('1')
    const tokenAmount = parseEther('1000')

    it('should cancel order when success', async () => {
      const token = await initializeToken()
      const exchange = await initializeExchange()
      await exchange.connect(user1).createOrder(ETHER_ADDRESS, ethAmount, token.address, tokenAmount)

      const transaction = await exchange.connect(user1).cancelOrder(1)

      const order = await exchange.orders(1)
      expect(order[1].toString()).to.equal('2')
      await expect(transaction)
        .to.emit(exchange, 'CancelOrder')
        .withArgs(1, user1.address, ETHER_ADDRESS, ethAmount, token.address, tokenAmount)
    })

    it('should revert when unknown', async () => {
      const token = await initializeToken()
      const exchange = await initializeExchange()
      await exchange.connect(user1).createOrder(token.address, tokenAmount, ETHER_ADDRESS, ethAmount)

      await expect(exchange.connect(user1).cancelOrder(2)).to.be.revertedWith('Order unknown')
    })

    it('should revert when already cancelled', async () => {
      const token = await initializeToken()
      const exchange = await initializeExchange()
      await exchange.connect(user1).createOrder(token.address, tokenAmount, ETHER_ADDRESS, ethAmount)
      await exchange.connect(user1).cancelOrder(1)

      await expect(exchange.connect(user1).cancelOrder(1)).to.be.revertedWith('Order not cancellable')
    })

    it('should revert when filled', async () => {
      const token = await initializeToken()
      const exchange = await initializeExchange()
      await token.transfer(user1.address, tokenAmount)
      await exchange.connect(user2).depositEther({ value: parseEther('1.1') })
      await token.connect(user1).approve(exchange.address, tokenAmount)
      await exchange.connect(user1).depositToken(token.address, tokenAmount)
      await exchange.connect(user1).createOrder(token.address, tokenAmount, ETHER_ADDRESS, ethAmount)
      await exchange.connect(user2).fillOrder(1)

      await expect(exchange.connect(user1).cancelOrder(1)).to.be.revertedWith('Order not cancellable')
    })

    it('should revert when not owner', async () => {
      const token = await initializeToken()
      const exchange = await initializeExchange()
      await exchange.connect(user2).createOrder(token.address, tokenAmount, ETHER_ADDRESS, ethAmount)

      await expect(exchange.connect(user1).cancelOrder(1)).to.be.revertedWith('Not owner of the order')
    })
  })

  describe('#fillOrder()', () => {
    const ethAmount = parseEther('1')
    const tokenAmount = parseEther('1000')

    context('when selling Ether', () => {
      it('should fill order when success', async () => {
        const token = await initializeToken()
        const exchange = await initializeExchange()
        await token.transfer(user1.address, parseEther('1100'))
        await exchange.connect(user2).depositEther({ value: ethAmount })
        await token.connect(user1).approve(exchange.address, parseEther('1100'))
        await exchange.connect(user1).depositToken(token.address, parseEther('1100'))
        await exchange.connect(user2).createOrder(ETHER_ADDRESS, ethAmount, token.address, tokenAmount)

        const transaction = await exchange.connect(user1).fillOrder(1)

        const order = await exchange.orders(1)
        expect(order[1].toString()).to.equal('1')
        let balance = await exchange.ethBalanceOf(user1.address)
        expect(balance).to.equal(ethAmount)
        balance = await exchange.ethBalanceOf(user2.address)
        expect(balance).to.equal(Zero)
        balance = await exchange.tokenBalanceOf(token.address, user2.address)
        expect(balance).to.equal(tokenAmount)
        balance = await exchange.tokenBalanceOf(token.address, user1.address)
        expect(balance).to.equal(Zero)
        balance = await exchange.tokenBalanceOf(token.address, feeAccount.address)
        expect(balance).to.equal(parseEther('100'))
        expect(transaction).to.emit(exchange, 'Trade')
        const event = await getTransactionEvent(exchange, transaction, 'Trade')
        expect(event.orderId.toString()).to.equal('1')
        expect(event.sellAccount).to.equal(user2.address)
        expect(event.sellToken).to.equal(ETHER_ADDRESS)
        expect(event.sellAmount).to.equal(ethAmount)
        expect(event.buyAccount).to.equal(user1.address)
        expect(event.buyToken).to.equal(token.address)
        expect(event.buyAmount).to.equal(tokenAmount)
        expect(event.timestamp.toNumber()).to.be.closeTo(getUnixTimestamp(), 1000)
      })

      it('should revert when insufficient funds for buyer', async () => {
        const token = await initializeToken()
        const exchange = await initializeExchange()
        await token.transfer(user1.address, tokenAmount)
        await exchange.connect(user2).depositEther({ value: ethAmount })
        await token.connect(user1).approve(exchange.address, tokenAmount)
        await exchange.connect(user1).depositToken(token.address, tokenAmount)
        await exchange.connect(user2).createOrder(ETHER_ADDRESS, ethAmount, token.address, tokenAmount)

        await expect(exchange.connect(user1).fillOrder(1)).to.be.revertedWith('Insufficient funds for buyer')
      })

      it('should revert when insufficient funds for seller', async () => {
        const token = await initializeToken()
        const exchange = await initializeExchange()
        await token.transfer(user1.address, parseEther('1100'))
        await exchange.connect(user2).depositEther({ value: parseEther('0.5') })
        await token.connect(user1).approve(exchange.address, parseEther('1100'))
        await exchange.connect(user1).depositToken(token.address, parseEther('1100'))
        await exchange.connect(user2).createOrder(ETHER_ADDRESS, ethAmount, token.address, tokenAmount)

        await expect(exchange.connect(user1).fillOrder(1)).to.be.revertedWith('Insufficient funds for seller')
      })
    })

    context('when selling token', () => {
      it('should fill order when success', async () => {
        const token = await initializeToken()
        const exchange = await initializeExchange()
        await token.transfer(user2.address, tokenAmount)
        await token.connect(user2).approve(exchange.address, tokenAmount)
        await exchange.connect(user2).depositToken(token.address, tokenAmount)
        await exchange.connect(user1).depositEther({ value: parseEther('1.1') })
        await exchange.connect(user2).createOrder(token.address, tokenAmount, ETHER_ADDRESS, ethAmount)

        const transaction = await exchange.connect(user1).fillOrder(1)

        const order = await exchange.orders(1)
        expect(order[1].toString()).to.equal('1')
        let balance = await exchange.tokenBalanceOf(token.address, user1.address)
        expect(balance).to.equal(tokenAmount)
        balance = await exchange.tokenBalanceOf(token.address, user2.address)
        expect(balance).to.equal(Zero)
        balance = await exchange.ethBalanceOf(user2.address)
        expect(balance).to.equal(ethAmount)
        balance = await exchange.ethBalanceOf(user1.address)
        expect(balance).to.equal(Zero)
        balance = await exchange.ethBalanceOf(feeAccount.address)
        expect(balance).to.equal(parseEther('0.1'))
        expect(transaction).to.emit(exchange, 'Trade')
        const event = await getTransactionEvent(exchange, transaction, 'Trade')
        expect(event.orderId.toString()).to.equal('1')
        expect(event.sellAccount).to.equal(user2.address)
        expect(event.sellToken).to.equal(token.address)
        expect(event.sellAmount).to.equal(tokenAmount)
        expect(event.buyAccount).to.equal(user1.address)
        expect(event.buyToken).to.equal(ETHER_ADDRESS)
        expect(event.buyAmount).to.equal(ethAmount)
        expect(event.timestamp.toNumber()).to.be.closeTo(getUnixTimestamp(), 1000)
      })

      it('should revert when insufficient funds for buyer', async () => {
        const token = await initializeToken()
        const exchange = await initializeExchange()
        await token.transfer(user2.address, tokenAmount)
        await token.connect(user2).approve(exchange.address, tokenAmount)
        await exchange.connect(user2).depositToken(token.address, tokenAmount)
        await exchange.connect(user1).depositEther({ value: ethAmount })
        await exchange.connect(user2).createOrder(token.address, tokenAmount, ETHER_ADDRESS, ethAmount)

        await expect(exchange.connect(user1).fillOrder(1)).to.be.revertedWith('Insufficient funds for buyer')
      })

      it('should revert when insufficient funds for seller', async () => {
        const token = await initializeToken()
        const exchange = await initializeExchange()
        await token.transfer(user2.address, tokenAmount)
        await token.connect(user2).approve(exchange.address, parseEther('900'))
        await exchange.connect(user2).depositToken(token.address, parseEther('900'))
        await exchange.connect(user1).depositEther({ value: parseEther('1.1') })
        await exchange.connect(user2).createOrder(token.address, tokenAmount, ETHER_ADDRESS, ethAmount)

        await expect(exchange.connect(user1).fillOrder(1)).to.be.revertedWith('Insufficient funds for seller')
      })
    })

    it('should revert when unknown order', async () => {
      const token = await initializeToken()
      const exchange = await initializeExchange()
      await token.transfer(user1.address, parseEther('1100'))
      await exchange.connect(user2).depositEther({ value: ethAmount })
      await token.connect(user1).approve(exchange.address, parseEther('1100'))
      await exchange.connect(user1).depositToken(token.address, parseEther('1100'))
      await exchange.connect(user2).createOrder(ETHER_ADDRESS, ethAmount, token.address, tokenAmount)

      await expect(exchange.connect(user1).fillOrder(2)).to.be.revertedWith('Order unknown')
    })

    it('should revert when cancelled order', async () => {
      const token = await initializeToken()
      const exchange = await initializeExchange()
      await token.transfer(user1.address, parseEther('1100'))
      await exchange.connect(user2).depositEther({ value: ethAmount })
      await token.connect(user1).approve(exchange.address, parseEther('1100'))
      await exchange.connect(user1).depositToken(token.address, parseEther('1100'))
      await exchange.connect(user2).createOrder(ETHER_ADDRESS, ethAmount, token.address, tokenAmount)
      await exchange.connect(user2).cancelOrder(1)

      await expect(exchange.connect(user1).fillOrder(1)).to.be.revertedWith('Order not fillable')
    })

    it('should revert when filled order', async () => {
      const token = await initializeToken()
      const exchange = await initializeExchange()
      await token.transfer(user1.address, parseEther('1100'))
      await exchange.connect(user2).depositEther({ value: ethAmount })
      await token.connect(user1).approve(exchange.address, parseEther('1100'))
      await exchange.connect(user1).depositToken(token.address, parseEther('1100'))
      await exchange.connect(user2).createOrder(ETHER_ADDRESS, ethAmount, token.address, tokenAmount)
      await exchange.connect(user1).fillOrder(1)

      await expect(exchange.connect(user1).fillOrder(1)).to.be.revertedWith('Order not fillable')
    })
  })
})
