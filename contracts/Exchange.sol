// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Token.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Exchange {
    using Counters for Counters.Counter;
    using SafeMath for uint256;

    address private constant ETHER = address(0);

    struct Order {
        uint256 id;
        address account;
        address sellToken;
        uint256 sellAmount;
        address buyToken;
        uint256 buyAmount;
        uint256 timestamp;
    }

    address public feeAccount;
    uint256 public feePercent;
    mapping(address => uint256) public ethBalanceOf;
    mapping(address => mapping(address => uint256)) public tokenBalanceOf;
    mapping(uint256 => Order) public orders;
    mapping(uint256 => bool) public pendingOrders;
    mapping(uint256 => bool) public filledOrders;
    mapping(uint256 => bool) public cancelledOrders;
    Counters.Counter private ordersCounter;

    event DepositEther(address account, uint256 amount, uint256 newBalance);

    event DepositToken(address account, address token, uint256 amount, uint256 newBalance);

    event WithdrawEther(address account, uint256 amount, uint256 newBalance);

    event WithdrawToken(address account, address token, uint256 amount, uint256 newBalance);

    event CreateOrder(
        uint256 id,
        address account,
        address sellToken,
        uint256 sellAmount,
        address buyToken,
        uint256 buyAmount,
        uint256 timestamp
    );

    event CancelOrder(
        uint256 id,
        address account,
        address sellToken,
        uint256 sellAmount,
        address buyToken,
        uint256 buyAmount
    );

    event Trade(
        uint256 orderId,
        address sellAccount,
        address sellToken,
        uint256 sellAmount,
        address buyAccount,
        address buyToken,
        uint256 buyAmount,
        uint256 timestamp
    );

    constructor(address _feeAccount, uint256 _feePercent) {
        feeAccount = _feeAccount;
        feePercent = _feePercent;
    }

    function depositEther() public payable {
        ethBalanceOf[msg.sender] = ethBalanceOf[msg.sender].add(msg.value);

        emit DepositEther(msg.sender, msg.value, ethBalanceOf[msg.sender]);
    }

    function depositToken(address _token, uint256 _amount) public {
        require(Token(_token).transferFrom(msg.sender, address(this), _amount), "Cannot transfer token");

        tokenBalanceOf[_token][msg.sender] = tokenBalanceOf[_token][msg.sender].add(_amount);

        emit DepositToken(msg.sender, _token, _amount, tokenBalanceOf[_token][msg.sender]);
    }

    function withdrawEther(uint256 _amount) public {
        require(ethBalanceOf[msg.sender] >= _amount, "Insufficient funds");

        ethBalanceOf[msg.sender] = ethBalanceOf[msg.sender].sub(_amount);
        // solhint-disable-next-line avoid-low-level-calls
        (bool called, ) = msg.sender.call{value: _amount}("");
        require(called, "Cannot send Ether");

        emit WithdrawEther(msg.sender, _amount, ethBalanceOf[msg.sender]);
    }

    function withdrawToken(address _token, uint256 _amount) public {
        require(tokenBalanceOf[_token][msg.sender] >= _amount, "Insufficient funds");

        tokenBalanceOf[_token][msg.sender] = tokenBalanceOf[_token][msg.sender].sub(_amount);
        require(Token(_token).transfer(msg.sender, _amount), "Cannot transfer token");

        emit WithdrawToken(msg.sender, _token, _amount, tokenBalanceOf[_token][msg.sender]);
    }

    function createOrder(
        address _sellToken,
        uint256 _sellAmount,
        address _buyToken,
        uint256 _buyAmount
    ) public {
        require(_buyToken != _sellToken, "Assets are identical");

        ordersCounter.increment();
        uint256 orderId = ordersCounter.current();
        orders[orderId] = Order(orderId, msg.sender, _sellToken, _sellAmount, _buyToken, _buyAmount, block.timestamp);
        pendingOrders[orderId] = true;

        emit CreateOrder(orderId, msg.sender, _sellToken, _sellAmount, _buyToken, _buyAmount, block.timestamp);
    }

    function cancelOrder(uint256 _id) public {
        Order storage order = _getRequiredOrder(_id);
        require(pendingOrders[_id], "Order not cancellable");
        require(order.account == msg.sender, "Not owner of the order");

        pendingOrders[_id] = false;
        cancelledOrders[_id] = true;

        emit CancelOrder(order.id, order.account, order.sellToken, order.sellAmount, order.buyToken, order.buyAmount);
    }

    function fillOrder(uint256 _id) public {
        Order storage order = _getRequiredOrder(_id);
        require(pendingOrders[_id], "Order not fillable");

        _trade(_id, order.account, order.sellToken, order.sellAmount, msg.sender, order.buyToken, order.buyAmount);
        pendingOrders[_id] = false;
        filledOrders[_id] = true;
    }

    function _getRequiredOrder(uint256 _id) private view returns (Order storage) {
        Order storage order = orders[_id];
        require(order.id == _id, "Order unknown");

        return order;
    }

    function _trade(
        uint256 _orderId,
        address _sellAccount,
        address _sellToken,
        uint256 _sellAmount,
        address _buyAccount,
        address _buyToken,
        uint256 _buyAmount
    ) internal {
        uint256 feeAmount = _buyAmount.mul(feePercent).div(100);
        require(_buyToken != _sellToken, "Assets are identical");
        require(
            _buyToken == ETHER
                ? ethBalanceOf[_buyAccount] >= _buyAmount.add(feeAmount)
                : tokenBalanceOf[_buyToken][_buyAccount] >= _buyAmount.add(feeAmount),
            "Insufficient funds for buyer"
        );
        require(
            _sellToken == ETHER
                ? ethBalanceOf[_sellAccount] >= _sellAmount
                : tokenBalanceOf[_sellToken][_sellAccount] >= _sellAmount,
            "Insufficient funds for seller"
        );

        if (_buyToken == ETHER) {
            ethBalanceOf[_buyAccount] = ethBalanceOf[_buyAccount].sub(_buyAmount).sub(feeAmount);
            ethBalanceOf[_sellAccount] = ethBalanceOf[_sellAccount].add(_buyAmount);
            ethBalanceOf[feeAccount] = ethBalanceOf[feeAccount].add(feeAmount);
        } else {
            tokenBalanceOf[_buyToken][_buyAccount] = tokenBalanceOf[_buyToken][_buyAccount].sub(_buyAmount).sub(
                feeAmount
            );
            tokenBalanceOf[_buyToken][_sellAccount] = tokenBalanceOf[_buyToken][_sellAccount].add(_buyAmount);
            tokenBalanceOf[_buyToken][feeAccount] = tokenBalanceOf[_buyToken][feeAccount].add(feeAmount);
        }

        if (_sellToken == ETHER) {
            ethBalanceOf[_sellAccount] = ethBalanceOf[_sellAccount].sub(_sellAmount);
            ethBalanceOf[_buyAccount] = ethBalanceOf[_buyAccount].add(_sellAmount);
        } else {
            tokenBalanceOf[_sellToken][_sellAccount] = tokenBalanceOf[_sellToken][_sellAccount].sub(_sellAmount);
            tokenBalanceOf[_sellToken][_buyAccount] = tokenBalanceOf[_sellToken][_buyAccount].add(_sellAmount);
        }

        emit Trade(
            _orderId,
            _sellAccount,
            _sellToken,
            _sellAmount,
            _buyAccount,
            _buyToken,
            _buyAmount,
            block.timestamp
        );
    }
}
