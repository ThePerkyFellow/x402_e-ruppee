// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockEINR
 * @notice Mock e-Rupee token for Phase 1 testing.
 *
 * 🧒 ELI5: This is Monopoly money. It looks and acts like real e-Rupee
 *          but it's fake — for testing only. When RBI gives us access to
 *          real e-Rupee, we swap this out. The rest of the system doesn't
 *          care — to it, money is money (ERC-20 interface).
 *
 * Architecture note:
 *   This contract is intentionally minimal. The programmable logic lives
 *   in PBMWrapper, NOT here. The e-Rupee should be pure ERC-20 — just
 *   money, no conditions. This is the "Programmable Payment" (not
 *   "Programmable Money") design from MAS Orchid Blueprint.
 *
 * Decimals:
 *   Use 2 for paise (100 paise = 1 rupee), matching real INR.
 *   For USDC compatibility testing, use 6.
 */
contract MockEINR is ERC20, Ownable {
    uint8 private _decimals;

    constructor(uint8 decimals_) ERC20("Mock e-Rupee", "eINR") Ownable(msg.sender) {
        _decimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /**
     * @notice Mint new tokens. Only owner can call (simulates bank/RBI).
     * @param to Recipient address
     * @param amount Amount in smallest unit (paise if decimals=2)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Burn tokens. Used when converting back to fiat (future use).
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
