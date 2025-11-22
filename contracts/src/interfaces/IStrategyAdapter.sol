// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IStrategyAdapter {
    function update(bytes calldata _params) external;

    function price(bytes calldata _params) external returns (uint256);
}
