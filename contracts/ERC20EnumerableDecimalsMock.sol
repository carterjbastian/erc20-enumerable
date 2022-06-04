// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./ERC20Enumerable.sol";

contract ERC20EnumerableDecimalsMock is ERC20Enumerable {
    uint8 private immutable _decimals;

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) ERC20Enumerable(name_, symbol_) {
        _decimals = decimals_;
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) public {
        _burn(account, amount);
    }
}
