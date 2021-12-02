// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract Token is ERC20 {
  constructor(uint256 _initialSupply) payable ERC20('ToDEX', 'TDX') {
    _mint(msg.sender, _initialSupply);
  }
}
